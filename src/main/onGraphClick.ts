import { AssemblyReferences } from "./loaded";
import { remove } from "./shared-types";
import { ViewState } from "./sqlTables";

export const showAdjacent = (assemblyReferences: AssemblyReferences, viewState: ViewState, id: string): void => {
  const leafVisible = viewState.leafVisible;
  if (!leafVisible) return; // initial default is that they are all visible

  const adjacent = new Set<string>();
  Object.entries(assemblyReferences).forEach(([assembly, dependencies]) => {
    if (assembly === id) dependencies.forEach((dependency) => adjacent.add(dependency));
    else if (dependencies.includes(id)) adjacent.add(assembly);
  });
  leafVisible.forEach((leaf) => adjacent.add(leaf));
  viewState.leafVisible = [...adjacent];
};

export const hide = (assemblyReferences: AssemblyReferences, viewState: ViewState, id: string): void => {
  // initial default is that they are all visible
  const leafVisible = viewState.leafVisible ?? Object.keys(assemblyReferences);

  remove(leafVisible, id);
  viewState.leafVisible = leafVisible;
};
