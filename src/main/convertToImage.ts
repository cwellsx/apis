import type { GroupNode, Groups, Image, LeafNode, ParentNode, ViewOptions, ViewType } from "../shared-types";
import { isParent } from "../shared-types";
import { createImage, type ImageData, type Node as ImageNode } from "./createImage";
import { log } from "./log";
import type { Edge, StringPredicate } from "./shared-types";
import { options } from "./shared-types";

type Nodes = Groups | LeafNode[];

const createLookup = (array: string[]): StringPredicate => {
  const temp = new Set(array);
  return (id: string) => temp.has(id);
};

export function convertToImage(
  groups: Groups,
  leafs: LeafNode[],
  edges: Edge[],
  viewOptions: ViewOptions
): Image | string {
  const { leafVisible, groupExpanded } = viewOptions;
  const isLeafVisible = createLookup(leafVisible);
  const isGroupExpanded = createLookup(groupExpanded);
  const nodes = viewOptions.showGrouped ? groups : leafs;
  log("convertToImage");
  const imageData = convertToImageData(
    nodes,
    edges,
    isLeafVisible,
    isGroupExpanded,
    viewOptions.showGrouped,
    viewOptions.viewType
  );
  log("createImage");
  return imageData.edges.length || imageData.nodes.length ? createImage(imageData) : "Empty graph, no nodes to display";
}

export function convertToImageData(
  nodes: Nodes,
  edges: Edge[],
  isLeafVisible: StringPredicate,
  isGroupExpanded: StringPredicate,
  showGrouped: boolean,
  viewType: ViewType
): ImageData {
  // create a Map to say which leaf nodes are closed by which non-expanded parent nodes
  const closed = new Map<string, string>();
  if (showGrouped) {
    const findClosed = (node: GroupNode, isClosedBy: ParentNode | null): void => {
      if (isParent(node)) {
        if (!isClosedBy && !isGroupExpanded(node.id)) isClosedBy = node;
        node.children.forEach((child) => findClosed(child, isClosedBy));
      } else if (isClosedBy) closed.set(node.id, isClosedBy.id);
    };
    nodes.forEach((node) => findClosed(node, null));
  } // else none of the leaf nodes are hidden within closed groups

  const makeEdgeId = (clientId: string, serverId: string): string => `${clientId}|${serverId}`;
  const fromEdgeId = (edgeId: string): { clientId: string; serverId: string } => {
    const split = edgeId.split("|");
    return { clientId: split[0], serverId: split[1] };
  };

  // create groups of visible edges
  const edgeGroups = new Map<string, Edge[]>();
  edges
    .filter((edge) => isLeafVisible(edge.clientId) && isLeafVisible(edge.serverId))
    .forEach((edge) => {
      const clientId = closed.get(edge.clientId) ?? edge.clientId;
      const serverId = closed.get(edge.serverId) ?? edge.serverId;
      if (options.noSelfEdges && clientId == serverId) return;
      const edgeId = makeEdgeId(clientId, serverId);
      const found = edgeGroups.get(edgeId);
      if (found) found.push(edge);
      else edgeGroups.set(edgeId, [edge]);
    });

  const edgeIds: string[] = [...edgeGroups.keys()];

  // whether a group is visible depends on whether it contains visible leafs
  const isGroupNodeVisible = (node: GroupNode): boolean =>
    showGrouped
      ? isParent(node)
        ? node.children.some((child) => isGroupNodeVisible(child))
        : isLeafVisible(node.id)
      : !isParent(node) && isLeafVisible(node.id);

  const metaGroupLabels = [".NET", "3rd-party"];
  const toImageNode = (node: GroupNode): ImageNode => {
    const textNode = { id: node.id, label: node.label };
    // implement this option here to affect the label on the image but not in the tree of groups
    if (
      showGrouped &&
      options.shortLeafNames &&
      node.parent &&
      !metaGroupLabels.includes(node.parent.label) &&
      (!isParent(node) || !isGroupExpanded(node.id))
    ) {
      if (!node.label.startsWith(node.parent.label)) {
        if (viewType == "references") throw new Error("Unexpected parent node name");
        // else this is a sublayer so do nothing
      } else textNode.label = "*" + node.label.substring(node.parent.label.length);
    }
    return !isParent(node)
      ? { type: "node", ...textNode }
      : !isGroupExpanded(node.id)
      ? { type: "group", ...textNode }
      : { type: "subgraph", ...textNode, children: toImageNodes(node.children) };
  };

  const toImageNodes = (nodes: Nodes): ImageNode[] => nodes.filter(isGroupNodeVisible).map(toImageNode);

  return {
    nodes: toImageNodes(nodes),
    edges: edgeIds.map((edgeId) => {
      return { edgeId, ...fromEdgeId(edgeId) };
    }),
  };
}
