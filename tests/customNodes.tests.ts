import fs from "fs";
import { readCustomNodes } from "../src/main/readCustomNodes";

const customDataPath = "./tests/customData/customData.json";
console.log("Hello again");

const run = () => {
  if (!fs.existsSync(customDataPath)) {
    console.log(`Not found: ${customDataPath}`);
    return;
  }
  const customDataText = fs.readFileSync(customDataPath, "utf8");
  const customDataJson = JSON.parse(customDataText);

  const nodes = readCustomNodes(customDataJson);
  console.log(`customNodes.tests: ${nodes ? "succeeded" : "failed"}`);
};

run();
