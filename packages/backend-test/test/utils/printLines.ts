import { log } from "backend-api";
import { fileWrite } from "./file";
import { fileViewState } from "./paths";

export const printLines = (filename: string, printed: string[]) => {
  log(filename);
  fileWrite(fileViewState(filename), printed.join("\r\n"));
};
