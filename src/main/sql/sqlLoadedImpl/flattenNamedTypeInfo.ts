import { NamedTypeInfo } from "../../loaded";
import { DeclaringTypeColumns, WantedTypeColumns } from "./columns";

const isCompilerGeneratedAttribute = (attribute: string): boolean =>
  attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";

const isCompilerGeneratedType = (typeInfo: NamedTypeInfo): boolean =>
  typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;

export const flattenNamedTypeInfo = (
  assemblyName: string,
  namedTypeInfos: NamedTypeInfo[]
): {
  declaringTypeColumns: DeclaringTypeColumns[];
  wantedTypeColumns: WantedTypeColumns[];
} => {
  const declaringTypeColumns: DeclaringTypeColumns[] = [];
  const wantedTypeColumns: WantedTypeColumns[] = [];
  const namespaces = new Map<number, string | undefined>();

  namedTypeInfos.forEach((typeInfo) => {
    const metadataToken = typeInfo.typeId.metadataToken;
    namespaces.set(metadataToken, typeInfo.typeId.namespace);
    const declaringType = typeInfo.typeId.declaringType?.metadataToken;
    if (!declaringType) return;
    const nestedType = metadataToken;
    declaringTypeColumns.push({ assemblyName, nestedType, declaringType });
    if (!isCompilerGeneratedType(typeInfo)) return;
    wantedTypeColumns.push({
      assemblyName,
      nestedType,
      wantedType: declaringType,
      wantedMethod: 0,
      wantedNamespace: "",
    });
  });

  const map: Map<number, WantedTypeColumns> = new Map<number, WantedTypeColumns>(
    wantedTypeColumns.map((columns) => [columns.nestedType, columns])
  );
  const recurse = (wantedType: number): number => {
    const parent = map.get(wantedType);
    return parent ? recurse(parent.wantedType) : wantedType;
  };
  wantedTypeColumns.forEach((columns) => {
    const wantedType = recurse(columns.wantedType);
    columns.wantedType = wantedType;
    columns.wantedNamespace = namespaces.get(wantedType);
  });

  return { declaringTypeColumns, wantedTypeColumns };
};
