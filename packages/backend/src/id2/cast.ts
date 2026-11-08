import * as Id from "./types";

export const castAssemblyId = (id: number): Id.AssemblyId => id as Id.AssemblyId;
export const castGroupId = (id: number): Id.GroupId => id as Id.GroupId;
export const castViewId = (id: number): Id.ViewId => id as Id.ViewId;

export const castNamespaceId = (id: bigint): Id.NamespaceId => id as Id.NamespaceId;

export const castCustomLeafId = (id: string): Id.CustomLeafId => id as Id.CustomLeafId;
export const castCustomGroupId = (id: string): Id.CustomGroupId => id as Id.CustomGroupId;
export const castCustomNodeId = (id: string): Id.CustomNodeId => id as Id.CustomNodeId;
export const castAnyCustomId = (id: string): Id.AnyCustomId => id as Id.AnyCustomId;

export const castTypeDefId = (id: bigint): Id.TypeDefId => id as Id.TypeDefId;
export const castTypeSpecId = (id: bigint): Id.TypeSpecId => id as Id.TypeSpecId;
export const castGenericParamId = (id: bigint): Id.GenericParamId => id as Id.GenericParamId;

export const castMethodDefId = (id: bigint): Id.MethodDefId => id as Id.MethodDefId;
export const castMethodSpecId = (id: bigint): Id.MethodSpecId => id as Id.MethodSpecId;
export const castMemberId = (id: bigint): Id.MemberId => id as Id.MemberId;

export const castAnyBigId = (id: bigint): Id.AnyBigId => id as Id.TypeDefId;

export const castBigAssemblyId = (id: bigint): Id.BigAssemblyId => id as Id.BigAssemblyId;
export const castBigGroupId = (id: bigint): Id.BigGroupId => id as Id.BigGroupId;
