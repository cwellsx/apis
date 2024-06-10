import type { ApiViewOptions, GraphFilter, Leaf, TypeNodeId, ViewGraph } from "../shared-types";
import { Parent, isParent, typeNodeId } from "../shared-types";
import { convertNamesToNodes } from "./convertNamesToNodes";
import { convertToImage } from "./convertToImage";
import { log } from "./log";
import { Edges, NodeIdMap } from "./shared-types";
import { CallColumns, MethodNameColumns, TypeNameColumns } from "./sqlTables";

export const convertLoadedToApis = (
  calls: CallColumns[],
  viewOptions: ApiViewOptions,
  graphFilter: GraphFilter,
  typeNames: TypeNameColumns[],
  methodNames: MethodNameColumns[],
  exes: string[]
): ViewGraph => {
  log("convertLoadedToApis");

  const assemblyTypeNames: { [assemblyName: string]: { [typeId: number]: TypeNameColumns } } = {};
  const assemblyMethodNames: { [assemblyName: string]: { [methodId: number]: MethodNameColumns } } = {};

  // initialize lookup dictionaries
  typeNames.forEach((nameColumns) => {
    let found: { [typeId: number]: TypeNameColumns } = assemblyTypeNames[nameColumns.assemblyName];
    if (!found) {
      found = {};
      assemblyTypeNames[nameColumns.assemblyName] = found;
    }
    found[nameColumns.metadataToken] = nameColumns;
  });
  methodNames.forEach((nameColumns) => {
    let found: { [typeId: number]: MethodNameColumns } = assemblyMethodNames[nameColumns.assemblyName];
    if (!found) {
      found = {};
      assemblyMethodNames[nameColumns.assemblyName] = found;
    }
    found[nameColumns.metadataToken] = nameColumns;
  });

  // type instances i.e. TypeNodeId are grouped by assemblyName or namespace
  const groupedTypes: { [name: string]: NodeIdMap<Leaf> } = {};
  const edges = new Edges();

  const addLeaf = (typeNodeId: TypeNodeId, groupName: string): void => {
    let types = groupedTypes[groupName];
    if (!types) {
      types = new NodeIdMap<Leaf>();
      groupedTypes[groupName] = types;
    }
    if (types.has(typeNodeId)) return; // Leaf already created for this type

    const typeName = assemblyTypeNames[typeNodeId.assemblyName][typeNodeId.metadataToken];
    const leaf: Leaf = {
      nodeId: typeNodeId,
      label: typeName.decoratedName,
      parent: null,
    };
    types.set(typeNodeId, leaf);
  };

  const getGroupNames: (api: CallColumns) => { fromGroupName: string; toGroupName: string } = (api) => {
    switch (viewOptions.showClustered.clusterBy) {
      case "assembly":
        return { fromGroupName: api.fromAssemblyName, toGroupName: api.toAssemblyName };
      case "namespace":
        return { fromGroupName: api.fromNamespace, toGroupName: api.toNamespace };
    }
  };

  calls.forEach((api) => {
    if (api.fromAssemblyName === api.toAssemblyName && api.fromTypeId === api.toTypeId) return;
    if (!api.fromTypeId || !api.toTypeId) return;

    const fromType = typeNodeId(api.fromAssemblyName, api.fromTypeId);
    const toType = typeNodeId(api.toAssemblyName, api.toTypeId);
    const { fromGroupName, toGroupName } = getGroupNames(api);

    addLeaf(fromType, fromGroupName);
    addLeaf(toType, toGroupName);

    const methodName = assemblyMethodNames[api.toAssemblyName][api.toMethodId].name;

    edges.add(fromType, toType, methodName);
  });

  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const nestedClusters = viewOptions.showClustered.nestedClusters;
  const { groups, leafs } = convertNamesToNodes(
    Object.keys(groupedTypes),
    exes,
    viewOptions.showClustered.clusterBy,
    nestedClusters
  );

  Object.entries(groupedTypes).forEach(([name, types]) => {
    const node = leafs[name];
    if (isParent(node)) throw new Error("Unexpected parent");
    const parent = node as Parent;
    const children: Leaf[] = types.values();
    children.forEach((child) => (child.parent = parent));
    parent["children"] = children;
  });

  const image = convertToImage(groups, edges.values(), viewOptions, graphFilter, false, undefined);
  return { groups, image, viewOptions, graphFilter };
};
