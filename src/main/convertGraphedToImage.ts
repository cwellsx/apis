import type { Image, Graphed } from "../shared-types";
import { getAppFilename } from "./getAppFilename";
import fs from "fs";
import path from "path";
import os from "os";
import child_process from "child_process";
import { convertXmlMapToAreas } from "./convertXmlMapToAreas";
import { convertPathToUrl } from "./convertPathToUrl";
import { Config } from "./config";
import { showErrorBox } from "./showErrorBox";

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
  throw Error("graphviz not found");
};

const getDotFormat = (graphed: Graphed, config: Config): string[] => {
  const lines: string[] = [];
  lines.push("digraph SRC {");
  const isShown = (key: string): boolean => config.isShown(key);

  lines.push(
    ...graphed.nodes
      .filter((node) => isShown(node.id))
      .map((node) => `  "${node.id}" [shape=folder, id="${node.id}", label="${node.label}" href=foo];`)
  );

  lines.push(
    ...graphed.edges
      .filter((edge) => isShown(edge.clientId) && isShown(edge.serverId))
      .map((edge) => `  "${edge.clientId}" -> "${edge.serverId}" [id="${edge.clientId}|${edge.serverId}", href=foo]`)
  );

  lines.push("}");
  return lines;
};

export function convertGraphedToImage(graphed: Graphed, config: Config): Image {
  const lines = getDotFormat(graphed, config);

  const dotFilename = getAppFilename("assemblies.dot");
  const pngFilename = getAppFilename("assemblies.png");
  const mapFilename = getAppFilename("assemblies.map");
  fs.writeFileSync(dotFilename, lines.join(os.EOL));

  const dotExe = findDotExe();
  const args = [dotFilename, "-Tpng", `-o${pngFilename}`, "-Tcmapx", `-o${mapFilename}`, `-Nfontname="Segoe UI"`];

  const spawned = child_process.spawnSync(dotExe, args);
  if (spawned.status !== 0) showErrorBox("dot.exe failed", "" + spawned.error);

  const xml = fs.readFileSync(mapFilename, { encoding: "utf8" });

  return { imagePath: convertPathToUrl(pngFilename), areas: convertXmlMapToAreas(xml) };
}
