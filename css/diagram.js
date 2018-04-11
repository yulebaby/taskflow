function init() {
  if (window.goSamples) goSamples();  // init for these samples -- you don't need to call this
  var $ = go.GraphObject.make;  // for conciseness in defining templates

  /* 定义初始化颜色 */
  var yellowgrad = $(go.Brush, "Linear", { 0: "rgb(254, 201, 0)", 1: "rgb(254, 162, 0)" });
  var greengrad = $(go.Brush, "Linear", { 0: "#98FB98", 1: "#9ACD32" });
  var bluegrad = $(go.Brush, "Linear", { 0: "#B0E0E6", 1: "#87CEEB" });
  var redgrad = $(go.Brush, "Linear", { 0: "#C45245", 1: "#871E1B" });
  var whitegrad = $(go.Brush, "Linear", { 0: "#F0F8FF", 1: "#E6E6FA" });

  /* 定义字体 */
  var bigfont = "11pt Helvetica, Arial, sans-serif";
  var smallfont = "11pt Helvetica, Arial, sans-serif";

  /* 定义样式 */
  function textStyle() {
    return {
      margin: 6,
      wrap: go.TextBlock.WrapFit,
      textAlign: "center",
      editable: false,
      font: bigfont
    }
  }

  myDiagram = $(go.Diagram, "myDiagramDiv", {
        // have mouse wheel events zoom in and out instead of scroll up and down
        "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,    // 是否开启鼠标滚轮改变大小
        allowDrop: true,  // support drag-and-drop from the Palette
        // "grid.visible": true,
        // "grid.gridCellSize": new go.Size(50, 50),
        
        initialAutoScale: go.Diagram.Uniform,
        "linkingTool.direction": go.LinkingTool.ForwardsOnly,
        initialContentAlignment: go.Spot.Center,
        layout: $(go.LayeredDigraphLayout, { isInitial: false, isOngoing: false, layerSpacing: 50, angle: 90 }),
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
  // Define a function for creating a "port" that is normally transparent.
  // The "name" is used as the GraphObject.portId, the "spot" is used to control how links connect
  // and where the port is positioned on the node, and the boolean "output" and "input" arguments
  // control whether the user can draw links from or to the port.
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
        { fill: bluegrad, portId: "", fromLinkable: true, cursor: "pointer", fromEndSegmentLength: 20}),
      $(go.TextBlock, "任务开始", textStyle(),
        new go.Binding("text", "text").makeTwoWay()), {click: function (e, node) {vm.contentShow = false;}},{
          click: function (e, node) {
            vm.isThread = true;
            vm.goNode(node.Nd.key, true);
          }
        },
        makePort("T", go.Spot.Top, false, true),
        makePort("L", go.Spot.Left, true, true),
        makePort("R", go.Spot.Right, true, true),
        makePort("B", go.Spot.Bottom, true, false)
      ));

  /* 结束节点 */
  myDiagram.nodeTemplateMap.add("endComment",
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "RoundedRectangle", { fill: greengrad, portId: "", toLinkable: true, toEndSegmentLength: 20 }),
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
      $(go.Shape, "Rectangle",
        { fill: yellowgrad, portId: "", fromLinkable: true, toLinkable: true, cursor: "pointer",
          toEndSegmentLength: 20, fromEndSegmentLength: 20, }),
      $(go.TextBlock, "主线任务", textStyle(),
        new go.Binding("text", "text").makeTwoWay()),{ 
          click: function(e, node) {
            if(node.Nd.loc.substr(0, 2) !== '0 '){
              /* 直接隐藏节点详情 */
              vm.goNode(node.Nd.key, false);
              var json = JSON.parse(myDiagram.model.toJson());
              var nodeData = json.nodeDataArray,
                  nodeLink = json.linkDataArray;
              var isClick = false;
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
      $(go.Shape, "Rectangle",
        { fill: whitegrad, stroke: "black",
          portId: "", fromLinkable: true, toLinkable: true, cursor: "pointer",
          toEndSegmentLength: 20, fromEndSegmentLength: 20 }),
      $(go.TextBlock, "支线任务",
        { margin: 6,
          font: bigfont,
          editable: false },
        new go.Binding("text", "text").makeTwoWay()),{ 
          click: function(e, node) {
            if(node.Nd.loc.substr(0, 2) !== '0 '){
              vm.goNode(node.Nd.key, false);
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
        { stroke: "#2F4F4F", strokeWidth: 3 }),
      $(go.Shape,  // the arrowhead
        { toArrow: "kite", fill: "#2F4F4F", stroke: null, scale: 1 })
  );

  /* 左侧模板栏 */
  var palette =
    $(go.Palette, "palette",  // 创建一个新的调色板在HTML div元素的“调色板”
      {
        // 用调色板共享模板图
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

function layout() {
  myDiagram.layoutDiagram(true);
}

// Show the diagram's model in JSON format
function save() {
  console.log(myDiagram.model.toJson());
  myDiagram.isModified = false;
}
function load(val) {
  myDiagram.model = go.Model.fromJson(val);
}