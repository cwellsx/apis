import type { AssemblyReferences } from "../../contracts-dotnet";
import type { GraphFilter, ReferenceViewOptions } from "../../contracts-ui";
import { Edges, NodeIdMap, toNameNodeId } from "../../nodeIds";
import { log } from "../../utils";
import { GraphData, ImageAttribute } from "../imageDataTypes";
import { convertNamesToNodes } from "./convertNamesToNodes";
import { convertToImage } from "./convertToImage";

export const convertLoadedToReferences = (
  assemblyReferences: AssemblyReferences,
  graphViewOptions: ReferenceViewOptions,
  graphFilter: GraphFilter,
  exes: string[]
): GraphData => {
  log("convertLoadedToView");

  const edges: Edges = new Edges();

  Object.entries(assemblyReferences).forEach(([assembly, dependencies]) => {
    dependencies.forEach((dependency) =>
      edges.addOrUpdate(toNameNodeId("assembly", assembly), toNameNodeId("assembly", dependency), [], true)
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
  const imageData = convertToImage(
    nestedClusters ? groups : Object.values(leafs),
    edges,
    graphViewOptions,
    graphFilter,
    nestedClusters,
    imageAttributes
  );
  return { groups, imageData, graphViewOptions, graphFilter };
};
