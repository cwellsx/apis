import { assert } from "../../src";
import type { BrandedId, GenericParam, Id, MetadataToken, Specification } from "./id";

export const isMetadataToken = (id: Id): id is MetadataToken => typeof id === "number";
export const isBrandedId = (id: Id): id is BrandedId => typeof id === "string" && id.includes("|");
export const isSpecification = (id: Id): id is Specification => Array.isArray(id);
export const isGenericParam = (id: Id): id is GenericParam => typeof id === "string" && !isBrandedId(id);

export const spitBrandedId = (id: BrandedId): [string, number] => {
  const split = id.split("|");
  assert(split.length === 2);
  return [split[0], Number(split[1])];
};

export const spitGenericParam = (id: GenericParam): [string, number] => {
  const split = id.split("~");
  assert(split.length === 2);
  return [split[0], Number(split[1])];
};

export const getSpecification = (id: Specification): number => id[0];
