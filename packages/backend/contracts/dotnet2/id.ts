export type MetadataToken = number;

type Id = MetadataToken | string | Id[];
export type TypeId = Id;
export type MethodId = Id;

export type LocalTypeId = MetadataToken;
