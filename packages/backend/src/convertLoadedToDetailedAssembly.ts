import type {
  EventMember,
  FieldMember,
  Members as LoadedMembers,
  MethodMember,
  NamedTypeInfo,
  PropertyMember,
  TypeId,
  TypeInfo,
} from "./contracts-dotnet";
import {
  getMembers,
  isAnonTypeInfo,
  isNamedTypeInfo,
  Access as LoadedAccess,
  MemberException,
} from "./contracts-dotnet";
import type { Access, DetailedAssembly, MemberInfo, Members, Named, Namespace, NodeId, Type } from "./contracts-ui";
import { artificialNodeIdFactory, GetArtificialNodeId, toMetadataNodeId, toNodeId } from "./nodeIds";
import { getMethodName, getPropertyName, getTypeIdName, getTypeInfoName, nestTypes, options } from "./utils";

type Exceptions = Named[];

const getAttributes = (attributes: string[] | undefined, getArtificialNodeId: GetArtificialNodeId): Named[] => {
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
          !options.showCompilerGeneratedAttributes &&
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
  return filterAttributes(attributes).map((attribute) => ({
    name: attribute,
    nodeId: getArtificialNodeId("attribute"),
  }));
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

export const convertLoadedToDetailedAssembly = (typeInfos: TypeInfo[], assemblyName: string): DetailedAssembly => {
  const getArtificialNodeId = artificialNodeIdFactory();

  const createMembers = (members: LoadedMembers): Members => {
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
        toMetadataNodeId("field", assemblyName, fieldMember.metadataToken),
        fieldMember.name,
        getAttributes(fieldMember.attributes, getArtificialNodeId),
        fieldMember.fieldType,
        fieldMember.access
      );
    const getEventMember = (eventMember: EventMember): MemberInfo =>
      getFromName(
        toMetadataNodeId("event", assemblyName, eventMember.metadataToken),
        eventMember.name,
        getAttributes(eventMember.attributes, getArtificialNodeId),
        eventMember.eventHandlerType,
        eventMember.access
      );
    const getPropertyMember = (propertyMember: PropertyMember): MemberInfo =>
      getFromName(
        toMetadataNodeId("property", assemblyName, propertyMember.metadataToken),
        getPropertyName(propertyMember),
        getAttributes(propertyMember.attributes, getArtificialNodeId),
        propertyMember.propertyType,
        propertyMember.access
      );
    const getMethodMember = (methodMember: MethodMember): MemberInfo =>
      getFromName(
        toMetadataNodeId("method", assemblyName, methodMember.metadataToken),
        getMethodName(methodMember),
        getAttributes(methodMember.attributes, getArtificialNodeId),
        methodMember.returnType,
        methodMember.access
      );
    const getException = (exception: MemberException): MemberInfo =>
      getFromName(
        toMetadataNodeId("memberException", assemblyName, exception.metadataToken),
        exception.name,
        [],
        undefined,
        LoadedAccess.Private // not ideal but ignored by the UI
      );

    return {
      fieldMembers: members.fieldMembers?.map(getFieldMember) ?? [],
      eventMembers: members.eventMembers?.map(getEventMember) ?? [],
      propertyMembers: members.propertyMembers?.map(getPropertyMember) ?? [],
      methodMembers: members.methodMembers?.map(getMethodMember) ?? [],
      exceptions: members.exceptions?.map(getException) ?? [],
    };
  };

  // remove all typeInfo without typeId
  const exceptions: Exceptions = [];
  const createExceptions = (exceptions: string[]): Exceptions =>
    exceptions.map((exceptionMessage) => ({ name: exceptionMessage, nodeId: getArtificialNodeId("exception") }));
  typeInfos.filter(isAnonTypeInfo).forEach((typeInfo) => exceptions.push(...createExceptions(typeInfo.exceptions)));

  const named = typeInfos.filter(isNamedTypeInfo);

  // use declaringType to nest
  const { rootTypes, getChildren, unwantedTypes } = nestTypes(named);

  // optionally remove compiler-generated types
  const isWantedType = (typeInfo: NamedTypeInfo): boolean =>
    options.showCompilerGeneratedTypes ? true : unwantedTypes[typeInfo.typeId.metadataToken] === undefined;

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

    return {
      // Named
      name: getTypeInfoName(typeInfo),
      nodeId: toNodeId({ type: "type", assemblyName, metadataToken: typeInfo.typeId.metadataToken }),
      // Type
      access: typeInfo.access ? getAccess(typeInfo.access) : undefined,
      attributes: getAttributes(typeInfo.attributes, getArtificialNodeId),
      subtypes: nested.length ? nested.filter(isWantedType).map(getType) : undefined,
      members: createMembers(getMembers(typeInfo)),
      exceptions: typeInfo.exceptions ? createExceptions(typeInfo.exceptions) : [],
    };
  };

  const namespaces: Namespace[] = [...grouped.entries()]
    .map(([name, typeInfos]) => {
      const nodeId: NodeId = toNodeId({ type: "namespace", name });
      return {
        name,
        nodeId,
        types: typeInfos.map(getType).sort((x, y) => x.name.localeCompare(y.name)),
      };
    })
    .sort((x, y) => x.name.localeCompare(y.name));

  return { namespaces, exceptions, detailType: "assemblyDetails" };
};
