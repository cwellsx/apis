import { Loaded, Graphed } from "../shared-types";

export const graphLoaded = (loaded: Loaded): Graphed => {
  const result: Graphed = {
    nodes: [],
    edges: [],
  };
  const assemblies = loaded.assemblies;
  Object.entries(assemblies).forEach((entry) => {
    const [assembly, dependencies]: [string, string[]] = entry;
    result.nodes.push({ id: assembly, label: assembly });
    dependencies.forEach((dependency) => result.edges.push({ clientId: assembly, serverId: dependency }));
  });
  return result;
};
