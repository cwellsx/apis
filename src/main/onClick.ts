import { remove } from "./shared-types";
import { SqlLoaded } from "./sqlTables";

export const showAdjacent = (sqlLoaded: SqlLoaded, id: string): void => {
  const loaded = sqlLoaded.read();

  const leafVisible = sqlLoaded.viewState.leafVisible;
  if (!leafVisible) return; // initial default is that they are all visible

  const adjacent = new Set<string>();
  Object.entries(loaded.assemblies).forEach(([assembly, dependencies]) => {
    if (assembly === id) dependencies.forEach((dependency) => adjacent.add(dependency));
    else if (dependencies.includes(id)) adjacent.add(assembly);
  });
  leafVisible.forEach((leaf) => adjacent.add(leaf));
  sqlLoaded.viewState.leafVisible = [...adjacent];
};

export const hide = (sqlLoaded: SqlLoaded, id: string): void => {
  const loaded = sqlLoaded.read();
  // initial default is that they are all visible
  const leafVisible = sqlLoaded.viewState.leafVisible ?? Object.keys(loaded.assemblies);

  remove(leafVisible, id);
  sqlLoaded.viewState.leafVisible = leafVisible;
};
