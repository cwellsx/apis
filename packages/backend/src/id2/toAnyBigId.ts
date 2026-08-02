import { AnyNodeType, NodeId, nodeIdToText, NodeType } from "../contracts-ui";
import * as IdCast from "./idCast";
import type { AnyBigId } from "./idTypes";

type ViewType = "assemblies" | "namespaces" | "references";

const toBigGroupId = (bigId: bigint, viewType: ViewType): AnyBigId => {
  switch (viewType) {
    case "assemblies":
    case "references":
      return IdCast.castBigAssemblyGroupId(bigId);
    case "namespaces":
      return IdCast.castBigNamespaceGroupId(bigId);
  }
};

export const toAnyBigId = (nodeId: NodeId, nodeType: AnyNodeType, viewType: ViewType): AnyBigId => {
  const text = nodeIdToText(nodeId);
  const bigId = BigInt(text);
  switch (nodeType) {
    case NodeType.Group:
      return toBigGroupId(bigId, viewType);
    case NodeType.Assembly:
      return IdCast.castBigAssemblyId(bigId);
    case NodeType.Namespace:
      return IdCast.castBigNamespaceId(bigId);
    case NodeType.Type:
      return IdCast.castTypeDefId(bigId);
    case NodeType.Method:
      return IdCast.castMethodDefId(bigId);
    case NodeType.Custom:
      return IdCast.castBigCustomId(bigId);
  }
};
