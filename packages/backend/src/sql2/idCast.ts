import {
  AnyId,
  AssemblyId,
  GenericParamId,
  MemberId,
  MethodDefId,
  MethodRefId,
  NamespaceId,
  TypeDefId,
  TypeRefId,
  ViewId,
} from "./idTypes";

export const castAssemblyId = (id: number): AssemblyId => id as AssemblyId;
export const castNamespaceId = (id: number): NamespaceId => id as NamespaceId;
export const castViewId = (id: number): ViewId => id as ViewId;

export const castTypeDefId = (id: bigint): TypeDefId => id as TypeDefId;
export const castTypeRefId = (id: bigint): TypeRefId => id as TypeRefId;
export const castGenericParamId = (id: bigint): GenericParamId => id as GenericParamId;

export const castMethodDefId = (id: bigint): MethodDefId => id as MethodDefId;
export const castMethodRefId = (id: bigint): MethodRefId => id as MethodRefId;
export const castMemberId = (id: bigint): MemberId => id as MemberId;

export const castAnyId = (id: bigint): AnyId => id as TypeDefId;
