import type { AnyNodeType, Node } from "../contracts-ui";
import { NodeType, textToNodeId } from "../contracts-ui";
import { Id, Sql } from "../sql2";
import { assert } from "../utils";
import type { ViewType } from "./viewType";

export type Database = { groups: Node[]; roots: Node[]; viewId: Id.ViewId };

export const createDatabase = (sqlTables: Sql.Tables, viewType: ViewType): Database => {
  const groupsTable = viewType == "assemblies" ? sqlTables.assemblyGroups : sqlTables.namespaceGroups;
  const rootsTable = viewType == "assemblies" ? sqlTables.assemblies : sqlTables.namespaces;
  const rootNodeType = viewType == "assemblies" ? NodeType.Assembly : NodeType.Namespace;

  const views = sqlTables.views.selectAll();
  const found = views.find((view) => view.viewType == viewType);
  assert(!!found);

  type Item<T> = { id: T; name: string };

  const getTopItems = (items: Item<number>[], type: AnyNodeType): Node[] =>
    items.map((item) => {
      const text = item.id.toString();
      const nodeId = textToNodeId(text);
      return { nodeId, label: item.name, parent: null, type };
    });

  return {
    groups: getTopItems(groupsTable.selectAll(), NodeType.Group),
    roots: getTopItems(rootsTable.selectAll(), rootNodeType),
    viewId: found.id,
  };
};
