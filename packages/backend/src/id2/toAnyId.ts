import { AnyNodeType, NodeId, nodeIdToText, NodeType } from "../contracts-ui";
import { assert } from "../utils";
import * as IdCast from "./idCast";
import type { AnyBigId, AnyCustomId, CustomCallId } from "./idTypes";

export const toAnyBigId = (nodeId: NodeId, nodeType: AnyNodeType): AnyBigId => {
  const text = nodeIdToText(nodeId);
  const bigId = BigInt(text);
  switch (nodeType) {
    case NodeType.Group:
      return IdCast.castBigGroupId(bigId);
    case NodeType.Assembly:
      return IdCast.castBigAssemblyId(bigId);
    case NodeType.Namespace:
      return IdCast.castNamespaceId(bigId);
    case NodeType.Type:
      return IdCast.castTypeDefId(bigId);
    case NodeType.Method:
      return IdCast.castMethodDefId(bigId);
  }
  assert(false);
};

export const toAnyCustomId = (nodeId: NodeId, nodeType: AnyNodeType): AnyCustomId => {
  const text = nodeIdToText(nodeId);
  switch (nodeType) {
    case NodeType.CustomGroup:
      return IdCast.castCustomGroupId(text);
    case NodeType.CustomNode:
      return IdCast.castCustomNodeId(text);
    case NodeType.CustomLeaf:
      return IdCast.castCustomLeafId(text);
  }
  assert(false);
};

export const toCustomCallId = (nodeId: NodeId, nodeType: AnyNodeType): CustomCallId => {
  const text = nodeIdToText(nodeId);
  switch (nodeType) {
    case NodeType.CustomNode:
      return IdCast.castCustomNodeId(text);
    case NodeType.CustomLeaf:
      return IdCast.castCustomLeafId(text);
  }
  assert(false);
};
