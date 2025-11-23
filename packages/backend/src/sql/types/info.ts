import type { BadMethodInfo, NamedTypeInfo as GoodTypeInfo, MemberException, TypeId } from "../../contracts-dotnet";

export { NamedTypeInfo as GoodTypeInfo } from "../../contracts-dotnet";
export type { MethodInfo } from "../../contracts-dotnet";
export type { CommonGraphViewType } from "./viewType";
export type SavedTypeInfo = Omit<GoodTypeInfo, "members">;

export type BadMethodInfoAndIds = BadMethodInfo & { methodId: number; typeId: number };
export type CompilerMethodError = "Multiple Callers" | "No Callers" | null;

// contains all exceptions (if any) from a TypeInfo
export type BadTypeInfo = { typeId?: TypeId; exceptions?: string[]; memberExceptions?: MemberException[] };
export type NamedBadTypeInfo = BadTypeInfo & { typeId: TypeId };
