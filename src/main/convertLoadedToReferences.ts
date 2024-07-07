import type { GraphFilter, ReferenceViewOptions, ViewGraph } from "../shared-types";
import { nameNodeId } from "../shared-types";
import { convertNamesToNodes } from "./convertNamesToNodes";
import { convertToImage } from "./convertToImage";
import { ImageAttribute } from "./createImage";
import type { AssemblyReferences } from "./loaded";
import { log } from "./log";
import { NodeIdMap, type Edge } from "./shared-types";

export const convertLoadedToReferences = (
  assemblyReferences: AssemblyReferences,
  graphViewOptions: ReferenceViewOptions,
  graphFilter: GraphFilter,
  exes: string[]
): ViewGraph => {
  log("convertLoadedToView");

  const edges: Edge[] = [];
  Object.entries(assemblyReferences).forEach(([assembly, dependencies]) => {
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
  const nestedClusters = graphViewOptions.nestedClusters;
  const { groups, leafs } = convertNamesToNodes(names, exes, "assembly", nestedClusters);
  // if they're not grouped on the image then pass them all, including .NET assemblies
  // but we don't disassemble .NET so assign them a non-default ImageAttribute
  const imageAttributes = new NodeIdMap<ImageAttribute>();
  const known = Object.keys(assemblyReferences);
  Object.entries(leafs).forEach(([key, node]) => {
    if (!known.includes(key)) imageAttributes.set(node.nodeId, { shape: "none", className: "leaf-none" });
  });
  const image = convertToImage(
    nestedClusters ? groups : Object.values(leafs),
    edges,
    graphViewOptions,
    graphFilter,
    nestedClusters,
    imageAttributes
  );
  return { groups, image, graphViewOptions, graphFilter };
};
