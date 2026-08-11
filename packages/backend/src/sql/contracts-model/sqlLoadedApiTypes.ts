import { TypeAndMethodId } from "../types";

export type Direction = "upwards" | "downwards";

export type CallstackIterator = {
  first: TypeAndMethodId;
  readNext: (assemblyName: string, methodId: number, direction: Direction) => TypeAndMethodId[];
};
