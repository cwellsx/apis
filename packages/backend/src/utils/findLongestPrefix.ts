// the item whose label is the longest name segment prefix of the name -- Foo matches Foo and Foo.Bar, but not FooBar
export const findLongestPrefix = <T>(
  name: string,
  items: T[],
  getLabel: (item: T) => string,
  separator = "."
): T | undefined =>
  items.reduce<T | undefined>((previous, current) => {
    const currentLabel = getLabel(current);
    if (name !== currentLabel && !name.startsWith(`${currentLabel}${separator}`)) return previous;
    if (previous && getLabel(previous).length > currentLabel.length) return previous;
    return current;
  }, undefined);
