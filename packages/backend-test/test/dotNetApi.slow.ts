// this is slow so it's run as an explicit script instead of being a test
import { getJson, getWhen } from "sut/dotNetApi";
import { fileAssert, fileWrite } from "./file";
import "./global-hooks";
import { dirDotNet, fileCoreGoodJson, fileCoreJson, fileCoreTempJson } from "./paths";

describe("dotnet", () => {
  it("getWhen", async () => {
    const when = await getWhen(dirDotNet);
    console.log(`when: ${when}`);
  });

  it("getJson", async () => {
    const json = await getJson(dirDotNet);
    fileWrite(fileCoreJson, json);
    const obj = JSON.parse(json) as unknown;
    const testJson = JSON.stringify(obj, null, 2);
    if (!fileAssert(fileCoreGoodJson, fileCoreTempJson, testJson))
      throw new Error(`core.json does not match expected content. See ${fileCoreTempJson}`);
  });
});
