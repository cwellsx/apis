import type { AnyNodeType, Node, RootNodeType } from "../contracts-ui";
import { NodeType, textToNodeId } from "../contracts-ui";
import type { Id, Sql } from "../sql2";
import { assert } from "../utils";
import type { Leafs, Top } from "./forest";
import type { NodeState } from "./nodeState";
import type { ViewType } from "./viewType";

export type Database = {
  rootNodeType: RootNodeType;
  top: Top;
  getNodeStates: () => Map<Id.AnyId, NodeState>;
  getLeafs: (nodeStates: Map<Id.AnyId, NodeState>) => Leafs;
  setAnyNodeState: (id: Id.AnyId, nodeState: NodeState) => void;
};

export const createDatabase = (sqlTables: Sql.Tables, viewType: ViewType): Database => {
  const groupsTable = viewType == "assemblies" ? sqlTables.assemblyGroups : sqlTables.namespaceGroups;
  const rootsTable = viewType == "assemblies" ? sqlTables.assemblies : sqlTables.namespaces;
  const rootNodeType = viewType == "assemblies" ? NodeType.Assembly : NodeType.Namespace;

  const views = sqlTables.views.selectAll();
  const found = views.find((view) => view.viewType == viewType);
  assert(!!found);
  const viewId: Id.ViewId = found.id;

  const groups = groupsTable.selectAll();
  const roots = rootsTable.selectAll();
  const rootIds = roots.map((value) => value.id);

  type Numeric = number | bigint;
  type Item<TId extends Numeric> = { id: TId; name: string };
  const toNodesFromItems = <TId extends Numeric>(items: Item<TId>[], type: AnyNodeType): Node[] =>
    items.map((item) => {
      const text = item.id.toString();
      const nodeId = textToNodeId(text);
      return { nodeId, label: item.name, parent: null, type };
    });

  const top: Top = {
    groups: toNodesFromItems<number>(groups, NodeType.Group),
    roots: toNodesFromItems<number>(roots, rootNodeType),
  };

  const toBoolean = (b: Sql.Boolean): boolean => b == 1;
  const fromBoolean = (b: boolean): Sql.Boolean => (b ? 1 : 0);

  const getNodeStates = (): Map<Id.AnyId, NodeState> => {
    const viewStates: Sql.ViewState[] = sqlTables.viewStates.selectWhere({ viewId });
    return new Map<Id.AnyId, NodeState>(
      viewStates.map((viewState) => [
        viewState.id,
        { isHidden: toBoolean(viewState.isHidden), isExpanded: toBoolean(viewState.isExpanded) },
      ])
    );
  };

  const setAnyNodeState = (id: Id.AnyId, nodeState: NodeState): void => {
    if (!nodeState.isExpanded && !nodeState.isHidden) {
      //sqlTables.viewStates.selectOne
      // TODO
      return;
    }
    const viewState: Sql.ViewState = {
      viewId,
      id,
      isHidden: fromBoolean(!!nodeState.isHidden),
      isExpanded: fromBoolean(!!nodeState.isExpanded),
    };
    sqlTables.viewStates.upsert(viewState);
  };

  /*
  
  Two ways to implement this -- one way could be to use JOIN e.g. like this
  
  ```
  WITH ExpandedAssemblies AS (
    SELECT A.*
    FROM Assemblies A
    JOIN NodeStates S ON S.nodeId = A.id
    WHERE S.isExpanded = 1
  ),
  ExpandedTypes AS (
    SELECT T.*
    FROM Types T
    JOIN ExpandedAssemblies EA ON EA.id = T.assemblyId
    JOIN NodeStates S ON S.nodeId = T.id
    WHERE S.isExpanded = 1
  )
  SELECT M.*
  FROM Methods M
  JOIN ExpandedTypes ET ON ET.id = M.typeId;
  ```
  
  The problem with this is:
  
  - long JOIN chains
  - hard to debug or unit-test
  - difficult to evolve
  
  Instead, use the Map of NodeState instances:
  
  - good enough for small sets e.g. 100 instances
  - simple SqlTable API without JOIN
  
  */

  const getTypeNamesInAssemblies = (ids: NonNullable<Id.AssemblyId>[]): Sql.TypeName[] =>
    sqlTables.typeNames.selectWhereIn("assemblyId", ids);

  const getTypeNamesInNamespaces = (ids: NonNullable<Id.NamespaceId>[]): Sql.TypeName[] =>
    sqlTables.typeNames.selectWhereIn("namespaceId", ids);

  const getLeafs = (nodeStates: Map<Id.AnyId, NodeState>): Leafs => {
    const isExpanded = (id: Id.AnyId): boolean => nodeStates.get(id)?.isExpanded ?? false; // non-expanded by default
    const expandedRootIds = rootIds.filter(isExpanded);
    const typeNames =
      viewType == "assemblies"
        ? getTypeNamesInAssemblies(expandedRootIds as Id.AssemblyId[])
        : getTypeNamesInNamespaces(expandedRootIds as Id.NamespaceId[]);
    const expandedTypeIds = typeNames.map((value) => value.id).filter(isExpanded);
    const methodNames = sqlTables.methodNames.selectWhereIn("typeId", expandedTypeIds);

    const methodParents = methodNames.map((methodName): [string, string] => [
      methodName.id.toString(),
      methodName.typeId.toString(),
    ]);
    const typeParents = typeNames.map((typeName): [string, string] => [
      typeName.id.toString(),
      (viewType == "assemblies" ? typeName.assemblyId : typeName.namespaceId!).toString(),
    ]);
    const parents = new Map<string, string>(typeParents.concat(methodParents));

    return {
      typeNames: toNodesFromItems<bigint>(typeNames, NodeType.Type),
      methodNames: toNodesFromItems<bigint>(methodNames, NodeType.Method),
      parents,
    };
  };

  return { rootNodeType, top, getNodeStates, setAnyNodeState, getLeafs };
};
