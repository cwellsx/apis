import { NamedTypeInfo as GoodTypeInfo } from "../../contracts-dotnet";

export type SavedTypeInfo = Omit<GoodTypeInfo, "members">;

export const createSavedTypeInfo = (typeInfo: GoodTypeInfo): SavedTypeInfo => {
  const result: SavedTypeInfo = { ...typeInfo };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  delete (result as any)["members"];
  return result;
};
