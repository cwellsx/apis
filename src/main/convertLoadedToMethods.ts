import { ImageData, Node } from "./createImage";
import { CallDetails, Loaded, Method } from "./loaded";

type Edge = {
  client: Node;
  server: Node;
};

export interface INodes {
  [key: string]: { node: Node; asText: string }; // dependencies/references of each assembly
}

const makeId = (assemblyId: string, methodId: string | number): string => `${assemblyId}-${methodId}`;

const makeNode = (assemblyId: string, methodId: string | number, methodMember: string, declaringType: string): Node => {
  return { id: makeId(assemblyId, methodId), label: `${declaringType}\n${methodMember}`, type: "node" };
};

export const convertLoadedToMethods = (loaded: Loaded, assemblyId: string, methodId: string): ImageData => {
  const nodes: INodes = {};
  const edges: Edge[] = [];

  const methodsDictionary = loaded.methods[assemblyId];
  const methodDetails = methodsDictionary[methodId];
  const firstNode = makeNode(assemblyId, methodId, methodDetails.methodMember, methodDetails.declaringType);

  nodes[firstNode.id] = { node: firstNode, asText: methodDetails.asText };

  const findCalledBy = (called: Node, calledBy: Method[]): void => {
    for (const method of calledBy) {
      const node = makeNode(method.assemblyName, method.metadataToken, method.methodMember, method.declaringType);
      edges.push({ client: node, server: called });
      if (nodes[node.id]) continue; // avoid infinite loop if there's recursion or cyclic dependency
      const methodDetails = loaded.methods[method.assemblyName][method.metadataToken];
      nodes[node.id] = { node, asText: methodDetails.asText };
      findCalledBy(node, methodDetails.calledBy); // recurse
    }
  };

  findCalledBy(firstNode, methodDetails.calledBy);

  const findCalled = (caller: Node, calls: CallDetails[]): void => {
    for (const call of calls) {
      if (call.error && !call.isWarning) continue; //the metadataToken is invalid because the method was not found
      const method = call.called;
      const node = makeNode(method.assemblyName, method.metadataToken, method.methodMember, method.declaringType);
      edges.push({ client: caller, server: node });
      if (nodes[node.id]) continue; // avoid infinite loop if there's recursion or cyclic dependency
      const methodDetails = loaded.methods[method.assemblyName][method.metadataToken];
      nodes[node.id] = { node, asText: methodDetails.asText };
      findCalledBy(node, methodDetails.calledBy); // recurse
    }
  };

  findCalled(firstNode, methodDetails.calls);

  return {
    nodes: Object.values(nodes).map((pair) => pair.node),
    edges: edges.map((edge) => {
      const clientId = edge.client.id;
      const serverId = edge.server.id;
      const edgeId = `${clientId}-${serverId}`;
      return { clientId, serverId, edgeId };
    }),
  };
};
