// this is slow so it's run as an explicit script instead of being a test
import { getJson, getWhen } from "sut/dotNetApi";
import "./global-hooks";
import { fileWrite } from "./utils/file";
import { dirDotNet, fileCoreJson, fileCorePrettyJson } from "./utils/paths";

describe("dotnet", () => {
  it("getWhen", async () => {
    const when = await getWhen(dirDotNet);
    console.log(`when: ${when}`);
  });

  it("getJson", async () => {
    const json = await getJson(dirDotNet);
    fileWrite(fileCoreJson, json);
    const obj = JSON.parse(json) as unknown;
    const prettyJson = JSON.stringify(obj, null, 1);
    fileWrite(fileCorePrettyJson, prettyJson);
  });
});
