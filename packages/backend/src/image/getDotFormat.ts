import { getOrThrow, options } from "../utils";
import { getNodeAttributes, NodeAttributes } from "./getNodeAttributes";
import type { ImageData } from "./imageDataTypes";

export const getDotFormat = (
  imageData: ImageData
): { lines: string[]; nodeMap: Map<string, NodeAttributes>; edgeTooltips: { [edgeId: string]: string } } => {
  const lines: string[] = [];
  lines.push("digraph SRC {");
  lines.push("  labeljust=l");
  lines.push(`  graph [fontname="Segoe UI", fontsize=10];`);
  lines.push(`  edge [fontname="Segoe UI", fontsize=10];`);
  lines.push(`  node [fontname="Segoe UI", fontsize=10, margin="0.07,0.01"];`); // not sure whether margin makes a difference

  // https://stackoverflow.com/questions/2012036/graphviz-how-to-connect-subgraphs
  if (imageData.hasParentEdges) lines.push("  compound=true");

  const nodeMap = new Map<string, NodeAttributes>();
  const getNode = (nodeId: string): NodeAttributes => getOrThrow(nodeMap, nodeId);

  // push the tree of nodes -- use subgraphs for exapanded groups
  const pushLayer = (layer: NodeAttributes[], level: number): void => {
    const prefix = " ".repeat(2 * (level + 1));

    for (const node of layer) {
      nodeMap.set(node.id, node);

      const shape = "rect";
      const label = node.label.replace("\\", "\\\\");

      let inline = Object.entries(node.attributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(", ");
      inline = inline ? `, ${inline}` : "";

      switch (node.type) {
        case "leaf":
        case "closed":
          lines.push(`${prefix}"${node.id}" [shape=${shape}, id="${node.id}", label="${label}", href=foo${inline}];`);
          break;
        case "subgraph":
          lines.push(`${prefix}subgraph "cluster_${node.id}" {`);
          for (const [key, value] of Object.entries(node.attributes)) lines.push(`${prefix}  ${key}="${value}"`);
          lines.push(`${prefix}  label="${label}"`);
          lines.push(`${prefix}  id="${node.id}"`);
          lines.push(`${prefix}  href=foo`);
          pushLayer(node.children, level + 1);
          if (options.verticalClusters) {
            // invisible edges between nodes to they're aligned vertically
            // https://forum.graphviz.org/t/positioning-nodes-in-a-subgraph/1065/18
            const children = node.children.filter((child) => child.type !== "subgraph");
            for (let i = 0; i < children.length - 1; ++i) {
              const first = children[i];
              const second = children[i + 1];
              lines.push(`${prefix} "${first.id}" -> "${second.id}" [style=invis]`);
            }
          }
          lines.push(`}`);
      }
    }
  };

  pushLayer(imageData.nodes.map(getNodeAttributes), 0);

  // used to override the title assigned to edge labels
  const edgeTooltips: { [edgeId: string]: string } = {};

  // push the map of grouped edges
  imageData.edges.forEach(({ clientId, serverId, edgeId, labels, titles }) => {
    type EdgeAttribute = { key: string; value: string };
    const edgeAttributes: EdgeAttribute[] = [];

    const adjust = (nodeId: string, key: string): string => {
      let node = nodeMap.get(nodeId);
      if (!node) throw new Error("Edge to undefined node");
      if (node.type !== "subgraph") return nodeId;
      if (!imageData.hasParentEdges) throw new Error("Unexpected edge to cluster");
      // https://stackoverflow.com/questions/2012036/graphviz-how-to-connect-subgraphs
      edgeAttributes.push({ key, value: `cluster_${nodeId}` });
      while (node.type === "subgraph") {
        node = node.children[0];
      }
      return node.id;
    };

    clientId = adjust(clientId, "ltail");
    serverId = adjust(serverId, "lhead");

    // use \l instead of \r\n to left-justify labels
    // https://stackoverflow.com/questions/13103584/graphviz-how-do-i-make-the-text-in-labels-left-aligned
    const edgeLabel = labels.map((s) => s + "\\l").join("");
    // use \r\b in tooltips, that's OK in the XML
    const edgeTitle = `${getNode(clientId).label} → ${getNode(serverId)?.label ?? "?"}`;
    const edgeTooltip = [edgeTitle, ...titles].join("\r\n");

    edgeAttributes.push(
      ...[
        { key: "label", value: edgeLabel },
        { key: "tooltip", value: edgeTooltip },
        { key: "id", value: edgeId },
        { key: "href", value: "foo" },
      ]
    );

    const attributes = edgeAttributes.map((attribute) => `${attribute.key}="${attribute.value}"`).join(", ");

    // const labelAttributes = `, label="${edgeLabel}", tooltip="${edgeTooltip}"`;
    // lines.push(`  "${clientId}" -> "${serverId}" [id="${edgeId}", href=foo${labelAttributes}]`);
    lines.push(`  "${clientId}" -> "${serverId}" [${attributes}]`);

    edgeTooltips[edgeId] = edgeTooltip;
  });

  lines.push("}");
  return { lines, nodeMap, edgeTooltips };
};
