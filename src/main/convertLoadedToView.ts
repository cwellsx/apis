import type { LeafNode, View } from "../shared-types";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
import { convertToView } from "./convertToView";
import { type Loaded } from "./loaded";
import { log } from "./log";
import { type Edge } from "./shared-types";
import type { SqlLoaded } from "./sqlTables";

export const convertLoadedToView = (sqlLoaded: SqlLoaded): View => {
  log("viewSqlLoaded");
  // maybe we needn't read Loaded and calculate Groups more than once, but for now we do it every time
  const loaded: Loaded = sqlLoaded.read();
  const leafs: LeafNode[] = [];
  const edges: Edge[] = [];
  Object.entries(loaded.assemblies).forEach(([assembly, dependencies]) => {
    leafs.push({ id: assembly, label: assembly, parent: null });
    dependencies.forEach((dependency) => edges.push({ clientId: assembly, serverId: dependency }));
  });
  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const groups = convertLoadedToGroups(loaded);
  return convertToView(groups, leafs, edges, sqlLoaded.viewState);
};
