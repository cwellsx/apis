// number

export type AssemblyId = number & { __brand: "AssemblyId" };
export type NamespaceId = number & { __brand: "NamespaceId" };
export type ViewId = number & { __brand: "ViewId" };

// bigint

export type TypeId = bigint & { __brand: "TypeId" };
export type MethodId = bigint & { __brand: "MethodId" };
export type MemberId = bigint & { __brand: "MemberId" };

export type AnyId = TypeId | MethodId;

// cast

export const castAssemblyId = (id: number): AssemblyId => id as AssemblyId;
export const castNamespaceId = (id: number): NamespaceId => id as NamespaceId;
export const castViewId = (id: number): ViewId => id as ViewId;

export const castTypeId = (id: bigint): TypeId => id as TypeId;
export const castMethodId = (id: bigint): MethodId => id as MethodId;
export const castMemberId = (id: bigint): MemberId => id as MemberId;

// pack

const pack = (id: number, assemblyId: AssemblyId): bigint => (BigInt(assemblyId) << 32n) + BigInt(id);
export const packTypeId = (id: number, assemblyId: AssemblyId): TypeId => castTypeId(pack(id, assemblyId));
export const packMethodId = (id: number, assemblyId: AssemblyId): MethodId => castMethodId(pack(id, assemblyId));
export const packMemberId = (id: number, assemblyId: AssemblyId): MemberId => castMemberId(pack(id, assemblyId));
