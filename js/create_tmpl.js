var domain = "http://admin.beibeiyue.com/prestore";
// var domain = 'http://192.168.1.205:8866/prestore';
// var domain = 'http://tadmin.beibeiyue.cn/admin/prestore';

var initFunc = {
  /* 初始化详情信息 */
  setStep: function () {
    return {
      task: '',
      planDays: '',
      warnCycle: '',
      startDate: '',
      completeDate: ''
    }
  },
  setStepInfo: function () {
    return {
      sendFile: '',
      workDetail: '',
      receiveFile: '',
      weChatWords: '',
      phoneWords: '',
      remark: '',
      isSupportSheet: 2,
      isQualityControl: 2
    }
  },
  prompt: function (text) {
    // alert(text);
    return false;
  },
  /* 获取地址栏参数 */
  getQueryString: function (name){
    var reg = new RegExp("(^|&)"+ name.toLowerCase() +"=([^&]*)(&|$)");
    var r = window.location.search.substr(1).toLowerCase().match(reg);
    if(r!=null){return  unescape(r[2]);}
    return null;
  }
}


var vm = new Vue({
  el: '#gojs',
  data: {
    groupId: '',
    typeList: [],
    goId: null,
    contentShow: false,
    content: {
      step: initFunc.setStep(),
      stepInfo: initFunc.setStepInfo()
    },
    /* 判断 */
    isThread: false
  },
  mounted: function () {
    this.groupId = initFunc.getQueryString('groupid');
    /* 如果groupId存在则请求服务器数据 */
    if(this.groupId){
      var params = {
        type: 2,
        groupId: this.groupId
      }
      $.ajax({
        url: domain + '/flowChart.html',
        type: 'post',
        data: params,
        dataType: 'text',
        success: function (res) {
          var typeList = JSON.parse(res).typeList;
          for (var l = 0; l < typeList.length; l++) {
            vm.typeList.push(typeList[l]);
          }
          var i = 0;
          function hasDiagram () {
            setTimeout(function () {
              console.log(window['myDiagram'])
              if(window['myDiagram']){
                myDiagram.model = go.Model.fromJson(res);
              }else{
                if(i <= 20){
                  hasDiagram()
                }
              }
              i++;
            },500)
          }
          hasDiagram();
        }
      });
    }
  },
  methods: {
    /* 点击 node 节点出现节点详情 */
    goNode: function (key) {
      this.goId = key;
      this.contentShow = true;
      var json = JSON.parse(myDiagram.model.toJson());
      for(var i = 0; i < json.nodeDataArray.length; i++){
        if(json.nodeDataArray[i].key === this.goId){
          this.content = json.nodeDataArray[i].info ? {
            step: {
              id: json.nodeDataArray[i].id,
              task: json.nodeDataArray[i].text,
              planDays: json.nodeDataArray[i].planDays,
              warnCycle: json.nodeDataArray[i].warnCycle,
              startDate: json.nodeDataArray[i].startDate,
              completeDate: json.nodeDataArray[i].completeDate,
            },
            stepInfo: json.nodeDataArray[i].info
          } : {
            step: initFunc.setStep(),
            stepInfo: initFunc.setStepInfo()
          };
          this.content.stepInfo.isSupportSheet = this.content.stepInfo.isSupportSheet || 2;
          this.content.stepInfo.isQualityControl = this.content.stepInfo.isQualityControl || 2;
          this.content.step.task = json.nodeDataArray[i].text ? json.nodeDataArray[i].text : json.nodeDataArray[i].category == 'oneComment' ? '主线任务' : '支线任务';
        }
      }
    },
    /* 保存任务详情 */
    nodeSave: function () {
      if(!this.content.step.task){
        return initFunc.prompt('请输入任务名称');
      }
      if(!this.content.step.planDays && !this.isThread){
        return initFunc.prompt('请输入计划天数');
      }

      var json = JSON.parse(myDiagram.model.toJson());
      var isRequset = true;
      for(var i = 0; i < json.nodeDataArray.length; i++){
        if(json.nodeDataArray[i].key === this.goId){
          json.nodeDataArray[i].text = this.content.step.task;
          json.nodeDataArray[i].info = this.content.stepInfo;
          for(var q in this.content.step){
            json.nodeDataArray[i][q] = this.content.step[q];
          }
          /* 如果是本次新增的节点 则不直接保存至数据库 */
          if(!json.nodeDataArray[i].id || !json.nodeDataArray[i].info.id){
            isRequset = false;
          }
        }
      }
      myDiagram.model = go.Model.fromJson(JSON.stringify(json));
      this.contentShow = false;
      /* 如果 groupId 存在则直接保存到服务器, 否则暂存在任务流中 */

      if(this.groupId && isRequset){
        var params = {};
        for(var q in this.content.step){
          params['step.'+q] = this.content.step[q];
          if(q == 'planDays'){params['step.'+q] = Number(this.content.step[q])}
        }
        for(var q in this.content.stepInfo){
          params['stepInfo.'+q] = this.content.stepInfo[q]
        }
        if (params['stepInfo.isSupportSheet'] == 1 && !params['stepInfo.typeCode']) {
          alert('请选择工单类型');
        } else {
          $.ajax({
            url: domain + '/saveStepInfo.html',
            type: 'post',
            data: params,
            dataType: 'json',
            success: function (res) {}
          })
        }
      }

    },
    /* 保存任务流 */
    save: function () {
      var json = JSON.parse(myDiagram.model.toJson());
      var nodeData = json.nodeDataArray,
          nodeLink = json.linkDataArray;
      var hasStart = 0;
      for(var i = 0; i < nodeData.length; i++){
        if(nodeData[i].category == 'startComment'){
          hasStart++;
          json.nodeDataArray[i].type = 1;
          json.nodeDataArray[i].text = '任务开始';
        }
        if(json.nodeDataArray[i].category == 'endComment'){
          json.nodeDataArray[i].type = 1;
          json.nodeDataArray[i].text = '任务结束';
        }
        if(nodeData[i].category == 'oneComment'){
          /* 一级节点 默认有详情 */
          json.nodeDataArray[i].type = 0;
          /* 循环 连线 数组 判断是否有子节点 */
          for(var j = 0; j < nodeLink.length; j++){
            /* 如果该节点 nodeData[i] 有子节点 */
            if(nodeLink[j].from == nodeData[i].key){
              /* 设置该一级节点 没有详情 */
              json.nodeDataArray[i].type = 1;
              /* 再次循环 全部节点 判断子节点是不是一级或者结束 */
              for(var l = 0; l < nodeData.length; l++){
                /* 获取到子节点 */
                if(nodeLink[j].to == nodeData[l].key){
                  /* 判断该子节点是不是二级 */
                  if(nodeData[l].category == 'twoComment'){
                    json.nodeDataArray[i].type = 1;
                  }else{
                    /* 判断该子节点是不是一级或者结束 */
                    if(nodeData[l].category == 'endComment' || nodeData[l].category == 'oneComment'){
                      json.nodeDataArray[i].type = 0;
                    }
                  }
                }
              }
              /* 如果循环连线的子节点有一个二级直接取消剩余循环 */
              if(json.nodeDataArray[i].type == 1){
                break;
              }
            }
          }
        }
        if(json.nodeDataArray[i].category == 'twoComment'){
          json.nodeDataArray[i].type = 0;
        }
        if(!nodeData[i].text){
          if(nodeData[i].category == 'oneComment'){json.nodeDataArray[i].text = '主线任务';}
          if(nodeData[i].category == 'twoComment'){json.nodeDataArray[i].text = '支线任务';}
        }
        /* 如果 info 不存在则赋值为空 */
        if(!json.nodeDataArray[i].info){
          json.nodeDataArray[i].info = initFunc.setStepInfo();
        }else{
          /* 如果字段不存在则赋值为空 */
          if(!json.nodeDataArray[i].info.sendFile){
            json.nodeDataArray[i].info.sendFile = '';
          }
          if(!json.nodeDataArray[i].info.workDetail){
            json.nodeDataArray[i].info.workDetail = '';
          }
          if(!json.nodeDataArray[i].info.receiveFile){
            json.nodeDataArray[i].info.receiveFile = '';
          }
          if(!json.nodeDataArray[i].info.weChatWords){
            json.nodeDataArray[i].info.weChatWords = '';
          }
          if(!json.nodeDataArray[i].info.phoneWords){
            json.nodeDataArray[i].info.phoneWords = '';
          }
          if(!json.nodeDataArray[i].info.remark){
            json.nodeDataArray[i].info.remark = '';
          }
        }
      }
      myDiagram.model = go.Model.fromJson(JSON.stringify(json));

      if(hasStart != 1){
        return initFunc.prompt('必须也仅能拥有一个开始节点');
      }
      var params = {
        jsonStr: JSON.stringify(json),
        type: 2
      }
      if(this.groupId){
        params.groupId = this.groupId;
      }
      var url = this.groupId ? '/saveFlowChart.html' : '/saveFlowChartModel.html';
      $.ajax({
        url: domain + url,
        type: 'post',
        data: params,
        dataType: 'json',
        success: function (res) {
          initFunc.prompt(res.msg);
        },
        error: function (err){
          initFunc.prompt('保存失败, 刷新页面重试');
        }
      })
    },
    /* 上传文件 */
    upfile: function (dom) {
      var file = document.getElementById(dom).files[0];
      if(file){
        var formData = new FormData();
        formData.append('file', file);
        formData.append('fileFileName', file.name);
        $.ajax({
          url: domain + '/fileUpload.html',
          type: 'post',
          data: formData,
          processData: false,
          contentType: false,
          success: function (res) {
            if(res.flag){
              if(vm.content.stepInfo[dom].length == 0){
                vm.content.stepInfo[dom] = res.fileName + '||' + res.url;
              }else{
                vm.content.stepInfo[dom] = vm.content.stepInfo[dom] + '&&' + res.fileName + '||' + res.url;
              }
            }
          },
          error: function (e) {

          }
        })
      }
    },
    deleteFile: function (i) {
      var arr = this.content.stepInfo.sendFile.split('&&');
      arr.splice(i, 1);
      this.content.stepInfo.sendFile = arr.join('&&');
    }
  },
  filters: {
    split: function (input, n, reg){
      if(typeof input != 'object'){
        return input.split(reg)[n];
      }else{
        return '';
      }
    },
  }
});
