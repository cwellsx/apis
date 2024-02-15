import { Access, Namespace, Type, TypeException, Types } from "../shared-types";
import type { Loaded, TypeId, TypeInfo } from "./shared-types";
import { Flags } from "./shared-types";

type KnownTypeInfo = TypeInfo & { typeId: TypeId; flags: Flags[] };

export const convertToTypes = (loaded: Loaded, id: string): Types => {
  let typeInfos = loaded.types[id].filter((typeInfo) => !typeInfo.isUnwanted);
  if (!typeInfos) return { namespaces: [] }; // for an assembly whose types we haven't loaded

  // remove all typeInfo without typeId
  const exceptions: string[][] = [];
  typeInfos.filter((typeInfo) => !typeInfo.typeId).forEach((typeInfos) => exceptions.push(typeInfos.exceptions ?? []));
  if (exceptions) typeInfos = typeInfos.filter((typeInfo) => typeInfo.typeId); // as (TypeInfo & { typeId: TypeId })[];

  // remove all typeInfo with exceptions
  const typeExceptions: TypeException[] = [];
  typeInfos
    .filter((typeInfo) => typeInfo.exceptions)
    .forEach((typeInfo) =>
      typeExceptions.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: getTypeName(typeInfo.typeId!, typeInfo.genericTypeParameters),
        exceptions: typeInfo.exceptions ?? [],
      })
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

  const getTypeName = (typeId: TypeId, genericTypeParameters?: TypeId[]): string => {
    const name = typeId.name;
    const generic = genericTypeParameters ?? typeId.genericTypeArguments;
    return (
      (typeId.declaringType ? `${getTypeName(typeId.declaringType)}.` : "") +
      (generic ? name.substring(0, name.indexOf("`")) + `<${generic.map((it) => it.name).join(",")}>` : name)
    );
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
    return { name: getTypeName(typeInfo.typeId, typeInfo.genericTypeParameters), access: getAccess(typeInfo.flags) };
  };

  const namespaces: Namespace[] = [...grouped.entries()]
    .map(([name, typeInfos]) => {
      return {
        name,
        types: typeInfos.map(getType).sort((x, y) => x.name.localeCompare(y.name)),
      };
    })
    .sort((x, y) => x.name.localeCompare(y.name));

  return { namespaces };
};
