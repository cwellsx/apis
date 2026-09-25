import { Sql } from "../sql2";

export const toBoolean = (b: Sql.Boolean): boolean => b == 1;
export const fromBoolean = (b: boolean): Sql.Boolean => (b ? 1 : 0);
