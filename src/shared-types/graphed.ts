import { TextNode } from "./textNode";

// this defines the nodes and edges displayed on a graph
// this is an abstraction and this application's native data format
// various input data types for variuous sources are converted to this format for display

type Scalar = "string" | "number" | "boolean";

interface IProperties {
  [key: string]: Scalar;
}

type Decorators = {
  tags?: string[];
  properties?: IProperties;
};

export type GraphNode = TextNode & Decorators;

export type GraphEdge = {
  clientId: string;
  serverId: string;
  label?: string;
} & Decorators;

export type Graphed = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
