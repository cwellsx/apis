// types

export type NameTypes = "namespace" | "assembly" | "group" | "customLeaf";
type MetadataTypes = "method" | "type" | "field" | "event" | "property" | "memberException";
type ArtificialTypes = "attribute" | "exception";

export type ClusterBy = "namespace" | "assembly";

export type NameNodeId = { type: NameTypes; name: string };
export type MetadataNodeId = { type: MetadataTypes; assemblyName: string; metadataToken: number };
export type MethodNodeId = { type: "method"; assemblyName: string; metadataToken: number };
export type TypeNodeId = { type: "type"; assemblyName: string; metadataToken: number };
type ArtificialNodeId = { type: ArtificialTypes; artificialKey: number };
// including groupBy allows for multiple levels of groups with different groupBy
export type GroupByNodeId = { type: "customGroup"; groupBy: string; groupLabel: string };

export type NodeId = NameNodeId | MetadataNodeId | ArtificialNodeId | GroupByNodeId;

// factory methods

const validateName = (type: string, name: string): void => {
  if (!name.length) throw new Error(`Invalid name: ${type} must not be empty`);
  if (name.includes(nodeIdSeparator)) throw new Error(`Invalid name: ${type} must not contain "${nodeIdSeparator}"`);
};
const validateToken = (metadataToken: number): void => {
  if (!metadataToken) {
    throw new Error(`Invalid token: must not be zero`);
  }
};

export type GetArtificialNodeId = (type: ArtificialTypes) => NodeId;
export const artificialNodeIdFactory = (): GetArtificialNodeId => {
  let artificialKey = 0;
  const getNodeId = (type: ArtificialTypes): NodeId => ({ type, artificialKey: ++artificialKey });
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

export const groupByNodeId = (groupBy: string, groupLabel: string): NodeId => {
  validateName("groupBy", groupBy);
  validateName("groupLabel", groupLabel);
  return {
    type: "customGroup",
    groupBy,
    groupLabel,
  };
};

// edge id

export type EdgeId = {
  clientId: NodeId;
  serverId: NodeId;
};

// round-trip text

const nodeIdSeparator = "|";
const edgeIdSeparator = "||";

export const edgeIdToText = (clientId: NodeId, serverId: NodeId): string =>
  `${nodeIdToText(clientId)}${edgeIdSeparator}${nodeIdToText(serverId)}`;

const textToEdgeId = (edgeId: string): EdgeId => {
  const split = edgeId.split(edgeIdSeparator);
  return { clientId: textToNodeId(split[0]), serverId: textToNodeId(split[1]) };
};

export const textIsEdgeId = (id: string): boolean => id.includes(edgeIdSeparator);
export const makeUniqueEdgeId = (edgeId: string, index: number): string => `${edgeId}-${index}`;

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
    case "memberException":
      return [nodeId.type, nodeId.assemblyName, "" + nodeId.metadataToken].join(nodeIdSeparator);
    case "attribute":
    case "exception":
      return [nodeId.type, "" + nodeId.artificialKey].join(nodeIdSeparator);
  }
};

export const textToNodeId = (text: string): NodeId => {
  if (textIsEdgeId(text)) throw new Error("Text is edge Id");
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
    case "memberException":
      return { type, assemblyName: split[1], metadataToken: +split[2] };
    case "attribute":
    case "exception":
      return { type, artificialKey: +split[1] };
    default:
      throw new Error(`textToNodeId unhandled nodeId type "${type}"`);
  }
};

export const textToNodeOrEdgeId = (text: string): NodeId | EdgeId =>
  textIsEdgeId(text) ? textToEdgeId(text) : textToNodeId(text);
