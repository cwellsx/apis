import { CustomViewOptions, Leaf, ViewGraph } from "../shared-types";
import { convertToImage } from "./convertToImage";
import { CustomNode } from "./isCustomJson";
import { log } from "./log";
import { Edge } from "./shared-types";

export const convertLoadedToCustom = (nodes: CustomNode[], viewOptions: CustomViewOptions): ViewGraph => {
  log("convertLoadedToView");
  const leafs: Leaf[] = [];
  const edges: Edge[] = [];
  nodes.forEach((node) => {
    leafs.push({
      label: node.label ?? node.id,
      id: node.id,
      parent: null,
    });
    node.dependencies.forEach((dependency) => {
      edges.push({
        clientId: node.id,
        serverId: dependency.id,
        label: dependency.label,
      });
    });
  });
  const image = convertToImage(leafs, edges, viewOptions);
  return { groups: leafs, image, viewOptions };
};
