import { existsSync, readFile, stat } from "./fs";
import { Reflected, loadedVersion } from "./loaded";

/*
  This is a nuisance to write and maintain -- maybe replace it with
  https://github.com/samchon/typia
  https://typia.io/docs/pure/
*/
const assertIsReflected = (json: Reflected): Reflected => {
  if (!json.version) throw new Error("Expect `version` property");
  if (!json.exes) throw new Error("Expect `exes` property");
  if (!json.assemblies) throw new Error("Expect `assemblies` property");
  if (!json.assemblyMethods) throw new Error("Expect `assemblies` property");
  if (json.version != loadedVersion) throw new Error(`Expect version ${loadedVersion} actually ${json.version}`);

  return json;
};

export const whenCoreJson = async (path: string): Promise<string> => {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const stats = await stat(path);
  return stats.mtime.toISOString();
};

export const readCoreJson = async (path: string): Promise<Reflected> => {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const text = await readFile(path);
  const json = JSON.parse(text);
  return assertIsReflected(json);
};
