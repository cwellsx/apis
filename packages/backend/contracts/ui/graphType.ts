import * as GraphOptions from "./graphOptions";

export type GraphType = GraphOptions.Any["graphType"];
export type CommonGraphType = Exclude<GraphType, "custom">;
