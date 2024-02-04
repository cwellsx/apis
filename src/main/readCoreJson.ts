import { existsSync, readFile, stat } from "./fs";
import { Loaded } from "./shared-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const isObject = (x: any): boolean => typeof x === "object" && !Array.isArray(x) && x !== null;
const isString = (x: any): boolean => typeof x === "string";
const isStringArray = (x: any): boolean => Array.isArray(x) && x.every((s) => isString(s));

const assertLoaded = (json: any): Loaded => {
  if (!json.assemblies) throw new Error("Expect `assemblies` property");
  if (!json.types) throw new Error("Expect `types` property");
  if (!isObject(json.assemblies)) throw new Error("Expect `assemblies` property to be an object");
  if (!isObject(json.types)) throw new Error("Expect `types` property to be an object");
  if (!Object.values(json.assemblies).every((x) => isStringArray(x)))
    throw new Error("Expect `assemblies` values to be a string array");
  return json;
};

export const whenCoreJson = async (path: string): Promise<string> => {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const stats = await stat(path);
  return stats.mtime.toISOString();
};

export const readCoreJson = async (path: string): Promise<Loaded> => {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const text = await readFile(path);
  const json = JSON.parse(text);
  return assertLoaded(json);
};
