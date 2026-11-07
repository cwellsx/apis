import os from "os";
import type { Image } from "../contracts-ui";
import type { ImageData } from "../types";
import { log, options } from "../utils";
import { insertSvgMap } from "./insertSvgMap";
import { toDotFormat } from "./toDotFormat";
import { runVizJs } from "./viz-js";

export const renderImage = async (imageData: ImageData, hasParentEdges: boolean): Promise<Image | string> => {
  log("createImage");

  if (!imageData.edges.length && !imageData.roots.length) return "Empty graph, no nodes to display";

  // convert to *.dot file format lines
  const { lines, dotNodeMap, edgeLabels } = toDotFormat(imageData, hasParentEdges);
  const dotText = lines.join(os.EOL);

  const countImageNodes = dotNodeMap.size;

  const tooBig: string[] = [];
  if (imageData.edges.length > options.maxImageSize.edges)
    tooBig.push(`edges (actually ${imageData.edges.length} maximum is ${options.maxImageSize.edges})`);
  if (countImageNodes > options.maxImageSize.nodes)
    tooBig.push(`nodes (actually ${countImageNodes} maximum is ${options.maxImageSize.nodes})`);
  if (tooBig.length) return `Too many ${tooBig.join(", and ")}.`;

  const svg = await runVizJs(dotText, "svg");
  const xml = await runVizJs(dotText, "cmapx");

  return { svg: insertSvgMap(svg, xml) };
};
