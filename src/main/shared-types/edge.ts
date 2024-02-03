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

export type Edge = {
  clientId: string;
  serverId: string;
  label?: string;
} & Decorators;
