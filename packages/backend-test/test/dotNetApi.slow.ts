// this is slow so it's run as an explicit script instead of being a test
import * as fs from "fs";
import { getJson, getWhen } from "sut/dotNetApi";
import "./global-hooks";
import { dirDotNet, fileCoreGoodJson, fileCoreJson, fileCoreTestJson } from "./paths";

describe("dotnet", () => {
  it("getWhen", async () => {
    const when = await getWhen(dirDotNet);
    console.log(`when: ${when}`);
  });

  it("getJson", async () => {
    const json = await getJson(dirDotNet);
    fs.writeFileSync(fileCoreJson, json, "utf-8");
    const obj = JSON.parse(json) as unknown;
    const testJson = JSON.stringify(obj, null, 2);
    fs.writeFileSync(fileCoreTestJson, testJson, "utf-8");
    if (!fs.existsSync(fileCoreGoodJson)) fs.copyFileSync(fileCoreTestJson, fileCoreGoodJson);
    else {
      const goodJson = fs.readFileSync(fileCoreGoodJson, "utf-8");
      if (goodJson !== testJson) throw new Error(`core.json does not match expected content. See ${fileCoreTestJson}`);
    }
  });
});
