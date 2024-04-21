import type { Access, Exceptions, MemberInfo, Namespace, TextNode, Type, Types } from "../shared-types";
import type {
  AllTypeInfo,
  EventMember,
  FieldMember,
  MethodMember,
  NamedTypeInfo,
  Parameter,
  PropertyMember,
  TypeId,
} from "./loaded";
import { Access as LoadedAccess, isPartTypeInfo, namedTypeInfo } from "./loaded";
import { logError } from "./log";
import { options } from "./shared-types";

type IdKind = "!n!" | "!t!" | "!e!" | "!a!";
type MemberIdKind = "!mm!" | "!mf!" | "!mp!" | "!me!";
const makeId = (kind: IdKind | MemberIdKind, id: number | string): string => `${kind}${id}`;

export const getMethodId = (id: string): string | undefined => (id.startsWith("!mm!") ? id.substring(4) : undefined);

// use a closure to create an Exception instance with a unique id from a message string
const pushException: (exceptions: Exceptions, message: string) => void = (function () {
  let index = 0;
  const result = (exceptions: Exceptions, message: string) => {
    const exception = { label: message, id: makeId("!e!", (++index).toString()) };
    exceptions.push(exception);
  };
  return result;
})();
const createExceptions = (messages: string[]): Exceptions => {
  const exceptions: Exceptions = [];
  messages.forEach((message) => pushException(exceptions, message));
  return exceptions;
};

const makeTypeName = (name: string, generic?: TypeId[]): string => {
  if (!generic) return name;
  const index = name.indexOf("`");
  return (index === -1 ? name : name.substring(0, index)) + `<${generic.map((it) => it.name).join(",")}>`;
};
const makeTypeIdName = (typeId: TypeId): string => makeTypeName(typeId.name, typeId.genericTypeArguments);

const getTypeName = (typeInfo: NamedTypeInfo): string =>
  makeTypeName(typeInfo.typeId.name, typeInfo.genericTypeParameters ?? typeInfo.typeId.genericTypeArguments);

// id can constructed using TypeId only without typeInfo.genericTypeParameters
const getTypeId = (typeId: TypeId): string => makeId("!t!", typeId.metadataToken);

const parseAttribute = (attribute: string): { namespace?: string; name: string; args?: string } => {
  if (attribute[0] != "[" || attribute[attribute.length - 1] != "]")
    throw new Error(`Unexpected attribute ${attribute}`);
  attribute = attribute.substring(1, attribute.length - 1);
  const paren = attribute.indexOf("(");
  const [first, args] =
    paren == -1
      ? [attribute, undefined]
      : [attribute.substring(0, paren), attribute.substring(paren + 1, attribute.length - 1)];
  const dot = first.lastIndexOf(".");
  const [namespace, name] = dot == -1 ? [undefined, attribute] : [first?.substring(0, dot), first.substring(dot + 1)];
  return { namespace, name, args };
};
const filterAttributes = (attributes: string[]): string[] => {
  const result: string[] = [];
  for (const attribute of attributes) {
    try {
      const { namespace, name, args } = parseAttribute(attribute);
      if (
        !options.compilerAttributes &&
        (namespace == "System.Runtime.CompilerServices" ||
          name == "AttributeUsageAttribute" ||
          name == "EmbeddedAttribute")
      )
        continue;

      const text = !args
        ? name
        : // some attributes have long parameters which aren't interesting to display
        name == "ObsoleteAttribute" || name == "DebuggerBrowsableAttribute"
        ? `${name}(…)`
        : `${name}(${args})`;
      result.push(`[${text}]`);
    } catch {
      continue;
    }
  }
  return result;
};
const getAttributes = (attributes: string[] | undefined, containerId: number): TextNode[] => {
  if (!attributes) return [];
  return filterAttributes(attributes).map((attribute) => {
    return {
      label: attribute,
      id: makeId("!a!", `${containerId}!${attribute}`),
    };
  });
};

const getAccess = (access: LoadedAccess): Access => {
  switch (access) {
    case LoadedAccess.Public:
      return "public";
    case LoadedAccess.ProtectedInternal:
    case LoadedAccess.Protected:
      return "protected";
    case LoadedAccess.Internal:
      return "internal";
    case LoadedAccess.PrivateProtected:
    case LoadedAccess.Private:
      return "private";
  }
};

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

const getMemberInfo = (
  getTypeIdName: (type: TypeId) => string
): {
  getFieldMember: (fieldMember: FieldMember) => MemberInfo;
  getEventMember: (eventMember: EventMember) => MemberInfo;
  getPropertyMember: (propertyMember: PropertyMember) => MemberInfo;
  getMethodMember: (methodMember: MethodMember) => MemberInfo;
} => {
  const getGenericName = (name: string, genericArguments: TypeId[] | undefined): string =>
    !genericArguments ? name : `${name}<${genericArguments.map(getTypeIdName).join(", ")}>`;

  const getMethodName = (name: string, parameters: Parameter[] | undefined): string =>
    !parameters ? name : `${name}(${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")})`;

  const getPropertyName = (name: string, parameters: Parameter[] | undefined): string =>
    !parameters ? name : `${name}[${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")}]`;

  const getFromName = (
    id: string,
    name: string,
    attributes: TextNode[],
    memberTypeId: TypeId | undefined, // undefined iff it's a constructor
    access: LoadedAccess
  ): MemberInfo => {
    const label = !memberTypeId ? name : `${name} : ${getTypeIdName(memberTypeId)}`;
    return {
      label,
      id,
      attributes,
      access: getAccess(access),
    };
  };

  const getFieldMember = (fieldMember: FieldMember): MemberInfo =>
    getFromName(
      makeId("!mf!", fieldMember.metadataToken),
      fieldMember.name,
      getAttributes(fieldMember.attributes, fieldMember.metadataToken),
      fieldMember.fieldType,
      fieldMember.access
    );
  const getEventMember = (eventMember: EventMember): MemberInfo =>
    getFromName(
      makeId("!me!", eventMember.metadataToken),
      eventMember.name,
      getAttributes(eventMember.attributes, eventMember.metadataToken),
      eventMember.eventHandlerType,
      eventMember.access
    );
  const getPropertyMember = (propertyMember: PropertyMember): MemberInfo =>
    getFromName(
      makeId("!mp!", propertyMember.metadataToken),
      getPropertyName(propertyMember.name, propertyMember.parameters),
      getAttributes(propertyMember.attributes, propertyMember.metadataToken),
      propertyMember.propertyType,
      propertyMember.access
    );
  const getMethodMember = (methodMember: MethodMember): MemberInfo =>
    getFromName(
      makeId("!mm!", methodMember.metadataToken),
      getMethodName(getGenericName(methodMember.name, methodMember.genericArguments), methodMember.parameters),
      getAttributes(methodMember.attributes, methodMember.metadataToken),
      methodMember.returnType,
      methodMember.access
    );

  return { getFieldMember, getEventMember, getPropertyMember, getMethodMember };
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
      label: getTypeName(typeInfo),
      id: getTypeId(typeInfo.typeId),
    };
    if (isPartTypeInfo(typeInfo)) return { ...typeTextNode, exceptions: createExceptions(typeInfo.exceptions) };

    const subtypes = nested ? nested.filter(isWantedType).map(getType) : undefined;
    const { getFieldMember, getEventMember, getPropertyMember, getMethodMember } = getMemberInfo(makeTypeIdName);

    return {
      ...typeTextNode,
      access: getAccess(typeInfo.access),
      attributes: getAttributes(typeInfo.attributes, typeInfo.typeId.metadataToken),
      subtypes,
      members: {
        fieldMembers: typeInfo.members.fieldMembers?.map(getFieldMember) ?? [],
        eventMembers: typeInfo.members.eventMembers?.map(getEventMember) ?? [],
        propertyMembers: typeInfo.members.propertyMembers?.map(getPropertyMember) ?? [],
        methodMembers: typeInfo.members.methodMembers?.map(getMethodMember) ?? [],
      },
    };
  };

  const namespaces: Namespace[] = [...grouped.entries()]
    .map(([name, typeInfos]) => {
      return {
        label: name,
        id: makeId("!n!", name),
        types: typeInfos.map(getType).sort((x, y) => x.label.localeCompare(y.label)),
      };
    })
    .sort((x, y) => x.label.localeCompare(y.label));

  return { assemblyId, namespaces, exceptions };
};
