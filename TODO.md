# To Do

## Now

Fix the handling of graphs

- Edit addImageMap -- use xmldom to insert synthetic polygons within the a of an edge
- Copy event-handler from VS Code extension into Electron
- In React use

xmldom

```ts
const { DOMParser, XMLSerializer } = require("xmldom");

const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");

const edgeGroup = doc.getElementById(edgeId);
const aElement = edgeGroup.getElementsByTagName("a")[0];

const polygon = doc.createElement("polygon");
polygon.setAttribute("class", "hit-edge");
polygon.setAttribute("points", pointsStr);

aElement.appendChild(polygon);

const output = new XMLSerializer().serializeToString(doc);
```

CSS

```css
.hit-edge:hover ~ path {
  stroke: red;
}
```

.NET

```c#
var doc = XDocument.Load("graph.svg");

XNamespace svg = "http://www.w3.org/2000/svg";
XNamespace xlink = "http://www.w3.org/1999/xlink";

var edgeGroup = doc.Descendants(svg + "g")
    .FirstOrDefault(g => (string)g.Attribute("id") == edgeId);

var aElement = edgeGroup.Descendants(svg + "a").First();

var pathElement = aElement.Element(svg + "path");

var polygon = new XElement(svg + "polygon",
    new XAttribute("class", "hit-edge"),
    new XAttribute("points", pointsStr),
    new XAttribute("data-edge-id", edgeId)
);

// Insert polygon *after* the path
pathElement.AddAfterSelf(polygon);

doc.Save("graph-with-hitareas.svg");
```

## Near term

- Remove xml-js
- Implement and test the appOptions round-trip -- font size and zoom
- Fix useEffect- Delete Panes.tsx and SplitPane and split-pane-react
- Debug - hourglass and prevent overlapping input events from user
- Implement - webit api instead of setting em size to change zoom `const { webFrame } = require('electron'); webFrame.setZoomFactor(1.2);`
- Implement - add styles e.g. to distinguish synthetic groups from assemblies or namespaces
- Implement - assembly details and call graphs for Core data -- see e.g. MORE/DETAILS.md

### Tooltips

Put the tooltip in a data-tooltip attribute of the hit-edge polygon in addImageMap.ts

Take this from the anchor in the SVG
or simplify the SVG by removing the tooltip and href attributes
and instead pass a tooltip dictionary into the addImageMap function.

Display the tooltip with an event handler like this

```ts
const tooltip = document.getElementById("tooltip");

svg.addEventListener("mousemove", (evt) => {
  const target = evt.target;

  if (target.classList.contains("hit-edge")) {
    const text = target.getAttribute("data-tooltip");
    tooltip.textContent = text;
    tooltip.style.left = evt.pageX + 10 + "px";
    tooltip.style.top = evt.pageY + 10 + "px";
    tooltip.style.display = "block";
  } else {
    tooltip.style.display = "none";
  }
});
```

```html
<div
  id="tooltip"
  style="
  position: absolute;
  background: #222;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  display: none;
"
></div>
```

### Graph options

I deleted the old graph options -- they were as follows -- these are ideas which could be reimplemented

```ts
export type ShowClustered = { clusterBy: ClusterBy; nestedClusters: boolean };

export type ShowEdgeLabels = { groups: boolean; leafs: boolean };

export type References = {
  graphType: "references";
  nestedClusters: boolean; // one element from ShowClustered
};

export type Methods = {
  graphType: "methods";
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
  methodId?: NodeId; // should be MethodNodeId but don't want all the nodeIds types shared with the renderer
};

export type Apis = {
  graphType: "apis";
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
  showInternalCalls: boolean;
};

type CustomBase = {
  graphType: "custom";
  showEdgeLabels: ShowEdgeLabels;
  // these are extra/random strings in the CustomNode.tags array which can be used to filter which nodes are shown
  tags: { tag: string; shown: boolean }[];
};

type CustomAuto = CustomBase & {
  readonly isAutoLayers: true;
  // these are the names of layers defined in all CustomNode.layer property
  readonly layers: string[];
};

// this is used when the JSON is created by hand and contains semi-random properties
export type CustomManual = CustomBase & {
  readonly isAutoLayers: false;
  // these are extra/random properties added to CustomNode, any one of which can be used to specify layers
  nodeProperties: string[];
  // this optionally contains one element which the yser select from nodeProperties
  // it's an array so that if the UI were more complicated then the user could specify more than one level of layering
  clusterBy: string[];
};
```

## Other ideas to do sometime

### Backend alias

Create tsconfig.paths.json

Reference it using `extends` in the tsconfig.json of other projects like backend-test

Use it to define path aliases using `paths`

- `@contracts-app: ["./contracts/app"]`
- `@src-id: ["./src/id2"]`
- `@src-utils: ["./src/utils"]`

### https://github.com/caplin/FlexLayout

Use this to split the Electron window into areas.

## More

And `./MORE/*`
