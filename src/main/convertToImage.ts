import type { GraphViewOptions, GroupedLabels, Image, Node, NodeId } from "../shared-types";
import {
  NodeIdMap,
  createLookupNodeId,
  fromEdgeId,
  isParent,
  joinLabel,
  makeEdgeId,
  nodeIdToText,
} from "../shared-types";
import type { ImageAttribute, ImageData, ImageNode, ImageText } from "./createImage";
import { createImage } from "./createImage";
import { log } from "./log";
import type { Edge } from "./shared-types";
import { options } from "./shared-types";

export function convertToImage(
  nodes: Node[],
  edges: Edge[],
  viewOptions: GraphViewOptions,
  imageAttributes?: NodeIdMap<ImageAttribute>,
  groupedLabels?: GroupedLabels
): Image | string {
  const { leafVisible, groupExpanded } = viewOptions;
  const isLeafVisible = createLookupNodeId(leafVisible);
  const isGroupExpanded = createLookupNodeId(groupExpanded);

  // assert the id are unique -- if they're not then CheckboxTree will throw an exception in the renderer
  // also assert that the parent fields are set correctly
  const allNodeIds = new Set<string>();
  // also take this opportunity to initialize
  const allNodes = new NodeIdMap<Node>();

  const assertUnique = (node: Node): void => {
    const stringId = nodeIdToText(node.nodeId);
    if (allNodeIds.has(stringId)) {
      throw new Error(`Duplicate node id: ${stringId}`);
    }
    allNodeIds.add(stringId);
    const nodeId = node.nodeId;
    allNodes.set(nodeId, node);
    if (isParent(node)) {
      node.children.forEach((child) => {
        assertUnique(child);
        if (child.parent !== node) {
          throw new Error(`Unexpected parent of: ${nodeId}`);
        }
      });
    }
  };
  nodes.forEach(assertUnique);

  // create a Map to say which leaf nodes are closed by which non-expanded parent nodes
  const closed = new NodeIdMap<NodeId>();

  const findClosed = (node: Node, isClosedByParentId: NodeId | null): void => {
    const id = node.nodeId;
    if (isParent(node)) {
      if (!isClosedByParentId && !isGroupExpanded(id)) isClosedByParentId = id;
      node.children.forEach((child) => findClosed(child, isClosedByParentId));
    } else if (isClosedByParentId) closed.set(id, isClosedByParentId);
  };
  nodes.forEach((node) => findClosed(node, null));

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
  const isGroupNodeVisible = (node: Node): boolean =>
    isParent(node) ? node.children.some((child) => isGroupNodeVisible(child)) : isLeafVisible(node.nodeId);

  const metaGroupLabels = [".NET", "3rd-party"];

  const toImageNode = (node: Node): ImageNode => {
    const nodeId = node.nodeId;

    const imageAttribute: ImageAttribute = imageAttributes?.get(nodeId) ?? {};

    const textNode: ImageText = {
      id: nodeIdToText(nodeId),
      label: node.label,
      className: isParent(node) ? (isGroupExpanded(nodeId) ? "expanded" : "closed") : "leaf",
      ...imageAttribute,
    };

    // implement this option here to affect the label on the image but not in the tree of groups
    if (
      options.shortLeafNames &&
      node.parent &&
      !metaGroupLabels.includes(node.parent.label) &&
      (!isParent(node) || !isGroupExpanded(nodeId))
    ) {
      if (!node.label.startsWith(node.parent.label)) {
        if (viewOptions.viewType == "references") throw new Error("Unexpected parent node name");
        // else this is a sublayer so do nothing
      } else textNode.label = "*" + node.label.substring(node.parent.label.length);
    }

    return !isParent(node)
      ? { type: "node", ...textNode }
      : !isGroupExpanded(nodeId)
      ? { type: "group", ...textNode }
      : { type: "subgraph", ...textNode, children: toImageNodes(node.children) };
  };

  const toImageNodes: (nodes: Node[]) => ImageNode[] = (nodes) => nodes.filter(isGroupNodeVisible).map(toImageNode);

  const imageNodes: { [nodeId: string]: ImageNode } = {};
  toImageNodes(nodes).forEach((imageNode) => (imageNodes[imageNode.id] = imageNode));

  const imageData: ImageData = {
    nodes: imageNodes,
    edges: edgeIds.map((edgeId) => {
      const edges = edgeGroups.get(edgeId);
      const labels: string[] = [];
      edges?.forEach((edge) => {
        const isGroupedEdge = edgeId !== makeEdgeId(edge.clientId, edge.serverId);
        // no need to show the serverLabel unless this is a group of edges
        const label = !isGroupedEdge
          ? edge.label
          : !groupedLabels
          ? undefined
          : joinLabel(
              groupedLabels.serverLabel,
              allNodes.getOrThrow(edge.serverId).label,
              groupedLabels.edgeLabel,
              edge.label
            );
        if (label) labels.push(label);
      });
      return { edgeId, ...fromEdgeId(edgeId), labels };
    }),
  };

  log("createImage");
  return imageData.edges.length || imageData.nodes.length ? createImage(imageData) : "Empty graph, no nodes to display";
}
