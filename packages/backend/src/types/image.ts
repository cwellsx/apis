import type { Node } from "../contracts-ui";

export type ImageEdge = { clientId: string; serverId: string; edgeId: string; labels: string[]; titles: string[] };

export type ImageData = { nodes: Node[]; edges: ImageEdge[]; edgeDetails: boolean };
