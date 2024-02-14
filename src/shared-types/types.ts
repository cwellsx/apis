export const enum Flags {
  Public = 1,
  Protected = 2,
  Internal = 3,
  Private = 4,

  Nested = 5,

  Generic = 6,
  GenericDefinition = 7,
}

export type Type = {
  name: string;
  flags: Flags[];
};

export type Namespace = {
  name: string;
  types: Type[];
};

export type Types = {
  namespaces: Namespace[];
};
