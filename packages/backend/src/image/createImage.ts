import os from "os";
import { ConvertPathToUrl } from "../contracts-app";
import type { Image } from "../contracts-ui";
import { textIsEdgeId } from "../contracts-ui";
import { getAppFilename, getOrThrow, log, options, readFileSync, writeFileSync } from "../utils";
import { ExtraAttributes, convertXmlMapToAreas } from "./convertXmlMapToAreas";
import { getDotFormat } from "./getDotFormat";
import { runDotExe } from "./graphviz";
import type { CreateImage, ImageData } from "./imageDataTypes";
import { runVizJs } from "./viz-js";

/*
  This is implemented using Graphviz; this is the only module which uses (and therefore encapsulates) Graphviz.
*/

type UsingGraphViz = "usingJs" | "usingExe" | "usingBoth";
const usingGraphViz = (): UsingGraphViz => "usingJs"; // "usingBoth";
const logUsingJs = true;

export const bindImage = (convertPathToUrl: ConvertPathToUrl): CreateImage => {
  const usingBoth = async (
    dotText: string,
    getAreaAttributes: (id: string) => ExtraAttributes
  ): Promise<Image | string> => {
    // specify all the path ames
    const dotFilename = getAppFilename("assemblies.dot");
    const pngFilename = getAppFilename("assemblies.png");
    const mapFilename = getAppFilename("assemblies.map");
    // create the *.dot file
    writeFileSync(dotFilename, dotText);

    //const formats = await getVizJsFormats();
    const svgText = await runVizJs(dotText, "svg");
    const mapText = await runVizJs(dotText, "cmapx");

    const svgFilename = getAppFilename("assemblies.svg");
    writeFileSync(svgFilename, svgText);
    const map2Filename = getAppFilename("assemblies.map2");
    writeFileSync(map2Filename, mapText);

    // launch GraphViz
    runDotExe(dotFilename, pngFilename, mapFilename);

    // read the image *.map file
    const xml = readFileSync(mapFilename);

    return {
      imagePath: convertPathToUrl(pngFilename),
      areas: convertXmlMapToAreas(xml, getAreaAttributes),
      now: Date.now(),
    };
  };

  const usingJs = async (
    dotText: string,
    getAreaAttributes: (id: string) => ExtraAttributes
  ): Promise<Image | string> => {
    //const formats = await getVizJsFormats();
    const svgText = await runVizJs(dotText, "svg");
    const xml = await runVizJs(dotText, "cmapx");

    const svgFilename = getAppFilename("assemblies.svg");
    writeFileSync(svgFilename, svgText);

    // write the image *.map file
    if (logUsingJs) {
      const dotFilename = getAppFilename("assemblies.dot");
      const mapFilename = getAppFilename("assemblies.map");
      writeFileSync(dotFilename, dotText);
      writeFileSync(mapFilename, xml);
    }

    return {
      imagePath: convertPathToUrl(svgFilename),
      areas: convertXmlMapToAreas(xml, getAreaAttributes),
      now: Date.now(),
    };
  };

  const usingExe = (dotText: string, getAreaAttributes: (id: string) => ExtraAttributes): Image | string => {
    // specify all the path ames
    const dotFilename = getAppFilename("assemblies.dot");
    const pngFilename = getAppFilename("assemblies.png");
    const mapFilename = getAppFilename("assemblies.map");
    // create the *.dot file
    writeFileSync(dotFilename, dotText);

    // launch GraphViz
    runDotExe(dotFilename, pngFilename, mapFilename);

    // read the image *.map file
    const xml = readFileSync(mapFilename);

    return {
      imagePath: convertPathToUrl(pngFilename),
      areas: convertXmlMapToAreas(xml, getAreaAttributes),
      now: Date.now(),
    };
  };

  const createImage = async (imageData: ImageData): Promise<Image | string> => {
    log("createImage");

    if (!imageData.edges.length && !imageData.nodes.length) return "Empty graph, no nodes to display";

    // convert to *.dot file format lines
    const { lines, nodeMap, edgeTooltips } = getDotFormat(imageData);
    const dotText = lines.join(os.EOL);

    const countImageNodes = nodeMap.size;

    const tooBig: string[] = [];
    if (imageData.edges.length > options.maxImageSize.edges)
      tooBig.push(`edges (actually ${imageData.edges.length} maximum is ${options.maxImageSize.edges})`);
    if (countImageNodes > options.maxImageSize.nodes)
      tooBig.push(`nodes (actually ${countImageNodes} maximum is ${options.maxImageSize.nodes})`);
    if (tooBig.length) return `Too many ${tooBig.join(", and ")}.`;

    const getAreaAttributes = (id: string): ExtraAttributes => {
      if (textIsEdgeId(id)) {
        // this is the label of an edge, not the edge itself
        const edgeLabelTooltip = id.endsWith("-label") ? edgeTooltips[id.substring(0, id.length - 6)] : undefined;

        return { className: imageData.edgeDetails ? "edge-details" : "edge-none", edgeLabelTooltip };
      } else {
        const node = getOrThrow(nodeMap, id);
        return { className: node.className };
      }
    };

    switch (usingGraphViz()) {
      case "usingBoth":
        return await usingBoth(dotText, getAreaAttributes);
      case "usingExe":
        return usingExe(dotText, getAreaAttributes);
      case "usingJs":
        return await usingJs(dotText, getAreaAttributes);
    }
  };

  return createImage;
};
