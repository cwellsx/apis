import { instance, Viz } from "@viz-js/viz";
import child_process from "child_process";
import path from "path";
import { showErrorBox } from "../../electron-app/src/main/showErrorBox";
import { existsSync } from "./fs";
import { log } from "./log";

const findDotExe = (): string => {
  const graphvizDirs = [`C:\\Program Files (x86)\\Graphviz\\bin`, `C:\\Program Files\\Graphviz\\bin`];
  for (const graphvizDir of graphvizDirs) {
    const dotExe = path.join(graphvizDir, "dot.exe");
    if (existsSync(dotExe)) return dotExe;
  }
  showErrorBox("dot.exe not found", "Install Graphviz before you can use this program");
  throw new Error("graphviz not found");
};

export const runDotExe = (dotFilename: string, pngFilename: string, mapFilename: string): void => {
  log("launch GraphViz");
  const dotExe = findDotExe();
  const args = [dotFilename, "-Tpng", `-o${pngFilename}`, "-Tcmapx", `-o${mapFilename}`, `-Nfontname="Segoe UI"`];
  const spawned = child_process.spawnSync(dotExe, args);
  if (spawned.status !== 0) throw new Error(`dot.exe failed: ${spawned.error}`);
};

let viz: Viz | undefined = undefined;

const getOrCreateViz = async (): Promise<Viz> => {
  if (!viz) {
    log("Instantiate Viz.js");
    viz = await instance();
  }
  return viz;
};

export const runVizJs = async (dotText: string, format: string): Promise<string> => {
  const viz = await getOrCreateViz();
  log("Invoke Viz.js");
  return viz.renderString(dotText, { format });
};

export const getVizJsFormats = async (): Promise<string[]> => {
  const viz = await getOrCreateViz();
  log("Return Viz.js formats");
  return viz.formats;
};
