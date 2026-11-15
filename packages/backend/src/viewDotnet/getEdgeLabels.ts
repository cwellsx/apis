import type { AnyLeafType, AnyNodeType, EdgeLabels } from "../contracts-ui";
import { NodeType } from "../contracts-ui";
import { Id, IdTest } from "../id";
import type { Sql } from "../sqlDotNet";
import { assert, compareOrdinal } from "../utils";
import { toNodeId } from "../viewCommon";
import type { NodeCall } from "./getCalls";

// the kind of thing a call's endpoint is, which is what the popup shows an icon for
const nodeTypeOf = (id: Id.CallToId): AnyNodeType => {
  switch (IdTest.isCallToId(id)) {
    case "A":
      return NodeType.Assembly;
    case "N":
      return NodeType.Namespace;
    case "T":
      return NodeType.Type;
    case "M":
      return NodeType.Method;
  }
};

// one level down from an edge: the calls which are bundled into it, with their names. One level down is the children
// of the node, which the parents table lists -- and for a namespace which is clustered, that includes the namespaces
// hidden inside it, so that a popup shows what the node encloses rather than only the types of its own namespace.
export const getEdgeLabels = (
  sqlTables: Sql.Tables,
  parentKinds: bigint,
  leafType: AnyLeafType,
  call: NodeCall
): EdgeLabels[] => {
  type PopupCall = Sql.Call & { fromName: string; toName: string };

  // a node of the leaf type of this view has nothing below it, so on that side the call is at the node itself and
  // the parents table is not consulted: which of the two an endpoint is, is the kind of its node
  const fromIsLeaf = call.fromNode.type === leafType;
  const toIsLeaf = call.toNode.type === leafType;

  // a call from a leaf to a leaf has nothing one level down on either side, so there is no popup content. In the
  // references view a leaf is an assembly, which has no level below it either
  if (fromIsLeaf && toIsLeaf) return [];

  /*
    SELECT calls.fromId, calls.toId, fromFullName.fullName, toFullName.fullName
    FROM calls
    JOIN parents AS fromParent
      ON calls.fromId = fromParent.childId
    JOIN parents AS toParent
      ON calls.toId = toParent.childId
    JOIN fullNames AS fromFullName
      ON calls.fromId = fromFullName.id
    JOIN fullNames AS toFullName
      ON calls.toId = toFullName.id
    WHERE fromParent.parentId = ?
      AND toParent.parentId = ?
      AND fromParent.kind & ? <> 0
      AND toParent.kind & ? <> 0;
  */
  // the three cases below differ in which of the two endpoints has its calls one level down: neither, the to side
  // only, or the from side only -- a call from a leaf to a leaf has returned already. Each is written out in full.
  const getPopupCalls = (): PopupCall[] => {
    if (fromIsLeaf)
      return sqlTables.calls
        .join(sqlTables.parents, "childId", "toId", { rightAlias: "toParent" })
        .join(sqlTables.fullNames, "id", sqlTables.calls, "fromId", { rightAlias: "fromFullName" })
        .join(sqlTables.fullNames, "id", sqlTables.calls, "toId", { rightAlias: "toFullName" })
        .where("calls.fromId = ?", call.fromId)
        .where("toParent.parentId = ?", call.toId)
        .where("toParent.kind & ? <> 0", parentKinds)
        .selectAll<PopupCall>({
          fromId: "calls.fromId",
          toId: "calls.toId",
          fromName: "fromFullName.fullName",
          toName: "toFullName.fullName",
        });

    if (toIsLeaf)
      return sqlTables.calls
        .join(sqlTables.parents, "childId", "fromId", { rightAlias: "fromParent" })
        .join(sqlTables.fullNames, "id", sqlTables.calls, "fromId", { rightAlias: "fromFullName" })
        .join(sqlTables.fullNames, "id", sqlTables.calls, "toId", { rightAlias: "toFullName" })
        .where("fromParent.parentId = ?", call.fromId)
        .where("fromParent.kind & ? <> 0", parentKinds)
        .where("calls.toId = ?", call.toId)
        .selectAll<PopupCall>({
          fromId: "calls.fromId",
          toId: "calls.toId",
          fromName: "fromFullName.fullName",
          toName: "toFullName.fullName",
        });

    return sqlTables.calls
      .join(sqlTables.parents, "childId", "fromId", { rightAlias: "fromParent" })
      .join(sqlTables.parents, "childId", sqlTables.calls, "toId", { rightAlias: "toParent" })
      .join(sqlTables.fullNames, "id", sqlTables.calls, "fromId", { rightAlias: "fromFullName" })
      .join(sqlTables.fullNames, "id", sqlTables.calls, "toId", { rightAlias: "toFullName" })
      .where("fromParent.parentId = ?", call.fromId)
      .where("fromParent.kind & ? <> 0", parentKinds)
      .where("toParent.parentId = ?", call.toId)
      .where("toParent.kind & ? <> 0", parentKinds)
      .selectAll<PopupCall>({
        fromId: "calls.fromId",
        toId: "calls.toId",
        fromName: "fromFullName.fullName",
        toName: "toFullName.fullName",
      });
  };

  // sorted by client, which is the first column of the popup, so that the order is part of the model and
  // every front end shows the rows in the same order. Ties are broken on the server, so it is a total order
  // which doesn't depend on the order the rows came out of SQL.
  const labels = getPopupCalls()
    .map((popupCall) => ({
      client: { label: popupCall.fromName, nodeId: toNodeId(popupCall.fromId), type: nodeTypeOf(popupCall.fromId) },
      server: { label: popupCall.toName, nodeId: toNodeId(popupCall.toId), type: nodeTypeOf(popupCall.toId) },
    }))
    .sort((x, y) => compareOrdinal(x.client.label, y.client.label) || compareOrdinal(x.server.label, y.server.label));

  // every drawn edge is a bundle of calls, so there is always something one level down -- or, at a leaf, the call
  // itself. An empty popup means the calls have lost a level, not that the edge is unusual
  assert(
    labels.length > 0,
    `no calls one level down for ${call.fromNode.label} (${call.fromNode.type}) -> ${call.toNode.label} (${call.toNode.type})`
  );
  return labels;
};
