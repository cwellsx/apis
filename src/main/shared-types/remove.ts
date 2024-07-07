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

export const uniqueStrings = (strings: string[]): string[] => [...new Set<string>(strings)];

export const getOrSet = <K, V>(map: Map<K, V>, key: K, create: () => V) => {
  let found = map.get(key);
  if (!found) {
    found = create();
    map.set(key, found);
  }
  return found;
};

export const mapOfMaps = <K, K2, V>(records: [K, K2, V][]): Map<K, Map<K2, V>> => {
  const result = new Map<K, Map<K2, V>>();
  records.forEach(([key, key2, value]) => {
    const map = getOrSet(result, key, () => new Map<K2, V>());
    map.set(key2, value);
  });
  return result;
};

export const getMapped = <K, K2, V>(map: Map<K, Map<K2, V>>, key: K, key2: K2): V => {
  const result = map.get(key)?.get(key2);
  if (result === undefined) throw new Error(`Value not found for keys ${key}, ${key2}`);
  return result;
};
