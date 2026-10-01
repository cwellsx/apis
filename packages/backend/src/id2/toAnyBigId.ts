import { AnyNodeType, NodeId, nodeIdToText, NodeType } from "../contracts-ui";
import * as IdCast from "./idCast";
import type { AnyBigId } from "./idTypes";

export const toAnyBigId = (nodeId: NodeId, nodeType: AnyNodeType): AnyBigId => {
  const text = nodeIdToText(nodeId);
  const bigId = BigInt(text);
  switch (nodeType) {
    case NodeType.Group:
      return IdCast.castBigGroupId(bigId);
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
