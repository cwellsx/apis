// these are the data loaded from .Net assemblies

// change this to refresh the cache, if the data returned from Core.exe changes
export const loadedVersion = "2024-02-12"; // see also src.dotnet\AssemblyReader.cs

// dependencies/references of each assembly
export interface IAssemblies {
  [key: string]: string[];
}

// types of each assembly
export interface ITypes {
  [key: string]: TypeInfo[];
}

export const enum Flags {
  Public = 1,
  Protected = 2,
  Internal = 3,
  Private = 4,

  Nested = 5,

  Generic = 6,
  GenericDefinition = 7,
}

// GoodTypeInfo with TypeId and without exceptions is the usual, happy path
export type TypeId = {
  assemblyName?: string;
  namespace?: string;
  name: string;
  genericTypeArguments?: TypeId[];
  declaringType?: TypeId;
};
export type GoodTypeInfo = {
  typeId: TypeId;
  attributes?: string[];
  baseType?: TypeId;
  interfaces?: TypeId[];
  genericTypeParameters?: TypeId[];
  flags: Flags[];
};

// if an exception is thrown and caught, when reading the TypeInfo
// then the exceptions field is present and any other fields including the TypeId may be missing
export type AnonTypeInfo = {
  exceptions: string[];
};
export type BadTypeInfo = {
  typeId: TypeId;
  exceptions: string[];
  // plus some of the optional fields from GoodTypeInfo
  genericTypeParameters?: TypeId[];
  attributes?: string[];
};

// the TypeInfo array may be a micture of good, bad, and very bad (i.e. anonymous) instances
export type NamedTypeInfo = BadTypeInfo | GoodTypeInfo;
export type TypeInfo = NamedTypeInfo | AnonTypeInfo;
export function isNamedTypeInfo(typeInfo: TypeInfo): typeInfo is NamedTypeInfo {
  return (typeInfo as NamedTypeInfo).typeId !== undefined;
}
export function isBadTypeInfo(typeInfo: NamedTypeInfo): typeInfo is BadTypeInfo {
  return (typeInfo as BadTypeInfo).exceptions !== undefined;
}

// this is the format of the data from DotNetApi.getJson
export interface IReflectedAssemblies {
  [key: string]: ReflectedAssembly;
}
export type ReflectedAssembly = {
  referencedAssemblies: string[];
  types: TypeInfo[];
};
export type Reflected = {
  version: string; // the LoadedVersion value
  exes: string[];
  assemblies: IReflectedAssemblies;
};

// this is the format of the data from SqlTables
export type Loaded = {
  version: string; // the LoadedVersion value
  exes: string[];
  assemblies: IAssemblies;
  types: ITypes;
};
