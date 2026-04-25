import { assert } from "../../src";
import { Reflected } from "./loadedAssemblies";
import { loadedVersion } from "./loadedVersion";

/*
  This is a nuisance to write and maintain -- maybe replace it with
  https://github.com/samchon/typia
  https://typia.io/docs/pure/
*/

export const isReflected = (json: unknown): asserts json is Reflected => {
  assert(!!json, "Expect json is truthy");
  assert(typeof json === "object", "Expect json is object");
  const o = json as Reflected;
  assert(!!o.version, "Expect `version` property");
  assert(!!o.exes, "Expect `exes` property");
  assert(!!o.assemblies, "Expect `assemblies` property");
  assert(!!o.assemblyMethods, "Expect `assemblies` property");
  assert(o.version === loadedVersion, `Expect version ${loadedVersion} actually ${o.version}`);
};
