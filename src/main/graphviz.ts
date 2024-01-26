import type { Image, IAssemblies } from "../shared-types";
import { getAppFilename } from "./getAppFilename";
import fs from "fs";
import path from "path";
import os from "os";
import child_process from "child_process";
import { readXml } from "./readXml";
import { convertPathToUrl } from "./convertPathToUrl";
import { Config } from "./config";
import { showErrorBox } from "./showErrorBox";

const findDotExe = (): string => {
  const graphvizDirs = [`C:\\Program Files (x86)\\Graphviz\\bin`, `C:\\Program Files\\Graphviz\\bin`];
  for (const graphvizDir of graphvizDirs) {
    const dotExe = path.join(graphvizDir, "dot.exe");
    if (fs.existsSync(dotExe)) return dotExe;
  }
  showErrorBox("dot.exe not found", "Install Graphviz before you can use this program");
  throw Error("graphviz not found");
};

export function showAssemblies(assemblies: IAssemblies, config: Config): Image {
  const lines: string[] = [];
  lines.push("digraph SRC {");
  const filter = (key: string): boolean => config.isShown(key);
  Object.keys(assemblies)
    .filter(filter)
    .forEach((key) => {
      lines.push(`  "${key}" [shape=folder, id="${key}", href=foo];`);
      const references = assemblies[key];
      references.filter(filter).forEach((ref) => lines.push(`  "${key}" -> "${ref}" [id="${key}|${ref}", href=foo]`));
    });
  lines.push("}");
  const dotFilename = getAppFilename("assemblies.dot");
  const pngFilename = getAppFilename("assemblies.png");
  const mapFilename = getAppFilename("assemblies.map");
  fs.writeFileSync(dotFilename, lines.join(os.EOL));

  const dotExe = findDotExe();
  const args = [dotFilename, "-Tpng", `-o${pngFilename}`, "-Tcmapx", `-o${mapFilename}`, `-Nfontname="Segoe UI"`];

  const spawned = child_process.spawnSync(dotExe, args);
  if (spawned.status !== 0) showErrorBox("dot.exe failed", "" + spawned.error);

  const xml = fs.readFileSync(mapFilename, { encoding: "utf8" });

  return { imagePath: convertPathToUrl(pngFilename), areas: readXml(xml) };
}
