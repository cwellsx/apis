import type { LeafNode, View } from "../shared-types";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
import { convertToView } from "./convertToView";
import { AssemblyReferences } from "./loaded";
import { log } from "./log";
import { type Edge } from "./shared-types";
import type { ViewState } from "./sqlTables";

export const convertLoadedToView = (assemblyReferences: AssemblyReferences, viewState: ViewState): View => {
  log("convertLoadedToView");
  const leafs: LeafNode[] = [];
  const edges: Edge[] = [];
  Object.entries(assemblyReferences).forEach(([assembly, dependencies]) => {
    leafs.push({ id: assembly, label: assembly, parent: null });
    dependencies.forEach((dependency) => edges.push({ clientId: assembly, serverId: dependency }));
  });
  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const groups = convertLoadedToGroups(assemblyReferences, viewState.exes);
  return convertToView(groups, leafs, edges, viewState);
};
