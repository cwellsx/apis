import type { ApiViewOptions, GraphFilter, Leaf, TypeNodeId, ViewGraph } from "../shared-types";
import { Parent, methodNodeId as getMethodNodeId, isParent, typeNodeId } from "../shared-types";
import { convertNamesToNodes } from "./convertNamesToNodes";
import { convertToImage } from "./convertToImage";
import { log } from "./log";
import { Edges, NodeIdMap } from "./shared-types";
import type { Call, GetTypeOrMethodName, TypeAndMethodId } from "./sql";

export const convertLoadedToApis = (
  calls: Call[],
  typeOrMethodName: GetTypeOrMethodName,
  graphViewOptions: ApiViewOptions,
  graphFilter: GraphFilter,
  exes: string[]
): ViewGraph => {
  log("convertLoadedToApis");

  const { getTypeName, getMethodName } = typeOrMethodName;

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

    const typeName = getTypeName(typeNodeId);
    const leaf: Leaf = {
      nodeId: typeNodeId,
      label: typeName,
      parent: null,
    };
    types.set(typeNodeId, leaf);
  };

  const getGroupNames: (
    from: TypeAndMethodId,
    to: TypeAndMethodId
  ) => { fromGroupName: string; toGroupName: string } = (from, to) => {
    switch (graphViewOptions.showClustered.clusterBy) {
      case "assembly":
        return { fromGroupName: from.assemblyName, toGroupName: to.assemblyName };
      case "namespace":
        return { fromGroupName: from.namespace, toGroupName: to.namespace };
    }
  };

  calls.forEach(({ from, to }) => {
    if (from.assemblyName === to.assemblyName && from.typeId === to.typeId) return;
    if (!from.typeId || !to.typeId) return;

    const fromType = typeNodeId(from.assemblyName, from.typeId);
    const toType = typeNodeId(to.assemblyName, to.typeId);
    const { fromGroupName, toGroupName } = getGroupNames(from, to);

    addLeaf(fromType, fromGroupName);
    addLeaf(toType, toGroupName);

    const methodNodeId = getMethodNodeId(to.assemblyName, to.methodId);
    const methodName = getMethodName(methodNodeId);

    edges.add(fromType, toType, methodName);
  });

  // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
  const nestedClusters = graphViewOptions.showClustered.nestedClusters;
  const { groups, leafs } = convertNamesToNodes(
    Object.keys(groupedTypes),
    exes,
    graphViewOptions.showClustered.clusterBy,
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

  const image = convertToImage(groups, edges.values(), graphViewOptions, graphFilter, false, undefined);
  return { groups, image, graphViewOptions, graphFilter };
};
