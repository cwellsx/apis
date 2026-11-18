// this is slow so it's run as an explicit script instead of being a test
import { getJson, getWhen } from "sut/dotnetFetch";
import "./global-hooks";
import { fileWrite } from "./utils/file";
import { dirDotnet, fileCoreJson, fileCorePrettyJson } from "./utils/paths";

describe("dotnet", () => {
  it("getWhen", async () => {
    const when = await getWhen(dirDotnet);
    console.log(`when: ${when}`);
  });

  it("getJson", async () => {
    const json = await getJson(dirDotnet);
    fileWrite(fileCoreJson, json);
    const obj = JSON.parse(json) as unknown;
    const prettyJson = JSON.stringify(obj, null, 1);
    fileWrite(fileCorePrettyJson, prettyJson);
  });
});
