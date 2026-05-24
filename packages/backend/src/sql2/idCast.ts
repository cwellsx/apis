import * as Id from "./idTypes";

export const castAssemblyId = (id: number): Id.AssemblyId => id as Id.AssemblyId;
export const castNamespaceId = (id: number): Id.NamespaceId => id as Id.NamespaceId;
export const castAssemblyGroupId = (id: number): Id.AssemblyGroupId => id as Id.AssemblyGroupId;
export const castNamespaceGroupId = (id: number): Id.NamespaceGroupId => id as Id.NamespaceGroupId;
export const castViewId = (id: number): Id.ViewId => id as Id.ViewId;

export const castCustomId = (id: number): Id.CustomId => id as Id.CustomId;

export const castTypeDefId = (id: bigint): Id.TypeDefId => id as Id.TypeDefId;
export const castTypeRefId = (id: bigint): Id.TypeRefId => id as Id.TypeRefId;
export const castGenericParamId = (id: bigint): Id.GenericParamId => id as Id.GenericParamId;

export const castMethodDefId = (id: bigint): Id.MethodDefId => id as Id.MethodDefId;
export const castMethodRefId = (id: bigint): Id.MethodRefId => id as Id.MethodRefId;
export const castMemberId = (id: bigint): Id.MemberId => id as Id.MemberId;

export const castAnyId = (id: bigint): Id.AnyId => id as Id.TypeDefId;
