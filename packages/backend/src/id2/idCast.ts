import * as Id from "./idTypes";

export const castAssemblyId = (id: number): Id.AssemblyId => id as Id.AssemblyId;
export const castNamespaceId = (id: number): Id.NamespaceId => id as Id.NamespaceId;
export const castGroupId = (id: number): Id.GroupId => id as Id.GroupId;
export const castViewId = (id: number): Id.ViewId => id as Id.ViewId;

export const castCustomId = (id: string): Id.CustomId => id as Id.CustomId;
export const castCustomGroupId = (id: string): Id.CustomGroupId => id as Id.CustomGroupId;

export const castTypeDefId = (id: bigint): Id.TypeDefId => id as Id.TypeDefId;
export const castTypeSpecId = (id: bigint): Id.TypeSpecId => id as Id.TypeSpecId;
export const castGenericParamId = (id: bigint): Id.GenericParamId => id as Id.GenericParamId;

export const castMethodDefId = (id: bigint): Id.MethodDefId => id as Id.MethodDefId;
export const castMethodSpecId = (id: bigint): Id.MethodSpecId => id as Id.MethodSpecId;
export const castMemberId = (id: bigint): Id.MemberId => id as Id.MemberId;

export const castAnyBigId = (id: bigint): Id.AnyBigId => id as Id.TypeDefId;

export const toBigAssemblyId = (id: Id.AssemblyId): Id.BigAssemblyId => BigInt(id) as Id.BigAssemblyId;
export const toBigNamespaceId = (id: Id.NamespaceId): Id.BigNamespaceId => BigInt(id) as Id.BigNamespaceId;
export const toBigGroupId = (id: Id.GroupId): Id.BigGroupId => BigInt(id) as Id.BigGroupId;

export const castBigAssemblyId = (id: bigint): Id.BigAssemblyId => id as Id.BigAssemblyId;
export const castBigNamespaceId = (id: bigint): Id.BigNamespaceId => id as Id.BigNamespaceId;
export const castBigGroupId = (id: bigint): Id.BigGroupId => id as Id.BigGroupId;

export const castBigCustomId = (id: bigint): Id.BigCustomId => id as Id.BigCustomId;

export const zero = {
  // number
  assemblyId: castAssemblyId(0),
  namespaceId: castNamespaceId(0),
  groupId: castGroupId(0),
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

  customId: castCustomId("foo"),
  customGroupId: castCustomGroupId("foo"),
};

export const textToViewId = (id: string | undefined): Id.ViewId | undefined =>
  id ? castViewId(Number(id)) : undefined;
export const viewIdToText = (id: Id.ViewId): string => id.toString();
export const minViewId = (ids: Id.ViewId[]): Id.ViewId => castViewId(Math.min(...ids));
