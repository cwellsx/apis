import { exec } from "child_process";
import fs from "fs";
import path from "path";
import packageJson from "./package.json";

type Config = {
  outputDir: string;
  buildCommand: string;
  sourceDir: string;
  ignoreDirs: string[];
  ignoreExtensions: string[];
  log: boolean;
};
type PackageJson = { config: Config };

const getLatestMtime = (dirPath: string, ignoreDirs: string[], ignoreExtensions: string[]): Date | null => {
  let latest: Date | null = null;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (ignoreDirs.includes(entry.name)) continue;
      const subLatest = getLatestMtime(fullPath, ignoreDirs, ignoreExtensions);
      if (subLatest && (!latest || subLatest > latest)) {
        latest = subLatest;
      }
    } else {
      if (ignoreExtensions.includes(path.extname(entry.name))) continue;
      const stat = fs.statSync(fullPath);
      if (!latest || stat.mtime > latest) {
        latest = stat.mtime;
      }
    }
  }

  return latest;
};

const consoleLog = (message: string) => {
  if (isLogging) console.log(`[rebuild-dotnet] ${message}`);
};

const rebuildRequired = (latestSource: Date, latestBuild: Date | null): boolean => {
  if (!latestBuild) {
    consoleLog("No previous build found; rebuild required.");
    return true;
  }
  const result = latestSource > latestBuild;
  consoleLog(`Latest source time: ${latestSource.toISOString()}`);
  consoleLog(`Latest build time:  ${latestBuild.toISOString()}`);
  consoleLog(`Rebuild required:   ${result}`);
  return result;
};

const rebuild = (config: Config): Date => {
  const { outputDir, buildCommand, sourceDir, ignoreDirs, ignoreExtensions } = config;
  const latestSource = getLatestMtime(sourceDir, ignoreDirs, ignoreExtensions);
  let latestBuild = getLatestMtime(outputDir, [], []);
  if (!latestSource) throw new Error(`Source directory "${sourceDir}" is empty or does not exist.`);
  if (rebuildRequired(latestSource, latestBuild)) {
    consoleLog(`Executing build command: ${buildCommand}`);
    exec(buildCommand);
    latestBuild = getLatestMtime(outputDir, [], []);
  }
  if (!latestBuild || latestBuild < latestSource)
    throw new Error("Build failed: output is not up to date after build command.");
  return latestBuild;
};

const copyTo = (src: string, dest: string) => {
  if (!fs.existsSync(src)) {
    throw new Error(`Source path does not exist: ${src}`);
  }

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    // Ensure destination directory exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    // Copy each entry
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      copyTo(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
};

const remove = (targetPath: string) => {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.statSync(targetPath);

  if (stat.isDirectory()) {
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        remove(entryPath);
      } else {
        fs.unlinkSync(entryPath);
      }
    }

    fs.rmdirSync(targetPath);
  } else {
    fs.unlinkSync(targetPath);
  }
};

const config = (packageJson as unknown as PackageJson).config;
const isLogging = config.log;

const latestBuild = rebuild(config);

for (const targetDir of process.argv.slice(2)) {
  const dest = path.resolve(path.join("..", targetDir, "externals", "dotnet"));
  if (fs.existsSync(dest)) {
    const latestCopy = fs.statSync(dest).mtime;
    if (latestCopy >= latestBuild) {
      consoleLog(`Skipping copy to ${dest}; already up to date.`);
      continue;
    } else {
      consoleLog(`Removing outdated copy at ${dest}.`);
      remove(dest);
    }
  } else {
    consoleLog(`Creating new copy at ${dest}.`);
  }
  copyTo(config.outputDir, dest);
}
