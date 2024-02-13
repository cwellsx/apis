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

export type TypeId = {
  assemblyName?: string;
  namespace?: string;
  name: string;
  genericTypeArguments?: TypeId[];
  declaringType?: TypeId;
};
export type TypeInfo = {
  typeId?: TypeId;
  attributes?: string[];
  baseType?: TypeId;
  interfaces?: TypeId[];
  genericTypeParameters?: TypeId[];

  isUnwanted?: boolean;
  exceptions?: string[];
};

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
