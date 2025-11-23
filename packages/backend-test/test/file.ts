import * as fs from "fs";

export const fileWrite = (filePath: string, data: string): void => fs.writeFileSync(filePath, data, "utf-8");

const fileCopy = (src: string, dest: string) => fs.copyFileSync(src, dest);
const fileRead = (filePath: string): string => fs.readFileSync(filePath, "utf-8");

export const fileAssert = (filePathGood: string, filePathTemp: string, testData: string): boolean => {
  fileWrite(filePathTemp, testData);
  if (!pathExists(filePathGood)) {
    fileCopy(filePathTemp, filePathGood);
    return true;
  } else {
    const goodData = fileRead(filePathGood);
    return goodData === testData;
  }
};

export const pathExists = (path: string): boolean => fs.existsSync(path);
export const pathIsDirectory = (path: string): boolean => fs.statSync(path).isDirectory();
export const pathMkdir = (path: string) => fs.mkdirSync(path, { recursive: true });
