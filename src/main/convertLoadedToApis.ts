import type { ApiViewOptions, Leaf, TypeNodeId, ViewGraph } from "../shared-types";
import { Parent, isParent, typeNodeId } from "../shared-types";
import { convertNamesToGroups } from "./convertNamesToGroups";
import { convertToImage } from "./convertToImage";
import { log } from "./log";
import { Edges } from "./shared-types";
import { CallColumns, MethodNameColumns, TypeNameColumns } from "./sqlTables";

export const convertLoadedToApis = (
  calls: CallColumns[],
  viewOptions: ApiViewOptions,
  typeNames: TypeNameColumns[],
  methodNames: MethodNameColumns[],
  exes: string[]
): ViewGraph => {
  log("convertLoadedToApis");

  const assemblyTypeNames: { [assemblyName: string]: { [typeId: number]: TypeNameColumns } } = {};
  typeNames.forEach((nameColumns) => {
    let found: { [typeId: number]: TypeNameColumns } = assemblyTypeNames[nameColumns.assemblyName];
    if (!found) {
      found = {};
      assemblyTypeNames[nameColumns.assemblyName] = found;
    }
    found[nameColumns.metadataToken] = nameColumns;
  });

  const assemblyMethodNames: { [assemblyName: string]: { [methodId: number]: MethodNameColumns } } = {};
  methodNames.forEach((nameColumns) => {
    let found: { [typeId: number]: MethodNameColumns } = assemblyMethodNames[nameColumns.assemblyName];
    if (!found) {
      found = {};
      assemblyMethodNames[nameColumns.assemblyName] = found;
    }
    found[nameColumns.metadataToken] = nameColumns;
  });

  const transform: (assemblyName: string, typeId: number) => number = (assemblyName: string, typeId: number) =>
    assemblyTypeNames[assemblyName][typeId].wantedTypeId ?? typeId;
  calls.forEach((call) => {
    call.fromTypeId = transform(call.fromAssemblyName, call.fromTypeId);
    call.toTypeId = transform(call.toAssemblyName, call.toTypeId);
  });

  const assemblyTypes: { [assemblyName: string]: { [typeId: number]: Leaf } } = {};
  const edges = new Edges();

  const addLeaf = (typeNodeId: TypeNodeId): void => {
    const { assemblyName, metadataToken: typeId } = typeNodeId;
    let types = assemblyTypes[assemblyName];
    if (!types) {
      types = {};
      assemblyTypes[assemblyName] = types;
    }
    if (types[typeId]) return; // Leaf already created for this type

    const typeName = assemblyTypeNames[assemblyName][typeId];
    const leaf: Leaf = {
      nodeId: typeNodeId,
      label: typeName.decoratedName,
      parent: null,
    };
    types[typeId] = leaf;
  };

  calls.forEach((api) => {
    if (api.fromAssemblyName === api.toAssemblyName && api.fromTypeId === api.toTypeId) return;
    if (!api.fromTypeId || !api.toTypeId) return;

    const fromType = typeNodeId(api.fromAssemblyName, api.fromTypeId);
    const toType = typeNodeId(api.toAssemblyName, api.toTypeId);

    addLeaf(fromType);
    addLeaf(toType);

    const methodName = assemblyMethodNames[api.toAssemblyName][api.toMethodId].name;

    edges.add(fromType, toType, methodName);
  });

  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const { groups, leafs } = convertNamesToGroups(Object.keys(assemblyTypes), exes, "assembly");

  Object.entries(assemblyTypes).forEach(([assemblyName, types]) => {
    const node = leafs[assemblyName];
    if (isParent(node)) throw new Error("Unexpected parent");
    const parent = node as Parent;
    const children: Leaf[] = Object.values(types);
    children.forEach((child) => (child.parent = parent));
    parent["children"] = children;
  });

  const image = convertToImage(groups, edges.values(), viewOptions);
  return { groups, image, viewOptions };
};
