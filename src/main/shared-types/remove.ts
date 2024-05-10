export function remove<T>(items: T[], item: T) {
  const index = items.indexOf(item);
  items.splice(index, 1);
}

export function replace<T>(items: T[], oldItem: T, newItem: T) {
  const index = items.indexOf(oldItem);
  items.splice(index, 1, newItem);
}

export function insert<T>(items: T[], index: number, newItem: T) {
  items.splice(index, 0, newItem);
}

export function distinctor<T>(equals: (lhs: T, rhs: T) => boolean) {
  const distinct = (item: T, index: number, items: T[]): boolean => {
    const predicate = (found: T): boolean => equals(item, found);
    const foundIndex = items.findIndex(predicate);
    return foundIndex === index;
  };
  return distinct;
}
