import type { Reflected } from "../../contracts-dotnet";
import { log, uniqueStrings } from "../../utils";
import { Columns, Tables } from "../types";
import { flattenMethodDictionary } from "./flattenMethodDictionary";
import { flattenTypeInfo } from "./flattenTypeInfo";
import { getCompilerMethodColumns } from "./getCompilerMethodColumns";
import { getMethodTypeId, GetTypeId } from "./getMethodTypeId";

/*
  Save the namespace in CallColumns, because that is:
  - Complicated to calculate
  - Needed for select by open namespace
  - Not in the Reflected JSON because it would increase the size of the JSON and the complexity of the C#

  Therefore writing CallColumns requires MapMethodTypes data, but CallColumns cannot be sorted by assembly,
  so do all reflected.assemblies to get MapMethodTypes before doing any reflected.assemblyMethods
*/

export const save = (reflected: Reflected, table: Tables): void => {
  log("save reflected.assemblies");

  const allCompilerTypes = new Map<string, Set<number>>();
  const allCompilerMethods = new Map<string, Set<number>>();

  for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
    // TypeInfo[]
    const { typeColumns, memberColumns, methodNameColumns, declaringTypeColumns, typeNameColumns } = flattenTypeInfo(
      assemblyName,
      assemblyInfo.types
    );
    table.type.insertMany(typeColumns);
    table.member.insertMany(memberColumns);
    table.methodName.insertMany(methodNameColumns);
    table.declaringType.insertMany(declaringTypeColumns);
    table.typeName.insertMany(typeNameColumns);

    // referencedAssemblies[]
    table.assembly.insert({
      assemblyName,
      // uniqueStrings because I've unusually seen an assembly return two references to the same assembly name
      references: uniqueStrings(assemblyInfo.referencedAssemblies),
    });

    // allCompilerTypes
    allCompilerTypes.set(
      assemblyName,
      new Set<number>(typeNameColumns.filter((column) => column.isCompilerType).map((column) => column.metadataToken))
    );
    allCompilerMethods.set(
      assemblyName,
      new Set<number>(
        methodNameColumns.filter((column) => column.isCompilerMethod).map((column) => column.metadataToken)
      )
    );
  }

  log("save reflected.assemblyMethods");

  const getTypeId: GetTypeId = getMethodTypeId(table);

  const allCallColumns: Columns.CallColumns[] = [];
  const allLocalsTypeColumns: Columns.LocalsTypeColumns[] = [];

  for (const [assemblyName, methodDictionary] of Object.entries(reflected.assemblyMethods)) {
    const { callColumns, methodColumns, localsTypeColumns } = flattenMethodDictionary(
      assemblyName,
      methodDictionary,
      getTypeId
    );

    // => MethodColumns[]
    table.method.insertMany(methodColumns);

    // => CallColumns[]
    table.call.insertMany(callColumns);
    // => LocalsTypeColumns[]
    table.localsType.insertMany(localsTypeColumns);

    allCallColumns.push(...callColumns);
    allLocalsTypeColumns.push(...localsTypeColumns);
  }

  const compilerMethodColumns = getCompilerMethodColumns(reflected.compilerMethods, getTypeId);
  // const compilerMethodColumns = flattenCompilerMethods(
  //   reflected,
  //   allCallColumns,
  //   allLocalsTypeColumns,
  //   allCompilerTypes,
  //   allCompilerMethods,
  //   getTypeAndMethodNames(table)
  // );
  table.compilerMethod.insertMany(compilerMethodColumns);
};
