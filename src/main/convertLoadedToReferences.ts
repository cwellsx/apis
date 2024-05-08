import type { Leaf, ReferenceViewOptions, ViewGraph } from "../shared-types";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
import { convertToImage } from "./convertToImage";
import type { AssemblyReferences } from "./loaded";
import { log } from "./log";
import { type Edge } from "./shared-types";

export const convertLoadedToReferences = (
  assemblyReferences: AssemblyReferences,
  viewOptions: ReferenceViewOptions,
  exes: string[]
): ViewGraph => {
  log("convertLoadedToView");
  const leafs: Leaf[] = [];
  const edges: Edge[] = [];
  Object.entries(assemblyReferences).forEach(([assembly, dependencies]) => {
    leafs.push({ id: assembly, label: assembly, parent: null });
    dependencies.forEach((dependency) => edges.push({ clientId: assembly, serverId: dependency }));
  });
  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const groups = convertLoadedToGroups(assemblyReferences, exes);
  const image = convertToImage(groups, leafs, edges, viewOptions);
  return { groups, image, viewOptions };
};
