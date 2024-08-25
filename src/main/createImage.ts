import child_process from "child_process";
import os from "os";
import path from "path";
import type { AreaClass, Image } from "../shared-types";
import { textIsEdgeId } from "../shared-types";
import { convertPathToUrl } from "./convertPathToUrl";
import { ExtraAttributes, convertXmlMapToAreas } from "./convertXmlMapToAreas";
import { existsSync, getAppFilename, readFileSync, writeFileSync } from "./fs";
import { log } from "./log";
import { options } from "./shared-types";
import { showErrorBox } from "./showErrorBox";

/*
  This is implemented using Graphviz; this is the only module which uses (and therefore encapsulates) Graphviz.
*/

export type Shape = "folder" | "rect" | "none" | "component";

export type ImageAttribute = {
  // used for leafs and for non-expanded groups
  shape?: Shape;
  // used for clusters i.e. for expanded groups -- https://graphviz.org/docs/attr-types/style/
  style?: "rounded";
  // if this is defined then this is the label and label is the tooltip
  shortLabel?: string;
  tooltip?: string;
  className?: AreaClass;
};

export type ImageText = ImageAttribute & {
  id: string;
  label: string;
  className: AreaClass;
};

type Subgraph = ImageText & { type: "subgraph"; children: ImageNode[] };
export type ImageNode = (ImageText & { type: "node" | "group" }) | Subgraph;

export type ImageData = {
  nodes: ImageNode[];
  edges: { clientId: string; serverId: string; edgeId: string; labels: string[]; titles: string[] }[];
  edgeDetails: boolean;
  hasParentEdges: boolean;
};

const findDotExe = (): string => {
  const graphvizDirs = [`C:\\Program Files (x86)\\Graphviz\\bin`, `C:\\Program Files\\Graphviz\\bin`];
  for (const graphvizDir of graphvizDirs) {
    const dotExe = path.join(graphvizDir, "dot.exe");
    if (existsSync(dotExe)) return dotExe;
  }
  showErrorBox("dot.exe not found", "Install Graphviz before you can use this program");
  throw new Error("graphviz not found");
};

const defaultShape = (node: ImageNode): Shape => {
  switch (node.type) {
    case "group":
      return "rect";
    case "node":
      return "folder";
    // Shape is unused for subgraphs
    // https://stackoverflow.com/questions/49139028/change-subgraph-cluster-shape-to-rounded-rectangle
    case "subgraph":
      return "none";
  }
};

const getDotFormat = (
  imageData: ImageData
): { lines: string[]; nodes: { [nodeId: string]: ImageNode }; edgeTooltips: { [edgeId: string]: string } } => {
  const lines: string[] = [];
  lines.push("digraph SRC {");
  lines.push("  labeljust=l");
  // https://stackoverflow.com/questions/2012036/graphviz-how-to-connect-subgraphs
  if (imageData.hasParentEdges) lines.push("  compound=true");

  const nodes: { [nodeId: string]: ImageNode } = {};

  // push the tree of nodes -- use subgraphs for exapanded groups
  const pushLayer = (layer: ImageNode[], level: number): void => {
    const prefix = " ".repeat(2 * (level + 1));
    for (const node of layer) {
      nodes[node.id] = node;

      const shape = node?.shape ?? defaultShape(node);
      const label = (node?.shortLabel ?? node.label).replace("\\", "\\\\");
      if (node?.shortLabel && !node.tooltip) node.tooltip = node.label;
      switch (node.type) {
        case "node":
          lines.push(`${prefix}"${node.id}" [shape=${shape}, id="${node.id}", label="${label}" href=foo];`);
          break;
        case "group":
          lines.push(`${prefix}"${node.id}" [shape=${shape}, id="${node.id}", label="${label}" href=foo];`);
          break;
        case "subgraph":
          lines.push(`${prefix}subgraph "cluster_${node.id}" {`);
          if (node?.style) lines.push(`${prefix}  style="${node.style}"`);
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
  pushLayer(Object.values(imageData.nodes), 0);

  // used to override the title assigned to edge labels
  const edgeTooltips: { [edgeId: string]: string } = {};

  const nodeMap = new Map<string, ImageNode>(Object.values(nodes).map((node) => [node.id, node]));

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
    const edgeTitle = `${nodes[clientId].label} → ${nodes[serverId]?.label ?? "?"}`;
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
  return { lines, nodes, edgeTooltips };
};

export function createImage(imageData: ImageData): Image {
  log("createImage");

  // convert to *.dot file format lines
  const { lines, nodes, edgeTooltips } = getDotFormat(imageData);

  // specify all the path ames
  const dotFilename = getAppFilename("assemblies.dot");
  const pngFilename = getAppFilename("assemblies.png");
  const mapFilename = getAppFilename("assemblies.map");
  // create the *.dot file
  writeFileSync(dotFilename, lines.join(os.EOL));

  // launch GraphViz
  log("launch GraphViz");
  const dotExe = findDotExe();
  const args = [dotFilename, "-Tpng", `-o${pngFilename}`, "-Tcmapx", `-o${mapFilename}`, `-Nfontname="Segoe UI"`];
  const spawned = child_process.spawnSync(dotExe, args);
  if (spawned.status !== 0) showErrorBox("dot.exe failed", "" + spawned.error);

  // read the image *.map file
  log("convertXmlMapToAreas");
  const xml = readFileSync(mapFilename);

  const getAreaAttributes = (id: string): ExtraAttributes => {
    if (textIsEdgeId(id)) {
      // this is the label of an edge, not the edge itself
      const edgeLabelTooltip = id.endsWith("-label") ? edgeTooltips[id.substring(0, id.length - 6)] : undefined;

      return { className: imageData.edgeDetails ? "edge-details" : "edge-none", edgeLabelTooltip };
    } else {
      const node = nodes[id];
      if (!node) throw new Error("Node not found");
      return { className: node.className };
    }
  };

  return {
    imagePath: convertPathToUrl(pngFilename),
    areas: convertXmlMapToAreas(xml, getAreaAttributes),
    now: Date.now(),
  };
}
