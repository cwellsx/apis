import type { CustomViewOptions, GraphFilter, Leaf, Node, NodeId, Parent, ViewGraph } from "../shared-types";
import { groupByNodeId, isCustomManual, isParent, nameNodeId } from "../shared-types";
import { createNestedClusters } from "./convertNamesToNodes";
import { convertToImage } from "./convertToImage";
import type { ImageAttribute, Shape } from "./createImage";
import { CustomNode } from "./customJson";
import { log } from "./log";
import { Edges, last, NodeIdMap, options } from "./shared-types";
import { getOrThrow } from "./shared-types/remove";

export const convertLoadedToCustom = (
  nodes: CustomNode[],
  graphViewOptions: CustomViewOptions,
  graphFilter: GraphFilter
): ViewGraph => {
  log("convertLoadedToView");

  const tags = new Map<string, boolean>(graphViewOptions.tags.map(({ tag, shown }) => [tag, shown]));
  const leafNodeId = (id: string): NodeId => nameNodeId("customLeaf", id);
  const isCustomFolders = !isCustomManual(graphViewOptions) && graphViewOptions.isAutoLayers && options.customFolders;
  const isCustomFolder = (node: CustomNode) => isCustomFolders && node.id == node.layer;
  const folderNodeId = (id: string): NodeId => nameNodeId("customFolder", id);
  const hiddenNodeIds = new Set<string>();
  const leafNodes = new Map<string, Leaf>();
  const imageAttributes = new NodeIdMap<ImageAttribute>();

  // do the Leaf[] first to determine which are hidden
  nodes.forEach((node) => {
    if (node.tags?.some((tag) => !tags.get(tag))) {
      hiddenNodeIds.add(node.id);
      return;
    }
    const leaf = !isCustomFolder(node)
      ? { label: node.label ?? node.id, nodeId: leafNodeId(node.id), parent: null }
      : { label: last(node.id.split("/")), nodeId: folderNodeId(node.id), parent: null };
    leafNodes.set(node.id, leaf);
    if (node.shape) {
      const shape: Shape = node.shape as Shape;
      imageAttributes.set(leaf.nodeId, { shape, tooltip: node.label });
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
        const clientId = isCustomFolder(node) ? folderNodeId(node.id) : leafNodeId(node.id);
        edges.add(clientId, leafNodeId(dependency.id), label);
      });
  });

  // next do the group
  const roots: Node[] = [];

  if (graphViewOptions.isAutoLayers) {
    const { groups, leafs } = createNestedClusters(graphViewOptions.layers.sort(), "group", "/");
    nodes.forEach((node) => {
      const leaf = leafs[node.layer ?? ""];
      const customNode = getOrThrow(leafNodes, node.id);
      if (isCustomFolder(node)) {
        // don't insert the customNode as a child
        // instead mutate the container so that it mimics/replaces the customNode
        leaf.nodeId = customNode.nodeId;
        leaf.label = customNode.label;
      } else {
        const convertToParent = (node: Node): Parent => {
          if (isParent(node)) return node;
          const parent = leaf as Parent;
          parent["children"] = [];
          return parent;
        };
        const parent = convertToParent(leaf);
        parent.children.push(customNode);
        customNode.parent = parent;
      }
    });
    roots.push(...groups);
  } else {
    const groupedBy = graphViewOptions.clusterBy.length ? graphViewOptions.clusterBy[0] : undefined;
    if (groupedBy) {
      const parents: { [id: string]: Parent } = {};
      nodes.forEach((node) => {
        let groupName = node[groupedBy];
        const leaf = getOrThrow(leafNodes, node.id);
        if (!groupName) {
          roots.push(leaf);
          return;
        }
        groupName = "" + groupName;
        let parent: Parent = parents[groupName];
        if (!parent) {
          parent = { label: groupName, nodeId: groupByNodeId(groupedBy, groupName), parent: null, children: [] };
          roots.push(parent);
          parents[groupName] = parent;
        }
        parent.children.push(leaf);
        leaf.parent = parent;
      });
    } else roots.push(...Object.values(leafNodes));
  }

  roots.sort((x, y) => x.label.localeCompare(y.label));

  const image = convertToImage(
    roots,
    edges.values(),
    graphViewOptions,
    graphFilter,
    graphViewOptions.isAutoLayers,
    imageAttributes
  );
  return { groups: roots, image, graphViewOptions, graphFilter };
};
