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

type Text = {
  id: string;
  label: string;
};

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

export type ImageAttributes = { [index: string]: ImageAttribute | undefined };

export type Node = (Text & { type: "node" | "group" }) | Subgraph;
type Subgraph = Text & { type: "subgraph"; children: Node[] };

export type ImageData = {
  nodes: Node[];
  edges: { clientId: string; serverId: string; edgeId: string }[];
  imageAttributes: ImageAttributes;
  classNames: { [type: string]: AreaClass };
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

const defaultShape = (node: Node): Shape => {
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

  // push the tree of nodes -- use subgraphs for exapanded groups
  const pushLayer = (layer: Node[], level: number): void => {
    const prefix = " ".repeat(2 * (level + 1));
    for (const node of layer) {
      const imageAttribute = imageData.imageAttributes[node.id];
      const shape = imageAttribute?.shape ?? defaultShape(node);
      const label = imageAttribute?.shortLabel ?? node.label;
      if (imageAttribute?.shortLabel && !imageAttribute.tooltip) imageAttribute.tooltip = node.label;
      switch (node.type) {
        case "node":
          lines.push(`${prefix}"${node.id}" [shape=${shape}, id="${node.id}", label="${label}" href=foo];`);
          break;
        case "group":
          lines.push(`${prefix}"${node.id}" [shape=${shape}, id="${node.id}", label="${label}" href=foo];`);
          break;
        case "subgraph":
          lines.push(`${prefix}subgraph "cluster_${node.id}" {`);
          if (imageAttribute?.style) lines.push(`${prefix}  style="${imageAttribute.style}"`);
          lines.push(`${prefix}  label="${label}"`);
          lines.push(`${prefix}  id="${node.id}"`);
          lines.push(`${prefix}  href=foo`);
          pushLayer(node.children, level + 1);
          lines.push(`}`);
      }
    }
  };
  pushLayer(imageData.nodes, 0);

  // push the map of grouped edges
  imageData.edges.forEach(({ clientId, serverId, edgeId }) =>
    lines.push(`  "${clientId}" -> "${serverId}" [id="${edgeId}", href=foo]`)
  );

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

  const getNodeAttributes = (id: string) => {
    const imageAttribute: ImageAttribute | undefined = imageData.imageAttributes[id];
    const className = imageData.classNames[id];
    const tooltip = imageAttribute?.tooltip;
    return { className, tooltip };
  };

  return {
    imagePath: convertPathToUrl(pngFilename),
    areas: convertXmlMapToAreas(xml, getNodeAttributes),
    now: Date.now(),
  };
}
