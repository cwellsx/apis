import { Sql } from "../sql2";
import { createDatabase } from "./createDatabase";
import { getTrunk } from "./getTrunk";
import type { Node, NodeId, NodeState, ViewState, ViewType } from "./types";

export const createViewState = (sqlTables: Sql.Tables, viewType: ViewType): ViewState => {
  const database = createDatabase(sqlTables, viewType);

  const trunk = getTrunk(database);

  const getTree = (): Node[] => trunk;

  const setNodeState = (id: NodeId, nodeState: NodeState): void => {};

  return { getTree, setNodeState };
};
