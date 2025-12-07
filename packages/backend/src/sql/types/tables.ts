import { SqlTable } from "sqlio";

import * as Columns from "./columns";

export type Tables = {
  assembly: SqlTable<Columns.AssemblyColumns>;
  type: SqlTable<Columns.TypeColumns>;
  member: SqlTable<Columns.MemberColumns>;
  method: SqlTable<Columns.MethodColumns>;
  call: SqlTable<Columns.CallColumns>;
  typeName: SqlTable<Columns.TypeNameColumns>;
  methodName: SqlTable<Columns.MethodNameColumns>;
  graphFilter: SqlTable<Columns.GraphFilterColumns>;
  declaringType: SqlTable<Columns.DeclaringTypeColumns>;
  compilerMethod: SqlTable<Columns.CompilerMethodColumns>;
  localsType: SqlTable<Columns.LocalsTypeColumns>;
  deleteAll: () => void;
};
