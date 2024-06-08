import { MethodDictionary } from "./loadedCalls";
import { TypeInfo } from "./loadedTypeInfo";

// this is the format of the data from DotNetApi.getJson

export type AssemblyInfo = {
  referencedAssemblies: string[];
  types: TypeInfo[];
};

type ReflectedAssemblies = { [assemblyName: string]: AssemblyInfo };

type AssemblyMethods = { [assemblyName: string]: MethodDictionary };

export type Reflected = {
  version: string; // the LoadedVersion value
  exes: string[];
  assemblies: ReflectedAssemblies;
  assemblyMethods: AssemblyMethods;
};

// this is the format of data from SqlLoaded

export type AssemblyReferences = {
  [key: string]: string[]; // dependencies/references of each assembly
};
