import type { GraphFilter, Leaf, Node, NodeId } from "../../contracts-ui";
import { edgeIdToText, GraphOptions, isParent, nodeIdToText } from "../../contracts-ui";
import type { ImageData, ImageNode } from "../../image";
import { createLookupNodeId, Edges, NodeIdMap, NodeIdSet } from "../../nodeIds";
import { log, uniqueStrings, viewFeatures } from "../../utils";

// TODO support optional shape on CustomNode
export type CustomLeaf = Leaf & { type: "c"; shape?: string };
export type CustomParent = Leaf & { children: (Node | CustomLeaf)[] };
export type InputNode = Node | CustomLeaf | CustomParent;

export function convertToImage(
  roots: Node[],
  edges: Edges,
  viewOptions: GraphOptions.Any,
  graphFilter: GraphFilter,
  shortLeafNames: boolean
): ImageData {
  log("convertToImage");

  const { leafVisible, groupExpanded, isCheckModelAll: hasParentEdges } = graphFilter;
  const isLeafVisible = createLookupNodeId(leafVisible);
  const isGroupExpanded = createLookupNodeId(groupExpanded);

  // assert the id are unique -- if they're not then CheckboxTree will throw an exception in the renderer
  // also assert that the parent fields are set correctly
  const allNodeIds = new Set<string>();
  // also take this opportunity to initialize
  const allNodes = new NodeIdMap<Node>();

  // TODO replace this with a call to convertNamesToNodes
  const sort = (nodes: Node[]): void => {
    nodes.sort((x, y) => x.label.localeCompare(y.label));
  };

  const assertUnique = (node: Node): void => {
    const stringId = nodeIdToText(node.nodeId);
    if (allNodeIds.has(stringId)) {
      throw new Error(`Duplicate node id: ${stringId}`);
    }
    allNodeIds.add(stringId);
    const nodeId = node.nodeId;
    allNodes.set(nodeId, node);
    if (isParent(node)) {
      sort(node.children);
      node.children.forEach((child) => {
        assertUnique(child);
        if (child.parent !== node) {
          throw new Error(`Unexpected parent of: ${stringId}`);
        }
      });
    }
  };
  sort(roots);
  roots.forEach(assertUnique);

  // create a Map to say which leaf nodes are closed by which non-expanded parent nodes
  // parent is the displayed but non-expanded parent
  // child is its immediate child which is the leaf or perhaps the ancestor of the leaf
  const closedBy = new NodeIdMap<{ parent: NodeId; child: NodeId }>();
  const findClosed = (node: Node, isClosedBy: { parent: NodeId; child: NodeId } | null): void => {
    const id = node.nodeId;
    if (!isParent(node) || hasParentEdges) {
      if (isClosedBy) closedBy.set(id, isClosedBy);
    }
    if (isParent(node)) {
      const isClosed = !isClosedBy && !isGroupExpanded(id);
      node.children.forEach((child) =>
        findClosed(child, isClosedBy ?? (isClosed ? { parent: id, child: child.nodeId } : null))
      );
    }
  };
  roots.forEach((node) => findClosed(node, null));

  const edgeLeafs = new NodeIdSet();

  // create groups of visible edges
  const visibleEdges = new Edges();
  edges
    .values()
    .filter((edge) => isLeafVisible(edge.clientId) && isLeafVisible(edge.serverId))
    .forEach((edge) => {
      edgeLeafs.add(edge.clientId);
      edgeLeafs.add(edge.serverId);
      const clientClosedBy = closedBy.get(edge.clientId);
      const serverClosedBy = closedBy.get(edge.serverId);
      const labels = !serverClosedBy ? edge.labels : [allNodes.getOrThrow(serverClosedBy.child).label];
      const isServerLeaf = !serverClosedBy;
      visibleEdges.addOrUpdate(
        clientClosedBy?.parent ?? edge.clientId,
        serverClosedBy?.parent ?? edge.serverId,
        labels,
        isServerLeaf
      );
    });

  const { details } = viewFeatures[viewOptions.graphType];

  const toImageNode = (node: Node): ImageNode => {
    const nodeId = node.nodeId;

    return !isParent(node)
      ? { type: "leaf", node }
      : !isGroupExpanded(nodeId)
        ? { type: "closed", node }
        : { type: "subgraph", node, children: toImageNodes(node.children) };
  };

  // whether a group is visible depends on whether it contains visible leafs
  const isNodeVisible = (node: Node): boolean =>
    (isParent(node) && node.children.some((child) => isNodeVisible(child))) ||
    (isLeafVisible(node.nodeId) && edgeLeafs.has(node.nodeId));

  const toImageNodes: (nodes: Node[]) => ImageNode[] = (nodes) => nodes.filter(isNodeVisible).map(toImageNode);

  const showEdgeLabels = GraphOptions.getShowEdgeLabels(viewOptions);
  const imageData: ImageData = {
    nodes: toImageNodes(roots),
    edges: visibleEdges.values().map((edge) => {
      const labels = uniqueStrings(edge.labels).sort();
      const showLabels = !showEdgeLabels ? false : edge.isServerLeaf ? showEdgeLabels.leafs : showEdgeLabels.groups;
      return {
        clientId: nodeIdToText(edge.clientId),
        serverId: nodeIdToText(edge.serverId),
        edgeId: edgeIdToText(edge.edgeId),
        labels: showLabels ? labels : [],
        titles: labels,
      };
    }),
    edgeDetails: details.includes("edge"),
    hasParentEdges,
  };

  return imageData;
}
