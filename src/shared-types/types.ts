export type Access = "public" | "protected" | "internal" | "private";

export type Type = {
  name: string;
  access: Access;
};

export type TypeException = {
  name: string;
  exceptions: string[];
};

export type Namespace = {
  name: string;
  types: Type[];
};

export type Types = {
  namespaces: Namespace[];
  errors?: string[][];
};
