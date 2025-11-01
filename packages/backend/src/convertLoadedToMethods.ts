import { convertToImage } from "./convertToImage";
import type { GraphData, ImageAttribute } from "./imageDataTypes";
import { Edges, methodNodeId, NodeIdMap, toMethodNodeId, toNameNodeId, toTypeNodeId, typeNodeId } from "./nodeIds";
import type { ApiViewOptions, GraphFilter, Leaf, MethodViewOptions, NodeId, Parent } from "./shared-types";
import type { Call, Direction, GetTypeOrMethodName, TypeAndMethodId } from "./sql";
import { CallstackIterator } from "./sql/sqlLoadedApiTypes";
import { getOrSet, log } from "./utils";

/*
  exported
*/

type LeafDictionary = NodeIdMap<TypeAndMethodId>;

type CallstackElements = {
  leafs: LeafDictionary;
  edges: Edges;
};

const makeMethodNodeId = (method: TypeAndMethodId): NodeId => toMethodNodeId(method.assemblyName, method.methodId);

export const convertLoadedToCalls = (calls: Call[]): CallstackElements => {
  log("convertLoadedToCalls");

  const leafs = new NodeIdMap<TypeAndMethodId>();
  const edges = new Edges();

  calls.forEach((call) => {
    const clientId = makeMethodNodeId(call.from);
    const serverId = makeMethodNodeId(call.to);
    edges.addOrUpdate(clientId, serverId, [], true);
    leafs.set(clientId, call.from);
    leafs.set(serverId, call.to);
  });

  return { leafs, edges };
};

export const convertLoadedToCallstack = (callstackIterator: CallstackIterator): CallstackElements => {
  log("convertLoadedToCallstack");

  const called = new NodeIdMap<TypeAndMethodId>();
  const caller = new NodeIdMap<TypeAndMethodId>();
  const edges = new Edges();

  const getEdge = (leafId: NodeId, foundId: NodeId, direction: Direction): { clientId: NodeId; serverId: NodeId } => {
    switch (direction) {
      case "upwards":
        return { clientId: foundId, serverId: leafId };
      case "downwards":
        return { clientId: leafId, serverId: foundId };
    }
  };

  const findNextLayer = (leaf: TypeAndMethodId, direction: Direction, leafDictionary: LeafDictionary): void => {
    const leafId = makeMethodNodeId(leaf);
    leafDictionary.set(leafId, leaf);

    const allFound = callstackIterator.readNext(leaf.assemblyName, leaf.methodId, direction);

    for (const found of allFound) {
      const foundId = makeMethodNodeId(found);
      const { clientId, serverId } = getEdge(leafId, foundId, direction);
      edges.addOrUpdate(clientId, serverId, [], true);

      if (leafDictionary.has(foundId)) continue; // avoid infinite loop if there's recursion or cyclic dependency
      findNextLayer(found, direction, leafDictionary); // recurse
    }
  };

  [callstackIterator.first].forEach((called) => findNextLayer(called, "upwards", caller));
  [callstackIterator.first].forEach((calledBy) => findNextLayer(calledBy, "downwards", called));

  const combined = called.combine(caller);

  return { leafs: combined, edges };
};

export const convertCallstackToImage = (
  callstackElements: CallstackElements,
  typeOrMethodName: GetTypeOrMethodName,
  graphViewOptions: MethodViewOptions | ApiViewOptions,
  graphFilter: GraphFilter | undefined
): GraphData => {
  log("convertCallstackToImage");

  const { leafs, edges } = callstackElements;
  const { getTypeName, getMethodName } = typeOrMethodName;

  const makeTypedName = (typeAndMethodId: TypeAndMethodId): string =>
    getTypeName(typeNodeId(typeAndMethodId.assemblyName, typeAndMethodId.typeId));
  const makeMethodName = (typeAndMethodId: TypeAndMethodId): string =>
    getMethodName(methodNodeId(typeAndMethodId.assemblyName, typeAndMethodId.methodId));

  const clusterBy = graphViewOptions.showClustered.clusterBy;

  // begin to convert to image input format
  const imageAttributes = new NodeIdMap<ImageAttribute>();
  const methodAttributes: ImageAttribute = { shape: "none" };
  const typeAttributes: ImageAttribute = { shape: "folder", style: "rounded" };

  // create nodes now, create image nodes later
  type MethodData = { methodNodeId: NodeId; methodName: string };
  type TypeData = { methods: MethodData[]; typeName: string };

  const getTypeData = (typeAndMethodId: TypeAndMethodId): TypeData => ({
    methods: [],
    typeName: makeTypedName(typeAndMethodId),
  });
  const getMethodData = (methodNodeId: NodeId, typeAndMethodId: TypeAndMethodId): MethodData => ({
    methodNodeId,
    methodName: makeMethodName(typeAndMethodId),
  });

  const topNodes = new Map<string, NodeIdMap<TypeData>>(); // NameNodeIdMap<TypesAndMethods>(clusterBy);

  const getName = (typeAndMethodId: TypeAndMethodId): string => {
    switch (clusterBy) {
      case "assembly":
        return typeAndMethodId.assemblyName;
      case "namespace":
        return typeAndMethodId.namespace;
    }
  };

  leafs.entries().forEach(([methodNodeId, typeAndMethodId]) => {
    // add to the topNodes collection
    const topName = getName(typeAndMethodId);
    const typeNodes = getOrSet(topNodes, topName, () => new NodeIdMap<TypeData>());

    // add to the typeNodes collection
    const typeNodeId = toTypeNodeId(typeAndMethodId.assemblyName, typeAndMethodId.typeId);
    const typeData = typeNodes.getOrSet(typeNodeId, () => getTypeData(typeAndMethodId));

    // add to the methods collection
    const methodData = getMethodData(methodNodeId, typeAndMethodId);
    typeData.methods.push(methodData);

    // update the imageAttributes
    imageAttributes.set(typeNodeId, typeAttributes);
    imageAttributes.set(methodNodeId, { ...methodAttributes, shortLabel: methodData.methodName });
  });

  // create image nodes from nodes
  const groups: Parent[] = [];
  [...topNodes.entries()].forEach(([topName, typeAndMethods]) => {
    const nameNodeId = toNameNodeId(clusterBy, topName);
    const topParent: Parent = {
      parent: null,
      label: topName,
      nodeId: nameNodeId,
      children: [],
    };
    groups.push(topParent);

    typeAndMethods.entries().forEach(([typeNodeId, typeData]) => {
      const typeParent: Parent = {
        parent: topParent,
        label: typeData.typeName,
        nodeId: typeNodeId,
        children: [],
      };
      topParent.children.push(typeParent);

      typeData.methods.forEach((methodData) => {
        const methodLeaf: Leaf = {
          parent: typeParent,
          label: methodData.methodName,
          nodeId: methodData.methodNodeId,
        };
        typeParent.children.push(methodLeaf);
      });
    });
  });

  graphFilter ??= {
    leafVisible: leafs.keys(),
    groupExpanded: groups.map((parent) => parent.nodeId),
    isCheckModelAll: false,
  };

  // convert to Image
  const imageData = convertToImage(groups, edges, graphViewOptions, graphFilter, false, imageAttributes);

  return { imageData, graphViewOptions, graphFilter, groups };
};
