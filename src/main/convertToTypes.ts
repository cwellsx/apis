import { Namespace, Type, Types } from "../shared-types";
import { Loaded, TypeId, TypeInfo } from "./shared-types";

type KnownTypeInfo = TypeInfo & { typeId: TypeId };

function isKnownTypeInfo(typeInfo: TypeInfo): typeInfo is KnownTypeInfo {
  return typeInfo.typeId !== undefined;
}

export const convertToTypes = (loaded: Loaded, id: string): Types => {
  const typeInfos = loaded.types[id];
  if (!typeInfos) return { namespaces: [] }; // for an assembly whose types we haven't loaded

  // group by namespace
  const grouped = new Map<string, KnownTypeInfo[]>();
  typeInfos.forEach((typeInfo) => {
    if (!isKnownTypeInfo(typeInfo) || typeInfo.isUnwanted) return;
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

  const getType = (typeInfo: KnownTypeInfo): Type => {
    return { name: getTypeName(typeInfo.typeId, typeInfo.genericTypeParameters) };
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
