// number

export type AssemblyId = number & { __brand: "AssemblyId" };
export type NamespaceId = number & { __brand: "NamespaceId" };
export type AssemblyGroupId = number & { __brand: "AssemblyGroupId" };
export type NamespaceGroupId = number & { __brand: "NamespaceGroupId" };
export type ViewId = number & { __brand: "ViewId" };

export type CustomId = number & { __brand: "CustomId" };

// bigint

export type TypeDefId = bigint & { __brand: "TypeDefId" };
export type TypeSpecId = bigint & { __brand: "TypeSpecId" };
export type GenericParamId = bigint & { __brand: "GenericParam" };

export type MethodDefId = bigint & { __brand: "MethodDefId" };
export type MethodSpecId = bigint & { __brand: "MethodSpecId" };
export type MemberId = bigint & { __brand: "MemberId" };

export type BigAssemblyId = bigint & { __brand: "BigAssemblyId" };
export type BigNamespaceId = bigint & { __brand: "BigNamespaceId" };

export type CallFromId = MethodDefId | TypeDefId | BigAssemblyId | BigNamespaceId;
export type CallToId = CallFromId | MethodSpecId | TypeSpecId;

export type BaseTypeId = TypeDefId | GenericParamId; // resolvedId of a TypeSpec
export type TypeId = BaseTypeId | TypeSpecId;
export type MethodId = MethodDefId | MethodSpecId;

export type AnyDefId = TypeDefId | MethodDefId; // ownerId of a GenericParam
export type AnyOwnerId = TypeSpecId | MethodSpecId | MethodDefId; // ownerId of a SignatureType
//export type AnyOwnerId = bigint & { __brand: "TypeSpecId" | "MethodSpecId" | "MethodDefId" };

export type AnyRootId = AssemblyId | NamespaceId;
export type AnyGroupId = AssemblyGroupId | NamespaceGroupId;
export type AnyId = TypeId | MethodId | AnyRootId | AnyGroupId | CustomId;

export type AnyBigId = TypeId | MethodId | BigAssemblyId | BigNamespaceId;
