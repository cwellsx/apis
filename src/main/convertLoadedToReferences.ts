import type { ReferenceViewOptions, ViewGraph } from "../shared-types";
import { nameNodeId } from "../shared-types";
import { convertNamesToGroups } from "./convertNamesToGroups";
import { convertToImage } from "./convertToImage";
import { ImageAttribute } from "./createImage";
import type { AssemblyReferences } from "./loaded";
import { log } from "./log";
import { NodeIdMap, type Edge } from "./shared-types";

export const convertLoadedToReferences = (
  assemblyReferences: AssemblyReferences,
  viewOptions: ReferenceViewOptions,
  exes: string[]
): ViewGraph => {
  log("convertLoadedToView");
  // const known: Leaf[] = [];
  const edges: Edge[] = [];
  Object.entries(assemblyReferences).forEach(([assembly, dependencies]) => {
    // known.push({ nodeId: nameNodeId("assembly", assembly), label: assembly, parent: null });
    dependencies.forEach((dependency) =>
      edges.push({
        clientId: nameNodeId("assembly", assembly),
        serverId: nameNodeId("assembly", dependency),
        labels: [],
      })
    );
  });
  // flatten and sort all names -- these names will become leaf nodes
  const names: string[] = [];
  for (const [name, references] of Object.entries(assemblyReferences)) {
    names.push(name);
    names.push(...references);
  }
  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const { groups, leafs } = convertNamesToGroups(names, exes, "assembly");
  // if they're not grouped on the image then pass them all, including .NET assemblies
  // but we don't disassemble .NET so assign them a non-default ImageAttribute
  const imageAttributes = new NodeIdMap<ImageAttribute>();
  const known = Object.keys(assemblyReferences);
  Object.entries(leafs).forEach(([key, node]) => {
    if (!known.includes(key)) imageAttributes.set(node.nodeId, { shape: "none", className: "leaf-none" });
  });
  const image = convertToImage(
    viewOptions.nestedClusters ? groups : Object.values(leafs),
    edges,
    viewOptions,
    viewOptions.nestedClusters,
    imageAttributes
  );
  return { groups, image, viewOptions };
};
