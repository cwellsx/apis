import type { Access, Exceptions, Namespace, TextNode, Type, TypeException, Types } from "../shared-types";
import type { Loaded, TypeId, TypeInfo } from "./shared-types";
import { Flags, options } from "./shared-types";

type NamedTypeInfo = TypeInfo & { typeId: TypeId };
type KnownTypeInfo = TypeInfo & { typeId: TypeId; flags: Flags[] };
function isNamed(typeInfo: TypeInfo): typeInfo is NamedTypeInfo {
  return typeInfo.typeId !== undefined;
}

type IdKind = "!n!" | "!t!" | "!e!" | "!a!";
const makeId = (kind: IdKind, ...ids: string[]): string => `${kind}${ids.join(".")}`;

// use a closure to create an Exception instance with a unique id from a message string
const pushException: (exceptions: Exceptions, message: string) => void = (function () {
  let index = 0;
  const result = (exceptions: Exceptions, message: string) => {
    const exception = { label: message, id: makeId("!e!", (++index).toString()) };
    exceptions.push(exception);
  };
  return result;
})();
const pushExceptions = (exceptions: Exceptions, messages: string[]) =>
  messages.forEach((message) => pushException(exceptions, message));
const createExceptions = (messages: string[]): Exceptions => {
  const exceptions: Exceptions = [];
  pushExceptions(exceptions, messages);
  return exceptions;
};

const makeTypeName = (name: string, generic?: TypeId[]): string => {
  if (!generic) return name;
  const index = name.indexOf("`");
  return (index === -1 ? name : name.substring(0, index)) + `<${generic.map((it) => it.name).join(",")}>`;
};
// id can constructed using TypeId only without typeInfo.genericTypeParameters
const makeTypeId = (typeId: TypeId): string[] => {
  const name = makeTypeName(typeId.name, typeId.genericTypeArguments);
  const prefix = typeId.declaringType
    ? makeTypeId(typeId.declaringType)
    : typeId.namespace
    ? [typeId.namespace]
    : undefined;
  return prefix ? [...prefix, name] : [name];
};

const getTypeName = (typeInfo: NamedTypeInfo): string =>
  makeTypeName(typeInfo.typeId.name, typeInfo.genericTypeParameters ?? typeInfo.typeId.genericTypeArguments);

// id can constructed using TypeId only without typeInfo.genericTypeParameters
const getTypeId = (typeId: TypeId): string => makeId("!t!", ...makeTypeId(typeId));
const getTypeTextNode = (typeInfo: NamedTypeInfo): TextNode => {
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
      const text = name == "ObsoleteAttribute" || !args ? name : `${name}(${args})`;
      result.push(`[${text}]`);
    } catch {
      continue;
    }
  }
  return result;
};
const getAttributes = (typeInfo: KnownTypeInfo): TextNode[] => {
  if (!typeInfo.attributes) return [];
  return filterAttributes(typeInfo.attributes).map((attribute) => {
    return {
      label: attribute,
      id: makeId("!a!", ...makeTypeId(typeInfo.typeId), attribute),
    };
  });
};

const getAccess = (flags: Flags[]): Access =>
  flags.includes(Flags.Public)
    ? "public"
    : flags.includes(Flags.Protected)
    ? "protected"
    : flags.includes(Flags.Internal)
    ? "internal"
    : "private";

const getType = (typeInfo: KnownTypeInfo): Type => {
  return { ...getTypeTextNode(typeInfo), access: getAccess(typeInfo.flags), attributes: getAttributes(typeInfo) };
};

export const convertToTypes = (loaded: Loaded, id: string): Types => {
  const typeInfos = loaded.types[id].filter((typeInfo) => !typeInfo.isUnwanted);
  if (!typeInfos) return { namespaces: [], exceptions: [] }; // for an assembly whose types we haven't loaded

  // remove all typeInfo without typeId
  const exceptions: Exceptions = [];
  const namedTypeInfos: NamedTypeInfo[] = [];
  typeInfos.forEach((typeInfo) => {
    if (isNamed(typeInfo)) namedTypeInfos.push(typeInfo);
    else pushExceptions(exceptions, typeInfo.exceptions ?? []);
  });

  // remove all typeInfo with exceptions
  const typeExceptions: TypeException[] = [];
  namedTypeInfos
    .filter((typeInfo) => typeInfo.exceptions)
    .forEach((typeInfo) =>
      typeExceptions.push({ ...getTypeTextNode(typeInfo), exceptions: createExceptions(typeInfo.exceptions ?? []) })
    );

  const known = (
    typeExceptions ? typeInfos.filter((typeInfos) => !typeInfos.exceptions) : typeInfos
  ) as KnownTypeInfo[];

  // group by namespace
  const grouped = new Map<string, KnownTypeInfo[]>();
  known.forEach((typeInfo) => {
    const namespace = typeInfo.typeId.namespace ?? "";
    let list = grouped.get(namespace);
    if (!list) {
      list = [];
      grouped.set(namespace, list);
    }
    list.push(typeInfo);
  });

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
