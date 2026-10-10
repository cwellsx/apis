import { DataSource } from "backend-app";
import * as fs from "fs";
import path from "path";
import { assertCustomJson, fixCustomJson } from "sut/customJson";
import { createSqlCustom } from "sut/openDataSource/createSqlCustom";
import { assert, readJsonT } from "sut/utils";
import { fileWrite, pathMkdir } from "./utils/file";
import { dirCustom, dirTestCustomRoot } from "./utils/paths";

const readJsonFilePaths = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);

for (const jsonFile of readJsonFilePaths(dirCustom)) {
  const { name } = path.parse(jsonFile);
  const outputDir = `${dirTestCustomRoot}.${name}`;
  pathMkdir(outputDir);

  describe(`custom ${jsonFile}`, () => {
    const fullPath = path.join(dirCustom, jsonFile);
    const dataSource: DataSource = { path: fullPath, type: "customJson" };

    it("assert and fix CustomJson", async () => {
      const nodes = await readJsonT(fullPath, assertCustomJson);
      const errors = fixCustomJson(nodes);
      // assert(errors.length == 0);
      fileWrite(path.join(outputDir, "fixCustomJson.json"), JSON.stringify(nodes, null, " "));
    });

    // it("old createSqlCustomFromJson", async () => {
    //   const sqlCustom = await createSqlCustomFromJson(dataSource);
    // });

    it("createSqlCustom", async () => {
      const sqlCustom = await createSqlCustom(dataSource);
      const { items, edges, itemAttrs, edgeAttrs, itemTags, layers } = sqlCustom;
      assert(items.selectAll().length > 0);
      assert(edges.selectAll().length > 0);
      assert(itemAttrs.selectAll().length > 0);
      assert(edgeAttrs.selectAll().length > 0);
      //assert(itemTags.selectAll().length > 0);
      assert(layers.selectAll().length > 0);
      sqlCustom.close();
    });
  });
}
