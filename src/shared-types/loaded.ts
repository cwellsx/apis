export interface IStrings {
  [key: string]: string[];
}

export interface ITypes {
  [key: string]: TypeInfo[];
}

export type TypeInfo = {
  assembly: string;
  attributes?: string[];
  baseType?: string;
  interfaces?: string[];
};

export type Loaded = {
  assemblies: IStrings;
  types: ITypes;
};
