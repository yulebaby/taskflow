var domain = "http://admin.beibeiyue.com/prestore";
// var domain = 'http://192.168.1.109:8888/prestore';
// var domain = 'http://tadmin.beibeiyue.cn/admin/prestore'
// var domainOrder = 'http://192.168.1.109:9997/prepareMission';
var domainOrder = 'http://work.beibeiyue.com/prepareMission'

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
      receiveFile: '',
      weChatWords: '',
      phoneWords: '',
      remark: '',
      screenshot: '',
      periodResult: ''
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
document.title = decodeURI(initFunc.getQueryString('title')) || '门店筹建进度';

var vm = new Vue({
  el: '#gojs',
  data: {
    id: null,
    email: null,
    goId: null,
    contentShow: false,
    isBranch: false,
    content: {
      step: initFunc.setStep(),
      stepInfo: initFunc.setStepInfo()
    },
    /* 判断 */
    isThread: false,
    isStartCom: false,
    isEndCom: false,
    shopProgress: {
      shopId: null,
      shopName: null,
      step: [],
      nowSchedule: null,
      planSchedule: null,
      startDate: null,
      planDate: null
    },
    isOrder: false,
    orderItemDetails: null,
    showCreate: false,
    orderDetails: {
      baseInfo: {},
      projectName: ''
    },
    submitOrderLoading: false
  },
  mounted: function () {
    this.id = initFunc.getQueryString('id');
    this.email = initFunc.getQueryString('mail');
    if(this.id){
      var params = {
        type: 1,
        id: this.id
      }
      $.ajax({
        url: domain + '/flowChart.html',
        type: 'post',
        data: params,
        dataType: 'text',
        success: function (res) {
          var res = JSON.parse(res);
          for(var i = 0; i < res.nodeDataArray.length; i++){
            if(res.nodeDataArray[i].status == 0){
              res.nodeDataArray[i].category = 'unfinished';
            }
            if(res.nodeDataArray[i].status == 1){
              res.nodeDataArray[i].category = 'conducc';
            }
            if(res.nodeDataArray[i].status == 2){
              res.nodeDataArray[i].category = 'completed';
            }
            if(res.nodeDataArray[i].status == 3){
              res.nodeDataArray[i].category = 'delay';
            }
          }

          var i = 0;
          function hasDiagram () {
            setTimeout(function () {
              if(window['myDiagram']){
                myDiagram.model = go.Model.fromJson(JSON.stringify(res));
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
      $.ajax({
        url: domain + '/preShopPreview.html',
        type: 'post',
        data: {
          type: 1,
          id: this.id
        },
        dataType: 'json',
        success: function (res) {
          vm.shopProgress = res;
        }
      })
    }
  },
  methods: {
    /* 点击 node 节点出现节点详情 */
    goNode: function (key) {
      this.goId = key;
      var json = JSON.parse(myDiagram.model.toJson());
      for(var i = 0; i < json.nodeDataArray.length; i++){
        if(json.nodeDataArray[i].key === this.goId){
          vm.isStartCom = json.nodeDataArray[i].text == '任务开始';
          vm.isEndCom = json.nodeDataArray[i].text == '任务结束';
          if(json.nodeDataArray[i].type == 0 || vm.isStartCom || vm.isEndCom){
            this.contentShow = true;
          }else{
            this.contentShow = false;
          }
          if(json.nodeDataArray[i].type == 1){
            this.isBranch = true;
          }else{
            this.isBranch = false;
          }
          this.content = {
            step: {
              id: json.nodeDataArray[i].id,
              task: json.nodeDataArray[i].text || json.nodeDataArray[i].task,
              planDays: json.nodeDataArray[i].planDays,
              planStart: json.nodeDataArray[i].planStart,
              planComplete: json.nodeDataArray[i].planComplete,
              warnCycle: json.nodeDataArray[i].warnCycle,
              startDate: json.nodeDataArray[i].startDate,
              completeDate: json.nodeDataArray[i].completeDate,
            },
            stepInfo: json.nodeDataArray[i].info
          };
          this.content.stepInfo.weChatWords = this.content.stepInfo.weChatWords ? this.content.stepInfo.weChatWords : '';
          break;
        }
      }
      /* ----------------------------- 筹建二期 ----------------------------- */
      if (this.content.step.task === '图纸完成，施工资料发送') {
        this.isOrder = 1;
      } else if (this.content.step.task === '再次提醒施工前水电路问题') {
        this.isOrder = 2;
      } else if (this.content.step.task === '设备安装') {
        this.isOrder = 3;
      } else {
        this.isOrder = false;
      }
      if (this.isOrder) {
        this.getOrderItemsDetails();
      }
    },
    /* 保存任务详情 */
    nodeSave: function (bool) {
      var json = JSON.parse(myDiagram.model.toJson());
      if(this.isStartCom){
        var date = new Date();
        var year = date.getFullYear();
        var month = (date.getMonth()+1) < 10 ? '0' + (date.getMonth()+1) : (date.getMonth()+1);
        var day = date.getDate();
        var hour = date.getHours();
        var minute = date.getMinutes();
        var second = date.getSeconds();
        this.content.step.planComplete = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
      }
      for(var i = 0; i < json.nodeDataArray.length; i++){
        if(json.nodeDataArray[i].key === this.goId){
          json.nodeDataArray[i].text = this.content.step.task;
          json.nodeDataArray[i].info = this.content.stepInfo;
          for(var q in this.content.step){
            json.nodeDataArray[i][q] = this.content.step[q];
          }
        }
      }
      myDiagram.model = go.Model.fromJson(JSON.stringify(json));
      // this.contentShow = false;
      /* 如果 groupId 存在则直接保存到服务器, 否则暂存在任务六中 */

      var params = {};
      for(var q in this.content.step){
        params['step.'+q] = this.content.step[q];
        if(q == 'planDays'){params['step.'+q] = Number(this.content.step[q])}
      }
      for(var q in this.content.stepInfo){
        params['stepInfo.'+q] = this.content.stepInfo[q]
      }
      $.ajax({
        url: domain + '/saveStepInfo.html',
        type: 'post',
        data: params,
        dataType: 'json',
        success: function (res) {
          if(bool){
            location.reload();
          }
        }
      })

    },
    clickTime: function (sore) {
      var date = new Date();
      var year = date.getFullYear();
      var month = (date.getMonth()+1) < 10 ? '0' + (date.getMonth()+1) : (date.getMonth()+1);
      var day = date.getDate();
      var hour = date.getHours();
      var minute = date.getMinutes();
      var second = date.getSeconds();
      if(sore == 1){
        this.content.step.startDate = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
      }else{
        this.content.step.completeDate = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
      }
      this.nodeSave(true);
    },
    /* 新增 阶段文件 */
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
              if(!vm.content.stepInfo[dom]){
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
      this.content.stepInfo.periodResult = arr.join('&&');
    },
    /* 新增 阶段文件 end */

    /*  */
    createOrderBtn: function () {
      $.ajax({
        url: domain + '/queryBaseInfo.html',
        type: 'post',
        data: {
          storeId: vm.id,
          classType: vm.isOrder,
          token: '7e62a523c71b5c6468b2'
        },
        dataType: 'json',
        success: function (res) {
          vm.showCreate = true;
          vm.orderDetails = res;
        }
      })
    },
    submitOrder: function () {
      if (this.submitOrderLoading) { return; }
      if (!vm.orderDetails.receptionId) {alert('请选择工单接收人');return;}
      if (!vm.orderDetails.expectTimeStart || !vm.orderDetails.expectTime) {alert('请选择期望完成时间');return;}
      if (new Date(vm.orderDetails.expectTimeStart).getTime() > new Date(vm.orderDetails.expectTime).getTime()) {alert('开始时间不能大于结束时间');return;}
      this.submitOrderLoading = true;
      var params = {
        name: vm.orderDetails.baseInfo.storeName,
        ascriptionProId: vm.orderDetails.ascriptionProId,
        expectTimeStart: vm.orderDetails.expectTimeStart,
        expectTime: vm.orderDetails.expectTime,
        receptionId: vm.orderDetails.receptionId,
        describeContext: vm.orderDetails.describeContext,
        baseInfoJson: vm.orderDetails.baseInfo,
        projectidLogic: vm.orderDetails.projectIdLogic.join(','),
        storeId: vm.id,
        email: vm.email
      }
      for (var i = 0; i < vm.orderDetails.personList.length; i++) {
        if (vm.orderDetails.personList[i].userId === vm.orderDetails.receptionId) {
          params.receptionName = vm.orderDetails.personList[i].userName
        }
      }
      $.ajax({
        url: domainOrder + '/createMissionPreparation',
        data: {
          paramJson: JSON.stringify(params),
          token: '7e62a523c71b5c6468b2'
        },
        type: 'post',
        dataType: 'json',
        success: function (res) {
          if (res.code == 1000) {
            vm.showCreate = false;
            vm.getOrderItemsDetails();
            alert('创建工单成功');
          } else {
            alert(res.info);
          }
        },
        complete: function () {
          vm.submitOrderLoading = false
        }
      })
    },
    getOrderItemsDetails: function () {
      $.ajax({
        url: domainOrder + '/missionPreparationDetail',
        data: {
          paramJson: JSON.stringify({ storeId: vm.id, classType: vm.isOrder, mail: vm.email }),
          token: '7e62a523c71b5c6468b2'
        },
        type: 'post',
        dataType: 'json',
        success: function (res) {
          if (res.code == 1000) {
            vm.orderItemDetails = res.result;
          }
        }
      })
    },
    openOrder: function () {
      console.log(vm.orderItemDetails)
      var obj = {
        token: '7e62a523c71b5c6468b2',
        userId: vm.orderItemDetails.userId,
        storeId: vm.orderItemDetails.storeId,
        classType: vm.isOrder,
        id: vm.orderItemDetails.id,
        userName: vm.orderDetails.userName
      };
      window.open('http://gd.beibeiyue.com/#/login?userInfo=' + JSON.stringify(obj), '_blank')
    }
  },
  filters: {
    split: function (input, n){
      if(typeof input != 'object'){
        return input.split('||')[n];
      }else{
        return '';
      }
    },
    format: function (input) {
      if(!input) return '';
      var d = new Date(input);
      var year = d.getFullYear();
      var month = d.getMonth() + 1;
      var day = d.getDate() < 10 ? '0' + d.getDate() : '' + d.getDate();
      return year + '-' + (month < 10 ? '0' + month : month) + '-' + day;
    },
    format1: function (input) {
      if(!input) return '';
      var d = new Date(input);
      var year = d.getFullYear();
      var month = d.getMonth() + 1;
      var day = d.getDate() < 10 ? '0' + d.getDate() : '' + d.getDate();
      var hour = d.getHours();
      var minutes = d.getMinutes();
      var seconds = d.getSeconds();
      return year + '-' + (month < 10 ? '0' + month : month) + '-' + day + ' ' + (hour < 10 ? '0' + hour : hour) + ':' + (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
    }
  }
});
