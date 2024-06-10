import type {
  ClusterBy,
  EdgeId,
  GroupByNodeId,
  MetadataNodeId,
  MethodNodeId,
  NameNodeId,
  NameTypes,
  NodeId,
} from "../../shared-types";

// type predicate

export const isMethodNodeId = (nodeId: NodeId): nodeId is MethodNodeId => nodeId.type === "method";
export const isNameNodeId = (nodeId: NodeId, type: NameTypes): nodeId is NameNodeId => nodeId.type === type;
export const isEdgeId = (id: NodeId | EdgeId): id is EdgeId => (id as EdgeId).clientId !== undefined;

// equality

const nodeIdEquals = (lhs: NodeId, rhs: NodeId): boolean => {
  if (lhs.type != rhs.type) return false;

  const nameNodeIdEquals = (lhs: NameNodeId, rhs: NameNodeId): boolean => lhs.name == rhs.name;
  const groupByNodeIdEquals = (lhs: GroupByNodeId, rhs: GroupByNodeId): boolean =>
    lhs.groupBy == rhs.groupBy && lhs.groupLabel === rhs.groupLabel;
  const metadataNodeIdEquals = (lhs: MetadataNodeId, rhs: MetadataNodeId): boolean =>
    lhs.assemblyName == rhs.assemblyName && lhs.metadataToken === rhs.metadataToken;

  switch (lhs.type) {
    case "namespace":
    case "assembly":
    case "group":
    case "customLeaf":
      return nameNodeIdEquals(lhs, rhs as NameNodeId);
    case "customGroup":
      return groupByNodeIdEquals(lhs, rhs as GroupByNodeId);
    case "method":
    case "type":
    case "field":
    case "event":
    case "property":
      return metadataNodeIdEquals(lhs, rhs as MetadataNodeId);
    case "attribute":
    case "exception":
    default:
      throw new Error(`nodeIdEquals unhandled nodeId type "${lhs.type}"`);
  }
};

// NodeId[]

export const toggleNodeId = (array: NodeId[], element: NodeId): void => {
  const index = array.findIndex((found) => nodeIdEquals(found, element));
  if (index === -1) array.push(element);
  else array.splice(index, 1);
};

export const removeNodeId = (array: NodeId[], element: NodeId): void => {
  const index = array.findIndex((found) => nodeIdEquals(found, element));
  if (index === -1) throw new Error("removeNodeId element not found");
  else array.splice(index, 1);
};

export const getClusterNames = (array: NodeId[], clusterBy: ClusterBy): string[] =>
  array.filter((nodeId) => isNameNodeId(nodeId, clusterBy)).map((nodeId) => (nodeId as NameNodeId).name);

export const createLookupNodeId = (array: NodeId[]): ((nodeId: NodeId) => boolean) => {
  const lookupNodeId = (nodeId: NodeId): boolean => array.some((found) => nodeIdEquals(found, nodeId));
  return lookupNodeId;
};

export class NodeIdSet {
  private array: NodeId[] = [];
  private findIndex: (key: NodeId) => number;
  add: (key: NodeId) => void;
  has: (key: NodeId) => boolean;

  constructor() {
    this.findIndex = (key: NodeId): number => this.array.findIndex((found) => nodeIdEquals(found, key));
    this.add = (key: NodeId): void => {
      if (!this.has(key)) this.array.push(key);
    };
    this.has = (key: NodeId): boolean => this.findIndex(key) !== -1;
  }
}

export class NodeIdMap<TValue> {
  private array: { key: NodeId; value: TValue }[] = [];
  private findIndex: (key: NodeId) => number;
  set: (key: NodeId, value: TValue) => void;
  get: (key: NodeId) => TValue | undefined;
  getOrThrow: (key: NodeId) => TValue;
  has: (key: NodeId) => boolean;
  combine: (other: NodeIdMap<TValue>) => NodeIdMap<TValue>;
  entries: () => [NodeId, TValue][];
  values: () => TValue[];
  length: () => number;

  constructor() {
    this.findIndex = (key: NodeId): number => this.array.findIndex((pair) => nodeIdEquals(pair.key, key));

    this.set = (key: NodeId, value: TValue): void => {
      const index = this.findIndex(key);
      if (index !== -1) this.array[index].value = value;
      else this.array.push({ key, value });
    };
    this.get = (key: NodeId): TValue | undefined => {
      const index = this.findIndex(key);
      return index !== -1 ? this.array[index].value : undefined;
    };
    this.getOrThrow = (key: NodeId): TValue => {
      const value = this.get(key);
      if (value) return value;
      throw new Error(`NodeIdMap not found ${key}`);
    };
    this.has = (key: NodeId): boolean => this.findIndex(key) !== -1;
    this.combine = (other: NodeIdMap<TValue>): NodeIdMap<TValue> => {
      const result = new NodeIdMap<TValue>();
      result.array.push(...this.array);
      other.array.forEach(({ key, value }) => result.set(key, value));
      return result;
    };
    this.entries = (): [NodeId, TValue][] => this.array.map((pair) => [pair.key, pair.value]);
    this.values = (): TValue[] => this.array.map((pair) => pair.value);
    this.length = (): number => this.array.length;
  }
}
