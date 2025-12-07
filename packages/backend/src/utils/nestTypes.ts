import { TypeId, TypeInfo } from "../contracts-dotnet";

const getUnwantedTypes = <T extends { typeId: TypeId; attributes?: string[] }>(
  allTypes: T[],
  getChildren: (typeId: TypeId) => T[]
): { [index: number]: number } => {
  const unwantedTypes: { [index: number]: number } = {};

  const addUnwanted = (typeInfo: T, declaringType: number): void => {
    unwantedTypes[typeInfo.typeId.metadataToken] = declaringType;
    const children = getChildren(typeInfo.typeId);
    children.forEach((child) => addUnwanted(child, declaringType)); // <- recurses
  };

  const isCompilerGeneratedAttribute = (attribute: string): boolean =>
    attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";

  const isCompilerGeneratedType = (typeInfo: T): boolean =>
    typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;

  allTypes
    .filter(isCompilerGeneratedType)
    .forEach((typeInfo) => addUnwanted(typeInfo, typeInfo.typeId.declaringType?.metadataToken ?? 0));
  return unwantedTypes;
};

export const nestTypes = (
  allTypes: TypeInfo[]
): {
  rootTypes: TypeInfo[];
  getChildren: (typeId: TypeId) => TypeInfo[];
  unwantedTypes: { [index: number]: number };
} => {
  // create Map of every type's children, and an array of all the root types
  const childTypes = new Map<number, TypeInfo[]>(allTypes.map((typeInfo) => [typeInfo.typeId.metadataToken, []]));
  const getChildren = (typeId: TypeId): TypeInfo[] => {
    const found = childTypes.get(typeId.metadataToken);
    if (!found) throw new Error(`!findElement(${typeId.metadataToken})`);
    return found;
  };
  const rootTypes: TypeInfo[] = [];
  allTypes.forEach((typeInfo) => {
    if (typeInfo.typeId.declaringType) getChildren(typeInfo.typeId.declaringType).push(typeInfo);
    else rootTypes.push(typeInfo);
  });

  // find unwanted types
  const unwantedTypes: { [index: number]: number } = getUnwantedTypes(allTypes, getChildren);

  return { rootTypes, getChildren, unwantedTypes };
};
