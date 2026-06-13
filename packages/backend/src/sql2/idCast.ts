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

export const castAnyId = (id: bigint): Id.AnyId => id as Id.TypeDefId;
