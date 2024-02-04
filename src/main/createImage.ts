import child_process from "child_process";
import os from "os";
import path from "path";
import type { Image } from "../shared-types";
import { convertPathToUrl } from "./convertPathToUrl";
import { convertXmlMapToAreas } from "./convertXmlMapToAreas";
import { existsSync, getAppFilename, readFileSync, writeFileSync } from "./fs";
import { showErrorBox } from "./showErrorBox";

/*
  This is implemented using Graphviz; this is the only module which uses (and therefore encapsulates) Graphviz.
*/

type Text = {
  id: string;
  label: string;
};

export type Node = (Text & { type: "node" | "group" }) | Subgraph;
type Subgraph = Text & { type: "subgraph"; children: Node[] };

export type ImageData = {
  nodes: Node[];
  edges: { clientId: string; serverId: string; edgeId: string }[];
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

const getDotFormat = (imageData: ImageData): string[] => {
  const lines: string[] = [];
  lines.push("digraph SRC {");

  // push the tree of nodes -- use subgraphs for exapanded groups
  const pushLayer = (layer: Node[], level: number): void => {
    const prefix = " ".repeat(2 * (level + 1));
    for (const node of layer) {
      switch (node.type) {
        case "node":
          lines.push(`${prefix}"${node.id}" [shape=folder, id="${node.id}", label="${node.label}" href=foo];`);
          break;
        case "group":
          lines.push(`${prefix}"${node.id}" [shape=rect, id="${node.id}", label="${node.label}" href=foo];`);
          break;
        case "subgraph":
          lines.push(`${prefix}subgraph "cluster_${node.id}" {`);
          lines.push(`${prefix}  label="${node.label}"`);
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

  return { imagePath: convertPathToUrl(pngFilename), areas: convertXmlMapToAreas(xml), now: Date.now() };
}
