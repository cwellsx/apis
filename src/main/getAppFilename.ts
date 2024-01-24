import { app } from "electron";
import fs from "fs";
import path from "path";

export const getAppFilename = (filename: string): string => {
  // beware https://www.electronjs.org/docs/latest/api/app#appgetpathname
  // says that, "it is not recommended to write large files here"
  const dir = path.join(app.getPath("userData"), "app_data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
};
