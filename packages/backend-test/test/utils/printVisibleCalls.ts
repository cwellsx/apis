import type { Node } from "sut/contracts-ui";
import { NodeType, textToNodeId } from "sut/contracts-ui";
import type { GraphNodes } from "sut/types";
import { edgeIdToNodeIdText } from "sut/types";
import { compareOrdinal } from "sut/utils";

// the name of an endpoint of a visible call: a leaf, so a method where the view's leaf type is a method, or the
// node which hides its descendants.
// The name is the endpoint's path in the forest: a namespace's label already names the whole namespace (the
// clustered view wraps one in the "Core" cluster, whose label only repeats the prefix), so the deepest namespace
// label is used with the type and method labels beneath it.
// A group or an assembly ends such a path, and an endpoint of either kind has no path, so it is its label alone.
const getEndpointName = (node: Node): string => {
  let namespaceName: string | undefined;
  const parts: string[] = [];
  for (let current: Node | null = node; current; current = current.parent) {
    if (current.type == NodeType.Method || current.type == NodeType.Type) parts.unshift(current.label);
    else if (current.type == NodeType.Namespace) {
      if (namespaceName === undefined) namespaceName = current.label; // the deepest, nearest the endpoint
    } else break;
  }
  const name = namespaceName ? [namespaceName, ...parts].join(".") : parts.join(".");
  return name || node.label;
};

// every call drawn on the graph, as lines: each call is a pair of endpoint names, with the pair of endpoint
// tokens -- the node ids -- on the line below, in parentheses. Sorted by name, so that the order is part of the
// output and the token line stays with its names.
export const printVisibleCalls = (graphNodes: GraphNodes): string[] => {
  const rows = graphNodes.imageData.edges.map((edge) => {
    const { clientId, serverId } = edgeIdToNodeIdText(edge);
    const client = graphNodes.getNode(textToNodeId(clientId));
    const server = graphNodes.getNode(textToNodeId(serverId));
    return {
      nameLine: `${getEndpointName(client)} ${getEndpointName(server)}`,
      tokenLine: `(${clientId} ${serverId})`,
    };
  });
  return rows
    .sort((x, y) => compareOrdinal(x.nameLine, y.nameLine) || compareOrdinal(x.tokenLine, y.tokenLine))
    .flatMap((row) => [row.nameLine, row.tokenLine]);
};
