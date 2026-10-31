import { AppOptions } from "./appOptions";
import { Image } from "./image";
import { Node } from "./node";

export type NodeView = { nodes: Node[] };

export type ImageView = {
  // string is a message if there isn't an Image
  image: Image | string;
};

export type TextView = { text: string };

export type AnyView =
  | { type: "appOptions"; payload: AppOptions }
  | { type: "nodes"; payload: NodeView }
  | { type: "image"; payload: ImageView }
  | { type: "text"; payload: TextView }
  | { type: "title"; payload: string };
