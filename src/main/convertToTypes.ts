import type { Access, Exceptions, Members, Namespace, TextNode, Type, Types } from "../shared-types";
import { logError } from "./log";
import type { Loaded, NamedTypeInfo, TypeId, TypeInfo } from "./shared-types";
import {
  Access as LoadedAccess,
  Members as LoadedMembers,
  Parameter as LoadedParameter,
  isBadTypeInfo,
  isNamedTypeInfo,
  options,
} from "./shared-types";

type IdKind = "!n!" | "!t!" | "!e!" | "!a!" | "!m!";
type MemberIdKind = "!mM!" | "!mm!" | "!mF!" | "!mf!" | "!mP!" | "!mp!" | "!me!";
const makeId = (kind: IdKind | MemberIdKind, ...ids: string[]): string => `${kind}${ids.join(".")}`;

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
const makeTypeId = (typeId: TypeId): string[] => {
  const name = makeTypeIdName(typeId);
  const prefix = typeId.declaringType
    ? makeTypeId(typeId.declaringType)
    : typeId.namespace
    ? [typeId.namespace]
    : undefined;
  // with this implementation nested types are separated from their container by "." not "+" -- which could be ambiguous
  return prefix ? [...prefix, name] : [name];
};

const getTypeName = (typeInfo: NamedTypeInfo): string =>
  makeTypeName(typeInfo.typeId.name, typeInfo.genericTypeParameters ?? typeInfo.typeId.genericTypeArguments);

// id can constructed using TypeId only without typeInfo.genericTypeParameters
const getTypeId = (typeId: TypeId): string => makeId("!t!", ...makeTypeId(typeId));
const getTypeInfoTextNode = (typeInfo: NamedTypeInfo): TextNode => {
  return {
    label: getTypeName(typeInfo),
    id: getTypeId(typeInfo.typeId),
  };
};

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
const getAttributes = (attributes: string[] | undefined, containerId: string[]): TextNode[] => {
  if (!attributes) return [];
  return filterAttributes(attributes).map((attribute) => {
    return {
      label: attribute,
      id: makeId("!a!", ...containerId, attribute),
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

const getMembers = (members: LoadedMembers, typeId: string[]): Members => {
  //
  const getGenericName = (name: string, genericArguments: TypeId[] | undefined): string =>
    !genericArguments ? name : `${name}<${genericArguments.map(makeTypeIdName).join(", ")}>`;

  const getMethodName = (name: string, parameters: LoadedParameter[] | undefined): string =>
    !parameters ? name : `${name}(${parameters.map((parameter) => makeTypeIdName(parameter.type)).join(", ")})`;

  const getPropertyName = (name: string, parameters: LoadedParameter[] | undefined): string =>
    !parameters ? name : `${name}[${parameters.map((parameter) => makeTypeIdName(parameter.type)).join(", ")}]`;

  const getFromName = (
    memberIdKind: MemberIdKind,
    name: string,
    attributes: string[] | undefined,
    memberTypeId: TypeId | undefined, // undefined iff it's a constructor
    access: LoadedAccess,
    isConversionOperator?: boolean
  ): TextNode & { attributes: TextNode[]; access: Access } => {
    const label = !memberTypeId ? name : `${name} : ${makeTypeIdName(memberTypeId)}`;
    // if it's a conversion operator then we need to include the return type in the ID
    const memberId = [...typeId, isConversionOperator ? label : name];
    return {
      label,
      id: makeId(memberIdKind, ...memberId),
      attributes: getAttributes(attributes, memberId),
      access: getAccess(access),
    };
  };

  return {
    fieldMembers:
      members.fieldMembers?.map((fieldMember) => {
        return getFromName(
          fieldMember.isStatic ? "!mF!" : "!mf!",
          fieldMember.name,
          fieldMember.attributes,
          fieldMember.fieldType,
          fieldMember.access
        );
      }) ?? [],
    eventMembers:
      members.eventMembers?.map((eventMember) => {
        return getFromName(
          "!me!",
          eventMember.name,
          eventMember.attributes,
          eventMember.eventHandlerType,
          eventMember.access
        );
      }) ?? [],
    propertyMembers:
      members.propertyMembers?.map((propertyMember) => {
        return getFromName(
          propertyMember.isStatic ? "!mP!" : "!mp!",
          getPropertyName(propertyMember.name, propertyMember.parameters),
          propertyMember.attributes,
          propertyMember.propertyType,
          propertyMember.access
        );
      }) ?? [],
    constructorMembers:
      members.constructorMembers?.map((constructorMember) => {
        return getFromName(
          constructorMember.isStatic ? "!mM!" : "!mm!",
          // ctor name is the name of the type which is the last element in the typeId array
          getMethodName(typeId[typeId.length - 1], constructorMember.parameters),
          constructorMember.attributes,
          undefined,
          constructorMember.access
        );
      }) ?? [],
    methodMembers:
      members.methodMembers?.map((methodMember) => {
        return getFromName(
          methodMember.isStatic ? "!mM!" : "!mm!",
          getMethodName(getGenericName(methodMember.name, methodMember.genericArguments), methodMember.parameters),
          methodMember.attributes,
          methodMember.returnType,
          methodMember.access,
          methodMember.name === "op_Explicit" || methodMember.name === "op_Implicit"
        );
      }) ?? [],
  };
};

export const convertToTypes = (loaded: Loaded, id: string): Types => {
  const typeInfos: TypeInfo[] = loaded.types[id];
  if (!typeInfos) return { namespaces: [], exceptions: [] }; // for an assembly whose types we haven't loaded

  // remove all typeInfo without typeId
  const exceptions: Exceptions = [];
  const namedTypeInfos: NamedTypeInfo[] = [];
  typeInfos.forEach((typeInfo) => {
    if (isNamedTypeInfo(typeInfo)) namedTypeInfos.push(typeInfo);
    else exceptions.push(...createExceptions(typeInfo.exceptions));
  });

  // use declaringType to nest
  const { parentTypeInfos, getNested } = nestTypes(namedTypeInfos);

  // optionally remove compiler-generated types
  const isWanted: IsWanted = !options.compilerGenerated ? unwantedTypes(namedTypeInfos, getNested) : () => true;
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
    const subtypes = nested ? nested.filter(isWantedType).map(getType) : undefined;
    const typeTextNode = getTypeInfoTextNode(typeInfo);
    const typeId = makeTypeId(typeInfo.typeId);
    return isBadTypeInfo(typeInfo)
      ? { ...typeTextNode, exceptions: createExceptions(typeInfo.exceptions) }
      : {
          ...typeTextNode,
          access: getAccess(typeInfo.access),
          attributes: getAttributes(typeInfo.attributes, typeId),
          subtypes,
          members: getMembers(typeInfo.members, typeId),
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

  return { namespaces, exceptions };
};
