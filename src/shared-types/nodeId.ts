type NameTypes = "namespace" | "assembly" | "group";
type MetadataTokenTypes = "method" | "type" | "field" | "event" | "property";
type ArtificialKeyTypes = "attribute" | "exception";

export type NodeId =
  | {
      type: NameTypes;
      name: string;
    }
  | { type: MetadataTokenTypes; assemblyName: string; metadataToken: number }
  | { type: ArtificialKeyTypes; artificialKey: number };

export type GetArtificialKey = (type: ArtificialKeyTypes) => NodeId;

export const artificialKeyFactory = (): GetArtificialKey => {
  let artificialKey = 0;
  const getNodeId = (type: ArtificialKeyTypes): NodeId => ({ type, artificialKey: ++artificialKey });
  return getNodeId;
};

export const metadataTokenNodeId = (type: MetadataTokenTypes, assemblyName: string, metadataToken: number): NodeId => ({
  type,
  assemblyName,
  metadataToken,
});

export const nodeIdSeparator = "!";

export const nodeIdToText = (nodeId: NodeId): string => {
  switch (nodeId.type) {
    case "namespace":
    case "assembly":
    case "group":
      return [nodeId.type, nodeId.name].join(nodeIdSeparator);
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
      return { type, name: split[1] };
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
