import { ClusterBy, NodeId, nodeIdToText, textIsEdgeId, textToNodeId } from "../contracts-ui";

// types

export type NameTypes = "namespace" | "assembly" | "group" | "customLeaf" | "customFolder";
export type MetadataTypes = "method" | "type" | "field" | "event" | "property" | "memberException";
type ArtificialTypes = "attribute" | "exception";

export type NameNodeId = { type: NameTypes; name: string };
export type AssemblyNodeId = { type: "assembly"; name: string };
export type MetadataNodeId = { type: MetadataTypes; assemblyName: string; metadataToken: number };
export type MethodNodeId = { type: "method"; assemblyName: string; metadataToken: number };
export type TypeNodeId = { type: "type"; assemblyName: string; metadataToken: number };
type ArtificialNodeId = { type: ArtificialTypes; artificialKey: number };
// including groupBy allows for multiple levels of groups with different groupBy
export type GroupByNodeId = { type: "customGroup"; groupBy: string; groupLabel: string };

export type AnyNodeId = NameNodeId | MetadataNodeId | ArtificialNodeId | GroupByNodeId;

// factory methods to AnyNodeId

const validateName = (type: string, name: string): void => {
  if (!name.length) throw new Error(`Invalid name: ${type} must not be empty`);
  if (name.includes(nodeIdSeparator)) throw new Error(`Invalid name: ${type} must not contain "${nodeIdSeparator}"`);
};
const validateToken = (metadataToken: number): void => {
  if (!metadataToken) throw new Error(`Invalid token: must not be zero`);
};

export type GetArtificialNodeId = (type: ArtificialTypes) => NodeId;
export const artificialNodeIdFactory = (): GetArtificialNodeId => {
  let artificialKey = 0;
  const getNodeId = (type: ArtificialTypes): NodeId => toNodeId({ type, artificialKey: ++artificialKey });
  return getNodeId;
};

export const nameNodeId = (type: NameTypes, name: string): NameNodeId => {
  validateName(type, name);
  return { type, name };
};

export const metadataNodeId = (type: MetadataTypes, assemblyName: string, metadataToken: number): MetadataNodeId => {
  validateName("assemblyName", assemblyName);
  validateToken(metadataToken);
  return {
    type,
    assemblyName,
    metadataToken,
  };
};

export const methodNodeId = (assemblyName: string, metadataToken: number): MethodNodeId => {
  validateName("assemblyName", assemblyName);
  validateToken(metadataToken);
  return {
    type: "method",
    assemblyName,
    metadataToken,
  };
};

export const typeNodeId = (assemblyName: string, metadataToken: number): TypeNodeId => {
  validateName("assemblyName", assemblyName);
  validateToken(metadataToken);
  return {
    type: "type",
    assemblyName,
    metadataToken,
  };
};

export const groupByNodeId = (groupBy: string, groupLabel: string): GroupByNodeId => {
  validateName("groupBy", groupBy);
  validateName("groupLabel", groupLabel);
  return {
    type: "customGroup",
    groupBy,
    groupLabel,
  };
};

// factory methods to NodeId

export const toNameNodeId = (type: NameTypes, name: string): NodeId => toNodeId(nameNodeId(type, name));
export const toMetadataNodeId = (type: MetadataTypes, assemblyName: string, metadataToken: number): NodeId =>
  toNodeId(metadataNodeId(type, assemblyName, metadataToken));
export const toMethodNodeId = (assemblyName: string, metadataToken: number): NodeId =>
  toNodeId(methodNodeId(assemblyName, metadataToken));
export const toTypeNodeId = (assemblyName: string, metadataToken: number): NodeId =>
  toNodeId(typeNodeId(assemblyName, metadataToken));
export const toGroupByNodeId = (groupBy: string, groupLabel: string): NodeId =>
  toNodeId(groupByNodeId(groupBy, groupLabel));

// type predicate

export const isMethodNodeId = (nodeId: AnyNodeId): nodeId is MethodNodeId => nodeId.type === "method";
export const isAssemblyNodeId = (nodeId: AnyNodeId): nodeId is AssemblyNodeId => nodeId.type === "assembly";
export const isClusterNodeId = (nodeId: AnyNodeId, type: ClusterBy): nodeId is NameNodeId => nodeId.type === type;

const nameTypes = new Set<string>(["namespace", "assembly", "group", "customLeaf", "customFolder"]);
const isNameType = (type: string): type is NameTypes => nameTypes.has(type);
export const isNameNodeId = (nodeId: AnyNodeId): nodeId is NameNodeId => isNameType(nodeId.type);

// factory method to AnyNodeId

export const toAnyNodeId = (nodeId: NodeId): AnyNodeId => textToAnyNodeId(nodeIdToText(nodeId));

// round-trip text

export const toNodeId = (anyNodeId: AnyNodeId): NodeId => textToNodeId(anyNodeIdToText(anyNodeId));

const nodeIdSeparator = "|";

export const anyNodeIdToText = (nodeId: AnyNodeId): string => {
  switch (nodeId.type) {
    case "namespace":
    case "assembly":
    case "group":
    case "customLeaf":
    case "customFolder":
      return [nodeId.type, nodeId.name].join(nodeIdSeparator);
    case "customGroup":
      return [nodeId.type, nodeId.groupBy, nodeId.groupLabel].join(nodeIdSeparator);
    case "method":
    case "type":
    case "field":
    case "event":
    case "property":
    case "memberException":
      return [nodeId.type, nodeId.assemblyName, "" + nodeId.metadataToken].join(nodeIdSeparator);
    case "attribute":
    case "exception":
      return [nodeId.type, "" + nodeId.artificialKey].join(nodeIdSeparator);
  }
};

export const textToAnyNodeId = (text: string): AnyNodeId => {
  if (textIsEdgeId(text)) throw new Error("Text is edge Id");
  const split = text.split(nodeIdSeparator);
  const type = split[0];
  switch (type) {
    case "namespace":
    case "assembly":
    case "group":
    case "customLeaf":
    case "customFolder":
      return { type, name: split[1] };
    case "customGroup":
      return { type, groupBy: split[1], groupLabel: split[2] };
    case "method":
    case "type":
    case "field":
    case "event":
    case "property":
    case "memberException":
      return { type, assemblyName: split[1], metadataToken: +split[2] };
    case "attribute":
    case "exception":
      return { type, artificialKey: +split[1] };
    default:
      throw new Error(`textToNodeId unhandled nodeId type "${type}"`);
  }
};
