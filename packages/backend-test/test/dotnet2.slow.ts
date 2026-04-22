// this is slow so it's run as an explicit script instead of being a test
import { getJson, getWhen } from "sut/dotNetApi";
import { fileWrite } from "./file";
import "./global-hooks2";
import { dirDotNet, dirSutBin, fileCoreJson, fileCorePrettyJson } from "./paths2";

const archived = false;
const dirCoreExe = archived ? dirSutBin : dirDotNet;

describe("dotnet", () => {
  it("getWhen", async () => {
    const when = await getWhen(dirCoreExe);
    console.log(`when: ${when}`);
  });

  it("getJson", async () => {
    const json = await getJson(dirCoreExe);
    fileWrite(fileCoreJson, json);
    const obj = JSON.parse(json) as unknown;
    const prettyJson = JSON.stringify(obj, null, 1);
    fileWrite(fileCorePrettyJson, prettyJson);
  });
});
