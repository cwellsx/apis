import type { Sql } from "../sql2";
import { QueryApi } from "./queryApi";

export const createQueryApi = (sqlTables: Sql.Tables): QueryApi => {
  // const toDetailedMethod = (methodDetails: Sql.MethodDetails): DetailedMethod => {
  //   const methodName = methodDetails.methodName;
  //   const {id, typeId, returnType, name} = methodName;
  //   return {
  //     title:{
  //        methodMember: name,
  //   declaringType: getOrThrow(fullNames, typeId)
  //   assemblyName: string;
  //     },
  //     asText: methodDetails.asText,
  //     detailType: "methodDetails"
  //   };
  // }
  //   return {toDetailedMethod};
  return { tbd: "tbd" };
};
