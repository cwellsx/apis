// types

export type NameTypes = "namespace" | "assembly" | "group" | "customLeaf";
type MetadataTypes = "method" | "type" | "field" | "event" | "property";
type ArtificialTypes = "attribute" | "exception";

type NameNodeId = { type: NameTypes; name: string };
export type MetadataNodeId = { type: MetadataTypes; assemblyName: string; metadataToken: number };
export type MethodNodeId = { type: "method"; assemblyName: string; metadataToken: number };
export type TypeNodeId = { type: "type"; assemblyName: string; metadataToken: number };
type ArtificialNodeId = { type: ArtificialTypes; artificialKey: number };
// including groupBy allows for multiple levels of groups with different groupBy
type GroupByNodeId = { type: "customGroup"; groupBy: string; groupLabel: string };

export type NodeId = NameNodeId | MetadataNodeId | ArtificialNodeId | GroupByNodeId;

// type predicate

export const isMethodNodeId = (nodeId: NodeId): nodeId is MethodNodeId => nodeId.type === "method";
export const isNameNodeId = (nodeId: NodeId, type: NameTypes): nodeId is NameNodeId => nodeId.type === type;

// factory methods

export type GetArtificialNodeId = (type: ArtificialTypes) => NodeId;
export const artificialNodeIdFactory = (): GetArtificialNodeId => {
  let artificialKey = 0;
  const getNodeId = (type: ArtificialTypes): NodeId => ({ type, artificialKey: ++artificialKey });
  return getNodeId;
};

export const validate = (type: string, name: string): void => {
  if (!name.length) throw new Error(`Invalid name: ${type} must not be empty`);
  if (name.includes(nodeIdSeparator)) throw new Error(`Invalid name: ${type} must not contain "${nodeIdSeparator}"`);
};

export const nameNodeId = (type: NameTypes, name: string): NodeId => {
  validate(type, name);
  return { type, name };
};

export const metadataNodeId = (type: MetadataTypes, assemblyName: string, metadataToken: number): MetadataNodeId => {
  validate("assemblyName", assemblyName);
  return {
    type,
    assemblyName,
    metadataToken,
  };
};

export const methodNodeId = (assemblyName: string, metadataToken: number): MethodNodeId => {
  validate("assemblyName", assemblyName);
  return {
    type: "method",
    assemblyName,
    metadataToken,
  };
};

export const typeNodeId = (assemblyName: string, metadataToken: number): TypeNodeId => {
  validate("assemblyName", assemblyName);
  return {
    type: "type",
    assemblyName,
    metadataToken,
  };
};

export const groupByNodeId = (groupBy: string, groupLabel: string): NodeId => {
  validate("groupBy", groupBy);
  validate("groupLabel", groupLabel);
  return {
    type: "customGroup",
    groupBy,
    groupLabel,
  };
};

// round-trip text

const nodeIdSeparator = "|";

export const nodeIdToText = (nodeId: NodeId): string => {
  switch (nodeId.type) {
    case "namespace":
    case "assembly":
    case "group":
    case "customLeaf":
      return [nodeId.type, nodeId.name].join(nodeIdSeparator);
    case "customGroup":
      return [nodeId.type, nodeId.groupBy, nodeId.groupLabel].join(nodeIdSeparator);
    case "method":
    case "type":
    case "field":
    case "event":
    case "property":
      return [nodeId.type, nodeId.assemblyName, "" + nodeId.metadataToken].join(nodeIdSeparator);
    case "attribute":
    case "exception":
      return [nodeId.type, "" + nodeId.artificialKey].join(nodeIdSeparator);
  }
};

export const textToNodeId = (text: string): NodeId => {
  const split = text.split(nodeIdSeparator);
  const type = split[0];
  switch (type) {
    case "namespace":
    case "assembly":
    case "group":
    case "customLeaf":
      return { type, name: split[1] };
    case "customGroup":
      return { type, groupBy: split[1], groupLabel: split[2] };
    case "method":
    case "type":
    case "field":
    case "event":
    case "property":
      return { type, assemblyName: split[1], metadataToken: +split[2] };
    case "attribute":
    case "exception":
      return { type, artificialKey: +split[1] };
    default:
      throw new Error(`textToNodeId unhandled nodeId type "${type}"`);
  }
};

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

// edges

export const makeEdgeId = (clientId: NodeId, serverId: NodeId): string =>
  `${nodeIdToText(clientId)}||${nodeIdToText(serverId)}`;
export const fromEdgeId = (edgeId: string): { clientId: string; serverId: string } => {
  const split = edgeId.split("||");
  return { clientId: split[0], serverId: split[1] };
};
export const isEdgeId = (id: string): boolean => id.includes("||");
export const makeUniqueEdgeId = (edgeId: string, index: number): string => `${edgeId}-${index}`;

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

export const getAssemblyNames = (array: NodeId[]): string[] =>
  array.filter((nodeId) => isNameNodeId(nodeId, "assembly")).map((nodeId) => (nodeId as NameNodeId).name);

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
  }
}
