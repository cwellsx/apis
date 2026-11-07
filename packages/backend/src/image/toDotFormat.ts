import { isMixed, nodeIdToText, type Node } from "../contracts-ui";
import { edgeIdToNodeIdText, nodeIdTextToEdgeIdText, type ImageData } from "../types";
import { assert, getOrThrow, options } from "../utils";
import { DotNode, toDotNode } from "./toDotNode";
import { EdgeAttributes, escapeDotString, toEdgeAttributes } from "./toEdgeAttributes";

export const toDotFormat = (
  imageData: ImageData,
  hasParentEdges: boolean
): { lines: string[]; countImageNodes: number; nodeLabels: Map<string, string>; edgeLabels: Map<string, string> } => {
  const lines: string[] = [];
  lines.push("digraph SRC {");
  lines.push("  labeljust=l");
  lines.push(`  graph [fontname="Segoe UI", fontsize=10];`);
  lines.push(`  edge [fontname="Segoe UI", fontsize=10];`);
  lines.push(`  node [fontname="Segoe UI", fontsize=10, margin="0.07,0.01"];`); // not sure whether margin makes a difference

  // https://stackoverflow.com/questions/2012036/graphviz-how-to-connect-subgraphs
  if (hasParentEdges) lines.push("  compound=true");

  // used to write aria-label instead of title into the SVG
  const nodeLabels = new Map<string, string>();
  const edgeLabels = new Map<string, string>();

  const dotNodeMap = new Map<string, DotNode>();
  const getDotNode = (nodeId: string): DotNode => getOrThrow(dotNodeMap, nodeId);

  // push the tree of nodes -- use subgraphs for exapanded groups
  const pushLayer = (layer: Node[], level: number): void => {
    const prefix = " ".repeat(2 * (level + 1));

    for (const node of layer) {
      if (!node.isVisible && !isMixed(node)) continue;

      const dotNode = toDotNode(node);
      dotNodeMap.set(dotNode.id, dotNode);
      nodeLabels.set(dotNode.id, dotNode.label);

      const shape = "rect";
      const shortLabel = escapeDotString(dotNode.shortLabel);

      let inline = Object.entries(dotNode.attributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(", ");
      inline = inline ? `, ${inline}` : "";

      switch (node.collapsible) {
        case "none":
        case "collapsed":
          lines.push(
            `${prefix}"${dotNode.id}" [shape=${shape}, id="${dotNode.id}", label="${shortLabel}", href=foo${inline}];`
          );
          break;
        case "expanded":
          lines.push(`${prefix}subgraph "cluster_${dotNode.id}" {`);
          for (const [key, value] of Object.entries(dotNode.attributes)) lines.push(`${prefix}  ${key}="${value}"`);
          lines.push(`${prefix}  label="${shortLabel}"`);
          lines.push(`${prefix}  id="${dotNode.id}"`);
          lines.push(`${prefix}  href=foo`);
          pushLayer(node.children, level + 1);
          if (options.verticalClusters) {
            // invisible edges between nodes to they're aligned vertically
            // https://forum.graphviz.org/t/positioning-nodes-in-a-subgraph/1065/18
            const children = node.children.filter((child) => child.collapsible !== "expanded");
            for (let i = 0; i < children.length - 1; ++i) {
              const first = nodeIdToText(children[i].nodeId);
              const second = nodeIdToText(children[i + 1].nodeId);
              lines.push(`${prefix} "${first}" -> "${second}" [style=invis]`);
            }
          }
          lines.push(`}`);
      }
    }
  };

  pushLayer(imageData.roots, 0);

  // push the map of grouped edges
  imageData.edges.forEach((edge) => {
    // accumulate attributes to be written as string
    const attributeValues: Record<string, string> = {};

    // currently don't want extra edge attributes for reasons explained in comments, but could add them here
    const edgeAttributes: EdgeAttributes = {};
    toEdgeAttributes(edgeAttributes, attributeValues);

    // GraphViz supports edges to clusters but in a hacky way as follows

    const adjust = (nodeId: string, key: string): string => {
      const dotNode = dotNodeMap.get(nodeId);
      assert(!!dotNode, "Edge to undefined node");
      let node = dotNode.node;
      // normal case is that node is not a cluster
      if (node.collapsible !== "expanded") return nodeId;
      assert(hasParentEdges, "Unexpected edge to cluster");
      // else add "ltail" or "lhead" attribute and return NodeId of non-clustered child
      // https://stackoverflow.com/questions/2012036/graphviz-how-to-connect-subgraphs
      attributeValues[key] = `cluster_${nodeId}`;
      while (node.collapsible === "expanded") {
        node = node.children[0];
      }
      return nodeIdToText(node.nodeId);
    };

    let { clientId, serverId } = edgeIdToNodeIdText(edge);
    clientId = adjust(clientId, "ltail");
    serverId = adjust(serverId, "lhead");

    // write the altered EdgeId

    const edgeId = nodeIdTextToEdgeIdText(clientId, serverId);
    attributeValues.id = edgeId;

    // need href otherwise we won't get area in cmapx -- then remove the <a> in post-processing

    attributeValues.href = "foo";

    // get label to write as aria-label

    const label = `${getDotNode(clientId).label} → ${getDotNode(serverId).label}`;
    edgeLabels.set(edgeId, label);

    // get attributes as string and add to the dot file

    const attributes = Object.entries(attributeValues)
      .map(([key, value]) => `${key}="${value}"`)
      .join(", ");

    lines.push(`  "${clientId}" -> "${serverId}" [${attributes}]`);
  });

  lines.push("}");
  return { lines, countImageNodes: dotNodeMap.size, nodeLabels, edgeLabels };
};
