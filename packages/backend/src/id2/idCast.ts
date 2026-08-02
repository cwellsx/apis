import * as Id from "./idTypes";

export const castAssemblyId = (id: number): Id.AssemblyId => id as Id.AssemblyId;
export const castNamespaceId = (id: number): Id.NamespaceId => id as Id.NamespaceId;
export const castAssemblyGroupId = (id: number): Id.AssemblyGroupId => id as Id.AssemblyGroupId;
export const castNamespaceGroupId = (id: number): Id.NamespaceGroupId => id as Id.NamespaceGroupId;
export const castViewId = (id: number): Id.ViewId => id as Id.ViewId;

export const castCustomId = (id: number): Id.CustomId => id as Id.CustomId;

export const castTypeDefId = (id: bigint): Id.TypeDefId => id as Id.TypeDefId;
export const castTypeSpecId = (id: bigint): Id.TypeSpecId => id as Id.TypeSpecId;
export const castGenericParamId = (id: bigint): Id.GenericParamId => id as Id.GenericParamId;

export const castMethodDefId = (id: bigint): Id.MethodDefId => id as Id.MethodDefId;
export const castMethodSpecId = (id: bigint): Id.MethodSpecId => id as Id.MethodSpecId;
export const castMemberId = (id: bigint): Id.MemberId => id as Id.MemberId;

export const castAnyBigId = (id: bigint): Id.AnyBigId => id as Id.TypeDefId;

export const toBigAssemblyId = (id: Id.AssemblyId): Id.BigAssemblyId => BigInt(id) as Id.BigAssemblyId;
export const toBigNamespaceId = (id: Id.NamespaceId): Id.BigNamespaceId => BigInt(id) as Id.BigNamespaceId;
export const toBigAssemblyGroupId = (id: Id.AssemblyGroupId): Id.BigAssemblyGroupId =>
  BigInt(id) as Id.BigAssemblyGroupId;
export const toBigNamespaceGroupId = (id: Id.NamespaceGroupId): Id.BigNamespaceGroupId =>
  BigInt(id) as Id.BigNamespaceGroupId;

export const castBigAssemblyId = (id: bigint): Id.BigAssemblyId => id as Id.BigAssemblyId;
export const castBigNamespaceId = (id: bigint): Id.BigNamespaceId => id as Id.BigNamespaceId;
export const castBigAssemblyGroupId = (id: bigint): Id.BigAssemblyGroupId => id as Id.BigAssemblyGroupId;
export const castBigNamespaceGroupId = (id: bigint): Id.BigNamespaceGroupId => id as Id.BigNamespaceGroupId;

export const castBigCustomId = (id: bigint): Id.BigCustomId => id as Id.BigCustomId;

export const zero = {
  // number
  assemblyId: castAssemblyId(0),
  namespaceId: castNamespaceId(0),
  assemblyGroupId: castAssemblyGroupId(0),
  namespaceGroupId: castNamespaceGroupId(0),
  viewId: castViewId(0),
  // bigint
  typeDefId: castTypeDefId(0n),
  typeSpecId: castTypeSpecId(0n),
  genericParamId: castGenericParamId(0n),

  typeId: castTypeSpecId(0n),
  methodDefId: castMethodDefId(0n),
  methodSpecId: castMethodSpecId(0n),
  methodId: castMethodDefId(0n),
  memberId: castMemberId(0n),
  anyBigId: castAnyBigId(0n),
};
