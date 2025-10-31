import type { ClusterBy, NodeId } from "../shared-types";
import { nodeIdToText, textToNodeId } from "../shared-types";
import { getOrSet } from "../utils";
import { isClusterNodeId, toAnyNodeId } from "./nodeIdTypes";

export class NodeIdMap<TValue> {
  // private array: { key: NodeId; value: TValue }[] = [];
  private data: Map<string, TValue>;
  set: (key: NodeId, value: TValue) => unknown; // use unknown instead of vois
  get: (key: NodeId) => TValue | undefined;
  getOrThrow: (key: NodeId) => TValue;
  getOrSet: (key: NodeId, getValue: () => TValue) => TValue;
  has: (key: NodeId) => boolean;
  keys: () => NodeId[];
  entries: () => [NodeId, TValue][];
  values: () => TValue[];
  length: () => number;
  combine: (other: NodeIdMap<TValue>) => NodeIdMap<TValue>;

  constructor() {
    this.data = new Map<string, TValue>();
    this.set = (key: NodeId, value: TValue): unknown => this.data.set(nodeIdToText(key), value);
    this.get = (key: NodeId): TValue | undefined => this.data.get(nodeIdToText(key));
    this.getOrThrow = (key: NodeId): TValue => {
      const value = this.get(key);
      if (value) return value;
      throw new Error(`NodeIdMap not found ${nodeIdToText(key)}`);
    };
    this.getOrSet = (key: NodeId, getValue: () => TValue): TValue => getOrSet(this.data, nodeIdToText(key), getValue);
    this.has = (key: NodeId): boolean => this.data.has(nodeIdToText(key));
    this.keys = (): NodeId[] => [...this.data.keys()].map((key) => textToNodeId(key));
    this.entries = (): [NodeId, TValue][] =>
      [...this.data.entries()].map((entry) => [textToNodeId(entry[0]), entry[1]]);
    this.values = (): TValue[] => [...this.data.values()];
    this.length = (): number => this.data.size;
    this.combine = (other: NodeIdMap<TValue>): NodeIdMap<TValue> => {
      const result = new NodeIdMap<TValue>();
      const add = (from: NodeIdMap<TValue>) => {
        for (const [key, value] of from.data.entries()) result.data.set(key, value);
      };
      add(this);
      add(other);
      return result;
    };
  }
}

export class NodeIdSet {
  private data: Set<string>;
  add: (key: NodeId) => unknown;
  has: (key: NodeId) => boolean;

  constructor(values?: NodeId[]) {
    this.data = new Set<string>(values?.map(nodeIdToText));
    this.add = (key: NodeId): unknown => this.data.add(nodeIdToText(key));
    this.has = (key: NodeId): boolean => this.data.has(nodeIdToText(key));
  }
}

export const createLookupNodeId = (array: NodeId[]): ((nodeId: NodeId) => boolean) => {
  const set = new NodeIdSet(array);
  const lookupNodeId = (nodeId: NodeId): boolean => set.has(nodeId);
  return lookupNodeId;
};

const nodeIdEquals = (lhs: NodeId, rhs: NodeId): boolean => lhs.nodeId === rhs.nodeId;

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
  array
    .map(toAnyNodeId)
    .filter((nodeId) => isClusterNodeId(nodeId, clusterBy))
    .map((nodeId) => nodeId.name);
