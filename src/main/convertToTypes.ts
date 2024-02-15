import type { Access, Exceptions, Namespace, TextNode, Type, TypeException, Types } from "../shared-types";
import type { Loaded, TypeId, TypeInfo } from "./shared-types";
import { Flags } from "./shared-types";

type NamedTypeInfo = TypeInfo & { typeId: TypeId };
type KnownTypeInfo = TypeInfo & { typeId: TypeId; flags: Flags[] };
function isNamed(typeInfo: TypeInfo): typeInfo is NamedTypeInfo {
  return typeInfo.typeId !== undefined;
}

// use a closure to create an Exception instance with a unique id from a message string
const pushException: (exceptions: Exceptions, message: string) => void = (function () {
  let index = 0;
  const result = (exceptions: Exceptions, message: string) => {
    const exception = { label: message, id: `!e!${++index}` };
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

const getTypeName = (typeInfo: NamedTypeInfo): string =>
  makeTypeName(typeInfo.typeId.name, typeInfo.genericTypeParameters ?? typeInfo.typeId.genericTypeArguments);

// id can constructed using TypeId only without typeInfo.genericTypeParameters
const getTypeId = (typeId: TypeId): string => {
  const name = makeTypeName(typeId.name, typeId.genericTypeArguments);
  const prefix = typeId.declaringType ? getTypeId(typeId.declaringType) : typeId.namespace;
  return prefix ? `!t!${prefix}.${name}` : `!t!${name}`;
};

const getTypeTextNode = (typeInfo: NamedTypeInfo): TextNode => {
  return {
    label: getTypeName(typeInfo),
    id: getTypeId(typeInfo.typeId),
  };
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
  return { ...getTypeTextNode(typeInfo), access: getAccess(typeInfo.flags) };
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
        id: `!n!${name}`,
        types: typeInfos.map(getType).sort((x, y) => x.label.localeCompare(y.label)),
      };
    })
    .sort((x, y) => x.label.localeCompare(y.label));

  return { namespaces, exceptions };
};
