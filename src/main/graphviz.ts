import type { View, Node, IStrings } from "../shared-types";
import { getAppFilename } from "./getAppFilename";
import fs from "fs";
import path from "path";
import os from "os";
import child_process from "child_process";
import { readXml } from "./readXml";
import { convertPathToUrl } from "./convertPathToUrl";
import { readNodes } from "./readNodes";

const graphvizDir = `C:\\Users\\Christopher\\Source\\Repos\\graphviz-2.38\\release\\bin`;

export function showAssemblies(assemblies: IStrings): View {
  const lines: string[] = [];
  lines.push("digraph SRC {");
  Object.keys(assemblies).forEach((key) => lines.push(`  "${key}" [shape=folder, id="${key}", href=foo];`));
  for (const key in assemblies) {
    const references = assemblies[key];
    references.forEach((ref) => lines.push(`  "${key}" -> "${ref}" [id="${key}|${ref}", href=foo]`));
  }
  lines.push("}");
  const dotFilename = getAppFilename("assemblies.dot");
  const pngFilename = getAppFilename("assemblies.png");
  const mapFilename = getAppFilename("assemblies.map");
  fs.writeFileSync(dotFilename, lines.join(os.EOL));

  const dotExe = path.join(graphvizDir, "dot.exe");
  const args = [dotFilename, "-Tpng", `-o${pngFilename}`, "-Tcmapx", `-o${mapFilename}`];

  child_process.spawnSync(dotExe, args);

  const xml = fs.readFileSync(mapFilename, { encoding: "utf8" });

  return {
    imagePath: convertPathToUrl(pngFilename),
    areas: readXml(xml),
    nodes: readNodes(assemblies),
    now: Date.now(),
  };
}
