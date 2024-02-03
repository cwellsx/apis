import child_process from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { Groups, Image, LeafNode } from "../shared-types";
import { convertPathToUrl } from "./convertPathToUrl";
import { convertXmlMapToAreas } from "./convertXmlMapToAreas";
import { getAppFilename } from "./getAppFilename";
import { Edge } from "./shared-types";
import { showErrorBox } from "./showErrorBox";

type Nodes = Groups | LeafNode[];

/*

This is implemented using Graphviz; this is the only module which uses (and therefore encapsulates) Graphviz.

*/

const findDotExe = (): string => {
  const graphvizDirs = [`C:\\Program Files (x86)\\Graphviz\\bin`, `C:\\Program Files\\Graphviz\\bin`];
  for (const graphvizDir of graphvizDirs) {
    const dotExe = path.join(graphvizDir, "dot.exe");
    if (fs.existsSync(dotExe)) return dotExe;
  }
  showErrorBox("dot.exe not found", "Install Graphviz before you can use this program");
  throw new Error("graphviz not found");
};

const getDotFormat = (nodes: Nodes, edges: Edge[], isShown: (name: string) => boolean): string[] => {
  const lines: string[] = [];
  lines.push("digraph SRC {");

  lines.push(
    ...nodes
      .filter((node) => isShown(node.id))
      .map((node) => `  "${node.id}" [shape=folder, id="${node.id}", label="${node.label}" href=foo];`)
  );

  lines.push(
    ...edges
      .filter((edge) => isShown(edge.clientId) && isShown(edge.serverId))
      .map((edge) => `  "${edge.clientId}" -> "${edge.serverId}" [id="${edge.clientId}|${edge.serverId}", href=foo]`)
  );

  lines.push("}");
  return lines;
};

export function createImage(nodes: Nodes, edges: Edge[], isShown: (name: string) => boolean): Image {
  const lines = getDotFormat(nodes, edges, isShown);

  const dotFilename = getAppFilename("assemblies.dot");
  const pngFilename = getAppFilename("assemblies.png");
  const mapFilename = getAppFilename("assemblies.map");
  fs.writeFileSync(dotFilename, lines.join(os.EOL));

  const dotExe = findDotExe();
  const args = [dotFilename, "-Tpng", `-o${pngFilename}`, "-Tcmapx", `-o${mapFilename}`, `-Nfontname="Segoe UI"`];

  const spawned = child_process.spawnSync(dotExe, args);
  if (spawned.status !== 0) showErrorBox("dot.exe failed", "" + spawned.error);

  const xml = fs.readFileSync(mapFilename, { encoding: "utf8" });

  return { imagePath: convertPathToUrl(pngFilename), areas: convertXmlMapToAreas(xml), now: Date.now() };
}
