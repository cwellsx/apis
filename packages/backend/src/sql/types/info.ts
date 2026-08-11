import type { TypeInfo } from "../../contracts-dotnet";

export type { MethodInfo, TypeId, TypeInfo } from "../../contracts-dotnet";
export type SavedTypeInfo = Omit<TypeInfo, "members">;
export type CompilerMethodError = "Multiple Callers" | "No Callers" | null;
