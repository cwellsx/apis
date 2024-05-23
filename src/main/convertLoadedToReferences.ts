import type { Leaf, ReferenceViewOptions, ViewGraph } from "../shared-types";
import { nameNodeId } from "../shared-types";
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
    leafs.push({ nodeId: nameNodeId("assembly", assembly), label: assembly, parent: null });
    dependencies.forEach((dependency) =>
      edges.push({ clientId: nameNodeId("assembly", assembly), serverId: nameNodeId("assembly", dependency) })
    );
  });
  // flatten and sort all names -- these names will become leaf nodes
  const names: string[] = [];
  for (const [name, references] of Object.entries(assemblyReferences)) {
    names.push(name);
    names.push(...references);
  }
  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const { groups } = convertLoadedToGroups(names, exes, "assembly");
  const image = convertToImage(viewOptions.showGrouped ? groups : leafs, edges, viewOptions);
  return { groups, image, viewOptions };
};
