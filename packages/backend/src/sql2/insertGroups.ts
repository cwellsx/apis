export const getGroupNames = (names: string[]): string[] => {
  // this create synthetic group nodes which act as parent nodes to real assembly and/or namespace names
  // the purpose of this filter is to ensure that groups contain nodes but not vice versay
  // e.g. with nodes "foo.bar" and "foo.bar.baz.bat" there should not be synthetic group for "foo.bar.baz"
  const filtered = names.filter(
    (candidate) => !names.some((other) => other != candidate && candidate.startsWith(other))
  );
  const all = new Set<string>(filtered);
  const splits = [...all].map((name) => name.split("."));
  const max = Math.max(...splits.map((split) => split.length));
  const result = new Set<string>();

  for (let i = max - 1; i >= 1; --i) {
    // exclude groups which match an existing name
    const candidates = splits
      .filter((split) => split.length >= i)
      .map((split) => split.slice(0, i).join("."))
      .filter((value) => !all.has(value));

    // exclude candidates where the group would have only one member
    const counts = new Map<string, number>();
    candidates.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    const wanted = new Set<string>(candidates.filter((value) => counts.get(value)! > 1));

    [...wanted].forEach((candidate) => result.add(candidate));
  }
  return [...result];
};
