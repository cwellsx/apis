import type {
  Access,
  GetArtificialKey,
  MemberInfo,
  Members,
  Named,
  Namespace,
  NodeId,
  Type,
  Types,
} from "../shared-types";
import { artificialKeyFactory, metadataTokenNodeId } from "../shared-types";
import type {
  AllTypeInfo,
  EventMember,
  FieldMember,
  Members as LoadedMembers,
  MethodMember,
  NamedTypeInfo,
  Parameter,
  PropertyMember,
  TypeId,
} from "./loaded";
import { Access as LoadedAccess, isPartTypeInfo, namedTypeInfo } from "./loaded";
import { options } from "./shared-types";
import { SavedTypeInfo } from "./sqlTables";

type Exceptions = Named[];

export const getTypeName = (name: string, generic?: TypeId[]): string => {
  if (!generic) return name;
  const index = name.indexOf("`");
  return (index === -1 ? name : name.substring(0, index)) + `<${generic.map((it) => it.name).join(",")}>`;
};
const getTypeIdName = (typeId: TypeId): string => getTypeName(typeId.name, typeId.genericTypeArguments);

const getAttributes = (attributes: string[] | undefined, getArtificialKey: GetArtificialKey): Named[] => {
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

  if (!attributes) return [];
  return filterAttributes(attributes).map((attribute) => ({ name: attribute, nodeId: getArtificialKey("attribute") }));
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

const getGenericName = (name: string, genericArguments: TypeId[] | undefined): string =>
  !genericArguments ? name : `${name}<${genericArguments.map(getTypeIdName).join(", ")}>`;

export const getMethodName = (methodMember: MethodMember): string => {
  const getName = (name: string, parameters: Parameter[] | undefined): string =>
    !parameters ? name : `${name}(${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")})`;
  return getName(getGenericName(methodMember.name, methodMember.genericArguments), methodMember.parameters);
};

const getPropertyName = (propertyMember: PropertyMember): string => {
  const getName = (name: string, parameters: Parameter[] | undefined): string =>
    !parameters ? name : `${name}[${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")}]`;
  return getName(propertyMember.name, propertyMember.parameters);
};

export const getTypeInfoName = (typeInfo: NamedTypeInfo | SavedTypeInfo): string =>
  getTypeName(typeInfo.typeId.name, typeInfo.genericTypeParameters ?? typeInfo.typeId.genericTypeArguments);

const nestTypes = (
  allTypes: NamedTypeInfo[]
): { rootTypes: NamedTypeInfo[]; getChildren: (typeId: TypeId) => NamedTypeInfo[]; unwantedTypes: Set<number> } => {
  // create Map of every type's children, and an array of all the root types
  const childTypes = new Map<number, NamedTypeInfo[]>(allTypes.map((typeInfo) => [typeInfo.typeId.metadataToken, []]));
  const getChildren = (typeId: TypeId): NamedTypeInfo[] => {
    const found = childTypes.get(typeId.metadataToken);
    if (!found) throw new Error(`!findElement(${typeId.metadataToken})`);
    return found;
  };
  const rootTypes: NamedTypeInfo[] = [];
  allTypes.forEach((typeInfo) => {
    if (typeInfo.typeId.declaringType) getChildren(typeInfo.typeId.declaringType).push(typeInfo);
    else rootTypes.push(typeInfo);
  });

  // find unwanted types
  const unwantedTypes = new Set<number>();
  if (!options.compilerGenerated) {
    const addUnwanted = (typeInfo: NamedTypeInfo): void => {
      unwantedTypes.add(typeInfo.typeId.metadataToken);
      const children = getChildren(typeInfo.typeId);
      children.forEach(addUnwanted); // <- recurses
    };

    const isCompilerGeneratedAttribute = (attribute: string): boolean =>
      attribute === "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]";

    const isCompilerGeneratedType = (typeInfo: NamedTypeInfo): boolean =>
      typeInfo.attributes?.some(isCompilerGeneratedAttribute) ?? false;

    allTypes.filter(isCompilerGeneratedType).forEach(addUnwanted);
  }

  return { rootTypes, getChildren, unwantedTypes };
};

export const convertLoadedToTypes = (allTypeInfo: AllTypeInfo, assemblyName: string): Types => {
  const getArtificialKey = artificialKeyFactory();

  const getMembers = (members: LoadedMembers): Members => {
    const getFromName = (
      nodeId: NodeId,
      name: string,
      attributes: Named[],
      memberTypeId: TypeId | undefined, // undefined iff it's a constructor
      access: LoadedAccess
    ): MemberInfo => {
      name = !memberTypeId ? name : `${name} : ${getTypeIdName(memberTypeId)}`;
      return {
        name,
        nodeId,
        attributes,
        access: getAccess(access),
      };
    };

    const getFieldMember = (fieldMember: FieldMember): MemberInfo =>
      getFromName(
        metadataTokenNodeId("field", assemblyName, fieldMember.metadataToken),
        fieldMember.name,
        getAttributes(fieldMember.attributes, getArtificialKey),
        fieldMember.fieldType,
        fieldMember.access
      );
    const getEventMember = (eventMember: EventMember): MemberInfo =>
      getFromName(
        metadataTokenNodeId("event", assemblyName, eventMember.metadataToken),
        eventMember.name,
        getAttributes(eventMember.attributes, getArtificialKey),
        eventMember.eventHandlerType,
        eventMember.access
      );
    const getPropertyMember = (propertyMember: PropertyMember): MemberInfo =>
      getFromName(
        metadataTokenNodeId("property", assemblyName, propertyMember.metadataToken),
        getPropertyName(propertyMember),
        getAttributes(propertyMember.attributes, getArtificialKey),
        propertyMember.propertyType,
        propertyMember.access
      );
    const getMethodMember = (methodMember: MethodMember): MemberInfo =>
      getFromName(
        metadataTokenNodeId("method", assemblyName, methodMember.metadataToken),
        getMethodName(methodMember),
        getAttributes(methodMember.attributes, getArtificialKey),
        methodMember.returnType,
        methodMember.access
      );

    return {
      fieldMembers: members.fieldMembers?.map(getFieldMember) ?? [],
      eventMembers: members.eventMembers?.map(getEventMember) ?? [],
      propertyMembers: members.propertyMembers?.map(getPropertyMember) ?? [],
      methodMembers: members.methodMembers?.map(getMethodMember) ?? [],
    };
  };

  // remove all typeInfo without typeId
  const exceptions: Exceptions = [];
  const createExceptions = (exceptions: string[]): Exceptions =>
    exceptions.map((exceptionMessage) => ({ name: exceptionMessage, nodeId: getArtificialKey("exception") }));
  allTypeInfo.anon.forEach((typeInfo) => exceptions.push(...createExceptions(typeInfo.exceptions)));

  const named = namedTypeInfo(allTypeInfo);

  // use declaringType to nest
  const { rootTypes, getChildren, unwantedTypes } = nestTypes(named);

  // optionally remove compiler-generated types
  const isWantedType = (typeInfo: NamedTypeInfo): boolean => !unwantedTypes.has(typeInfo.typeId.metadataToken);

  // group by namespace
  const grouped = new Map<string, NamedTypeInfo[]>();
  rootTypes.filter(isWantedType).forEach((typeInfo) => {
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
      nodeId: { type: "type", assemblyName, metadataToken: typeInfo.typeId.metadataToken },
    };
    if (isPartTypeInfo(typeInfo)) return { ...typeTextNode, exceptions: createExceptions(typeInfo.exceptions) };

    const subtypes = nested.length ? nested.filter(isWantedType).map(getType) : undefined;

    return {
      ...typeTextNode,
      access: getAccess(typeInfo.access),
      attributes: getAttributes(typeInfo.attributes, getArtificialKey),
      subtypes,
      members: getMembers(typeInfo.members),
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
