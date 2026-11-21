import type { AnyNodeType, Node } from "sut/contracts-ui";
import { edgeIdToText } from "sut/contracts-ui";
import type { GraphNodes } from "sut/types";
import { nodeIdsToEdgeId } from "sut/types";
import { assert } from "sut/utils";

// an edge of the graph, requested by the labels of its two endpoints: the popup to render is the one keyed by
// those two nodes
export type RequestedEdge = { clientLabel: string; serverLabel: string };

const findNode = (graphNodes: GraphNodes, label: string): Node => {
  const node = graphNodes.findNode((candidate) => candidate.label === label);
  assert(!!node, `no node with label ${label} on the graph`);
  return node;
};

// one end of a popup row: a name and the kind of thing it is, which the popup shows an icon for
const pointOf = (name: string, type: AnyNodeType): string => `${name} (${type})`;

// the edge popups requested by endpoint labels, as lines. Each popup is its header -- the edge's own two nodes --
// and, beneath it, one row per call bundled into the edge: the client and server names, one level down from the
// edge. The rows are already in the model's order, which is the order every front end shows.
export const printEdgePopups = (graphNodes: GraphNodes, edges: RequestedEdge[]): string[] => {
  return edges.flatMap((edge) => {
    const from = findNode(graphNodes, edge.clientLabel);
    const to = findNode(graphNodes, edge.serverLabel);
    const edgeId = edgeIdToText(nodeIdsToEdgeId(from.nodeId, to.nodeId));
    const info = graphNodes.edgePopups?.get(edgeId);
    assert(!!info, `no edge popup for ${edge.clientLabel} -> ${edge.serverLabel}`);
    const header = `${pointOf(from.label, from.type)} -> ${pointOf(to.label, to.type)}`;
    const rows = info.labels.map(
      (labels) =>
        `${pointOf(labels.client.label, labels.client.type)} -> ${pointOf(labels.server.label, labels.server.type)}`
    );
    return [header, ...rows];
  });
};
