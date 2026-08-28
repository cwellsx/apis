These are the changes made recently.

`ImageNode` now contains `Node` -- instead of containing label, id, className

The following ImageAttribute type is deleted.
In future these should be self-contained within the image module instead of being specified by the model.

```ts
export type Shape = "folder" | "rect" | "none" | "component";

export type ImageAttribute = {
  // used for leafs and for non-expanded groups
  shape?: Shape;
  // used for clusters i.e. for expanded groups -- https://graphviz.org/docs/attr-types/style/
  style?: "rounded";
  // if this is defined then this is the label and label is the tooltip
  shortLabel?: string;
  tooltip?: string;
  className?: AreaClass;
};
```

For custom nodes the optional user-specified shape attribute in CustomNode should be carried into the ImageAttribute.

Some shapes set by default for non-custom nodes.

```ts
const methodAttributes: ImageAttribute = { shape: "none" };
const typeAttributes: ImageAttribute = { shape: "folder", style: "rounded" };
```

shortLeafNames is true if graphViewOptions.isAutoLayers in the custom options, or graphViewOptions.nestedClusters in the references options -- perhaps it should always be true

The leaf details of references are disabled for Microsoft assemblies.
The internal implementation of these assemblies are not disassembled, only the signatures of methods that are referenced by the application.

```ts
Object.entries(leafs).forEach(([key, node]) => {
  if (!known.includes(key)) imageAttributes.set(node.nodeId, { shape: "none", className: "leaf-none" });
});
```

Set the className

```ts
const textNode: ImageText = {
  id: nodeIdToText(nodeId),
  label: node.label,
  className:
    (imageAttribute.className ?? isParent(node))
      ? isGroupExpanded(nodeId)
        ? "expanded"
        : "closed"
      : details.includes("leaf")
        ? "leaf-details"
        : "leaf-none",
  ...imageAttribute,
};
```

Shorten the label on the image if it begins like its parent

```ts
// implement this option here to affect the label on the image but not in the tree of groups
if (
  shortLeafNames &&
  options.shortLeafNames &&
  node.parent &&
  !metaGroupLabels.includes(node.parent.label) &&
  (!isParent(node) || !isGroupExpanded(nodeId))
) {
  if (!node.label.startsWith(node.parent.label)) {
    if (viewOptions.graphType == "references") throw new Error("Unexpected parent node name");
    // else this is a sublayer so do nothing
  } else textNode.shortLabel = "*" + node.label.substring(node.parent.label.length);
}
```

The new presenter/createImageData is like and based on output/helpers/convertToImage

These predefined groups should be added and will affect image attributes

```ts
const metaGroupLabels = [".NET", "3rd-party"];
```
