// number

export type AssemblyId = number & { __brand: "AssemblyId" };
export type NamespaceId = number & { __brand: "NamespaceId" };
export type GroupId = number & { __brand: "GroupId" };

export type ViewId = number & { __brand: "ViewId" };

// string

export type CustomId = string & { __brand: "CustomId" };
export type CustomGroupId = string & { __brand: "CustomGroupId" };

// bigint

export type TypeDefId = bigint & { __brand: "TypeDefId" };
export type TypeSpecId = bigint & { __brand: "TypeSpecId" };
export type GenericParamId = bigint & { __brand: "GenericParam" };

export type MethodDefId = bigint & { __brand: "MethodDefId" };
export type MethodSpecId = bigint & { __brand: "MethodSpecId" };
export type MemberId = bigint & { __brand: "MemberId" };

export type BigAssemblyId = bigint & { __brand: "BigAssemblyId" };
export type BigNamespaceId = bigint & { __brand: "BigNamespaceId" };
export type BigGroupId = bigint & { __brand: "BigGroupId" };
export type BigCustomId = bigint & { __brand: "BigCustomId" };

export type CallFromId = MethodDefId | TypeDefId | BigAssemblyId | BigNamespaceId;
export type CallToId = CallFromId | MethodSpecId | TypeSpecId;

export type BaseTypeId = TypeDefId | GenericParamId; // resolvedId of a TypeSpec
export type TypeId = BaseTypeId | TypeSpecId;
export type MethodId = MethodDefId | MethodSpecId;

export type AnyDefId = TypeDefId | MethodDefId; // ownerId of a GenericParam
export type AnyOwnerId = TypeSpecId | MethodSpecId | MethodDefId; // ownerId of a SignatureType

export type AnyRootId = AssemblyId | NamespaceId;

export type AnyCoreId = AssemblyId | NamespaceId | TypeId | MethodId;

export type AnyId = TypeId | MethodId | AnyRootId | GroupId | CustomId | CustomGroupId;

export type AnyBigId = TypeId | MethodId | BigAssemblyId | BigNamespaceId | BigGroupId | BigCustomId;
