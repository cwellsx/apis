import { ReferenceViewOptions } from "../shared-types";
import { AssemblyReferences } from "./loaded";
import { remove } from "./shared-types";

export const showAdjacent = (
  assemblyReferences: AssemblyReferences,
  viewOptions: ReferenceViewOptions,
  id: string
): void => {
  const leafVisible = viewOptions.leafVisible;
  if (!leafVisible) return; // initial default is that they are all visible

  const adjacent = new Set<string>();
  Object.entries(assemblyReferences).forEach(([assembly, dependencies]) => {
    if (assembly === id) dependencies.forEach((dependency) => adjacent.add(dependency));
    else if (dependencies.includes(id)) adjacent.add(assembly);
  });
  leafVisible.forEach((leaf) => adjacent.add(leaf));
  viewOptions.leafVisible = [...adjacent];
};

export const hide = (assemblyReferences: AssemblyReferences, viewOptions: ReferenceViewOptions, id: string): void => {
  // initial default is that they are all visible
  const leafVisible = viewOptions.leafVisible ?? Object.keys(assemblyReferences);

  remove(leafVisible, id);
  viewOptions.leafVisible = leafVisible;
};
