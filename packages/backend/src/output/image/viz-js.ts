// import from "@viz-js/viz" can cause this error
//
// TS1479: The current file is a CommonJS module whose imports will produce 'require' calls; however, the referenced file is an ECMAScript module and cannot be imported with 'require'. Consider writing a dynamic 'import("@viz-js/viz")' call instead.
// To convert this file to an ECMAScript module, change its file extension to '.mts', or add the field `"type": "module"` to 'C:/Dev/apis/package.json'.
//
// That is becuase its package.json declares "type": "module"
// even though it has various builds in its dist folder
//
// I avoid this error for now by using webpack in both projects to bundle the modules
// which avoids the error as long as transpileOnly: true is set in ts-loader options
//
// If in future this causes problems, then code like the following might do instead
// i.e. a so-called "runtime dynamic import"
//
// ```
// import type { Viz } from "@viz-js/viz";
//
// let viz: Viz | undefined;
//
// const getOrCreateViz = async (): Promise<Viz> => {
//   if (viz) return viz;
//   const mod = await import("@viz-js/viz"); // runtime dynamic import of ESM
//   const instanceFn = (mod as any).instance ?? (mod as any).default?.instance;
//   if (typeof instanceFn !== "function") throw new Error("Missing instance export");
//   viz = (await instanceFn()) as Viz;
//   return viz;
// };
// ```

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore TS1479 (see comment above)
import { instance, Viz } from "@viz-js/viz";
import { log } from "../../utils";

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
