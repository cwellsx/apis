// these are the data loaded from .Net assemblies

// change this to refresh the cache, if the data returned from Core.exe changes
export const loadedVersion = "2024-02-04"; // see also src.dotnet\AssemblyReader.cs

// dependencies/references of each assembly
export interface IAssemblies {
  [key: string]: string[];
}

// properties of each type
export interface ITypes {
  [key: string]: TypeInfo[];
}

export type TypeInfo = {
  assembly: string[]; // unusually, some types exist in several assemblies e.g. because they're injected by compiler
  attributes?: string[];
  baseType?: string;
  interfaces?: string[];
};

// this is the format of the data from DotNetApi.getJson
export type Loaded = {
  version: string; // the LoadedVersion value
  exes: string[];
  assemblies: IAssemblies;
  types: ITypes;
};
