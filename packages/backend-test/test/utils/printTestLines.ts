import { log } from "backend-api";
import { fileWrite } from "./file";

export const printTestLines = (toPath: (filename: string) => string, filename: string, printed: string[]) => {
  log(filename);
  fileWrite(toPath(filename), printed.join("\r\n"));
};
