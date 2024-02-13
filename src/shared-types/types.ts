export type Type = {
  name: string;
};

export type Namespace = {
  name: string;
  types: Type[];
};

export type Types = {
  namespaces: Namespace[];
};
