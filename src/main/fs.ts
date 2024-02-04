import { app } from "electron";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

export const pathJoin = (directory: string, filename: string): string => path.join(directory, filename);

export const getAppFilename = (filename: string): string => {
  // beware https://www.electronjs.org/docs/latest/api/app#appgetpathname
  // says that, "it is not recommended to write large files here"
  const dir = path.join(app.getPath("userData"), "app_data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
};

export const appendFileSync = (path: string, data: string): void => fs.appendFileSync(path, data);

export const existsSync = (path: string): boolean => fs.existsSync(path);

export const stat = (path: string): Promise<fs.Stats> => fsPromises.stat(path);

export const readFileSync = (path: string): string => fs.readFileSync(path, { encoding: "utf8" });

export const readFile = (path: string): Promise<string> => fsPromises.readFile(path, { encoding: "utf8" });

export const writeFileSync = (path: string, data: string): void => fs.writeFileSync(path, data);
