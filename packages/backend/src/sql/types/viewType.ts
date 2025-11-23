import { GraphViewType } from "../../contracts-ui";

export type CommonGraphViewType = Exclude<GraphViewType, "custom">;
