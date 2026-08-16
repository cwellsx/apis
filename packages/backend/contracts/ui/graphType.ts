import * as GraphOptions from "./graphOptions";

export type GraphType = GraphOptions.Any["graphType"]; // TODO delete this
export type CommonGraphType = Exclude<GraphType, "custom">;
