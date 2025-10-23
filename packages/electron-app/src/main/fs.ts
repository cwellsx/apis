import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { getAppDataPath } from "./appDataPath";

export const pathJoin = (directory: string, filename: string): string => path.join(directory, filename);

export const getAppFilename = (filename: string): string => {
  // beware https://www.electronjs.org/docs/latest/api/app#appgetpathname
  // says that, "it is not recommended to write large files here"
  const dir = getAppDataPath();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
};

export const getLogFilename = (filename: string): string => {
  // beware https://www.electronjs.org/docs/latest/api/app#appgetpathname
  // says that, "it is not recommended to write large files here"
  const dir = path.join(getAppDataPath(), "log");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
};

export const appendFileSync = (path: string, data: string): void => fs.appendFileSync(path, data);

export const existsSync = (path: string): boolean => fs.existsSync(path);

const stat = (path: string): Promise<fs.Stats> => fsPromises.stat(path);

export const readFileSync = (path: string): string => fs.readFileSync(path, { encoding: "utf8" });

export const readFile = (path: string): Promise<string> => fsPromises.readFile(path, { encoding: "utf8" });

export const writeFileSync = (path: string, data: string): void => fs.writeFileSync(path, data);

export const whenFile = async (path: string): Promise<string> => {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const stats = await stat(path);
  return stats.mtime.toISOString();
};

type TypeGuard<T> = (json: unknown) => json is T;

const parseJsonT = <T>(text: string, typeGuard: TypeGuard<T>): T => {
  const json = JSON.parse(text);
  if (typeGuard(json)) return json;
  throw new Error("Unexpected"); // the type guard should return true or throw an explicit exception
};

export const readJsonT = async <T>(path: string, typeGuard: TypeGuard<T>): Promise<T> => {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const text = await readFile(path);
  return parseJsonT(text, typeGuard);
};
