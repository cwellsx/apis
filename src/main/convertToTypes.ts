import type { Access, Exceptions, MemberInfo, Members, Namespace, TextNode, Type, Types } from "../shared-types";
import type { Loaded, NamedTypeInfo, TypeId, TypeInfo } from "./loaded";
import {
  Access as LoadedAccess,
  ConstructorMember as LoadedConstructorMember,
  EventMember as LoadedEventMember,
  FieldMember as LoadedFieldMember,
  Members as LoadedMembers,
  MethodMember as LoadedMethodMember,
  Parameter as LoadedParameter,
  PropertyMember as LoadedPropertyMember,
  isBadTypeInfo,
  isNamedTypeInfo,
} from "./loaded";
import { logError } from "./log";
import { options } from "./shared-types";

type IdKind = "!n!" | "!t!" | "!e!" | "!a!" | "!m!";
type MemberIdKind = "!mM!" | "!mm!" | "!mF!" | "!mf!" | "!mP!" | "!mp!" | "!mE!" | "!me!";
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

const getMemberInfo = (
  typeId: string[],
  getTypeIdName: (type: TypeId) => string
): {
  getFieldMember: (fieldMember: LoadedFieldMember) => MemberInfo;
  getEventMember: (eventMember: LoadedEventMember) => MemberInfo;
  getPropertyMember: (propertyMember: LoadedPropertyMember) => MemberInfo;
  getConstructorMember: (constructorMember: LoadedConstructorMember) => MemberInfo;
  getMethodMember: (methodMember: LoadedMethodMember) => MemberInfo;
} => {
  const getGenericName = (name: string, genericArguments: TypeId[] | undefined): string =>
    !genericArguments ? name : `${name}<${genericArguments.map(getTypeIdName).join(", ")}>`;

  const getMethodName = (name: string, parameters: LoadedParameter[] | undefined): string =>
    !parameters ? name : `${name}(${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")})`;

  const getPropertyName = (name: string, parameters: LoadedParameter[] | undefined): string =>
    !parameters ? name : `${name}[${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")}]`;

  const getFromName = (
    memberIdKind: MemberIdKind,
    name: string,
    attributes: string[] | undefined,
    memberTypeId: TypeId | undefined, // undefined iff it's a constructor
    access: LoadedAccess,
    isConversionOperator?: boolean
  ): MemberInfo => {
    const label = !memberTypeId ? name : `${name} : ${getTypeIdName(memberTypeId)}`;
    // if it's a conversion operator then we need to include the return type in the ID
    const memberId = [...typeId, isConversionOperator ? label : name];
    return {
      label,
      id: makeId(memberIdKind, ...memberId),
      attributes: getAttributes(attributes, memberId),
      access: getAccess(access),
    };
  };

  const getFieldMember = (fieldMember: LoadedFieldMember): MemberInfo =>
    getFromName(
      fieldMember.isStatic ? "!mF!" : "!mf!",
      fieldMember.name,
      fieldMember.attributes,
      fieldMember.fieldType,
      fieldMember.access
    );
  const getEventMember = (eventMember: LoadedEventMember): MemberInfo =>
    getFromName(
      eventMember.isStatic ? "!mE!" : "!me!",
      eventMember.name,
      eventMember.attributes,
      eventMember.eventHandlerType,
      eventMember.access
    );
  const getPropertyMember = (propertyMember: LoadedPropertyMember): MemberInfo =>
    getFromName(
      propertyMember.isStatic ? "!mP!" : "!mp!",
      getPropertyName(propertyMember.name, propertyMember.parameters),
      propertyMember.attributes,
      propertyMember.propertyType,
      propertyMember.access
    );
  const getConstructorMember = (constructorMember: LoadedConstructorMember): MemberInfo =>
    getFromName(
      constructorMember.isStatic ? "!mM!" : "!mm!",
      // ctor name is the name of the type which is the last element in the typeId array
      getMethodName(typeId[typeId.length - 1], constructorMember.parameters),
      constructorMember.attributes,
      undefined,
      constructorMember.access
    );
  const getMethodMember = (methodMember: LoadedMethodMember): MemberInfo =>
    getFromName(
      methodMember.isStatic ? "!mM!" : "!mm!",
      getMethodName(getGenericName(methodMember.name, methodMember.genericArguments), methodMember.parameters),
      methodMember.attributes,
      methodMember.returnType,
      methodMember.access,
      methodMember.name === "op_Explicit" || methodMember.name === "op_Implicit"
    );

  return { getFieldMember, getEventMember, getPropertyMember, getConstructorMember, getMethodMember };
};

const getMembers = (members: LoadedMembers, typeId: string[]): Members => {
  //
  const { getFieldMember, getEventMember, getPropertyMember, getConstructorMember, getMethodMember } = getMemberInfo(
    typeId,
    makeTypeIdName
  );

  const result: Members = {
    fieldMembers: members.fieldMembers?.map(getFieldMember) ?? [],
    eventMembers: members.eventMembers?.map(getEventMember) ?? [],
    propertyMembers: members.propertyMembers?.map(getPropertyMember) ?? [],
    constructorMembers: members.constructorMembers?.map(getConstructorMember) ?? [],
    methodMembers: members.methodMembers?.map(getMethodMember) ?? [],
  };

  // using makeTypeIdName i.e. short type names makes the labels readable
  // but could lead to duplicate id values if e.g. a method is overloaded on two types with the same short name

  const getDuplicateIds = (members: TextNode[]): Set<string> | null => {
    const found = new Set<string>();
    const duplicate = new Set<string>();
    members.forEach((member) => {
      const id = member.id;
      if (found.has(id)) duplicate.add(id);
      else found.add(id);
    });
    return duplicate.size != 0 ? duplicate : null;
  };

  const duplicateConstructors = getDuplicateIds(result.constructorMembers);
  const duplicateMethods = getDuplicateIds(result.methodMembers);
  if (duplicateConstructors || duplicateMethods) {
    // try again using fully-qualified type names
    const getTypeIdName = (typeId: TypeId): string => makeTypeId(typeId).join(".");
    const { getConstructorMember, getMethodMember } = getMemberInfo(typeId, getTypeIdName);

    result.constructorMembers.forEach((member, index) => {
      if (duplicateConstructors?.has(member.id))
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result.constructorMembers[index] = getConstructorMember(members.constructorMembers![index]);
    });

    result.methodMembers.forEach((member, index) => {
      if (duplicateMethods?.has(member.id))
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result.methodMembers[index] = getMethodMember(members.methodMembers![index]);
    });
  }

  return result;
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
