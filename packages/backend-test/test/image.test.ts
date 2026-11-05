import assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { insertSvgMap } from "sut/image/insertSvgMap";

const readFileSync = (path: string): string => fs.readFileSync(path, "utf-8");

describe("testImageMap", function () {
  const sampleDir = path.join(__dirname, "sample-image");
  const imagePath = path.join(sampleDir, "assemblies.svg");
  const mapPath = path.join(sampleDir, "assemblies.map");
  const outPath = path.join(sampleDir, "assemblies-mapped.svg");

  it("addImageMap writes a mapped SVG next to the input", function () {
    const result = insertSvgMap(readFileSync(imagePath), readFileSync(mapPath));
    fs.writeFileSync(outPath, result);
  });

  it("adds one hit-edge polygon per edge area (skips nodes/clusters)", function () {
    // addImageMap(imagePath, mapPath);

    const svg = readFileSync(outPath);

    // Count edge areas in the map: shape="poly" and id contains "||"
    const mapXml = readFileSync(mapPath);
    const edgeAreaMatches = mapXml.match(/<area shape="poly" id="[^"]*\|\|[^"]*"/g);
    const expectedEdgeCount = edgeAreaMatches?.length ?? 0;
    assert.ok(expectedEdgeCount > 0, "sample map should contain edge areas");

    const hitEdgeMatches = svg.match(/class="hit-edge"/g);
    assert.ok(hitEdgeMatches, "output SVG should contain hit-edge polygons");
    assert.strictEqual(
      hitEdgeMatches.length,
      expectedEdgeCount,
      `one hit-edge polygon per edge (expected ${expectedEdgeCount})`
    );
  });

  it("each hit-edge polygon references its source edge id", function () {
    // addImageMap(imagePath, mapPath);

    const svg = readFileSync(outPath);

    // Every edge id from the map should appear as a data-from-id attribute.
    const mapXml = readFileSync(mapPath);
    const edgeIds = mapXml.match(/<area shape="poly" id="([^"]*\|\|[^"]*)"/g);
    assert.ok(edgeIds, "sample map should contain edge areas");

    for (const edgeIdMatch of edgeIds) {
      const id = edgeIdMatch.match(/id="([^"]+)"/)?.[1];
      assert.ok(id, "edge area should have an id");
      assert.ok(svg.includes(`data-from-id="${id}"`), `hit-edge polygon should reference ${id}`);
    }
  });

  it("every hit-edge polygon has a points attribute", function () {
    // addImageMap(imagePath, mapPath);

    const svg = fs.readFileSync(outPath, "utf-8");
    const hitEdgeBlocks = svg.match(/<polygon [^>]*class="hit-edge"[^>]*>/g);
    assert.ok(hitEdgeBlocks, "should have hit-edge polygons");

    for (const block of hitEdgeBlocks) {
      assert.ok(block.includes('points="'), `polygon should have points: ${block}`);
    }
  });

  //   after(function () {
  //     // clean up the generated file so the sample directory stays pristine
  //     if (fs.existsSync(outPath)) {
  //       fs.unlinkSync(outPath);
  //     }
  //   });
});
