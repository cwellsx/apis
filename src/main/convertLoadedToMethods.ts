import type {
  GraphFilter,
  Leaf,
  MethodNodeId,
  MethodViewOptions,
  NameNodeId,
  NodeId,
  Parent,
  TypeNodeId,
  ViewGraph,
} from "../shared-types";
import {
  methodNodeId as getMethodNodeId,
  nameNodeId as getNameNodeId,
  typeNodeId as getTypeNodeId,
} from "../shared-types";
import { convertToImage } from "./convertToImage";
import type { ImageAttribute } from "./createImage";
import { log } from "./log";
import { Edges, NodeIdMap } from "./shared-types";
import type { Direction, GetTypeOrMethodName, TypeAndMethodId } from "./sql";

/*
  exported
*/

type LeafDictionary = NodeIdMap<TypeAndMethodId, MethodNodeId>;
type ReadCallStack = (assemblyName: string, methodId: number, direction: Direction) => TypeAndMethodId[];

type CallstackElements = {
  leafs: LeafDictionary;
  edges: Edges;
};

export const convertLoadedToCallstack = (
  readCallStack: ReadCallStack,
  firstLeaf: TypeAndMethodId[]
): CallstackElements => {
  const called = new NodeIdMap<TypeAndMethodId, MethodNodeId>();
  const caller = new NodeIdMap<TypeAndMethodId, MethodNodeId>();
  const edges = new Edges();

  const methodNodeId = (method: TypeAndMethodId): MethodNodeId => getMethodNodeId(method.assemblyName, method.methodId);

  const getEdge = (
    leafId: MethodNodeId,
    foundId: MethodNodeId,
    direction: Direction
  ): { clientId: NodeId; serverId: NodeId } => {
    switch (direction) {
      case "upwards":
        return { clientId: foundId, serverId: leafId };
      case "downwards":
        return { clientId: leafId, serverId: foundId };
    }
  };

  const findNextLayer = (leaf: TypeAndMethodId, direction: Direction, leafDictionary: LeafDictionary): void => {
    const leafId = methodNodeId(leaf);
    leafDictionary.set(leafId, leaf);

    const allFound = readCallStack(leaf.assemblyName, leaf.methodId, direction);

    for (const found of allFound) {
      const foundId = methodNodeId(found);
      const { clientId, serverId } = getEdge(leafId, foundId, direction);
      edges.add(clientId, serverId, []);

      if (leafDictionary.has(foundId)) continue; // avoid infinite loop if there's recursion or cyclic dependency
      findNextLayer(found, direction, leafDictionary); // recurse
    }
  };

  firstLeaf.forEach((called) => findNextLayer(called, "upwards", caller));
  firstLeaf.forEach((calledBy) => findNextLayer(calledBy, "downwards", called));

  const combined = called.combine(caller);

  return { leafs: combined, edges };
};

export const convertCallstackToImage = (
  callstackElements: CallstackElements,
  typeOrMethodName: GetTypeOrMethodName,
  viewOptions: MethodViewOptions,
  graphFilter: GraphFilter | undefined
): ViewGraph => {
  const { leafs, edges } = callstackElements;
  const { getTypeName, getMethodName } = typeOrMethodName;

  // begin to convert to image input format
  const imageAttributes = new NodeIdMap<ImageAttribute>();
  const methodAttributes: ImageAttribute = { shape: "none" };
  const typeAttributes: ImageAttribute = { shape: "folder", style: "rounded" };

  // create nodes now, create image nodes later
  type TypesAndMethods = NodeIdMap<MethodNodeId[], TypeNodeId>;
  const topNodes = new NodeIdMap<TypesAndMethods, NameNodeId>();

  const clusterBy = viewOptions.showClustered.clusterBy;
  const getName = (typeAndMethodId: TypeAndMethodId): string => {
    switch (clusterBy) {
      case "assembly":
        return typeAndMethodId.assemblyName;
      case "namespace":
        return typeAndMethodId.namespace;
    }
  };
  const getOrAddTopNode = (key: NameNodeId): TypesAndMethods => {
    let value = topNodes.get(key);
    if (!value) {
      value = new NodeIdMap<MethodNodeId[], TypeNodeId>();
      topNodes.set(key, value);
    }
    return value;
  };
  const getOrAddTypeNode = (key: TypeNodeId, typeNodes: TypesAndMethods): MethodNodeId[] => {
    let value = typeNodes.get(key);
    if (!value) {
      value = [];
      typeNodes.set(key, value);
    }
    return value;
  };
  leafs.entries().forEach(([methodNodeId, typeAndMethodId]) => {
    // make the NodeId instances
    const nameNodeId = getNameNodeId(clusterBy, getName(typeAndMethodId));
    const typeNodeId = getTypeNodeId(typeAndMethodId.assemblyName, typeAndMethodId.typeId);

    // add to the topNodes collection
    const typeNodes = getOrAddTopNode(nameNodeId);
    const methodNodes = getOrAddTypeNode(typeNodeId, typeNodes);
    methodNodes.push(methodNodeId);

    // update the imageAttributes
    imageAttributes.set(typeNodeId, typeAttributes);
    imageAttributes.set(methodNodeId, { ...methodAttributes, shortLabel: getMethodName(methodNodeId) });
  });

  // create image nodes from nodes
  const groups: Parent[] = [];
  topNodes.entries().forEach(([nameNodeId, typeAndMethods]) => {
    const topParent: Parent = {
      parent: null,
      label: nameNodeId.name,
      nodeId: nameNodeId,
      children: [],
    };
    groups.push(topParent);

    typeAndMethods.entries().forEach(([typeNodeId, methodNodeIds]) => {
      const typeParent: Parent = {
        parent: topParent,
        label: getTypeName(typeNodeId),
        nodeId: typeNodeId,
        children: [],
      };
      topParent.children.push(typeParent);

      methodNodeIds.forEach((methodNodeId) => {
        const methodLeaf: Leaf = {
          parent: typeParent,
          label: getMethodName(methodNodeId),
          nodeId: methodNodeId,
        };
        typeParent.children.push(methodLeaf);
      });
    });
  });

  graphFilter ??= {
    leafVisible: leafs.keys(),
    groupExpanded: groups.map((parent) => parent.nodeId),
  };

  // convert to Image
  log("convertToImage");
  const image = convertToImage(groups, edges.values(), viewOptions, graphFilter, false, imageAttributes);

  return { image, viewOptions, graphFilter, groups };
};
