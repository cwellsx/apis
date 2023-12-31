interface IStrings {
  [key: string]: string[];
}

interface ITypes {
  [key: string]: TypeInfo[];
}

export type TypeInfo = {
  assembly: string;
  attributes?: string[];
  baseType?: string;
  interfaces?: string[];
};

export type Loaded = {
  when: string;
  assemblies: IStrings;
  types: ITypes;
};
