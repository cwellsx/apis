// this is slow so it's run as an explicit script instead of being a test
import { getJson, getWhen } from "sut/dotNetApi";
import { fileWrite } from "./file";
import "./global-hooks";
import { dirSutBin, fileCoreJson, fileCorePrettyJson } from "./paths";

describe("dotnet", () => {
  it("getWhen", async () => {
    const when = await getWhen(dirSutBin);
    console.log(`when: ${when}`);
  });

  it("getJson", async () => {
    const json = await getJson(dirSutBin);
    fileWrite(fileCoreJson, json);
    const obj = JSON.parse(json) as unknown;
    const prettyJson = JSON.stringify(obj, null, 1);
    fileWrite(fileCorePrettyJson, prettyJson);
  });
});
