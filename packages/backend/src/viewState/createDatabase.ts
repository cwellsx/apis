import type { AnyLeafType, RootNodeType } from "../contracts-ui";
import { NodeType } from "../contracts-ui";
import * as Id from "../id2";
import type { Sql, ViewType } from "../sql2";
import { assert } from "../utils";
import type { NodeState } from "./nodeStates";
import { fromBoolean, NodeStates } from "./nodeStates";

// not exported
// - similar to Top and Leafs exported from forest.ts
// - converted from Item to Node by ViewState
type Top = { groups: Item<number>[]; roots: Item<number>[] };
type Leafs = { typeNames: Item<bigint>[]; methodNames: Item<bigint>[]; parents: Map<Id.AnyId, Id.AnyId> };

export type Numeric = number | bigint;
export type Item<TId extends Numeric> = { id: TId; name: string };

export type Database = {
  rootNodeType: RootNodeType;
  leafType: AnyLeafType;
  top: Top;
  getNodeStates: () => NodeStates;
  getLeafs: (nodeStates: NodeStates) => Leafs;
  setAnyNodeState: (id: Id.AnyBigId, nodeState: NodeState) => void;
};

export const createDatabase = (sqlTables: Sql.Tables, viewType: ViewType): Database => {
  type TypeNames = { typeNames: Sql.TypeName[]; typeParents: [Id.AnyId, Id.AnyId][] };
  type ViewOf = {
    top: Top;
    rootNodeType: RootNodeType;
    leafType: AnyLeafType;
    getTypeNames: (nodeStates: NodeStates) => TypeNames;
  };

  const viewOfAssemblies = (): ViewOf => {
    const assemblies = sqlTables.assemblies.selectAll();
    const top: Top = { groups: sqlTables.assemblyGroups.selectAll(), roots: assemblies };
    const getTypeNames = (nodeStates: NodeStates): TypeNames => {
      const assemblyIds = assemblies
        .map((value) => value.id)
        .filter((id) => nodeStates.showsChildren(Id.toBigAssemblyId(id), false));
      const typeNames = sqlTables.typeNames.selectWhereIn("assemblyId", assemblyIds);
      const typeParents = typeNames.map((typeName): [Id.AnyId, Id.AnyId] => [typeName.id, typeName.assemblyId]);
      return { typeNames, typeParents };
    };
    return { top, rootNodeType: NodeType.Assembly, leafType: NodeType.Method, getTypeNames };
  };

  const viewOfNamespaces = (): ViewOf => {
    const namespaces = sqlTables.namespaces.selectAll();
    const top: Top = { groups: sqlTables.namespaceGroups.selectAll(), roots: namespaces };
    const getTypeNames = (nodeStates: NodeStates): TypeNames => {
      const namespaceIds = namespaces
        .map((value) => value.id)
        .filter((id) => nodeStates.showsChildren(Id.toBigNamespaceId(id), false));
      const typeNames = sqlTables.typeNames.selectWhereIn("namespaceId", namespaceIds);
      const typeParents = typeNames.map((typeName): [Id.AnyId, Id.AnyId] => [typeName.id, typeName.namespaceId!]);
      return { typeNames, typeParents };
    };
    return { top, rootNodeType: NodeType.Namespace, leafType: NodeType.Method, getTypeNames };
  };

  const viewOfReferences = (): ViewOf => {
    const assemblies = sqlTables.assemblies.selectAll();
    const top: Top = { groups: sqlTables.assemblyGroups.selectAll(), roots: assemblies };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const getTypeNames = (nodeStates: NodeStates): TypeNames => ({ typeNames: [], typeParents: [] });
    return { top, rootNodeType: NodeType.Assembly, leafType: NodeType.Assembly, getTypeNames };
  };

  const createViewOf = (): ViewOf => {
    switch (viewType) {
      case "assemblies":
        return viewOfAssemblies();
      case "namespaces":
        return viewOfNamespaces();
      case "references":
        return viewOfReferences();
    }
  };

  const { top, rootNodeType, leafType, getTypeNames } = createViewOf();

  const views = sqlTables.views.selectAll();
  const found = views.find((view) => view.viewType == viewType);
  assert(!!found);
  const viewId: Id.ViewId = found.id;

  const getNodeStates = (): NodeStates => {
    const viewStates: Sql.ViewState[] = sqlTables.viewStates.selectWhere({ viewId });
    return new NodeStates(viewStates);
  };

  const setAnyNodeState = (id: Id.AnyBigId, nodeState: NodeState): void => {
    if (!nodeState.isExpanded && !nodeState.isHidden) {
      // TODO -- implement DELETE
      // return;
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

  const getLeafs = (nodeStates: NodeStates): Leafs => {
    assert(leafType == NodeType.Method);

    // get types
    const { typeNames, typeParents } = getTypeNames(nodeStates);

    // get methods
    const expandedTypeIds = typeNames.map((value) => value.id).filter((id) => nodeStates.showsChildren(id, false));
    const methodNames = sqlTables.methodNames.selectWhereIn("typeId", expandedTypeIds);
    const methodParents = methodNames.map((methodName): [Id.AnyId, Id.AnyId] => [methodName.id, methodName.typeId]);

    const parents = new Map<Id.AnyId, Id.AnyId>(typeParents.concat(methodParents));
    return { typeNames, methodNames, parents };
  };

  return { rootNodeType, leafType, top, getNodeStates, setAnyNodeState, getLeafs };
};
