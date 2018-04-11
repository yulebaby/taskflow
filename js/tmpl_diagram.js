function init() {
  if (window.goSamples) goSamples();  // init for these samples -- you don't need to call this
  var $ = go.GraphObject.make;  // for conciseness in defining templates

  /* 定义初始化颜色 */
  var mainBg = $(go.Brush, "Linear", { 0: "#01a6ff", 1: "#01a6ff" });
  var endBg = $(go.Brush, "Linear", { 0: "#ffdc2a", 1: "#ffdc2a" });
  var startBg = $(go.Brush, "Linear", { 0: "#417bf6", 1: "#417bf6" });
  var redgrad = $(go.Brush, "Linear", { 0: "#C45245", 1: "#871E1B" });
  var fromBg = $(go.Brush, "Linear", { 0: "#ffc51c", 1: "#ffc51c" });

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
    maxScale: 1,
    layout: $(go.LayeredDigraphLayout, { isInitial: false, isOngoing: false, layerSpacing: 50, angle: 90}),
    "undoManager.isEnabled": true,
    "ModelChanged": function(e) { if(vm){vm.contentShow = false;} }
  });

  /* 当文件被修改，添加一个“*”的称号，使“保存”按钮 */
  myDiagram.addDiagramListener("Modified", function(e) {
    var button = document.getElementById("SaveButton");
    if (button) button.disabled = !myDiagram.isModified;
    var idx = document.title.indexOf("*");
    if (myDiagram.isModified) {
      if (idx < 0) document.title += "*";
    } else {
      if (idx >= 0) document.title = document.title.substr(0, idx);
    }
  });


  /* 
   * 定义模板节点
   */
  function makePort(name, spot, output, input) {
    // the port is basically just a small circle that has a white stroke when it is made visible
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

  /* 开始节点 */
  myDiagram.nodeTemplateMap.add("startComment",
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle",
        { fill: startBg, stroke: null, portId: "", width: 300, height: 60, fromLinkable: true, cursor: "pointer", fromEndSegmentLength: 20}),
      $(go.TextBlock, "任务开始", textStyle(),
        new go.Binding("text", "text").makeTwoWay()), {click: function (e, node) {vm.contentShow = false;}},
        makePort("T", go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, true, true),
        makePort("B", go.Spot.Bottom, true, false)
      ));

  /* 结束节点 */
  myDiagram.nodeTemplateMap.add("endComment",
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle", { fill: endBg, stroke: null, width: 300, height: 60,  portId: "", toLinkable: true, toEndSegmentLength: 20 }),
      $(go.TextBlock, "任务完成", textStyle(), new go.Binding("text", "text").makeTwoWay()), {click: function (e, node) {vm.contentShow = false;}},
      makePort("T", go.Spot.Top, false, true),
      makePort("L", go.Spot.Left, true, true),
      makePort("R", go.Spot.Right, true, true),
      makePort("B", go.Spot.Bottom, true, false)
      ));

  /* 一级节点 */
  myDiagram.nodeTemplateMap.add("oneComment",
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle",
        { fill: mainBg, stroke: null, width: 300, height: 60,  portId: "", fromLinkable: true, toLinkable: true, cursor: "pointer",
          toEndSegmentLength: 20, fromEndSegmentLength: 20 }),
      $(go.TextBlock, "主线任务", textStyle(),
        new go.Binding("text", "text").makeTwoWay()),{ 
          click: function(e, node) {
            if(node.Nd.loc.substr(node.Nd.loc.length - 2, 2) !== ' 0'){
              /* 直接隐藏节点详情 */
              vm.goNode(node.Nd.key);
              var json = JSON.parse(myDiagram.model.toJson());
              var nodeData = json.nodeDataArray,
                  nodeLink = json.linkDataArray;
              /* 循环 连线 数组 判断是否有子节点 */
              for(var j = 0; j < nodeLink.length; j++){
                /* 如果该节点 nodeData[i] 有子节点 */
                if(nodeLink[j].from == node.Nd.key){
                  /* 设置该一级节点 没有详情 */
                  vm.isThread = true;
                  /* 再次循环 全部节点 判断子节点是不是一级或者结束 */
                  for(var l = 0; l < nodeData.length; l++){
                    /* 获取到子节点 */
                    if(nodeLink[j].to == nodeData[l].key){
                      /* 判断该子节点是不是二级 */
                      if(nodeData[l].category == 'twoComment'){
                        /* 如果有二级节点,直接跳出循环禁止点击 */
                        vm.isThread = true;
                        break;
                      }else{
                        /* 判断该子节点是不是一级或者结束 */
                        if(nodeData[l].category == 'endComment' || nodeData[l].category == 'oneComment'){
                          vm.isThread = false;
                        }
                      }
                    }
                  }
                  /* 如果循环连线的子节点有一个二级直接取消剩余循环 */
                  if(vm.isThread){
                    break;
                  }
                }
              }
            }
          }},
        makePort("T", go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, true, true),
        makePort("B", go.Spot.Bottom, true, false)
      ));

  /* 二级节点 */
  myDiagram.nodeTemplateMap.add('twoComment',
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      /* 定义节点的外形，将环绕TextBlock */
      $(go.Shape, "RoundedRectangle",
        { fill: fromBg, stroke: null, width: 300, height: 60, 
          portId: "", fromLinkable: true, toLinkable: true, cursor: "pointer",
          toEndSegmentLength: 20, fromEndSegmentLength: 20 }),
      $(go.TextBlock, "支线任务", textStyle(),
        new go.Binding("text", "text").makeTwoWay()),{ 
          click: function(e, node) {
            if(node.Nd.loc.substr(node.Nd.loc.length - 2, 2) !== ' 0'){
              vm.goNode(node.Nd.key);
              vm.isThread = false;
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

  /* 左侧模板栏 */
  var palette =
    $(go.Palette, "palette",  // 创建一个新的调色板在HTML div元素的“调色板”
      {
        nodeTemplateMap: myDiagram.nodeTemplateMap,
        autoScale: go.Diagram.Uniform  // 所有的东西都适合在视口
      });

  palette.model.nodeDataArray = [
    { category: "startComment" },
    { category: "oneComment" },
    { category: "twoComment" },
    { category: "endComment" },
  ];
}