import type { AnyLeafType, RootNodeType } from "../contracts-ui";
import { NodeType } from "../contracts-ui";
import * as Id from "../id2";
import type { Sql, ViewType } from "../sql2";
import { assert } from "../utils";
import { Leafs, Top } from "./forest";
import type { NodeStates } from "./nodeStates";

export type MakeNodeTree = {
  rootNodeType: RootNodeType;
  leafType: AnyLeafType;
  top: Top;
  getLeafs: (nodeStates: NodeStates) => Leafs;
};

type TypeNames = { typeNames: Sql.TypeName[]; typeParents: [Id.AnyId, Id.AnyId][] };

type ViewOf = {
  top: Top;
  rootNodeType: RootNodeType;
  leafType: AnyLeafType;
  getTypeNames: (nodeStates: NodeStates) => TypeNames;
};

const createViewOf = (sqlTables: Sql.Tables, viewType: ViewType): ViewOf => {
  const viewOfCalls = (): ViewOf => {
    const assemblies = sqlTables.assemblies.selectAll();
    const top: Top = { groupItems: sqlTables.groups.selectAll(), rootItems: assemblies };
    const getTypeNames = (nodeStates: NodeStates): TypeNames => {
      const assemblyIds = assemblies
        .map((value) => value.id)
        .filter((id) => nodeStates.isExpandedId(Id.toBigAssemblyId(id), false));
      const typeNames = sqlTables.typeNames.selectWhereIn("assemblyId", assemblyIds);
      const typeParents = typeNames.map((typeName): [Id.AnyId, Id.AnyId] => [typeName.id, typeName.assemblyId]);
      return { typeNames, typeParents };
    };
    return { top, rootNodeType: NodeType.Assembly, leafType: NodeType.Method, getTypeNames };
  };

  const viewOfReferences = (): ViewOf => {
    const assemblies = sqlTables.assemblies.selectAll();
    const top: Top = { groupItems: sqlTables.groups.selectAll(), rootItems: assemblies };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const getTypeNames = (nodeStates: NodeStates): TypeNames => ({ typeNames: [], typeParents: [] });
    return { top, rootNodeType: NodeType.Assembly, leafType: NodeType.Assembly, getTypeNames };
  };

  switch (viewType) {
    case "calls":
      return viewOfCalls();
    case "references":
      return viewOfReferences();
  }
};

export const databaseNodeTree = (sqlTables: Sql.Tables, viewType: ViewType): MakeNodeTree => {
  const { top, rootNodeType, leafType, getTypeNames } = createViewOf(sqlTables, viewType);

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
    const expandedTypeIds = typeNames.map((value) => value.id).filter((id) => nodeStates.isExpandedId(id, false));
    const methodNames = sqlTables.methodNames.selectWhereIn("typeId", expandedTypeIds);
    const methodParents = methodNames.map((methodName): [Id.AnyId, Id.AnyId] => [methodName.id, methodName.typeId]);

    const parents = new Map<Id.AnyId, Id.AnyId>(typeParents.concat(methodParents));
    return { typeItems: typeNames, methodItems: methodNames, parentItems: parents };
  };

  return { rootNodeType, leafType, top, getLeafs };
};
