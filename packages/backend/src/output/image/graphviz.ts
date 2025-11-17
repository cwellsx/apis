import child_process from "child_process";
import path from "path";
import { existsSync, log } from "../../utils";

const findDotExe = (): string => {
  const graphvizDirs = [`C:\\Program Files (x86)\\Graphviz\\bin`, `C:\\Program Files\\Graphviz\\bin`];
  for (const graphvizDir of graphvizDirs) {
    const dotExe = path.join(graphvizDir, "dot.exe");
    if (existsSync(dotExe)) return dotExe;
  }
  throw new Error("Graphviz dot.exe not found. Please install Graphviz before you can use this program.");
};

export const runDotExe = (dotFilename: string, pngFilename: string, mapFilename: string): void => {
  log("launch GraphViz");
  const dotExe = findDotExe();
  const args = [dotFilename, "-Tpng", `-o${pngFilename}`, "-Tcmapx", `-o${mapFilename}`, `-Nfontname="Segoe UI"`];
  const spawned = child_process.spawnSync(dotExe, args);
  if (spawned.status !== 0) throw new Error(`dot.exe failed: ${spawned.error}`);
};
