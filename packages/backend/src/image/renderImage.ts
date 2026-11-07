import os from "os";
import type { Image } from "../contracts-ui";
import type { ImageData } from "../types";
import { log, options } from "../utils";
import { insertSvgMap } from "./insertSvgMap";
import { toDotFormat } from "./toDotFormat";
import { runVizJs } from "./viz-js";

export const createImage = async (
  imageData: ImageData,
  hasParentEdges: boolean
): Promise<{ dotText: string; mapXml: string; svg: string } | string> => {
  log("createImage");
  if (!imageData.edges.length && !imageData.roots.length) return "Empty graph, no nodes to display";

  const { lines, countImageNodes, nodeLabels, edgeLabels } = toDotFormat(imageData, hasParentEdges);
  const dotText = lines.join(os.EOL);

  const tooBig: string[] = [];
  if (imageData.edges.length > options.maxImageSize.edges)
    tooBig.push(`edges (actually ${imageData.edges.length} maximum is ${options.maxImageSize.edges})`);
  if (countImageNodes > options.maxImageSize.nodes)
    tooBig.push(`nodes (actually ${countImageNodes} maximum is ${options.maxImageSize.nodes})`);
  if (tooBig.length) return `Too many ${tooBig.join(", and ")}.`;

  const svgRaw = await runVizJs(dotText, "svg");
  const mapXml = await runVizJs(dotText, "cmapx");

  const svg = insertSvgMap(svgRaw, mapXml, nodeLabels, edgeLabels);
  return { dotText, mapXml, svg };
};

export const renderImage = async (imageData: ImageData, hasParentEdges: boolean): Promise<Image | string> => {
  const result = await createImage(imageData, hasParentEdges);
  if (typeof result === "string") return result;
  return { svg: result.svg };
};
