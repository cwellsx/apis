# To Do

## Now

Documentation

- How to make docs better for agents versus humans
- Should AGENTS tell the agent how to use the docs
- Index to link code to docs and vice versa and a rule

More documentation -- scavenge all other doc files e.g. `image/` has its own README

    packages\backend\README.md
    packages\backend\contracts\README.md
    packages\backend\contracts\app\MENUAPI.md
    packages\backend\contracts\ui\TODO.md
    packages\backend\src\OVERVIEW.md
    packages\backend\src\README.md
    packages\backend\src\image\README.md
    packages\backend\src\sqlDotNet\SQLAPI.md
    packages\backend-dotnet\TESTS.md
    packages\backend-dotnet\Core\NAMESPACES.md
    packages\backend-dotnet\Core\TODO.md
    packages\backend-dotnet\Core\Cecil\CompilerTypes.md
    packages\backend-dotnet\Core\Output\ID.md
    packages\backend-dotnet\Core\Serializer\SERIALIZATION.md
    packages\backend-dotnet\Core.Test\README.md
    packages\backend-test\README.md
    packages\electron-app\TODO.md
    packages\electron-app\src\renderer\TODO.md
    packages\electron-app\src\renderer\images.org\LICENSE.md
    packages\electron-app\src\renderer\images.org\README.md
    packages\electron-app\src\renderer\images.org\google.cursors\README.md
    packages\electron-forge-resource-plugin\CHANGELOG.md
    packages\sqlio\TODO.md
    packages\vscode-ext\vsc-extension-quickstart.md
    packages\vscode-ext\media\README.md
    packages\vscode-ext\src.webview\README.md

Package maintenance

- README
- Break link between VS Code extension and backend
- Update Electron
- Fix vulns
- Replace better_sqlite3
- Reconnect VS Code extension
- Integrate VS Code extension
- Revise packages\electron-forge-resource-plugin\README.md

New features

- Popup for nodes
- Shorten the full-name in popup -- don't repeat parent name
- Balance the popup -- no extra whitespace on one side
- Replace System.Void => void
- Show node type in TreeView

Implement "show called" filter on an edge

- E.g. there are 900 edges within Mono.Cecil all types => can't open it
- So open it, but hide all the ones which aren't called from Core
- Or open it, change its default visibility to hidden, and show all the ones which are called from Core

Implement "progressive open" filter on a node

- On open don't show edges between its internal nodes
- Only show edges from its internal nodes to external nodes
- Also hide internal nodes which don't have external connections
- Allow progressive open i.e. open all edges of specific node
- Requires prior knowledge of which nodes have external edges

Ancestry

- Implement the change described in ANCESTORS-KIND-PLAN.md
- Probably option B to begin
  - Clustered namespaces
  - Descendants of clustered namespaces
  - Clustered types
  - Descendants of clustered types
- Capture existing behavior before starting, for regression tests

Tests

- Capture some further details for regression testing e.g.
  - Popup details
  - Whether each node is visible
- Modify the test utilities and write new test suites
  - New test suites meaning new sequences of action to test end states
  - Regression testing means capturing and version controlling data
  - Normally an assert on state is enough but I might want to see state too

How to format the tooltip:

- Group by -- source, destination, none
- Compress groups -- join(",") instead of join("\n")
- Shorten identifiers -- remove prefix
- Simplest case (no grouping) is pairs with an arrow
- Use title= for native tooltip on shortened identifiers

## Near term

- Implement and test the appOptions round-trip -- font size and zoom
- Fix useEffect- Delete Panes.tsx and SplitPane and split-pane-react
- Debug - hourglass and prevent overlapping input events from user
- Implement - webkit api instead of setting em size to change zoom `const { webFrame } = require('electron'); webFrame.setZoomFactor(1.2);`
- Implement - add styles e.g. to distinguish synthetic groups from assemblies or namespaces
- Implement - assembly details and call graphs for Core data -- see e.g. MORE/DETAILS.md
- Make the display of namespace optional -- requires changing isParent

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
- `@src-id: ["./src/id"]`
- `@src-utils: ["./src/utils"]`

### https://github.com/caplin/FlexLayout

Use this to split the Electron window into areas.

## More

And `./MORE/*`
