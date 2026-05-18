import { Id, Sql } from "../sql2";
import { assert } from "../utils";
import type { NodeId, NodeItem, NodeType, ViewType } from "./types";

export type Database = { groups: NodeItem[]; roots: NodeItem[]; viewId: Id.ViewId; nodeType: NodeType };

export const createDatabase = (sqlTables: Sql.Tables, viewType: ViewType): Database => {
  const groupsTable = viewType == "assemblies" ? sqlTables.assemblyGroups : sqlTables.namespaceGroups;
  const rootsTable = viewType == "assemblies" ? sqlTables.assemblies : sqlTables.namespaces;
  const nodeType: NodeType = viewType == "assemblies" ? "a" : "n";

  const views = sqlTables.views.selectAll();
  const found = views.find((view) => view.viewType == viewType);
  assert(!!found);

  type Item = { id: NodeId; name: string };

  const getNodeItems = (items: Item[], type: NodeType): NodeItem[] =>
    items.map((item) => ({ id: item.id, label: item.name, type }));

  return {
    groups: getNodeItems(groupsTable.selectAll(), "g"),
    roots: getNodeItems(rootsTable.selectAll(), "a"),
    viewId: found.id,
    nodeType,
  };
};
