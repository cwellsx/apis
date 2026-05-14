// number

export type AssemblyId = number & { __brand: "AssemblyId" };
export type NamespaceId = number & { __brand: "NamespaceId" };
export type AssemblyGroupId = number & { __brand: "AssemblyGroupId" };
export type NamespaceGroupId = number & { __brand: "NamespaceGroupId" };
export type ViewId = number & { __brand: "ViewId" };

// bigint

export type TypeDefId = bigint & { __brand: "TypeDefId" };
export type TypeRefId = bigint & { __brand: "TypeRefId" };
export type GenericParamId = bigint & { __brand: "GenericParam" };

export type MethodDefId = bigint & { __brand: "MethodDefId" };
export type MethodRefId = bigint & { __brand: "MethodRefId" };
export type MemberId = bigint & { __brand: "MemberId" };

export type BaseTypeId = TypeDefId | GenericParamId; // resolvedId of a TypeReference
export type TypeId = BaseTypeId | TypeRefId;
export type MethodId = MethodDefId | MethodRefId;

export type AnyDefId = TypeDefId | MethodDefId; // ownerId of a GenericParam
export type AnyOwnerId = TypeRefId | MethodRefId | MethodDefId; // ownerId of a SignatureType
export type AnyId = TypeId | MethodId | AssemblyId | NamespaceId;
