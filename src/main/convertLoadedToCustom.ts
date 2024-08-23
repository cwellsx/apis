import type { CustomViewOptions, GraphFilter, Leaf, Node, NodeId, Parent, ViewGraph } from "../shared-types";
import { groupByNodeId, isParent, nameNodeId } from "../shared-types";
import { createNestedClusters } from "./convertNamesToNodes";
import { convertToImage } from "./convertToImage";
import type { ImageAttribute, Shape } from "./createImage";
import { CustomNode } from "./customJson";
import { log } from "./log";
import { Edges, NodeIdMap } from "./shared-types";
import { getOrThrow } from "./shared-types/remove";

export const convertLoadedToCustom = (
  nodes: CustomNode[],
  graphViewOptions: CustomViewOptions,
  graphFilter: GraphFilter
): ViewGraph => {
  log("convertLoadedToView");

  const tags = new Map<string, boolean>(graphViewOptions.tags.map(({ tag, shown }) => [tag, shown]));
  const leafNodeId = (id: string): NodeId => nameNodeId("customLeaf", id);
  const hiddenNodeIds = new Set<string>();
  const leafs = new Map<string, Leaf>();
  const imageAttributes = new NodeIdMap<ImageAttribute>();

  // do the Leaf[] first to determine which are hidden
  nodes.forEach((node) => {
    if (node.tags?.some((tag) => !tags.get(tag))) hiddenNodeIds.add(node.id);
    else {
      const nodeId = leafNodeId(node.id);
      leafs.set(node.id, { label: node.label ?? node.id, nodeId, parent: null });
      if (node.shape) {
        const shape: Shape = node.shape as Shape;
        imageAttributes.set(nodeId, { shape });
      }
    }
  });

  // next do the Edge[]
  const edges = new Edges();
  nodes.forEach((node) => {
    node.dependencies
      .filter((dependency) => !hiddenNodeIds.has(dependency.id))
      .forEach((dependency) => {
        // create an optional label
        const booleans: string[] = [];
        Object.entries(dependency).forEach(([key, value]) => {
          if (value === true) booleans.push(key);
        });

        const label = dependency.label;

        edges.add(leafNodeId(node.id), leafNodeId(dependency.id), label);
      });
  });

  // next do the group
  const groups: Node[] = [];

  if (graphViewOptions.isAutoLayers) {
    const result = createNestedClusters(graphViewOptions.layers.sort(), "group", "/");
    nodes.forEach((node) => {
      const leaf = result.leafs[node.layer ?? ""];
      const convertToParent = (node: Node): Parent => {
        if (isParent(node)) return node;
        const parent = leaf as Parent;
        parent["children"] = [];
        return parent;
      };
      const parent = convertToParent(leaf);
      const customNode = getOrThrow(leafs, node.id);
      parent.children.push(customNode);
      customNode.parent = parent;
    });
    groups.push(...result.groups);

    // const parents = new Map<string, Parent>(
    //   graphViewOptions.layers.map((id) => [
    //     id,
    //     { label: id, nodeId: nameNodeId("group", id), parent: null, children: [] },
    //   ])
    // );
    // nodes.forEach((node) => {
    //   const leaf = getOrThrow(leafs, node.id);
    //   const parent = parents.get(node.layer ?? "") ?? parents.get(node.id);
    //   if (parent) {
    //     leaf.parent = parent;
    //     parent.children.push(leaf);
    //   } else groups.push(leaf);
    // });
    // groups.push(...parents.values());
  } else {
    const groupedBy = graphViewOptions.clusterBy.length ? graphViewOptions.clusterBy[0] : undefined;
    if (groupedBy) {
      const parents: { [id: string]: Parent } = {};
      nodes.forEach((node) => {
        let groupName = node[groupedBy];
        const leaf = getOrThrow(leafs, node.id);
        if (!groupName) {
          groups.push(leaf);
          return;
        }
        groupName = "" + groupName;
        let parent: Parent = parents[groupName];
        if (!parent) {
          parent = { label: groupName, nodeId: groupByNodeId(groupedBy, groupName), parent: null, children: [] };
          groups.push(parent);
          parents[groupName] = parent;
        }
        parent.children.push(leaf);
        leaf.parent = parent;
      });
    } else groups.push(...Object.values(leafs));
  }

  groups.sort((x, y) => x.label.localeCompare(y.label));

  const image = convertToImage(
    groups,
    edges.values(),
    graphViewOptions,
    graphFilter,
    graphViewOptions.isAutoLayers,
    imageAttributes
  );
  return { groups, image, graphViewOptions, graphFilter };
};
