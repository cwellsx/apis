import type { GraphViewOptions, GroupedLabels, Image, Node, NodeId } from "../shared-types";
import { NodeIdMap, createLookupNodeId, isParent, makeEdgeId, nodeIdToText } from "../shared-types";
import type { ImageAttribute, ImageData, ImageNode, ImageText } from "./createImage";
import { createImage } from "./createImage";
import { log } from "./log";
import type { Edge } from "./shared-types";
import { Edges, options } from "./shared-types";

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
  // parent is the displayed but non-expanded parent
  // child is its immediate child which is the leaf or perhaps the ancestor of the leaf
  const closedBy = new NodeIdMap<{ parent: NodeId; child: NodeId }>();
  const findClosed = (node: Node, isClosedBy: { parent: NodeId; child: NodeId } | null): void => {
    const id = node.nodeId;
    if (isParent(node)) {
      const isClosed = !isClosedBy && !isGroupExpanded(id);
      node.children.forEach((child) =>
        findClosed(child, isClosedBy ?? (isClosed ? { parent: id, child: child.nodeId } : null))
      );
    } else if (isClosedBy) closedBy.set(id, isClosedBy);
  };
  nodes.forEach((node) => findClosed(node, null));

  // create groups of visible edges
  const visibleEdges = new Edges();
  edges
    .filter((edge) => isLeafVisible(edge.clientId) && isLeafVisible(edge.serverId))
    .forEach((edge) => {
      const clientClosedBy = closedBy.get(edge.clientId);
      const serverClosedBy = closedBy.get(edge.serverId);
      const labels = !serverClosedBy ? edge.labels : [allNodes.getOrThrow(serverClosedBy.child).label];
      visibleEdges.add(clientClosedBy?.parent ?? edge.clientId, serverClosedBy?.parent ?? edge.serverId, labels);
    });

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

  const imageData: ImageData = {
    nodes: toImageNodes(nodes),
    edges: visibleEdges.values().map((edge) => ({
      clientId: nodeIdToText(edge.clientId),
      serverId: nodeIdToText(edge.serverId),
      edgeId: makeEdgeId(edge.clientId, edge.serverId),
      labels: [...new Set<string>(edge.labels)].sort(),
    })),
  };

  log("createImage");
  return imageData.edges.length || imageData.nodes.length ? createImage(imageData) : "Empty graph, no nodes to display";
}
