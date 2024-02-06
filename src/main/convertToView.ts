import type { Groups, LeafNode, View, ViewOptions } from "../shared-types";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
import { convertToImage } from "./convertToImage";
import { createImage } from "./createImage";
import { log } from "./log";
import { options, type Edge, type Loaded, type StringPredicate } from "./shared-types";
import type { SqlLoaded } from "./sqlTables";

export const viewSqlLoaded = (sqlLoaded: SqlLoaded, first: boolean): View => {
  log("showSqlLoaded");
  // maybe we needn't read Loaded and calculate Groups more than once, but for now we do it every time
  const loaded: Loaded = sqlLoaded.read();
  const leafs: LeafNode[] = [];
  const edges: Edge[] = [];
  const viewOptions = sqlLoaded.viewState.viewOptions;
  Object.entries(loaded.assemblies).forEach(([assembly, dependencies]) => {
    leafs.push({ id: assembly, label: assembly, parent: null });
    dependencies.forEach((dependency) => edges.push({ clientId: assembly, serverId: dependency }));
  });
  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const groups = convertLoadedToGroups(loaded);
  const leafVisible = sqlLoaded.viewState.leafVisible ?? Object.keys(loaded.assemblies);
  const groupExpanded = sqlLoaded.viewState.groupExpanded ?? [];
  return showGraphed(groups, leafs, edges, leafVisible, groupExpanded, viewOptions, first);
};

const createLookup = (array: string[]): StringPredicate => {
  const temp = new Set(array);
  return (id: string) => temp.has(id);
};

function showGraphed(
  groups: Groups,
  leafs: LeafNode[],
  edges: Edge[],
  leafVisible: string[],
  groupExpanded: string[],
  viewOptions: ViewOptions,
  first: boolean
): View {
  const isLeafVisible = createLookup(leafVisible);
  const isGroupExpanded = createLookup(groupExpanded);
  const nodes = options.flatten ? leafs : groups;
  log("convertToImage");
  const imageData = convertToImage(nodes, edges, isLeafVisible, isGroupExpanded, viewOptions.showGrouped);
  log("createImage");
  const image =
    imageData.edges.length || imageData.nodes.length ? createImage(imageData) : "Empty graph, no nodes to display";
  log("showView");
  return { image, groups: first ? groups : null, leafVisible, groupExpanded, viewOptions };
}
