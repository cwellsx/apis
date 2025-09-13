import { Reflected } from "./loadedAssemblies";
import { loadedVersion } from "./loadedVersion";

/*
  This is a nuisance to write and maintain -- maybe replace it with
  https://github.com/samchon/typia
  https://typia.io/docs/pure/
*/

export const isReflected = (json: unknown): json is Reflected => {
  if (!json) throw new Error("Expect json is truthy");
  if (typeof json !== "object") throw new Error("Expect json is object");
  const o = json as Reflected;
  if (!o.version) throw new Error("Expect `version` property");
  if (!o.exes) throw new Error("Expect `exes` property");
  if (!o.assemblies) throw new Error("Expect `assemblies` property");
  if (!o.assemblyMethods) throw new Error("Expect `assemblies` property");
  if (o.version != loadedVersion) throw new Error(`Expect version ${loadedVersion} actually ${o.version}`);
  return true;
};
