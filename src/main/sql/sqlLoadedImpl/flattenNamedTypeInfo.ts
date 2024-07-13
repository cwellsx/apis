import { NamedTypeInfo } from "../../loaded";
import { getTypeInfoName } from "../../shared-types";
import { DeclaringTypeColumns, TypeNameColumns } from "./columns";

const isCompilerGeneratedAttribute = (attribute: string): boolean =>
  attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";

const isCompilerGeneratedType = (typeInfo: NamedTypeInfo): boolean =>
  typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;

export const flattenNamedTypeInfo = (
  assemblyName: string,
  namedTypeInfos: NamedTypeInfo[]
): { declaringTypeColumns: DeclaringTypeColumns[]; typeNameColumns: TypeNameColumns[] } => {
  // declaring types

  const declaringTypeColumns: DeclaringTypeColumns[] = [];
  const declaringTypeIds = new Set<number>();

  namedTypeInfos.forEach((typeInfo) => {
    const metadataToken = typeInfo.typeId.metadataToken;
    const declaringType = typeInfo.typeId.declaringType?.metadataToken;
    if (!declaringType) return;
    const nestedType = metadataToken;
    declaringTypeColumns.push({ assemblyName, nestedType, declaringType });
    declaringTypeIds.add(declaringType);
    //mapTypeInfo.set(metadataToken, typeInfo);
  });

  const declaringTypeInfo = new Map<number, NamedTypeInfo>();
  namedTypeInfos.forEach((typeInfo) => {
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

  const typeNameColumns: TypeNameColumns[] = namedTypeInfos.map((typeInfo) => ({
    assemblyName,
    metadataToken: typeInfo.typeId.metadataToken,
    namespace: typeInfo.typeId.namespace ?? null,
    decoratedName: getTypeInfoName(typeInfo),
    isCompilerType: isCompilerType(typeInfo) ? 1 : 0,
  }));

  return { declaringTypeColumns, typeNameColumns };
};
