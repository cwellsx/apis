import { MethodsDictionary } from "./loadedMethodCalls";
import { TypeInfo } from "./loadedTypeInfo";

// this is the format of the data from DotNetApi.getJson

export type AssemblyInfo = {
  referencedAssemblies: string[];
  types: TypeInfo[];
};
interface IReflectedAssemblies {
  [key: string]: AssemblyInfo;
}
export type Reflected = {
  version: string; // the LoadedVersion value
  exes: string[];
  assemblies: IReflectedAssemblies;
  assemblyMethods: IAssemblyMethods;
};

export const convertReflectedToLoaded = (reflected: Reflected): Loaded => {
  const assemblies: IAssemblyReferences = {};
  const types: IAssemblyTypes = {};
  Object.entries(reflected.assemblies).forEach(([assemblyName, reflectedAssembly]) => {
    assemblies[assemblyName] = reflectedAssembly.referencedAssemblies;
    types[assemblyName] = reflectedAssembly.types;
  });
  const { version, exes } = reflected;
  const loaded: Loaded = { version, exes, assemblies, types, methods: reflected.assemblyMethods };
  return loaded;
};

// this is the format of the data from SqlTables

export interface IAssemblyReferences {
  [key: string]: string[]; // dependencies/references of each assembly
}
export interface IAssemblyTypes {
  [key: string]: TypeInfo[]; // types of each assembly
}
export interface IAssemblyMethods {
  [key: string]: MethodsDictionary;
}
export type Loaded = {
  version: string; // the LoadedVersion value
  exes: string[];
  assemblies: IAssemblyReferences;
  types: IAssemblyTypes;
  methods: IAssemblyMethods;
};
