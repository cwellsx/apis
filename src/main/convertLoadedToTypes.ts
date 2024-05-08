import type { Exceptions, Namespace, Type, Types } from "../shared-types";
import { getAccess, getAttributes, getId, getMembers, getTypeName } from "./convertLoadedToMembers";
import type { AllTypeInfo, NamedTypeInfo, TypeId } from "./loaded";
import { isPartTypeInfo, namedTypeInfo } from "./loaded";
import { logError } from "./log";
import { options } from "./shared-types";

// use a closure to create an Exception instance with a unique id from a message string
const pushException: (exceptions: Exceptions, message: string) => void = (function () {
  let index = 0;
  const result = (exceptions: Exceptions, message: string) => {
    const exception = { label: message, id: getId("!e!", (++index).toString()) };
    exceptions.push(exception);
  };
  return result;
})();
const createExceptions = (messages: string[]): Exceptions => {
  const exceptions: Exceptions = [];
  messages.forEach((message) => pushException(exceptions, message));
  return exceptions;
};

export const getTypeInfoName = (typeInfo: NamedTypeInfo): string =>
  getTypeName(typeInfo.typeId.name, typeInfo.genericTypeParameters ?? typeInfo.typeId.genericTypeArguments);

// id can constructed using TypeId only without typeInfo.genericTypeParameters
const getTypeId = (typeId: TypeId): string => getId("!t!", typeId.metadataToken);

type GetNested = (typeId: TypeId) => NamedTypeInfo[] | undefined;

const nestTypes = (typeInfos: NamedTypeInfo[]): { parentTypeInfos: NamedTypeInfo[]; getNested: GetNested } => {
  const parentTypes = new Map<string, { parent: NamedTypeInfo; children?: NamedTypeInfo[] }>(
    typeInfos.map((typeInfo) => [getTypeId(typeInfo.typeId), { parent: typeInfo }])
  );
  const getParent = (typeId: TypeId): { parent: NamedTypeInfo; children?: NamedTypeInfo[] } | undefined => {
    const parentId = getTypeId(typeId);
    const result = parentTypes.get(parentId);
    if (!result) logError(`!getParent(${parentId})`);
    return result;
  };
  const getNested = (typeId: TypeId): NamedTypeInfo[] | undefined => getParent(typeId)?.children;
  const parentTypeInfos: NamedTypeInfo[] = [];
  typeInfos.forEach((typeInfo) => {
    if (typeInfo.typeId.declaringType) {
      const element = getParent(typeInfo.typeId.declaringType);
      if (element) {
        if (!element.children) element.children = [];
        element.children.push(typeInfo);
        return;
      }
    }
    parentTypeInfos.push(typeInfo);
  });
  return { parentTypeInfos, getNested };
};

type IsWanted = (typeId: TypeId) => boolean;

const unwantedTypes = (typeInfos: NamedTypeInfo[], getNested: GetNested): IsWanted => {
  const areUnwanted = new Set<string>();
  const addUnwanted = (typeInfo: NamedTypeInfo): void => {
    areUnwanted.add(getTypeId(typeInfo.typeId));
    const nested = getNested(typeInfo.typeId);
    if (nested) nested.forEach(addUnwanted); // <- recurses
  };

  const isCompilerGeneratedAttribute = (attribute: string): boolean =>
    attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";
  const isUnwanted = (typeInfo: NamedTypeInfo): boolean =>
    typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;
  typeInfos.filter(isUnwanted).forEach(addUnwanted);
  const isWanted = (typeId: TypeId): boolean => !areUnwanted.has(getTypeId(typeId));
  return isWanted;
};

export const convertLoadedToTypes = (allTypeInfo: AllTypeInfo, assemblyId: string): Types => {
  // remove all typeInfo without typeId
  const exceptions: Exceptions = [];
  allTypeInfo.anon.forEach((typeInfo) => exceptions.push(...createExceptions(typeInfo.exceptions)));

  const named = namedTypeInfo(allTypeInfo);

  // use declaringType to nest
  const { parentTypeInfos, getNested } = nestTypes(named);

  // optionally remove compiler-generated types
  const isWanted: IsWanted = !options.compilerGenerated ? unwantedTypes(named, getNested) : () => true;
  const isWantedType = (typeInfo: NamedTypeInfo): boolean => isWanted(typeInfo.typeId);

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
    const nested = getNested(typeInfo.typeId);
    const typeTextNode = {
      label: getTypeInfoName(typeInfo),
      id: getTypeId(typeInfo.typeId),
    };
    if (isPartTypeInfo(typeInfo)) return { ...typeTextNode, exceptions: createExceptions(typeInfo.exceptions) };

    const subtypes = nested ? nested.filter(isWantedType).map(getType) : undefined;

    return {
      ...typeTextNode,
      access: getAccess(typeInfo.access),
      attributes: getAttributes(typeInfo.attributes, typeInfo.typeId.metadataToken),
      subtypes,
      members: getMembers(typeInfo.members),
    };
  };

  const namespaces: Namespace[] = [...grouped.entries()]
    .map(([name, typeInfos]) => {
      return {
        label: name,
        id: getId("!n!", name),
        types: typeInfos.map(getType).sort((x, y) => x.label.localeCompare(y.label)),
      };
    })
    .sort((x, y) => x.label.localeCompare(y.label));

  return { assemblyId, namespaces, exceptions, detailType: "types" };
};
