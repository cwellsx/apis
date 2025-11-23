import * as assert from "assert";
import { getAppDataPath, getCoreExePath } from "sut/utils";
import { pathExists, pathIsDirectory } from "./file";

describe("paths", () => {
  it("getAppDataPath", () => {
    const appDataPath = getAppDataPath();
    assert.ok(pathExists(appDataPath), `Path does not exist: ${appDataPath}`);
    assert.ok(pathIsDirectory(appDataPath), `Path is not a directory: ${appDataPath}`);
  });

  it("getCoreExePath", () => {
    const coreExePath = getCoreExePath();
    assert.ok(pathExists(coreExePath), `Path does not exist: ${coreExePath}`);
    assert.ok(!pathIsDirectory(coreExePath), `Path is a directory, expected a file: ${coreExePath}`);
  });
});
