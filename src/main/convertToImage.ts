import type { GroupNode, Groups, LeafNode, ParentNode } from "../shared-types";
import { isParent } from "../shared-types";
import type { ImageData, Node as ImageNode } from "./createImage";
import type { Edge, StringPredicate } from "./shared-types";

type Nodes = Groups | LeafNode[];

export function convertToImage(
  nodes: Nodes,
  edges: Edge[],
  isLeafVisible: StringPredicate,
  isGroupExpanded: StringPredicate
): ImageData {
  // create a Map to say which leaf nodes are closed by which non-expanded parent nodes
  const closed = new Map<string, string>();
  const findClosed = (node: GroupNode, isClosedBy: ParentNode | null): void => {
    if (isParent(node)) {
      if (!isClosedBy && !isGroupExpanded(node.id)) isClosedBy = node;
      node.children.forEach((child) => findClosed(child, isClosedBy));
    } else if (isClosedBy) closed.set(node.id, isClosedBy.id);
  };
  nodes.forEach((node) => findClosed(node, null));

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
      const edgeId = makeEdgeId(clientId, serverId);
      const found = edgeGroups.get(edgeId);
      if (found) found.push(edge);
      else edgeGroups.set(edgeId, [edge]);
    });

  const edgeIds: string[] = [...edgeGroups.keys()];

  // whether a group is visible depends on whether it contains visible leafs
  const isGroupNodeVisible = (node: GroupNode): boolean =>
    isParent(node) ? node.children.some((child) => isGroupNodeVisible(child)) : isLeafVisible(node.id);

  const toImageNode = (node: GroupNode): ImageNode => {
    const textNode = { id: node.id, label: node.label };
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