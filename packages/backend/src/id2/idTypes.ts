// number

export type AssemblyId = number & { __brand: "AssemblyId" };
export type GroupId = number & { __brand: "GroupId" };
export type ViewId = number & { __brand: "ViewId" };

// string

export type CustomLeafId = string & { __brand: "CustomLeafId" };
export type CustomNodeId = string & { __brand: "CustomNodeId" };
export type CustomGroupId = string & { __brand: "CustomGroupId" };

// synthetic bigint

export type NamespaceId = bigint & { __brand: "NamespaceId" };

// bigint

export type TypeDefId = bigint & { __brand: "TypeDefId" };
export type TypeSpecId = bigint & { __brand: "TypeSpecId" };
export type GenericParamId = bigint & { __brand: "GenericParam" };

export type MethodDefId = bigint & { __brand: "MethodDefId" };
export type MethodSpecId = bigint & { __brand: "MethodSpecId" };
export type MemberId = bigint & { __brand: "MemberId" };

export type BigAssemblyId = bigint & { __brand: "BigAssemblyId" };
export type BigGroupId = bigint & { __brand: "BigGroupId" };

export type CallFromId = MethodDefId | TypeDefId | BigAssemblyId | NamespaceId;
export type CallToId = CallFromId | MethodSpecId | TypeSpecId;

export type CustomCallId = CustomLeafId | CustomNodeId;

export type BaseTypeId = TypeDefId | GenericParamId; // resolvedId of a TypeSpec
export type TypeId = BaseTypeId | TypeSpecId;
export type MethodId = MethodDefId | MethodSpecId;

export type AnyDefId = TypeDefId | MethodDefId; // ownerId of a GenericParam
export type AnyOwnerId = TypeSpecId | MethodSpecId | MethodDefId; // ownerId of a SignatureType

export type AnyCoreId = AssemblyId | NamespaceId | TypeId | MethodId;

export type AnyId = GroupId | AnyCoreId | AnyCustomId;

export type AnyBigId = TypeId | MethodId | BigAssemblyId | NamespaceId | BigGroupId;

export type AnyCustomId = CustomLeafId | CustomNodeId | CustomGroupId;
