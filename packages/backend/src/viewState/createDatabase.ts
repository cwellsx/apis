import { Id, Sql } from "../sql2";
import { assert } from "../utils";
import type { NodeId, ViewType } from "./types";

export type Item = { id: NodeId; name: string };
export type ItemState = { id: NodeId; isHidden: boolean; isExpanded: boolean };

export type Database = { groups: Item[]; roots: Item[]; viewId: Id.ViewId };

export const createDatabase = (sqlTables: Sql.Tables, viewType: ViewType): Database => {
  const groupsTable = viewType == "assemblies" ? sqlTables.assemblyGroups : sqlTables.namespaceGroups;
  const rootsTable = viewType == "assemblies" ? sqlTables.assemblies : sqlTables.namespaces;

  const views = sqlTables.views.selectAll();
  const found = views.find((view) => view.viewType == viewType);
  assert(!!found);

  return { groups: groupsTable.selectAll(), roots: rootsTable.selectAll(), viewId: found.id };
};
