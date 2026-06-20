import { AnyNodeType, NodeId, nodeIdToText, NodeType } from "../contracts-ui";
import * as IdCast from "./idCast";
import type { AnyId } from "./idTypes";

type ViewType = "assemblies" | "namespaces" | "references";

const toGroupId = (id: number, viewType: ViewType): AnyId => {
  switch (viewType) {
    case "assemblies":
    case "references":
      return IdCast.castAssemblyGroupId(id);
    case "namespaces":
      return IdCast.castNamespaceGroupId(id);
  }
};

export const toAnyId = (nodeId: NodeId, nodeType: AnyNodeType, viewType: ViewType): AnyId => {
  const text = nodeIdToText(nodeId);
  switch (nodeType) {
    case NodeType.Group:
      return toGroupId(Number(text), viewType);
    case NodeType.Assembly:
      return IdCast.castAssemblyId(Number(text));
    case NodeType.Namespace:
      return IdCast.castNamespaceId(Number(text));
    case NodeType.Type:
      return IdCast.castTypeDefId(BigInt(text));
    case NodeType.Method:
      return IdCast.castMethodDefId(BigInt(text));
    case NodeType.Custom:
      return IdCast.castCustomId(Number(text));
  }
};
