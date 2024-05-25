import type { ApiViewOptions, Leaf, ViewGraph } from "../shared-types";
import { Parent, isParent, metadataNodeId } from "../shared-types";
import { convertNamesToGroups } from "./convertNamesToGroups";
import { convertToImage } from "./convertToImage";
import { log } from "./log";
import { type Edge } from "./shared-types";
import { CallColumns, TypeNameColumns } from "./sqlTables";

export const convertLoadedToApis = (
  calls: CallColumns[],
  viewOptions: ApiViewOptions,
  typeNames: TypeNameColumns[],
  exes: string[]
): ViewGraph => {
  log("convertLoadedToApis");

  const assemblyTypeNames: { [assemblyName: string]: { [typeId: number]: TypeNameColumns } } = {};
  typeNames.forEach((typeName) => {
    let found: { [typeId: number]: TypeNameColumns } = assemblyTypeNames[typeName.assemblyName];
    if (!found) {
      found = {};
      assemblyTypeNames[typeName.assemblyName] = found;
    }
    found[typeName.metadataToken] = typeName;
  });
  const transform: (assemblyName: string, typeId: number) => number = (assemblyName: string, typeId: number) =>
    assemblyTypeNames[assemblyName][typeId].wantedTypeId ?? typeId;
  calls.forEach((call) => {
    call.fromTypeId = transform(call.fromAssemblyName, call.fromTypeId);
    call.toTypeId = transform(call.toAssemblyName, call.toTypeId);
  });

  const assemblyTypes: { [assemblyName: string]: { [typeId: number]: Leaf } } = {};
  const edges: Edge[] = [];

  const addLeaf = (assemblyName: string, typeId: number): void => {
    let types = assemblyTypes[assemblyName];
    if (!types) {
      types = {};
      assemblyTypes[assemblyName] = types;
    }
    if (types[typeId]) return; // Leaf already created for this type

    const typeName = assemblyTypeNames[assemblyName][typeId];
    const leaf: Leaf = {
      nodeId: metadataNodeId("type", assemblyName, typeId),
      label: typeName.decoratedName,
      parent: null,
    };
    types[typeId] = leaf;
  };

  calls.forEach((api) => {
    if (api.fromAssemblyName === api.toAssemblyName && api.fromTypeId === api.toTypeId) return;
    if (!api.fromTypeId || !api.toTypeId) return;

    addLeaf(api.fromAssemblyName, api.fromTypeId);
    addLeaf(api.toAssemblyName, api.toTypeId);

    edges.push({
      clientId: metadataNodeId("type", api.fromAssemblyName, api.fromTypeId),
      serverId: metadataNodeId("type", api.toAssemblyName, api.toTypeId),
    });
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

  const image = convertToImage(groups, edges, viewOptions);
  return { groups, image, viewOptions };
};
