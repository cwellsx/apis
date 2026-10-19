import { AnyNodeType, NodeId, nodeIdToText, NodeType } from "../contracts-ui";
import { assert } from "../utils";
import * as IdCast from "./idCast";
import type { AnyBigId, AnyCustomId, CustomId } from "./idTypes";

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
    case NodeType.CustomLeaf:
      return IdCast.castCustomId(text);
  }
  assert(false);
};

export const toCustomId = (nodeId: NodeId, nodeType: AnyNodeType): CustomId => {
  const text = nodeIdToText(nodeId);
  switch (nodeType) {
    case NodeType.CustomLeaf:
      return IdCast.castCustomId(text);
  }
  assert(false);
};
