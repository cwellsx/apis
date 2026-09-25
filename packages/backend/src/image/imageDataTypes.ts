import type { Image, Node } from "../contracts-ui";

export type ImageEdge = { clientId: string; serverId: string; edgeId: string; labels: string[]; titles: string[] };

export type ImageData = { nodes: Node[]; edges: ImageEdge[]; edgeDetails: boolean; hasParentEdges: boolean };

export type CreateImage = (imageData: ImageData) => Promise<Image | string>;
