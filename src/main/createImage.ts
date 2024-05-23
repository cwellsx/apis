import child_process from "child_process";
import os from "os";
import path from "path";
import type { AreaClass, Image } from "../shared-types";
import { convertPathToUrl } from "./convertPathToUrl";
import { convertXmlMapToAreas } from "./convertXmlMapToAreas";
import { existsSync, getAppFilename, readFileSync, writeFileSync } from "./fs";
import { log } from "./log";
import { showErrorBox } from "./showErrorBox";

/*
  This is implemented using Graphviz; this is the only module which uses (and therefore encapsulates) Graphviz.
*/

type Shape = "folder" | "rect" | "none";

export type ImageAttribute = {
  // used for leafs and for non-expanded groups
  shape?: Shape;
  // used for clusters i.e. for expanded groups -- https://graphviz.org/docs/attr-types/style/
  style?: "rounded";
  // if this is defined then this is the label and label is the tooltip
  shortLabel?: string;
  tooltip?: string;
};

export type ImageText = ImageAttribute & {
  id: string;
  label: string;
  className: AreaClass;
};

type Subgraph = ImageText & { type: "subgraph"; children: ImageNode[] };
export type ImageNode = (ImageText & { type: "node" | "group" }) | Subgraph;

export type ImageData = {
  nodes: { [nodeId: string]: ImageNode };
  edges: { clientId: string; serverId: string; edgeId: string; labels: string[] }[];
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

const getDotFormat = (imageData: ImageData): string[] => {
  const lines: string[] = [];
  lines.push("digraph SRC {");
  lines.push("  labeljust=l");

  // push the tree of nodes -- use subgraphs for exapanded groups
  const pushLayer = (layer: ImageNode[], level: number): void => {
    const prefix = " ".repeat(2 * (level + 1));
    for (const node of layer) {
      //const imageAttribute = imageData.imageAttributes[node.id];
      const shape = node?.shape ?? defaultShape(node);
      const label = node?.shortLabel ?? node.label;
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
          lines.push(`}`);
      }
    }
  };
  pushLayer(Object.values(imageData.nodes), 0);

  // push the map of grouped edges
  imageData.edges.forEach(({ clientId, serverId, edgeId, labels }) => {
    const label = labels.join("\r\n");
    const labelAttributes = `, label="${label}", tooltip="${label}"`;
    lines.push(`  "${clientId}" -> "${serverId}" [id="${edgeId}", href=foo${labelAttributes}]`);
  });

  lines.push("}");
  return lines;
};

export function createImage(imageData: ImageData): Image {
  log("createImage");
  const lines = getDotFormat(imageData);

  const dotFilename = getAppFilename("assemblies.dot");
  const pngFilename = getAppFilename("assemblies.png");
  const mapFilename = getAppFilename("assemblies.map");
  writeFileSync(dotFilename, lines.join(os.EOL));

  const dotExe = findDotExe();
  const args = [dotFilename, "-Tpng", `-o${pngFilename}`, "-Tcmapx", `-o${mapFilename}`, `-Nfontname="Segoe UI"`];

  const spawned = child_process.spawnSync(dotExe, args);
  if (spawned.status !== 0) showErrorBox("dot.exe failed", "" + spawned.error);

  const xml = readFileSync(mapFilename);

  const getAreaAttributes = (id: string) => {
    // may be undefined because this is also called for edges
    const node: ImageNode | undefined = imageData.nodes[id];
    const className = node?.className;
    const tooltip = node?.tooltip;
    return { className, tooltip };
  };

  return {
    imagePath: convertPathToUrl(pngFilename),
    areas: convertXmlMapToAreas(xml, getAreaAttributes),
    now: Date.now(),
  };
}
