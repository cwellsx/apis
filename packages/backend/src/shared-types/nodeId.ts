// this module contains only NodeId-related things used by the UI
// anything used only by the backend is in src/main/nodeIds/*

// could use a branded primitive value type i.e. a string value plus a non-existant property which only exists as syntax
// but instead define NodeId as an object

// this key acts as a brand and is not exported, it's not meant to be known by code outside this module
// it's a `string` not a `unique symbol` because the object must be serialized accross the Electron process boundary
// - https://www.electronjs.org/docs/latest/tutorial/ipc says Electron uses the "Structured Clone Algorithm "
// - https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm says "except symbol"

const key = "nodeId"; // instead of `declare const key: unique symbol;`

export type NodeId = { readonly [key]: string };

export const nodeIdToText = (nodeId: NodeId): string => nodeId[key];
export const textToNodeId = (text: string): NodeId => ({ [key]: text });

// these string values correspond to other strings defined in the nodeIds module
export type ClusterBy = "namespace" | "assembly";

export type EdgeId = { readonly edgeId: string };
export const textToEdgeId = (text: string): EdgeId => ({ ["edgeId"]: text });

// want to distinguish the string from a NodeId versus the string from an EdgeId
// could do this by adding a unique prefix e.g. `$` or `!` to the string value
// instead look inside the string:
// - NodeId strings contain `|`
// - EdgeId strings are two NodeId strings joined by `||`

export const edgeIdSeparator = "||";

export const textIsEdgeId = (id: string): boolean => id.includes(edgeIdSeparator);

export const textToNodeOrEdgeId = (text: string): NodeId | EdgeId =>
  textIsEdgeId(text) ? textToEdgeId(text) : textToNodeId(text);
