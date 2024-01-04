import { app } from "electron";
import fs from "fs";
import path from "path";

export const getAppFilename = (filename: string): string => {
  // beware https://www.electronjs.org/docs/latest/api/app#appgetpathname
  // says that, "it is not recommended to write large files here"
  const dir = app.getPath("userData");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  return path.join(dir, filename);
};
