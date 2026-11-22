import type { AnyNodeType } from "sut/contracts-ui";
import { nodeIdToText } from "sut/contracts-ui";
import type { GraphNodes } from "sut/types";
import { assert } from "sut/utils";

// a node of the graph whose popup is wanted, by its type and label -- enough to find it among the visible nodes
export type RequestedNode = { label: string; type: AnyNodeType };

// the node popups requested by type and label, as lines. Each popup is its header -- the node itself -- and, beneath
// it, one line per child (the left column), then one per call (the right column), an arrow showing which way a call
// points. The rows are already in the model's order, which is the order every front end shows.
export const printNodePopups = (graphNodes: GraphNodes, nodes: RequestedNode[]): string[] => {
  return nodes.flatMap((request) => {
    const node = graphNodes.findNode(
      (candidate) => candidate.label === request.label && candidate.type === request.type
    );
    assert(!!node, `no node ${request.label} (${request.type}) on the graph`);
    const key = nodeIdToText(node.nodeId);
    const info = graphNodes.nodePopups?.get(key);
    assert(!!info, `no node popup for ${request.label} (${request.type})`);
    const children = info.children.map((child) => `  ${child.label} (${child.type})`);
    const calls = info.calls.map(
      (call) => `  ${call.direction === "right" ? "->" : "<-"} ${call.label} (${call.type})`
    );
    return [`${info.node.label} (${info.node.type})`, ...children, ...calls];
  });
};
