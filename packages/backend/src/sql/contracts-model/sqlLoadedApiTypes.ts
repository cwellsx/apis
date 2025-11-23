import { GraphViewType } from "../../contracts-ui";
import { TypeAndMethodId } from "../types";

export type Direction = "upwards" | "downwards";

export type CommonGraphViewType = Exclude<GraphViewType, "custom">;

export type CallstackIterator = {
  first: TypeAndMethodId;
  readNext: (assemblyName: string, methodId: number, direction: Direction) => TypeAndMethodId[];
};
