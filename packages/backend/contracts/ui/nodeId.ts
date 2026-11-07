// this module contains only NodeId-related things used by the UI
// anything used only by the backend is in src/main/nodeIds/*

// could use a branded primitive value type i.e. a string value plus a non-existant property which only exists as syntax
// but instead define NodeId as an object

// this key acts as a brand and is not exported, it's not meant to be known by code outside this module
// it's a `string` not a `unique symbol` because the object must be serialized accross the Electron process boundary
// - https://www.electronjs.org/docs/latest/tutorial/ipc says Electron uses the "Structured Clone Algorithm "
// - https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm says "except symbol"

const keyNodeId = "nodeId"; // instead of `declare const key: unique symbol;`

export type NodeId = { readonly [keyNodeId]: string };
export const nodeIdToText = (nodeId: NodeId): string => nodeId[keyNodeId];
export const textToNodeId = (text: string): NodeId => ({ [keyNodeId]: text });
// export const nodeIdEquals = (x: NodeId, y: NodeId): boolean => nodeIdToText(x) == nodeIdToText(y);

const keyEdgeId = "edgeId";

export type EdgeId = { readonly edgeId: string };
export const edgeIdToText = (edgeId: EdgeId): string => edgeId[keyEdgeId];
export const textToEdgeId = (text: string): EdgeId => ({ [keyEdgeId]: text });

export const isEdgeId = (id: NodeId | EdgeId): id is EdgeId => (id as EdgeId).edgeId !== undefined;
