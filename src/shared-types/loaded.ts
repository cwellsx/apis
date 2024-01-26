// these are the data loaded from .Net assemblies

// dependencies/references of each assembly
export interface IAssemblies {
  [key: string]: string[];
}

// properties of each type
export interface ITypes {
  [key: string]: TypeInfo[];
}

export type TypeInfo = {
  assembly: string;
  attributes?: string[];
  baseType?: string;
  interfaces?: string[];
};

// this is the format of the data from DotNetApi.getJson
export type Loaded = {
  assemblies: IAssemblies;
  types: ITypes;
};
