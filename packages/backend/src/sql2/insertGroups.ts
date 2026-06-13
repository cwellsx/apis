const maxLevels = 2;

export const getGroupNames = (names: string[]): string[] => {
  // this create synthetic group nodes which act as parent nodes to real assembly and/or namespace names
  // the purpose of this filter is to ensure that groups contain nodes but not vice versa
  // e.g. with nodes "foo.bar" and "foo.bar.baz.bat" there should not be synthetic group for "foo.bar.baz"
  const splitNames = [...new Set<string>(names)].map((name) => name.split("."));

  // if names are "foo.bar.baz" and "foo.bar.bat" then the group name should be "foo.bar" but not "foo"
  const groupedNames = new Set<string>(splitNames.map((split) => split.slice(0, maxLevels).join(".")));
  const splitGroupedNames = [...groupedNames].map((name) => name.split("."));

  const result = new Set<string>();

  for (let i = 0; i < maxLevels; ++i) {
    const split = i === maxLevels - 1 ? splitNames : splitGroupedNames;
    const candidates = split.filter((split) => split.length > i).map((split) => split.slice(0, i + 1).join("."));

    // exclude candidates where the group would have only one member
    const counts = new Map<string, number>();
    candidates.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    const wanted = new Set<string>(candidates.filter((value) => counts.get(value)! > 1));

    [...wanted].forEach((candidate) => result.add(candidate));
  }
  return [...result];
};
