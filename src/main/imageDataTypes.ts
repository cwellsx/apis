import type { AreaClass, ViewGraph, ViewGraphData } from "../shared-types";
import { createImage } from "./createImage";

export type Shape = "folder" | "rect" | "none" | "component";

export type ImageAttribute = {
  // used for leafs and for non-expanded groups
  shape?: Shape;
  // used for clusters i.e. for expanded groups -- https://graphviz.org/docs/attr-types/style/
  style?: "rounded";
  // if this is defined then this is the label and label is the tooltip
  shortLabel?: string;
  tooltip?: string;
  className?: AreaClass;
};

export type ImageText = ImageAttribute & {
  id: string;
  label: string;
  className: AreaClass;
};

type Subgraph = ImageText & { type: "subgraph"; children: ImageNode[] };
export type ImageNode = (ImageText & { type: "node" | "group" }) | Subgraph;

export type ImageData = {
  nodes: ImageNode[];
  edges: { clientId: string; serverId: string; edgeId: string; labels: string[]; titles: string[] }[];
  edgeDetails: boolean;
  hasParentEdges: boolean;
};

export type GraphData = ViewGraphData & {
  // string is a message if there isn't an Image
  imageData: ImageData;
};

export const createViewGraph = async (graphData: GraphData): Promise<ViewGraph> => {
  const { imageData, groups, graphFilter, graphViewOptions } = graphData;
  const image = await createImage(imageData);
  return { image, groups, graphFilter, graphViewOptions };
};
