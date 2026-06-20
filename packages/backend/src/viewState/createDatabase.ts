import type { RootNodeType } from "../contracts-ui";
import { NodeType } from "../contracts-ui";
import type * as Id from "../id2";
import type { Sql } from "../sql2";
import { assert } from "../utils";
import type { NodeState } from "./nodeState";

export type ViewType = Sql.ViewType;

export type Numeric = number | bigint;
export type Item<TId extends Numeric> = { id: TId; name: string };

// not exported
// - similar to Top and Leafs exported from forest.ts
// - converted from Item to Node by ViewState
type Top = { groups: Item<number>[]; roots: Item<number>[] };
type Leafs = { typeNames: Item<bigint>[]; methodNames: Item<bigint>[]; parents: Map<Id.AnyId, Id.AnyId> };

export type Database = {
  rootNodeType: RootNodeType;
  top: Top;
  getNodeStates: () => Map<Id.AnyId, NodeState>;
  getLeafs: (nodeStates: Map<Id.AnyId, NodeState>) => Leafs;
  setAnyNodeState: (id: Id.AnyId, nodeState: NodeState) => void;
};

export const createDatabase = (sqlTables: Sql.Tables, viewType: ViewType): Database => {
  type IsExpanded = (id: Id.AnyId) => boolean;
  type TypeNames = { typeNames: Sql.TypeName[]; typeParents: [Id.AnyId, Id.AnyId][] };
  type ViewOf = { top: Top; rootNodeType: RootNodeType; getTypeNames: (isExpanded: IsExpanded) => TypeNames };

  const viewOfAssemblies = (): ViewOf => {
    const assemblies = sqlTables.assemblies.selectAll();
    const top: Top = { groups: sqlTables.assemblyGroups.selectAll(), roots: assemblies };
    const getTypeNames = (isExpanded: IsExpanded): TypeNames => {
      const typeNames = sqlTables.typeNames.selectWhereIn(
        "assemblyId",
        assemblies.map((value) => value.id).filter(isExpanded)
      );
      const typeParents = typeNames.map((typeName): [Id.AnyId, Id.AnyId] => [typeName.id, typeName.assemblyId]);
      return { typeNames, typeParents };
    };
    return { top, rootNodeType: NodeType.Assembly, getTypeNames };
  };

  const viewOfNamespaces = (): ViewOf => {
    const namespaces = sqlTables.namespaces.selectAll();
    const top: Top = { groups: sqlTables.namespaceGroups.selectAll(), roots: namespaces };
    const getTypeNames = (isExpanded: IsExpanded): TypeNames => {
      const typeNames = sqlTables.typeNames.selectWhereIn(
        "namespaceId",
        namespaces.map((value) => value.id).filter(isExpanded)
      );
      const typeParents = typeNames.map((typeName): [Id.AnyId, Id.AnyId] => [typeName.id, typeName.namespaceId!]);
      return { typeNames, typeParents };
    };
    return { top, rootNodeType: NodeType.Namespace, getTypeNames };
  };

  const viewOfReferences = (): ViewOf => {
    const assemblies = sqlTables.assemblies.selectAll();
    const top: Top = { groups: sqlTables.assemblyGroups.selectAll(), roots: assemblies };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const getTypeNames = (isExpanded: IsExpanded): TypeNames => ({ typeNames: [], typeParents: [] });
    return { top, rootNodeType: NodeType.Assembly, getTypeNames };
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

  const { top, rootNodeType, getTypeNames } = createViewOf();

  const views = sqlTables.views.selectAll();
  const found = views.find((view) => view.viewType == viewType);
  assert(!!found);
  const viewId: Id.ViewId = found.id;

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

  const getLeafs = (nodeStates: Map<Id.AnyId, NodeState>): Leafs => {
    const isExpanded = (id: Id.AnyId): boolean => nodeStates.get(id)?.isExpanded ?? false; // non-expanded by default
    const { typeNames, typeParents } = getTypeNames(isExpanded);

    const expandedTypeIds = typeNames.map((value) => value.id).filter(isExpanded);
    const methodNames = sqlTables.methodNames.selectWhereIn("typeId", expandedTypeIds);
    const methodParents = methodNames.map((methodName): [Id.AnyId, Id.AnyId] => [methodName.id, methodName.typeId]);

    const parents = new Map<Id.AnyId, Id.AnyId>(typeParents.concat(methodParents));
    return { typeNames, methodNames, parents };
  };

  return { rootNodeType, top, getNodeStates, setAnyNodeState, getLeafs };
};
