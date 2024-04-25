import type { Groups, LeafNode, View } from "../shared-types";
import { convertToImage } from "./convertToImage";
import { createImage } from "./createImage";
import { log } from "./log";
import { type Edge, type StringPredicate } from "./shared-types";
import type { ViewState } from "./sqlTables";

const createLookup = (array: string[]): StringPredicate => {
  const temp = new Set(array);
  return (id: string) => temp.has(id);
};

export function convertToView(groups: Groups, leafs: LeafNode[], edges: Edge[], viewState: ViewState): View {
  const { leafVisible, groupExpanded, viewOptions } = viewState;
  const isLeafVisible = createLookup(leafVisible);
  const isGroupExpanded = createLookup(groupExpanded);
  const nodes = viewOptions.showGrouped ? groups : leafs;
  log("convertToImage");
  const imageData = convertToImage(nodes, edges, isLeafVisible, isGroupExpanded, viewOptions.showGrouped, false);
  log("createImage");
  const image =
    imageData.edges.length || imageData.nodes.length ? createImage(imageData) : "Empty graph, no nodes to display";
  log("showView");
  return { image, groups, leafVisible, groupExpanded, viewOptions };
}
