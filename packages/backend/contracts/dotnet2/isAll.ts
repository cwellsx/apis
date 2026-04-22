import type { All } from "./all";
import { version } from "./version";

/*
  This is a nuisance to write and maintain -- maybe replace it with
  https://github.com/samchon/typia
  https://typia.io/docs/pure/
*/

export const isAll = (json: unknown): json is All => {
  if (!json) throw new Error("Expect json is truthy");
  if (typeof json !== "object") throw new Error("Expect json is object");
  const o = json as All;
  if (!o.version) throw new Error("Expect `version` property");
  if (o.version != version) throw new Error(`Expect version ${version} actually ${o.version}`);

  if (!o.exes) throw new Error("Expect `exes` property");
  if (!o.assemblies) throw new Error("Expect `assemblies` property");
  if (!o.assemblyMethods) throw new Error("Expect `assemblyMethods` property");
  if (!o.compilerMethods) throw new Error("Expect `compilerMethods` property");
  if (!o.microsoftAssemblies) throw new Error("Expect `microsoftAssemblies` property");
  return true;
};
