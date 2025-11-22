import * as assert from "assert";
import * as fs from "fs";
import { getAppDataPath, getCoreExePath } from "sut/utils";

describe("paths", () => {
  it("getAppDataPath", () => {
    const appDataPath = getAppDataPath();
    assert.ok(fs.existsSync(appDataPath), `Path does not exist: ${appDataPath}`);
    assert.ok(fs.statSync(appDataPath).isDirectory(), `Path is not a directory: ${appDataPath}`);
  });

  it("getCoreExePath", () => {
    const coreExePath = getCoreExePath();
    assert.ok(fs.existsSync(coreExePath), `Path does not exist: ${coreExePath}`);
    assert.ok(!fs.statSync(coreExePath).isDirectory(), `Path is a directory, expected a file: ${coreExePath}`);
  });
});
