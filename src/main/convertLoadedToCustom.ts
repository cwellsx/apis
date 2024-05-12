import { CustomViewOptions, Leaf, Node, Parent, ViewGraph } from "../shared-types";
import { convertToImage } from "./convertToImage";
import { CustomNode } from "./customJson";
import { log } from "./log";
import { Edge } from "./shared-types";

export const convertLoadedToCustom = (nodes: CustomNode[], viewOptions: CustomViewOptions): ViewGraph => {
  log("convertLoadedToView");
  const leafs: { [id: string]: Leaf } = {};

  const tags: { [index: string]: boolean } = {};
  viewOptions.tags.forEach((element) => (tags[element.tag] = element.shown));

  const hiddenNodeIds = new Set<string>();

  // do the Leaf[] first to determine which are hidden
  nodes.forEach((node) => {
    if (node.tags?.some((tag) => !tags[tag])) hiddenNodeIds.add(node.id);
    else
      leafs[node.id] = {
        label: node.label ?? node.id,
        id: node.id,
        parent: null,
      };
  });

  // next do the Edge[]
  const edges: Edge[] = [];
  nodes.forEach((node) => {
    node.dependencies
      .filter((dependency) => !hiddenNodeIds.has(dependency.id))
      .forEach((dependency) => {
        const booleans: string[] = [];
        Object.entries(dependency).forEach(([key, value]) => {
          if (value === true) booleans.push(key);
        });
        edges.push({
          clientId: node.id,
          serverId: dependency.id,
          label: dependency.label + (booleans.length ? `(${booleans.join(", ")})` : ""),
        });
      });
  });

  // next do the group
  const groupedBy = viewOptions.groupedBy.length ? viewOptions.groupedBy[0] : undefined;
  const groups: Node[] = [];
  if (groupedBy) {
    const parents: { [id: string]: Parent } = {};
    nodes.forEach((node) => {
      let groupName = node[groupedBy];
      const leaf = leafs[node.id];
      if (!groupName) {
        groups.push(leaf);
        return;
      }
      groupName = "" + groupName;
      let parent: Parent = parents[groupName];
      if (!parent) {
        parent = { label: groupName, id: `!${groupedBy}!${groupName}`, parent: null, children: [] };
        groups.push(parent);
        parents[groupName] = parent;
      }
      parent.children.push(leaf);
      leaf.parent = parent;
    });
  } else groups.push(...Object.values(leafs));

  const image = convertToImage(groups, edges, viewOptions);
  return { groups, image, viewOptions };
};
