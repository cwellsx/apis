import type { Leaf, MetadataNodeId, MethodNodeId, MethodViewOptions, NodeId, Parent, ViewGraph } from "../shared-types";
import { metadataNodeId, methodNodeId, nameNodeId } from "../shared-types";
import { convertToImage } from "./convertToImage";
import type { ImageAttribute } from "./createImage";
import { CallDetails, GoodTypeInfo, MethodIdNamed } from "./loaded";
import { log } from "./log";
import type { TypeAndMethodDetails } from "./shared-types";
import { Edges, NodeIdMap, getMethodName, getTypeInfoName } from "./shared-types";

type TypeMethods = {
  type: GoodTypeInfo;
  methods: TypeAndMethodDetails[];
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

const groupsFromTypeDictionary = (
  types: NodeIdMap<TypeMethods>,
  viewOptions: MethodViewOptions
): { groups: Parent[]; leafs: Leaf[] } => {
  const leafs: Leaf[] = [];

  const leafFromTypeAndMethod = (typeAndMethod: TypeAndMethodDetails, parent: Parent | null): Leaf => ({
    parent,
    nodeId: getTypeAndMethodId(typeAndMethod),
    label: getMethodName(typeAndMethod.method),
  });

  const parentFromTypeMethods = (typeId: NodeId, typeMethods: TypeMethods, parent: Parent | null): Parent => {
    const self: Parent = {
      parent,
      nodeId: typeId,
      label: getTypeInfoName(typeMethods.type),
      children: [],
    };
    const children = typeMethods.methods.map((method) => leafFromTypeAndMethod(method, self));
    leafs.push(...children);
    self.children = children;
    return self;
  };

  const topType = viewOptions.topType;
  if (topType === "none") {
    const groups = types.entries().map(([typeId, typeMethods]) => parentFromTypeMethods(typeId, typeMethods, null));
    return { groups, leafs };
  }

  type TopDictionary = {
    [id: string]: [NodeId, TypeMethods][];
  };

  // key is assemblyName or namespace, values are the types within each
  const tops: TopDictionary = {};
  for (const entry of types.entries()) {
    const typeId = entry[1].type.typeId;
    const topId = topType === "assembly" ? typeId.assemblyName : typeId.namespace ?? "(none)";
    let entries = tops[topId];
    if (!entries) {
      entries = [];
      tops[topId] = entries;
    }
    entries.push(entry);
  }
  const entryToGroupNode = (entry: [string, [NodeId, TypeMethods][]]): Parent => {
    const [topId, values] = entry;
    const self: Parent = {
      nodeId: nameNodeId(topType, topId),
      label: topId,
      parent: null,
      children: [],
    };
    self.children = values.map(([typeId, typeMethods]) => parentFromTypeMethods(typeId, typeMethods, self));
    return self;
  };
  const groups = Object.entries(tops).map(entryToGroupNode);
  return { groups, leafs };
};

/*
  exported
*/

export const convertLoadedToMethods = (
  readMethod: ReadMethod,
  viewOptions: MethodViewOptions,
  methodId?: MethodNodeId
): ViewGraph => {
  type LeafDictionary = NodeIdMap<TypeAndMethodDetails>;
  const called = new NodeIdMap<TypeAndMethodDetails>();
  const caller = new NodeIdMap<TypeAndMethodDetails>();
  const edges = new Edges();

  const saveMethod = (methodId: MetadataNodeId, result: TypeAndMethodDetails, leafs: LeafDictionary): void => {
    if (leafs.has(methodId)) throw new Error("Duplicate leaf id");
    leafs.set(methodId, result);
  };

  const selectMethod = (methodId: MetadataNodeId, leafs: LeafDictionary | undefined): TypeAndMethodDetails => {
    const result = readMethod(methodId.assemblyName, methodId.metadataToken);
    assertTypeAndMethodId(methodId, result);
    if (leafs) saveMethod(methodId, result, leafs);

    return result;
  };

  const saveEdge = (clientId: MetadataNodeId, serverId: MetadataNodeId): void => {
    edges.add(clientId, serverId, []);
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
      if (caller.has(calledById)) continue; // avoid infinite loop if there's recursion or cyclic dependency
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
      if (called.has(calledId)) continue; // avoid infinite loop if there's recursion or cyclic dependency
      const calledMethod = selectMethod(calledId, called);
      findCalled(calledId, calledMethod.methodDetails.calls); // recurse
    }
  };

  findCalled(methodId, firstLeaf.methodDetails.calls);

  // begin to convert to image input format
  const imageAttributes = new NodeIdMap<ImageAttribute>();

  // combine the two LeafDictionary
  const leafDictionary: LeafDictionary = called.combine(caller);
  const methodAttributes: ImageAttribute = { shape: "none" };
  leafDictionary
    .entries()
    .forEach(([nodeId, typeAndMethod]) =>
      imageAttributes.set(nodeId, { ...methodAttributes, shortLabel: typeAndMethod.method.name })
    );

  // sort by type
  const types = new NodeIdMap<TypeMethods>();
  const typeAttributes: ImageAttribute = { shape: "folder", style: "rounded" };

  for (const typeAndMethod of leafDictionary.values()) {
    const type = typeAndMethod.type;
    const typeId = getTypeId(type);
    let typeNode = types.get(typeId);
    if (!typeNode) {
      typeNode = { type, methods: [] };
      types.set(typeId, typeNode);
      imageAttributes.set(typeId, typeAttributes);
    }
    typeNode.methods.push(typeAndMethod);
  }

  // convert to Groups
  log("groupsFromTypeDictionary");
  const { groups, leafs } = groupsFromTypeDictionary(types, viewOptions);

  // a Group is visible iff its leafs are visible
  if (isNewMethodId) {
    viewOptions.leafVisible = leafs.map((leaf) => leaf.nodeId);
    viewOptions.methodId = methodId;
  }

  // convert to Image
  log("convertToImage");
  const image = convertToImage(groups, edges.values(), viewOptions, false, imageAttributes);

  return { image, viewOptions, groups };
};
