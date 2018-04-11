function init() {
  if (window.goSamples) goSamples();  // init for these samples -- you don't need to call this
  var $ = go.GraphObject.make;  // for conciseness in defining templates

  /* 定义初始化颜色 */
  var mainBg = $(go.Brush, "Linear", { 0: "#01a6ff", 1: "#01a6ff" });
  var endBg = $(go.Brush, "Linear", { 0: "#ffdc2a", 1: "#ffdc2a" });
  var startBg = $(go.Brush, "Linear", { 0: "#417bf6", 1: "#417bf6" });
  var redgrad = $(go.Brush, "Linear", { 0: "#C45245", 1: "#871E1B" });
  var fromBg = $(go.Brush, "Linear", { 0: "#ffc51c", 1: "#ffc51c" });

  var completedBg = $(go.Brush, "Linear", { 0: "#00CC00", 1: "#00CC00" });
  var conduccBg = $(go.Brush, "Linear", { 0: "#ff9600", 1: "#ff9600" });
  var delayBg = $(go.Brush, "Linear", { 0: "#ff5722", 1: "#ff5722" });
  var unfinishedBg = $(go.Brush, "Linear", { 0: "#efefef", 1: "#efefef" });

  /* 定义样式 */
  function textStyle() {
    return {
      stroke: "#fff",
      margin: 10,
      wrap: go.TextBlock.WrapFit,
      textAlign: "center",
      editable: false,
      font: "18px Helvetica, Arial, sans-serif"
    }
  }

  myDiagram = $(go.Diagram, "myDiagramDiv", {
    // "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,    // 是否开启鼠标滚轮改变大小
    allowDrop: true,
    // initialAutoScale: go.Diagram.Uniform,
    // "linkingTool.direction": go.LinkingTool.ForwardsOnly,
    initialContentAlignment: go.Spot.Center,
    scale:0.7,
    minScale:0.1,
    maxScale:1.4,
    click : function() {  
      vm.contentShow = false;
    },  
    layout: $(go.LayeredDigraphLayout, { isInitial: false, isOngoing: false, layerSpacing: 50, angle: 90 }),
    "undoManager.isEnabled": true,
    allowDelete: false,
    allowMove: false,
    allowCopy: false,
    allowLink: false,
    allowMove: false,
  });
  
  /* 
   * 定义模板节点
   */
  function makePort(name, spot, output, input) {
    return $(go.Shape, "Circle",
              {
                fill: "transparent",
                stroke: null,  // this is changed to "white" in the showPorts function
                desiredSize: new go.Size(8, 8),
                alignment: spot, alignmentFocus: spot,  // align the port on the main Shape
                portId: name,  // declare this object to be a "port"
                fromSpot: spot, toSpot: spot,  // declare where links may connect at this port
                fromLinkable: output, toLinkable: input,  // declare whether the user may draw links to/from here
                cursor: "pointer"  // show a different cursor to indicate potential link point
              });
  }

  /* 已完成 */
  myDiagram.nodeTemplateMap.add("completed",
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle",
        { fill: completedBg, stroke: null, portId: "", width: 300, height: 60, fromLinkable: true, cursor: "pointer", fromEndSegmentLength: 20}),
      $(go.TextBlock, "任务开始", textStyle(),
        new go.Binding("text", "text").makeTwoWay()), {click: function (e, node) {vm.contentShow = false;}},{
          click: function (e, node) {
            // vm.isThread = true;
            vm.goNode(node.Nd.key);
          }
        },
        makePort("T", go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, true, true),
        makePort("B", go.Spot.Bottom, true, false)
      ));

  /* 进行中 */
  myDiagram.nodeTemplateMap.add("conducc",
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle", { fill: conduccBg, stroke: null, width: 300, height: 60,  portId: "", toLinkable: true, toEndSegmentLength: 20 }),
      $(go.TextBlock, "任务完成", textStyle(), new go.Binding("text", "text").makeTwoWay()), {click: function (e, node) {vm.goNode(node.Nd.key);}},
      makePort("T", go.Spot.Top, false, true),
      makePort("L", go.Spot.Left, true, true),
      makePort("R", go.Spot.Right, true, true),
      makePort("B", go.Spot.Bottom, true, false)
      ));

  /* 已延期 */
  myDiagram.nodeTemplateMap.add("delay",
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle",
        { fill: delayBg, stroke: null, width: 300, height: 60,  portId: "", fromLinkable: true, toLinkable: true, cursor: "pointer",
          toEndSegmentLength: 20, fromEndSegmentLength: 20 }),
      $(go.TextBlock, "主线任务", textStyle(),
        new go.Binding("text", "text").makeTwoWay()),{ 
          click: function(e, node) {
            vm.goNode(node.Nd.key);
          }},
        makePort("T", go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, true, true),
        makePort("B", go.Spot.Bottom, true, false)
      ));

  /* 未开始 */
  myDiagram.nodeTemplateMap.add('unfinished',
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      /* 定义节点的外形，将环绕TextBlock */
      $(go.Shape, "RoundedRectangle",
        { fill: unfinishedBg, stroke: null, width: 300, height: 60, 
          portId: "", fromLinkable: true, toLinkable: true, cursor: "pointer",
          toEndSegmentLength: 20, fromEndSegmentLength: 20 }),
      $(go.TextBlock, "支线任务", {
        stroke: "#888",
        margin: 10,
        wrap: go.TextBlock.WrapFit,
        textAlign: "center",
        editable: false,
        font: "18px Helvetica, Arial, sans-serif"
      },
        new go.Binding("text", "text").makeTwoWay()),{ 
          click: function(e, node) {
            if(node.Nd.loc.substr(0, 2) !== '0 '){
              vm.goNode(node.Nd.key);
              // vm.isThread = false;
            }
          }},
          makePort("T", go.Spot.Top, false, true),
          makePort("L", go.Spot.Left, true, true),
          makePort("R", go.Spot.Right, true, true),
          makePort("B", go.Spot.Bottom, true, false)));

  // 在linktemplatemap替换默认的链接模板
  myDiagram.linkTemplate =
    $(go.Link, go.Link.Orthogonal,{ 
      corner: 3,
      routing: go.Link.AvoidsNodes,
      // routing: go.Link.Orthogonal,
      curve: go.Link.JumpOver,
      toShortLength: 4,
      relinkableFrom: true,
      relinkableTo: true,
      reshapable: true,
      resegmentable: true, 
    },
      $(go.Shape,  // the link shape
        { stroke: "#ccc", strokeWidth: 3 }),
      $(go.Shape,  // the arrowhead
        { toArrow: "kite", fill: "#ccc", stroke: null, scale: 1 })
  );


  document.getElementById('editable').onpaste=function(){paste_img(event);return false;};
  document.getElementById('editable').oninput = function () {
    // document.getElementById('editable').innerHTML = '';
  }

}

  function paste_img(e) {
    if ( e.clipboardData.items ) {
      console.log('support clipboardData.items(chrome ...)');
      ele = e.clipboardData.items
      for (var i = 0; i < ele.length; ++i) {
        if ( ele[i].kind == 'file' && ele[i].type.indexOf('image/') !== -1 ) {
          var blob = ele[i].getAsFile();
          console.log(blob)
          if(blob){
            var formData = new FormData();
            formData.append('file', blob);
            formData.append('fileFileName', blob.name);
            $.ajax({
              url: domain + '/fileUpload.html',
              type: 'post',
              data: formData,
              processData: false,
              contentType: false,
              success: function (res) {
                var res = res.url ? res : {url: '', flag: true};
                if(res.flag){
                  vm.content.stepInfo.screenshot = res.url;
                  // window.URL = window.URL || window.webkitURL;
                  // var blobUrl = window.URL.createObjectURL(blob);

                  // var new_img= document.createElement('img');
                  // new_img.setAttribute('src', blobUrl);
                  // var new_a= document.createElement('a');
                  // new_a.setAttribute('target', '_blank')
                  // new_a.setAttribute('href', res.url)
                  // new_a.appendChild(new_img)
                  // var new_img_intro = document.createElement('div');
                  // new_img_intro.setAttribute('class', 'newup')
                  // new_img_intro.innerHTML = '重新上传';
                  var date = new Date();
                  var year = date.getFullYear();
                  var month = (date.getMonth()+1) < 10 ? '0' + (date.getMonth()+1) : (date.getMonth()+1);
                  var day = date.getDate();
                  var hour = date.getHours();
                  var minute = date.getMinutes();
                  var second = date.getSeconds();
                  var completeDate = year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
                  vm.content.step.completeDate = completeDate;

                  // document.getElementById('editable').innerHTML = '';
                  // document.getElementById('editable').appendChild(new_a);
                  // document.getElementById('editable').appendChild(new_img_intro);
                  // document.getElementById('editable').setAttribute('contenteditable', false);
                  vm.nodeSave();
                }
              },
              error: function (e) {

              }
            })
          }
        }

      }
    } else {
      alert('non-chrome');
    }
  }

$(function () {
  $('body').on('click', '.newup', function () {
    // $('#editable').html('');
    // document.getElementById('editable').setAttribute('contenteditable', true);
    vm.content.stepInfo.screenshot = '';
    vm.content.step.completeDate = '';
  })
})