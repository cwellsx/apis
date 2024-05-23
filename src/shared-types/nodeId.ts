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
      throw new Error(`Unhandled nodeId type "${type}"`);
  }
};

// edges

export const makeEdgeId = (clientId: string, serverId: string): string => `${clientId}||${serverId}`;
export const fromEdgeId = (edgeId: string): { clientId: string; serverId: string } => {
  const split = edgeId.split("||");
  return { clientId: split[0], serverId: split[1] };
};
