import type { AssemblyReferences } from "../../contracts-dotnet";
import type { GraphFilter, GraphOptions } from "../../contracts-ui";
import { Edges, toNameNodeId } from "../../nodeIds";
import { log } from "../../utils";
import { convertNamesToNodes } from "./convertNamesToNodes";
import { convertToImage } from "./convertToImage";
import type { GraphData } from "./graphData";

export const convertLoadedToReferences = (
  assemblyReferences: AssemblyReferences,
  graphViewOptions: GraphOptions.References,
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

  const imageData = convertToImage(
    nestedClusters ? groups : Object.values(leafs),
    edges,
    graphViewOptions,
    graphFilter,
    nestedClusters
  );
  return { groups, imageData, graphViewOptions, graphFilter };
};
