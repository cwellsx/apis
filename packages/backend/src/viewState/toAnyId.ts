import { AnyNodeType, NodeId, nodeIdToText, NodeType } from "../contracts-ui";
import type { Id } from "../sql2";
import {
  castAssemblyGroupId,
  castAssemblyId,
  castCustomId,
  castMethodDefId,
  castNamespaceGroupId,
  castNamespaceId,
  castTypeDefId,
} from "../sql2";
import { ViewType } from "./createDatabase";

const toGroupId = (id: number, viewType: ViewType): Id.AnyId => {
  switch (viewType) {
    case "assemblies":
    case "references":
      return castAssemblyGroupId(id);
    case "namespaces":
      return castNamespaceGroupId(id);
  }
};

export const toAnyId = (nodeId: NodeId, nodeType: AnyNodeType, viewType: ViewType): Id.AnyId => {
  const text = nodeIdToText(nodeId);
  switch (nodeType) {
    case NodeType.Group:
      return toGroupId(Number(text), viewType);
    case NodeType.Assembly:
      return castAssemblyId(Number(text));
    case NodeType.Namespace:
      return castNamespaceId(Number(text));
    case NodeType.Type:
      return castTypeDefId(BigInt(text));
    case NodeType.Method:
      return castMethodDefId(BigInt(text));
    case NodeType.Custom:
      return castCustomId(Number(text));
  }
};
