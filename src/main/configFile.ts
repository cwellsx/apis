import { app } from "electron";
import fs from "fs";
import path from "path";

import { log } from "./log";

import type { Config } from "../shared-types";

const configDir = app.getPath("userData");
const configPath = path.join(configDir, "config.json");
log(`configPath is ${configPath}`);

export function readConfig(): Config {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
  if (!fs.existsSync(configPath)) return {};
  const text = fs.readFileSync(configPath, { encoding: "utf8" });
  const config: Config = JSON.parse(text);
  return config;
}

export function writeConfig(config: Config): void {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
  const text = JSON.stringify(config);
  fs.writeFileSync(configPath, text, { encoding: "utf8" });
}
