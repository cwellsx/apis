export function remove<T>(items: T[], item: T) {
  const index = items.indexOf(item);
  items.splice(index, 1);
}

export function replace<T>(items: T[], oldItem: T, newItem: T) {
  const index = items.indexOf(oldItem);
  items.splice(index, 1, newItem);
}
