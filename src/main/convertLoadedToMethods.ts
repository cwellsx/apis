import type { Leaf, MetadataNodeId, MethodNodeId, MethodViewOptions, Node, Parent, ViewGraph } from "../shared-types";
import { metadataNodeId, methodNodeId, nameNodeId, nodeIdToText } from "../shared-types";
import { getMethodName, getTypeInfoName } from "./convertLoadedToTypeDetails";
import { convertToImage } from "./convertToImage";
import type { ImageAttribute, ImageAttributes } from "./createImage";
import { CallDetails, GoodTypeInfo, MethodIdNamed } from "./loaded";
import { log } from "./log";
import type { Edge, TypeAndMethodDetails } from "./shared-types";

type TypeMethods = {
  typeId: MetadataNodeId;
  type: GoodTypeInfo;
  methods: TypeAndMethodDetails[];
};

type LeafDictionary = {
  [id: string]: TypeAndMethodDetails;
};

type TypeDictionary = {
  [id: string]: TypeMethods;
};

type ReadMethod = (assemblyName: string, methodId: number) => TypeAndMethodDetails;

/*
  functions to create Ids
*/

const getTypeAndMethodId: (leaf: TypeAndMethodDetails) => MethodNodeId = (leaf: TypeAndMethodDetails) =>
  methodNodeId(leaf.type.typeId.assemblyName, leaf.method.metadataToken);

const getMethodId: (leaf: MethodIdNamed) => MethodNodeId = (method: MethodIdNamed) =>
  methodNodeId(method.assemblyName, method.metadataToken);

const getTypeId: (type: GoodTypeInfo) => MetadataNodeId = (type: GoodTypeInfo) =>
  metadataNodeId("type", type.typeId.assemblyName, type.typeId.metadataToken);

const assertTypeAndMethodId = (lhs: MetadataNodeId, leaf: TypeAndMethodDetails): void => {
  const rhs = getTypeAndMethodId(leaf);
  if (lhs.assemblyName !== rhs.assemblyName || lhs.metadataToken !== rhs.metadataToken)
    throw new Error("Unexpected leaf id");
};

/*
  functions to create group nodes
*/

const groupsFromTypeDictionary = (types: TypeDictionary, viewOptions: MethodViewOptions): Node[] => {
  const leafFromTypeAndMethod = (typeAndMethod: TypeAndMethodDetails, parent: Parent | null): Leaf => ({
    parent,
    nodeId: getTypeAndMethodId(typeAndMethod),
    label: getMethodName(typeAndMethod.method),
  });

  const parentFromTypeMethods = (typeMethods: TypeMethods, parent: Parent | null): Parent => {
    const self: Parent = {
      parent,
      nodeId: typeMethods.typeId,
      label: getTypeInfoName(typeMethods.type),
      children: [],
    };
    self.children = typeMethods.methods.map((method) => leafFromTypeAndMethod(method, self));
    return self;
  };

  const topType = viewOptions.topType;
  if (topType === "none") return Object.values(types).map((typeMethods) => parentFromTypeMethods(typeMethods, null));

  type TopNode = {
    topId: string;
    types: TypeMethods[];
  };

  type TopDictionary = {
    [id: string]: TopNode;
  };

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
  const entryToGroupNode = (entry: [string, TopNode]): Parent => {
    const [topId, topNode] = entry;
    const self: Parent = {
      nodeId: nameNodeId(topType, topId),
      label: topId,
      parent: null,
      children: [],
    };
    self.children = topNode.types.map((typeNode) => parentFromTypeMethods(typeNode, self));
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
  methodId?: MethodNodeId
): ViewGraph => {
  const called: LeafDictionary = {};
  const caller: LeafDictionary = {};
  const edges: Edge[] = [];

  const saveMethod = (methodId: MetadataNodeId, result: TypeAndMethodDetails, leafs: LeafDictionary): void => {
    const id = nodeIdToText(methodId);
    if (leafs[id]) throw new Error("Duplicate leaf id");
    leafs[id] = result;
  };

  const selectMethod = (methodId: MetadataNodeId, leafs: LeafDictionary | undefined): TypeAndMethodDetails => {
    const result = readMethod(methodId.assemblyName, methodId.metadataToken);
    assertTypeAndMethodId(methodId, result);
    if (leafs) saveMethod(methodId, result, leafs);

    return result;
  };

  const saveEdge = (client: MetadataNodeId, server: MetadataNodeId): void => {
    edges.push({ clientId: nodeIdToText(client), serverId: nodeIdToText(server) });
  };

  const isNewMethodId = !!methodId;
  methodId ??= viewOptions.methodId;

  const firstLeaf = selectMethod(methodId, undefined);
  saveMethod(methodId, firstLeaf, called);
  saveMethod(methodId, firstLeaf, caller);

  const findCalledBy = (called: MethodNodeId, calledBy: MethodIdNamed[]): void => {
    for (const method of calledBy) {
      const calledById: MethodNodeId = getMethodId(method);
      saveEdge(calledById, called);
      if (caller[nodeIdToText(calledById)]) continue; // avoid infinite loop if there's recursion or cyclic dependency
      const calledByMethod = selectMethod(calledById, caller);
      findCalledBy(calledById, calledByMethod.methodDetails.calledBy); // recurse
    }
  };

  findCalledBy(methodId, firstLeaf.methodDetails.calledBy);

  const findCalled = (caller: MethodNodeId, calls: CallDetails[]): void => {
    for (const call of calls) {
      if (call.error && !call.isWarning) continue; //the metadataToken is invalid because the method was not found
      const method = call.called;
      const calledId: MethodNodeId = getMethodId(method);
      saveEdge(caller, calledId);
      if (called[nodeIdToText(calledId)]) continue; // avoid infinite loop if there's recursion or cyclic dependency
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
    const id = nodeIdToText(typeId);
    let typeNode = types[id];
    if (!typeNode) {
      typeNode = { typeId: typeId, type, methods: [] };
      types[id] = typeNode;
      imageAttributes[id] = typeAttributes;
    }
    typeNode.methods.push(typeAndMethod);
  }

  // convert to Groups
  log("groupsFromTypeDictionary");
  const groups: Node[] = groupsFromTypeDictionary(types, viewOptions);

  // a Group is visible iff its leafs are visible
  if (isNewMethodId) {
    viewOptions.leafVisible = Object.keys(leafs);
    viewOptions.methodId = methodId;
  }

  // convert to Image
  log("convertToImage");
  const image = convertToImage(groups, edges, viewOptions, imageAttributes);

  return { image, viewOptions, groups };
};
