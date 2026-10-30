export type MetadataToken = number;
export type BrandedId = `${string}|${number}`;
export type GenericParam = `${string}~${number}`;
export type Specification = [MetadataToken];

export type Id = MetadataToken | GenericParam | BrandedId | Specification;

export type BaseTypeId = MetadataToken | GenericParam | BrandedId;
export type BaseMethodId = MetadataToken | BrandedId;

export type TypeId = Id;
export type MethodId = MetadataToken | BrandedId | Specification;

export type LocalTypeId = MetadataToken;
