import { NamedTypeInfo } from "../../loaded";
import { DeclaringTypeColumns } from "./columns";

export const flattenNamedTypeInfo = (
  assemblyName: string,
  namedTypeInfos: NamedTypeInfo[]
): {
  declaringTypeColumns: DeclaringTypeColumns[];
} => {
  const declaringTypeColumns: DeclaringTypeColumns[] = [];

  namedTypeInfos.forEach((typeInfo) => {
    const metadataToken = typeInfo.typeId.metadataToken;
    const declaringType = typeInfo.typeId.declaringType?.metadataToken;
    if (!declaringType) return;
    const nestedType = metadataToken;
    declaringTypeColumns.push({ assemblyName, nestedType, declaringType });
  });

  return { declaringTypeColumns };
};
