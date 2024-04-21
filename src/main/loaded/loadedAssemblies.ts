import { MethodDictionary } from "./loadedMethodCalls";
import { TypeInfo } from "./loadedTypeInfo";

// this is the format of the data from DotNetApi.getJson

export type AssemblyInfo = {
  referencedAssemblies: string[];
  types: TypeInfo[];
};
interface IReflectedAssemblies {
  [key: string]: AssemblyInfo;
}
export interface IAssemblyMethods {
  [key: string]: MethodDictionary;
}
export type Reflected = {
  version: string; // the LoadedVersion value
  exes: string[];
  assemblies: IReflectedAssemblies;
  assemblyMethods: IAssemblyMethods;
};

// this is the format of data from SqlLoaded

export type AssemblyReferences = {
  [key: string]: string[]; // dependencies/references of each assembly
};
