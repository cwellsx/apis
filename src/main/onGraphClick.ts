import type { ReferenceViewOptions } from "../shared-types";
import { isNameNodeId, nameNodeId, nodeIdToText, textToNodeId } from "../shared-types";
import type { AssemblyReferences } from "./loaded";

export const showAdjacent = (
  assemblyReferences: AssemblyReferences,
  viewOptions: ReferenceViewOptions,
  assemblyName: string
): void => {
  const leafVisible = viewOptions.leafVisible;
  if (!leafVisible) return; // initial default is that they are all visible

  const adjacent = new Set<string>();
  Object.entries(assemblyReferences).forEach(([assembly, dependencies]) => {
    if (assembly === assemblyName) dependencies.forEach((dependency) => adjacent.add(dependency));
    else if (dependencies.includes(assemblyName)) adjacent.add(assembly);
  });
  leafVisible.forEach((leaf) => {
    const nodeId = textToNodeId(leaf);
    if (!isNameNodeId(nodeId, "assembly")) throw new Error("Expected assembly Id");
    adjacent.add(nodeId.name);
  });
  viewOptions.leafVisible = [...adjacent].map((assemblyName) => nodeIdToText(nameNodeId("assembly", assemblyName)));
};
