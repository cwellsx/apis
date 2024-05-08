import type { Groups, LeafNode, MethodViewOptions, ParentNode, ViewGraph } from "../shared-types";
import { getMethodName } from "./convertLoadedToMembers";
import { getTypeInfoName } from "./convertLoadedToTypes";
import { convertToImage } from "./convertToImage";
import type { ImageAttribute, ImageAttributes } from "./createImage";
import { CallDetails, GoodTypeInfo, MethodIdNamed } from "./loaded";
import { log } from "./log";
import type { Edge, TypeAndMethod } from "./shared-types";

// initially the leaf nodes are the methods i.e. TypeAndMethod instances

export type NodeId = {
  assemblyName: string;
  metadataToken: number;
};

type TypeNode = {
  typeId: NodeId;
  type: GoodTypeInfo;
  methods: TypeAndMethod[];
};

type TopNode = {
  topId: string;
  types: TypeNode[];
};

type LeafDictionary = {
  [id: string]: TypeAndMethod;
};
type TypeDictionary = {
  [id: string]: TypeNode;
};
type TopDictionary = {
  [id: string]: TopNode;
};

type ReadMethod = (assemblyName: string, methodId: number) => TypeAndMethod;

/*
  functions to create Ids
*/

const stringId: (id: NodeId) => string = (id: NodeId) => `${id.assemblyName}-${id.metadataToken}`;
const getTypeAndMethodId: (leaf: TypeAndMethod) => NodeId = (leaf: TypeAndMethod) => ({
  assemblyName: leaf.type.typeId.assemblyName,
  metadataToken: leaf.method.metadataToken,
});
const getMethodId: (leaf: MethodIdNamed) => NodeId = (method: MethodIdNamed) => ({
  assemblyName: method.assemblyName,
  metadataToken: method.metadataToken,
});
const getTypeId: (type: GoodTypeInfo) => NodeId = (type: GoodTypeInfo) => ({
  assemblyName: type.typeId.assemblyName,
  metadataToken: type.typeId.metadataToken,
});

const assertTypeAndMethodId = (lhs: NodeId, leaf: TypeAndMethod): void => {
  const rhs = getTypeAndMethodId(leaf);
  if (lhs.assemblyName !== rhs.assemblyName || lhs.metadataToken !== rhs.metadataToken)
    throw new Error("Unexpected leaf id");
};

export const fromStringId = (id: string): NodeId => {
  const split = id.split("-");
  if (split.length !== 2) throw new Error("Unexpected Id");
  return { assemblyName: split[0], metadataToken: +split[1] };
};

/*
  functions to create group nodes
*/

const groupsFromTopDictionary = (types: TypeDictionary, viewOptions: MethodViewOptions): Groups => {
  const leafFromTypeAndMethod = (typeAndMethod: TypeAndMethod, parent: ParentNode | null): LeafNode => ({
    parent,
    id: stringId(getTypeAndMethodId(typeAndMethod)),
    label: getMethodName(typeAndMethod.method),
  });

  const parentFromTypeNode = (typeNode: TypeNode, parent: ParentNode | null): ParentNode => {
    const self: ParentNode = {
      parent,
      id: stringId(typeNode.typeId),
      label: getTypeInfoName(typeNode.type),
      children: [],
    };
    self.children = typeNode.methods.map((method) => leafFromTypeAndMethod(method, self));
    return self;
  };

  const topType = viewOptions.topType;
  if (topType === "none") return Object.values(types).map((typeNode) => parentFromTypeNode(typeNode, null));
  const tops: TopDictionary = {};
  for (const typeNode of Object.values(types)) {
    let topId = topType === "assembly" ? typeNode.typeId.assemblyName : typeNode.type.typeId.namespace;
    if (!topId) topId = "";
    let topNode = tops[topId];
    if (!topNode) {
      topNode = { topId, types: [] };
      tops[topId] = topNode;
    }
    topNode.types.push(typeNode);
  }
  const entryToGroupNode = (entry: [string, TopNode]): ParentNode => {
    const [topId, topNode] = entry;
    const self: ParentNode = {
      id: topId,
      label: topId,
      parent: null,
      children: [],
    };
    self.children = topNode.types.map((typeNode) => parentFromTypeNode(typeNode, self));
    return self;
  };
  return Object.entries(tops).map(entryToGroupNode);
};

/*
  exported
*/

export const convertLoadedToMethods = (
  readMethod: ReadMethod,
  viewOptions: MethodViewOptions,
  methodId?: NodeId
): ViewGraph => {
  const called: LeafDictionary = {};
  const caller: LeafDictionary = {};
  const edges: Edge[] = [];

  const saveMethod = (methodId: NodeId, result: TypeAndMethod, leafs: LeafDictionary): void => {
    const id = stringId(methodId);
    if (leafs[id]) throw new Error("Duplicate leaf id");
    leafs[id] = result;
  };

  const selectMethod = (methodId: NodeId, leafs: LeafDictionary | undefined): TypeAndMethod => {
    const result = readMethod(methodId.assemblyName, methodId.metadataToken);
    assertTypeAndMethodId(methodId, result);
    if (leafs) saveMethod(methodId, result, leafs);

    return result;
  };

  const saveEdge = (client: NodeId, server: NodeId): void => {
    edges.push({ clientId: stringId(client), serverId: stringId(server) });
  };

  const isNewMethodId = !!methodId;
  methodId ??= viewOptions.methodId;

  const firstLeaf = selectMethod(methodId, undefined);
  saveMethod(methodId, firstLeaf, called);
  saveMethod(methodId, firstLeaf, caller);

  const findCalledBy = (called: NodeId, calledBy: MethodIdNamed[]): void => {
    for (const method of calledBy) {
      const calledById: NodeId = getMethodId(method);
      saveEdge(calledById, called);
      if (caller[stringId(calledById)]) continue; // avoid infinite loop if there's recursion or cyclic dependency
      const calledByMethod = selectMethod(calledById, caller);
      findCalledBy(calledById, calledByMethod.methodDetails.calledBy); // recurse
    }
  };

  findCalledBy(methodId, firstLeaf.methodDetails.calledBy);

  const findCalled = (caller: NodeId, calls: CallDetails[]): void => {
    for (const call of calls) {
      if (call.error && !call.isWarning) continue; //the metadataToken is invalid because the method was not found
      const method = call.called;
      const calledId: NodeId = getMethodId(method);
      saveEdge(caller, calledId);
      if (called[stringId(calledId)]) continue; // avoid infinite loop if there's recursion or cyclic dependency
      const calledMethod = selectMethod(calledId, called);
      findCalled(calledId, calledMethod.methodDetails.calls); // recurse
    }
  };

  findCalled(methodId, firstLeaf.methodDetails.calls);

  // begin to convert to image input format
  const imageAttributes: ImageAttributes = {};

  // combine the two LeafDictionary
  const leafs: LeafDictionary = { ...called, ...caller };
  const methodAttributes: ImageAttribute = { shape: "none" };
  Object.entries(leafs).forEach(
    ([id, typeAndMethod]) => (imageAttributes[id] = { ...methodAttributes, shortLabel: typeAndMethod.method.name })
  );

  // build the TypeDictionary
  const types: TypeDictionary = {};
  const typeAttributes: ImageAttribute = { shape: "folder", style: "rounded" };

  for (const typeAndMethod of Object.values(leafs)) {
    const type = typeAndMethod.type;
    const typeId = getTypeId(type);
    const id = stringId(typeId);
    let typeNode = types[id];
    if (!typeNode) {
      typeNode = { typeId: typeId, type, methods: [] };
      types[id] = typeNode;
      imageAttributes[id] = typeAttributes;
    }
    typeNode.methods.push(typeAndMethod);
  }

  // convert to Groups
  log("groupsFromTopDictionary");
  const groups: Groups = groupsFromTopDictionary(types, viewOptions);

  // a Group is visible iff its leafs are visible
  if (isNewMethodId) {
    viewOptions.leafVisible = Object.keys(leafs);
    viewOptions.methodId = methodId;
  }

  // convert to Image
  if (!viewOptions.showGrouped) throw new Error("");

  log("convertToImage");
  const image = convertToImage(groups, [], edges, viewOptions, imageAttributes);

  return { image, viewOptions, groups };
};
