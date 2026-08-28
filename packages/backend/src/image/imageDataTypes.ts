import type { Image, Leaf, Node, Parent } from "../contracts-ui";

export type ImageLeaf = {
  node: Leaf;
  type: "leaf";
  // extra attributes which might come from CustomNode
  shape?: string;
};
export type ImageClosed = { node: Node; type: "closed" };
export type ImageSubgraph = { node: Parent; type: "subgraph"; children: ImageNode[] };
export type ImageNode = ImageLeaf | ImageClosed | ImageSubgraph;

export type ImageNodeType = ImageNode["type"];

export type ImageEdge = { clientId: string; serverId: string; edgeId: string; labels: string[]; titles: string[] };

export type ImageData = { nodes: ImageNode[]; edges: ImageEdge[]; edgeDetails: boolean; hasParentEdges: boolean };

export type CreateImage = (imageData: ImageData) => Promise<Image | string>;
