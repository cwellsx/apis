import { existsSync, readFile, stat } from "./fs";
import { Reflected, ReflectedAssembly, TypeId, TypeInfo, isBadTypeInfo, isNamedTypeInfo } from "./loaded";

const isObject = (x: object): boolean => typeof x === "object" && !Array.isArray(x) && x !== null;
const isString = (x: string): boolean => typeof x === "string";
const isBoolean = (x: boolean): boolean => typeof x === "boolean";
const isStringArray = (x: string[]): boolean => Array.isArray(x) && x.every((s) => isString(s));
const isTypeInfoArray = (x: TypeInfo[]): boolean => Array.isArray(x) && x.every((s) => isTypeInfo(s));
const isTypeIdArray = (x: TypeId[]): boolean => Array.isArray(x) && x.every((s) => isTypeId(s));

const isTypeId = (json: TypeId): boolean => {
  if (json.assemblyName && !isString(json.assemblyName)) throw new Error("Expect `assemblyName` type is `string`");
  if (json.namespace && !isString(json.namespace)) throw new Error("Expect `namespace` type is `string`");
  if (!json.name) throw new Error("Expect `name` property");
  if (!isString(json.name)) throw new Error("Expect `name` type is `string`");
  if (json.genericTypeArguments && !isTypeIdArray(json.genericTypeArguments))
    throw new Error("Expect `genericTypeArguments` type is `TypeId[]`");
  return true;
};

const isTypeInfo = (json: TypeInfo): boolean => {
  if (!isNamedTypeInfo(json) || isBadTypeInfo(json)) {
    if (!isStringArray(json.exceptions)) throw new Error("Expect `exceptions` if `!typeId`");
    return true;
  }
  if (!isTypeId(json.typeId)) throw new Error("Expect `typeId` type is `TypeId`");
  if (json.attributes && !isStringArray(json.attributes)) throw new Error("Expect `attributes` type is `string[]`");
  if (json.baseType && !isTypeId(json.baseType)) throw new Error("Expect `baseType` type is `TypeId`");
  if (json.interfaces && !isTypeIdArray(json.interfaces)) throw new Error("Expect `interfaces` type is `TypeId[]`");
  if (json.genericTypeParameters && !isTypeIdArray(json.genericTypeParameters))
    throw new Error("Expect `genericTypeParameters` type is `TypeId[]`");
  return true;
};

const isReflectedAssembly = (json: ReflectedAssembly): boolean => {
  if (!json.referencedAssemblies) throw new Error("Expect `referencedAssemblies` property");
  if (!json.types) throw new Error("Expect `types` property");
  if (!isStringArray(json.referencedAssemblies)) throw new Error("Expect `referencedAssemblies` type is `string[]`");
  if (!isTypeInfoArray(json.types)) throw new Error("Expect `referencedAssemblies` type is `TypeInfo[]`");
  return true;
};

const assertIsReflected = (json: Reflected): Reflected => {
  if (!json.version) throw new Error("Expect `version` property");
  if (!json.exes) throw new Error("Expect `exes` property");
  if (!json.assemblies) throw new Error("Expect `assemblies` property");
  if (!isString(json.version)) throw new Error("Expect `version` type is `string`");
  if (!isStringArray(json.exes)) throw new Error("Expect `exes` type is `string[]`");
  if (!isObject(json.assemblies)) throw new Error("Expect `assemblies` type is `object`");
  if (!Object.values(json.assemblies).every((x) => isReflectedAssembly(x)))
    throw new Error("Expect `assemblies` values type is `ReflectedAssembly`");
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
