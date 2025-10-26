import type { AnyGraphViewOptions, GraphFilter, GraphViewOptions, Node, NodeId } from "../shared-types";
import { isParent, nodeIdToText } from "../shared-types";
import type { ImageAttribute, ImageData, ImageNode, ImageText } from "./imageDataTypes";
import { log } from "./log";
import { createLookupNodeId, edgeIdToText, Edges, NodeIdMap, NodeIdSet } from "./nodeIds";
import { options, viewFeatures } from "./shared-types";
import { uniqueStrings } from "./shared-types/remove";

const getShowEdgeLabels = (viewOptions: AnyGraphViewOptions): AnyGraphViewOptions["showEdgeLabels"] =>
  viewOptions["showEdgeLabels"] ?? { groups: false, leafs: false };

export function convertToImage(
  roots: Node[],
  edges: Edges,
  viewOptions: GraphViewOptions,
  graphFilter: GraphFilter,
  shortLeafNames: boolean,
  imageAttributes?: NodeIdMap<ImageAttribute>
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
          throw new Error(`Unexpected parent of: ${nodeId}`);
        }
      });
    }
  };
  sort(roots);
  roots.forEach(assertUnique);

  // const allEdgeIds = new Set<string>();
  // edges.forEach((edge) => {
  //   const edgeId = edgeIdToText(edge.clientId, edge.serverId);
  //   if (allEdgeIds.has(edgeId)) throw new Error(`Duplicate edge id: ${edgeId}`);
  //   allEdgeIds.add(edgeId);
  // });

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

  const metaGroupLabels = [".NET", "3rd-party"];
  const { details } = viewFeatures[viewOptions.viewType];

  const toImageNode = (node: Node): ImageNode => {
    const nodeId = node.nodeId;

    // if (!hasParentEdges)
    //   if (isParent(node) != (nodeId.type !== leafType)) throw new Error("Unexpected leaf or parent type");

    const imageAttribute: ImageAttribute = imageAttributes?.get(nodeId) ?? {};

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

    // implement this option here to affect the label on the image but not in the tree of groups
    if (
      shortLeafNames &&
      options.shortLeafNames &&
      node.parent &&
      !metaGroupLabels.includes(node.parent.label) &&
      (!isParent(node) || !isGroupExpanded(nodeId))
    ) {
      if (!node.label.startsWith(node.parent.label)) {
        if (viewOptions.viewType == "references") throw new Error("Unexpected parent node name");
        // else this is a sublayer so do nothing
      } else textNode.shortLabel = "*" + node.label.substring(node.parent.label.length);
    }

    return !isParent(node)
      ? { type: "node", ...textNode }
      : !isGroupExpanded(nodeId)
        ? { type: "group", ...textNode }
        : { type: "subgraph", ...textNode, children: toImageNodes(node.children) };
  };

  // whether a group is visible depends on whether it contains visible leafs
  const isNodeVisible = (node: Node): boolean =>
    (isParent(node) && node.children.some((child) => isNodeVisible(child))) ||
    (isLeafVisible(node.nodeId) && edgeLeafs.has(node.nodeId));

  const toImageNodes: (nodes: Node[]) => ImageNode[] = (nodes) => nodes.filter(isNodeVisible).map(toImageNode);

  const showEdgeLabels = getShowEdgeLabels(viewOptions);
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
