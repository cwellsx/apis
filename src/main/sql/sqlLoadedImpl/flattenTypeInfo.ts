import { getMembers, Members, NamedTypeInfo } from "../../loaded";
import { getTypeInfoName } from "../../shared-types";
import type { DeclaringTypeColumns, MemberColumns, MethodNameColumns, TypeColumns, TypeNameColumns } from "./columns";
import { createSavedTypeInfo } from "./savedTypeInfo";

const isCompilerGeneratedAttribute = (attribute: string): boolean =>
  attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";

const isCompilerGeneratedType = (typeInfo: NamedTypeInfo): boolean =>
  typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;

export const flattenTypeInfo = (
  assemblyName: string,
  typeInfos: NamedTypeInfo[]
): {
  typeColumns: TypeColumns[];
  memberColumns: MemberColumns[];
  methodNameColumns: MethodNameColumns[];
  declaringTypeColumns: DeclaringTypeColumns[];
  typeNameColumns: TypeNameColumns[];
} => {
  // types

  const typeColumns: TypeColumns[] = typeInfos.map((type) => ({
    assemblyName,
    metadataToken: type.typeId.metadataToken,
    typeInfo: createSavedTypeInfo(type),
  }));

  // members and methods for each type

  const memberColumns: MemberColumns[] = [];
  const methodNameColumns: MethodNameColumns[] = [];

  for (const type of typeInfos) {
    memberColumns.push(
      ...Object.entries(getMembers(type))
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

    methodNameColumns.push(
      ...Object.entries(getMembers(type))
        .filter(([memberType]) => (memberType as keyof Members) == "methodMembers")
        .map(([, memberValues]) =>
          memberValues.map((memberInfo) => ({
            assemblyName,
            name: memberInfo.name,
            metadataToken: memberInfo.metadataToken,
          }))
        )
        .flat()
    );
  }
  // declaring types

  const declaringTypeColumns: DeclaringTypeColumns[] = [];
  const declaringTypeIds = new Set<number>();

  typeInfos.forEach((typeInfo) => {
    const metadataToken = typeInfo.typeId.metadataToken;
    const declaringType = typeInfo.typeId.declaringType?.metadataToken;
    if (!declaringType) return;
    const nestedType = metadataToken;
    declaringTypeColumns.push({ assemblyName, nestedType, declaringType });
    declaringTypeIds.add(declaringType);
  });

  const declaringTypeInfo = new Map<number, NamedTypeInfo>();
  typeInfos.forEach((typeInfo) => {
    const metadataToken = typeInfo.typeId.metadataToken;
    if (declaringTypeIds.has(metadataToken)) declaringTypeInfo.set(metadataToken, typeInfo);
  });

  // compiler types

  const isCompilerType = (typeInfo: NamedTypeInfo): boolean => {
    if (isCompilerGeneratedType(typeInfo)) return true;
    const declaringType = typeInfo.typeId.declaringType?.metadataToken;
    if (!declaringType) return false;
    const parentType = declaringTypeInfo.get(declaringType);
    if (!parentType) throw new Error("Missing declaringType info");
    return isCompilerType(parentType);
  };

  // type names

  const typeNameColumns: TypeNameColumns[] = typeInfos.map((typeInfo) => ({
    assemblyName,
    metadataToken: typeInfo.typeId.metadataToken,
    namespace: typeInfo.typeId.namespace ?? null,
    decoratedName: getTypeInfoName(typeInfo),
    isCompilerType: isCompilerType(typeInfo) ? 1 : 0,
  }));

  return { typeColumns, memberColumns, methodNameColumns, declaringTypeColumns, typeNameColumns };
};
