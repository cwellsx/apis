import { TypeInfo } from "./loadedTypeInfo";

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

export interface IAssemblyReferences {
  [key: string]: string[]; // dependencies/references of each assembly
}
export interface IAssemblyTypes {
  [key: string]: TypeInfo[]; // types of each assembly
}
export type Loaded = {
  version: string; // the LoadedVersion value
  exes: string[];
  assemblies: IAssemblyReferences;
  types: IAssemblyTypes;
};
