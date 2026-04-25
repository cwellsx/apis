import { assert } from "../../src";
import type { All } from "./all";
import { version } from "./version";

/*
  This is a nuisance to write and maintain -- maybe replace it with
  https://github.com/samchon/typia
  https://typia.io/docs/pure/
*/

export const isAll = (json: unknown): asserts json is All => {
  assert(!!json, "Expect json is truthy");
  assert(typeof json == "object", "Expect json is object");
  const o = json as All;
  assert(!!o.version, "Expect `version` property");
  assert(o.version == version, `Expect version ${version} actually ${o.version}`);

  assert(!!o.exes, "Expect `exes` property");
  assert(!!o.assemblies, "Expect `assemblies` property");
  assert(!!o.assemblyMethods, "Expect `assemblyMethods` property");
  assert(!!o.compilerMethods, "Expect `compilerMethods` property");
  assert(!!o.microsoftAssemblies, "Expect `microsoftAssemblies` property");
};
