import type {
  AssemblyNodeId,
  ClusterBy,
  EdgeId,
  GroupByNodeId,
  MetadataNodeId,
  MetadataTypes,
  MethodNodeId,
  NameNodeId,
  NameTypes,
  NodeId,
} from "../../shared-types";
import { getOrSet } from "./remove";

// type predicate

export const isMethodNodeId = (nodeId: NodeId): nodeId is MethodNodeId => nodeId.type === "method";
export const isAssemblyNodeId = (nodeId: NodeId): nodeId is AssemblyNodeId => nodeId.type === "assembly";
export const isEdgeId = (id: NodeId | EdgeId): id is EdgeId => (id as EdgeId).clientId !== undefined;

const isClusterNodeId = (nodeId: NodeId, type: ClusterBy): nodeId is NameNodeId => nodeId.type === type;

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

export const addNodeId = (array: NodeId[], element: NodeId): void => {
  const index = array.findIndex((found) => nodeIdEquals(found, element));
  if (index === -1) array.push(element);
};

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
  array.filter((nodeId) => isClusterNodeId(nodeId, clusterBy)).map((nodeId) => (nodeId as NameNodeId).name);

export const createLookupNodeId = (array: NodeId[]): ((nodeId: NodeId) => boolean) => {
  const lookupNodeId = (nodeId: NodeId): boolean => array.some((found) => nodeIdEquals(found, nodeId));
  return lookupNodeId;
};

export class NodeIdSet {
  private array: NodeId[] = [];
  add: (key: NodeId) => void;
  has: (key: NodeId) => boolean;

  constructor() {
    const findIndex = (key: NodeId): number => this.array.findIndex((found) => nodeIdEquals(found, key));

    this.add = (key: NodeId): void => {
      if (!this.has(key)) this.array.push(key);
    };
    this.has = (key: NodeId): boolean => findIndex(key) !== -1;
  }
}

interface INodeIdMap<TValue, TKey extends NodeId = NodeId> {
  set: (key: TKey, value: TValue) => void;
  get: (key: TKey) => TValue | undefined;
  getOrThrow: (key: TKey) => TValue;
  getOrSet: (key: TKey, getValue: () => TValue) => void;
  has: (key: TKey) => boolean;
  keys: () => TKey[];
  entries: () => [TKey, TValue][];
  values: () => TValue[];
  length: () => number;
}

export class NameNodeIdMap<TValue, TKey extends NameNodeId = NameNodeId> implements INodeIdMap<TValue, TKey> {
  private map: Map<string, TValue> = new Map<string, TValue>();
  private type: NameTypes;
  private makeKey: (name: string) => TKey;

  set: (key: TKey, value: TValue) => void;
  get: (key: TKey) => TValue | undefined;
  getOrThrow: (key: TKey) => TValue;
  getOrSet: (key: TKey, getValue: () => TValue) => TValue;
  has: (key: TKey) => boolean;
  keys: () => TKey[];
  entries: () => [TKey, TValue][];
  values: () => TValue[];
  length: () => number;

  constructor(type: NameTypes) {
    this.type = type;

    this.makeKey = (name: string): TKey => ({ type: this.type, name } as TKey);

    this.set = (key: TKey, value: TValue): void => {
      if (key.type != this.type) throw new Error("Unexpected key type");
      getOrSet(this.map, key.name, () => value);
    };
    this.get = (key: TKey): TValue | undefined => {
      return this.map.get(key.name);
    };
    this.getOrThrow = (key: TKey): TValue => {
      const value = this.get(key);
      if (value) return value;
      throw new Error(`NodeIdMap not found ${key}`);
    };
    this.getOrSet = (key: TKey, getValue: () => TValue): TValue => {
      let value = this.get(key);
      if (!value) {
        value = getValue();
        this.set(key, value);
      }
      return value;
    };
    this.has = (key: TKey): boolean => {
      return this.map.has(key.name);
    };
    this.keys = (): TKey[] => {
      const result: TKey[] = [];
      for (const name of this.map.keys()) {
        result.push(this.makeKey(name));
      }
      return result;
    };
    this.entries = (): [TKey, TValue][] => {
      const result: [TKey, TValue][] = [];
      for (const [name, value] of this.map.entries()) {
        result.push([this.makeKey(name), value]);
      }
      return result;
    };
    this.values = (): TValue[] => {
      const result: TValue[] = [];
      for (const value of this.map.values()) {
        result.push(value);
      }
      return result;
    };
    this.length = (): number => this.map.size;
  }
}

export class MetadataNodeIdMap<TValue, TKey extends MetadataNodeId = MetadataNodeId>
  implements INodeIdMap<TValue, TKey>
{
  private maps: Map<string, Map<number, TValue>> = new Map<string, Map<number, TValue>>();
  private type: MetadataTypes;
  private makeKey: (assemblyName: string, metadataToken: number) => TKey;

  set: (key: TKey, value: TValue) => void;
  get: (key: TKey) => TValue | undefined;
  getOrThrow: (key: TKey) => TValue;
  getOrSet: (key: TKey, getValue: () => TValue) => TValue;
  has: (key: TKey) => boolean;
  keys: () => TKey[];
  entries: () => [TKey, TValue][];
  values: () => TValue[];
  length: () => number;
  combine: (other: MetadataNodeIdMap<TValue, TKey>) => MetadataNodeIdMap<TValue, TKey>;

  constructor(type: MetadataTypes) {
    this.type = type;

    this.makeKey = (assemblyName: string, metadataToken: number): TKey =>
      ({ type: this.type, assemblyName, metadataToken } as TKey);

    this.set = (key: TKey, value: TValue): void => {
      if (key.type != this.type) throw new Error("Unexpected key type");
      const map = getOrSet(this.maps, key.assemblyName, () => new Map<number, TValue>());
      if (!map.has(key.metadataToken)) map.set(key.metadataToken, value);
    };
    this.get = (key: TKey): TValue | undefined => {
      return this.maps.get(key.assemblyName)?.get(key.metadataToken);
    };
    this.getOrThrow = (key: TKey): TValue => {
      const value = this.get(key);
      if (value) return value;
      throw new Error(`NodeIdMap not found ${key}`);
    };
    this.getOrSet = (key: TKey, getValue: () => TValue): TValue => {
      let value = this.get(key);
      if (!value) {
        value = getValue();
        this.set(key, value);
      }
      return value;
    };
    this.has = (key: TKey): boolean => {
      return this.maps.get(key.assemblyName)?.has(key.metadataToken) ?? false;
    };
    this.keys = (): TKey[] => {
      const result: TKey[] = [];
      for (const [assemblyName, map] of this.maps.entries()) {
        for (const metadataToken of map.keys()) {
          result.push(this.makeKey(assemblyName, metadataToken));
        }
      }
      return result;
    };
    this.entries = (): [TKey, TValue][] => {
      const result: [TKey, TValue][] = [];
      for (const [assemblyName, map] of this.maps.entries()) {
        for (const [metadataToken, value] of map.entries()) {
          result.push([this.makeKey(assemblyName, metadataToken), value]);
        }
      }
      return result;
    };
    this.values = (): TValue[] => {
      const result: TValue[] = [];
      for (const map of this.maps.values()) {
        for (const value of map.values()) {
          result.push(value);
        }
      }
      return result;
    };
    this.length = (): number => {
      let result = 0;
      for (const map of this.maps.values()) {
        result += map.size;
      }
      return result;
    };

    this.combine = (other: MetadataNodeIdMap<TValue, TKey>): MetadataNodeIdMap<TValue, TKey> => {
      const maps = new Map<string, Map<number, TValue>>(this.maps);
      const result = new MetadataNodeIdMap<TValue, TKey>(this.type);
      result.maps = maps;
      other.entries().forEach(([key, value]) => result.set(key, value));
      return result;
    };
  }
}

export class GroupByNodeIdMap<TValue> implements INodeIdMap<TValue, GroupByNodeId> {
  private maps: Map<string, Map<string, TValue>> = new Map<string, Map<string, TValue>>();

  set: (key: GroupByNodeId, value: TValue) => void;
  get: (key: GroupByNodeId) => TValue | undefined;
  getOrThrow: (key: GroupByNodeId) => TValue;
  getOrSet: (key: GroupByNodeId, getValue: () => TValue) => TValue;
  has: (key: GroupByNodeId) => boolean;
  keys: () => GroupByNodeId[];
  entries: () => [GroupByNodeId, TValue][];
  values: () => TValue[];
  length: () => number;

  constructor() {
    this.set = (key: GroupByNodeId, value: TValue): void => {
      const map = getOrSet(this.maps, key.groupBy, () => new Map<string, TValue>());
      if (!map.has(key.groupLabel)) map.set(key.groupLabel, value);
    };
    this.get = (key: GroupByNodeId): TValue | undefined => {
      return this.maps.get(key.groupBy)?.get(key.groupLabel);
    };
    this.getOrThrow = (key: GroupByNodeId): TValue => {
      const value = this.get(key);
      if (value) return value;
      throw new Error(`NodeIdMap not found ${key}`);
    };
    this.getOrSet = (key: GroupByNodeId, getValue: () => TValue): TValue => {
      let value = this.get(key);
      if (!value) {
        value = getValue();
        this.set(key, value);
      }
      return value;
    };
    this.has = (key: GroupByNodeId): boolean => {
      return this.maps.get(key.groupBy)?.has(key.groupLabel) ?? false;
    };
    this.keys = (): GroupByNodeId[] => {
      const result: GroupByNodeId[] = [];
      for (const [groupBy, map] of this.maps.entries()) {
        for (const groupLabel of map.keys()) {
          result.push({ type: "customGroup", groupBy, groupLabel });
        }
      }
      return result;
    };
    this.entries = (): [GroupByNodeId, TValue][] => {
      const result: [GroupByNodeId, TValue][] = [];
      for (const [groupBy, map] of this.maps.entries()) {
        for (const [groupLabel, value] of map.entries()) {
          result.push([{ type: "customGroup", groupBy, groupLabel }, value]);
        }
      }
      return result;
    };
    this.values = (): TValue[] => {
      const result: TValue[] = [];
      for (const map of this.maps.values()) {
        for (const value of map.values()) {
          result.push(value);
        }
      }
      return result;
    };
    this.length = (): number => {
      let result = 0;
      for (const map of this.maps.values()) {
        result += map.size;
      }
      return result;
    };
  }
}

type Data<TValue> = {
  namespace: NameNodeIdMap<TValue>;
  assembly: NameNodeIdMap<TValue>;
  group: NameNodeIdMap<TValue>;
  customLeaf: NameNodeIdMap<TValue>;

  customGroup: GroupByNodeIdMap<TValue>;

  method: MetadataNodeIdMap<TValue>;
  type: MetadataNodeIdMap<TValue>;
  field: MetadataNodeIdMap<TValue>;
  event: MetadataNodeIdMap<TValue>;
  property: MetadataNodeIdMap<TValue>;
  memberException: MetadataNodeIdMap<TValue>;

  // attribute: number;
  // exception: number;
};

const metadataTypes = new Set<string>(["method", "type", "field", "event", "property", "memberException"]);
const isMetadataType = (type: string): type is MetadataTypes => metadataTypes.has(type);
const isMetadataNodeId = (key: NodeId): key is MetadataNodeId => isMetadataType(key.type);

const nameTypes = new Set<string>(["namespace", "assembly", "group", "customLeaf"]);
const isNameType = (type: string): type is NameTypes => nameTypes.has(type);
export const isNameNodeId = (key: NodeId): key is NameNodeId => isNameType(key.type);

const isGroupByNodeId = (key: NodeId): key is GroupByNodeId => key.type === "customGroup";

export class NodeIdMap<TValue> {
  // private array: { key: NodeId; value: TValue }[] = [];
  private data: Data<TValue>;
  set: (key: NodeId, value: TValue) => void;
  get: (key: NodeId) => TValue | undefined;
  getOrThrow: (key: NodeId) => TValue;
  has: (key: NodeId) => boolean;
  keys: () => NodeId[];
  entries: () => [NodeId, TValue][];
  values: () => TValue[];
  length: () => number;

  constructor() {
    this.data = {
      namespace: new NameNodeIdMap<TValue>("namespace"),
      assembly: new NameNodeIdMap<TValue>("assembly"),
      group: new NameNodeIdMap<TValue>("group"),
      customLeaf: new NameNodeIdMap<TValue>("customLeaf"),

      customGroup: new GroupByNodeIdMap<TValue>(),

      method: new MetadataNodeIdMap<TValue>("method"),
      type: new MetadataNodeIdMap<TValue>("type"),
      field: new MetadataNodeIdMap<TValue>("field"),
      event: new MetadataNodeIdMap<TValue>("event"),
      property: new MetadataNodeIdMap<TValue>("property"),
      memberException: new MetadataNodeIdMap<TValue>("memberException"),
    };

    this.set = (key: NodeId, value: TValue): void => {
      if (isMetadataNodeId(key)) {
        const maps = this.data[key.type];
        maps.set(key, value);
      } else if (isNameNodeId(key)) {
        const maps = this.data[key.type];
        maps.set(key, value);
      } else if (isGroupByNodeId(key)) {
        const maps = this.data[key.type];
        maps.set(key, value);
      } else {
        throw new Error(`Unsupported type ${key.type}`);
      }
    };
    this.get = (key: NodeId): TValue | undefined => {
      if (isMetadataNodeId(key)) {
        const maps = this.data[key.type];
        return maps.get(key);
      } else if (isNameNodeId(key)) {
        const maps = this.data[key.type];
        return maps.get(key);
      } else if (isGroupByNodeId(key)) {
        const maps = this.data[key.type];
        return maps.get(key);
      } else {
        throw new Error(`Unsupported type ${key.type}`);
      }
    };
    this.getOrThrow = (key: NodeId): TValue => {
      const value = this.get(key);
      if (value) return value;
      throw new Error(`NodeIdMap not found ${key}`);
    };
    this.has = (key: NodeId): boolean => {
      if (isMetadataNodeId(key)) {
        const maps = this.data[key.type];
        return maps.has(key);
      } else if (isNameNodeId(key)) {
        const maps = this.data[key.type];
        return maps.has(key);
      } else if (isGroupByNodeId(key)) {
        const maps = this.data[key.type];
        return maps.has(key);
      } else {
        throw new Error(`Unsupported type ${key.type}`);
      }
    };

    this.keys = (): NodeId[] => {
      const result: NodeId[] = [];
      Object.values(this.data).forEach((value) => result.push(...value.keys()));
      return result;
    };
    this.entries = (): [NodeId, TValue][] => {
      const result: [NodeId, TValue][] = [];
      Object.values(this.data).forEach((value) => result.push(...value.entries()));
      return result;
    };
    this.values = (): TValue[] => {
      const result: TValue[] = [];
      Object.values(this.data).forEach((value) => result.push(...value.values()));
      return result;
    };
    this.length = (): number => {
      let result = 0;
      Object.values(this.data).forEach((value) => (result += value.length()));
      return result;
    };
  }
}
