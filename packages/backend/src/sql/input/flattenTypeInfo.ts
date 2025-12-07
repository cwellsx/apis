import { Members, MethodMember, TypeInfo } from "../../contracts-dotnet";
import { getTypeInfoName } from "../../utils";
import type { Columns, SavedTypeInfo } from "../types";

const createSavedTypeInfo = (typeInfo: TypeInfo): SavedTypeInfo => {
  const result: SavedTypeInfo = { ...typeInfo };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  delete (result as any)["members"];
  return result;
};

const isCompilerGeneratedAttribute = (attribute: string): boolean =>
  attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";

const isCompilerGeneratedType = (typeInfo: TypeInfo): boolean =>
  typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;

const isCompilerGeneratedMethod = (nethodInfo: MethodMember): boolean =>
  // don't use isCompilerGeneratedAttribute because that's also applied to properties which we want to keep as-is
  nethodInfo.name[0] === "<";

const isMethod = (entry: [string, unknown[]]): entry is ["method", MethodMember[]] =>
  (entry[0] as keyof Members) == "methodMembers";

export const flattenTypeInfo = (
  assemblyName: string,
  typeInfos: TypeInfo[]
): {
  typeColumns: Columns.TypeColumns[];
  memberColumns: Columns.MemberColumns[];
  methodNameColumns: Columns.MethodNameColumns[];
  declaringTypeColumns: Columns.DeclaringTypeColumns[];
  typeNameColumns: Columns.TypeNameColumns[];
} => {
  // types

  const typeColumns: Columns.TypeColumns[] = typeInfos.map((type) => ({
    assemblyName,
    metadataToken: type.typeId.metadataToken,
    typeInfo: createSavedTypeInfo(type),
  }));

  // members and methods for each type

  const memberColumns: Columns.MemberColumns[] = [];
  const methodNameColumns: Columns.MethodNameColumns[] = [];

  for (const type of typeInfos) {
    memberColumns.push(
      ...Object.entries(type.members)
        .map(([memberType, memberValues]) =>
          memberValues.map((memberInfo) => ({
            assemblyName,
            // memberType is string[] -- https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208
            memberType: memberType as keyof Members,
            typeMetadataToken: type.typeId.metadataToken,
            metadataToken: memberInfo.metadataToken,
            memberInfo: JSON.stringify(memberInfo),
          }))
        )
        .flat()
    );

    const getMethodNameColumns = (nethodMember: MethodMember): Columns.MethodNameColumns => ({
      assemblyName,
      name: nethodMember.name,
      metadataToken: nethodMember.metadataToken,
      isCompilerMethod: isCompilerGeneratedMethod(nethodMember) ? 1 : 0,
    });

    methodNameColumns.push(
      ...Object.entries(type.members)
        .filter(isMethod)
        .map(([, memberValues]) => memberValues.map(getMethodNameColumns))
        .flat()
    );
  }
  // declaring types

  const declaringTypeColumns: Columns.DeclaringTypeColumns[] = [];
  const declaringTypeIds = new Set<number>();

  typeInfos.forEach((typeInfo) => {
    const metadataToken = typeInfo.typeId.metadataToken;
    const declaringType = typeInfo.typeId.declaringType?.metadataToken;
    if (!declaringType) return;
    const nestedType = metadataToken;
    declaringTypeColumns.push({ assemblyName, nestedType, declaringType });
    declaringTypeIds.add(declaringType);
  });

  const declaringTypeInfo = new Map<number, TypeInfo>();
  typeInfos.forEach((typeInfo) => {
    const metadataToken = typeInfo.typeId.metadataToken;
    if (declaringTypeIds.has(metadataToken)) declaringTypeInfo.set(metadataToken, typeInfo);
  });

  // compiler types

  const isCompilerType = (typeInfo: TypeInfo): boolean => {
    if (isCompilerGeneratedType(typeInfo)) return true;
    const declaringType = typeInfo.typeId.declaringType?.metadataToken;
    if (!declaringType) return false;
    const parentType = declaringTypeInfo.get(declaringType);
    if (!parentType) throw new Error("Missing declaringType info");
    return isCompilerType(parentType);
  };

  // type names

  const typeNameColumns: Columns.TypeNameColumns[] = typeInfos.map((typeInfo) => ({
    assemblyName,
    metadataToken: typeInfo.typeId.metadataToken,
    namespace: typeInfo.typeId.namespace ?? null,
    decoratedName: getTypeInfoName(typeInfo),
    isCompilerType: isCompilerType(typeInfo) ? 1 : 0,
  }));

  return { typeColumns, memberColumns, methodNameColumns, declaringTypeColumns, typeNameColumns };
};
