import type { Named, Namespace, NodeId, Type, Types } from "../shared-types";
import { artificialKeyFactory, artificialNodeId } from "../shared-types";
import { getAccess, getAttributes, getMembers, getTypeName } from "./convertLoadedToMembers";
import type { AllTypeInfo, NamedTypeInfo, TypeId } from "./loaded";
import { isPartTypeInfo, namedTypeInfo } from "./loaded";
import { options } from "./shared-types";
import { SavedTypeInfo } from "./sqlTables";

type Exceptions = Named[];

export const getTypeInfoName = (typeInfo: NamedTypeInfo | SavedTypeInfo): string =>
  getTypeName(typeInfo.typeId.name, typeInfo.genericTypeParameters ?? typeInfo.typeId.genericTypeArguments);

// id can constructed using TypeId only without typeInfo.genericTypeParameters
// const getTypeId = (typeId: TypeId): string => getId("!t!", typeId.metadataToken);

type GetChildren = (typeId: TypeId) => NamedTypeInfo[] | undefined;

const nestTypes = (
  allTypeInfos: NamedTypeInfo[]
): { parentTypeInfos: NamedTypeInfo[]; getChildren: GetChildren; unwantedTypes: Set<number> } => {
  type Element = { parent: NamedTypeInfo; children?: NamedTypeInfo[] };
  const allTypes = new Map<number, Element>(
    allTypeInfos.map((typeInfo) => [typeInfo.typeId.metadataToken, { parent: typeInfo }])
  );
  // const getParent = (typeId: TypeId): { parent: NamedTypeInfo; children?: NamedTypeInfo[] } | undefined => {
  //   const parentId = getTypeId(typeId);
  //   const result = allTypes.get(parentId);
  //   if (!result) logError(`!getParent(${parentId})`);
  //   return result;
  // };
  const findElement = (typeId: TypeId): Element => {
    const found = allTypes.get(typeId.metadataToken);
    if (!found) throw new Error(`!findElement(${typeId.metadataToken})`);
    return found;
  };

  const getChildren = (typeId: TypeId): NamedTypeInfo[] | undefined => findElement(typeId)?.children;

  const parentTypeInfos: NamedTypeInfo[] = [];
  allTypeInfos.forEach((typeInfo) => {
    if (typeInfo.typeId.declaringType) {
      const element = findElement(typeInfo.typeId.declaringType);
      if (!element.children) element.children = [];
      element.children.push(typeInfo);
      return;
    } else parentTypeInfos.push(typeInfo);
  });

  // find unwanted types
  const unwantedTypes = new Set<number>();
  if (!options.compilerGenerated) {
    const addUnwanted = (typeInfo: NamedTypeInfo): void => {
      unwantedTypes.add(typeInfo.typeId.metadataToken);
      const children = getChildren(typeInfo.typeId);
      if (children) children.forEach(addUnwanted); // <- recurses
    };

    const isCompilerGeneratedAttribute = (attribute: string): boolean =>
      attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";

    const isCompilerGeneratedType = (typeInfo: NamedTypeInfo): boolean =>
      typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;

    allTypeInfos.filter(isCompilerGeneratedType).forEach(addUnwanted);
  }

  return { parentTypeInfos, getChildren, unwantedTypes };
};

// type IsWanted = (typeId: TypeId) => boolean;

// const unwantedTypes = (typeInfos: NamedTypeInfo[], getNested: GetChildren): IsWanted => {
//   const areUnwanted = new Set<string>();
//   const addUnwanted = (typeInfo: NamedTypeInfo): void => {
//     areUnwanted.add(getTypeId(typeInfo.typeId));
//     const nested = getNested(typeInfo.typeId);
//     if (nested) nested.forEach(addUnwanted); // <- recurses
//   };

//   const isCompilerGeneratedAttribute = (attribute: string): boolean =>
//     attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";
//   const isUnwanted = (typeInfo: NamedTypeInfo): boolean =>
//     typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;
//   typeInfos.filter(isUnwanted).forEach(addUnwanted);
//   const isWanted = (typeId: TypeId): boolean => !areUnwanted.has(getTypeId(typeId));
//   return isWanted;
// };

export const convertLoadedToTypes = (allTypeInfo: AllTypeInfo, assemblyName: string): Types => {
  const getArtificialKey = artificialKeyFactory();

  // remove all typeInfo without typeId
  const exceptions: Exceptions = [];
  const createExceptions = (exceptions: string[]): Exceptions =>
    exceptions.map((exceptionMessage) => ({
      name: exceptionMessage,
      nodeId: artificialNodeId("exception", getArtificialKey),
    }));
  allTypeInfo.anon.forEach((typeInfo) => exceptions.push(...createExceptions(typeInfo.exceptions)));

  const named = namedTypeInfo(allTypeInfo);

  // use declaringType to nest
  const { parentTypeInfos, getChildren, unwantedTypes } = nestTypes(named);

  // optionally remove compiler-generated types
  // const isWanted: IsWanted = !options.compilerGenerated ? unwantedTypes(named, getChildren) : () => true;
  const isWantedType = (typeInfo: NamedTypeInfo): boolean => !unwantedTypes.has(typeInfo.typeId.metadataToken);

  // group by namespace
  const grouped = new Map<string, NamedTypeInfo[]>();
  parentTypeInfos.filter(isWantedType).forEach((typeInfo) => {
    const namespace = typeInfo.typeId.namespace ?? "";
    let list = grouped.get(namespace);
    if (!list) {
      list = [];
      grouped.set(namespace, list);
    }
    list.push(typeInfo);
  });

  const getType = (typeInfo: NamedTypeInfo): Type => {
    const nested = getChildren(typeInfo.typeId);
    const typeTextNode: Named = {
      name: getTypeInfoName(typeInfo),
      //id: getTypeId(typeInfo.typeId),
      nodeId: { type: "type", assemblyName, metadataToken: typeInfo.typeId.metadataToken },
    };
    if (isPartTypeInfo(typeInfo)) return { ...typeTextNode, exceptions: createExceptions(typeInfo.exceptions) };

    const subtypes = nested ? nested.filter(isWantedType).map(getType) : undefined;

    return {
      ...typeTextNode,
      access: getAccess(typeInfo.access),
      attributes: getAttributes(typeInfo.attributes, getArtificialKey),
      subtypes,
      members: getMembers(typeInfo.members, getArtificialKey, assemblyName),
    };
  };

  const namespaces: Namespace[] = [...grouped.entries()]
    .map(([name, typeInfos]) => {
      const nodeId: NodeId = { type: "namespace", name };
      return {
        name,
        nodeId,
        types: typeInfos.map(getType).sort((x, y) => x.name.localeCompare(y.name)),
      };
    })
    .sort((x, y) => x.name.localeCompare(y.name));

  return { namespaces, exceptions, detailType: "types" };
};
