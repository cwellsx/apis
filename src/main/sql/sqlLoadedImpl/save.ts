import type { Reflected } from "../../loaded";
import { badTypeInfo, namedTypeInfo, validateTypeInfo } from "../../loaded";
import { Tables } from "./tables";

import { log } from "../../log";
import { uniqueStrings } from "../../shared-types";

import type { CallColumns, ErrorColumns, LocalsTypeColumns } from "./columns";
import { flattenCompilerMethods } from "./compilerMethods";
import { flattenGoodTypeInfo } from "./flattenGoodTypeInfo";
import { flattenMethodDictionary } from "./flattenMethodDictionary";
import { flattenNamedTypeInfo } from "./flattenNamedTypeInfo";
import { getMethodTypeId, GetTypeId } from "./getMethodTypeId";
import { getTypeAndMethodNames } from "./getTypeAndMethodNames";

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

  for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
    const allTypeInfo = validateTypeInfo(assemblyInfo.types);

    // BadTypeInfo[]
    const badTypeInfos = badTypeInfo(allTypeInfo);
    if (badTypeInfos.length) {
      table.error.insert({ assemblyName, badTypeInfos, badMethodInfos: [] });
    }

    // GoodTypeInfo[]
    const { typeColumns, memberColumns, methodNameColumns } = flattenGoodTypeInfo(assemblyName, allTypeInfo.good);
    table.type.insertMany(typeColumns);
    table.member.insertMany(memberColumns);
    table.methodName.insertMany(methodNameColumns);

    // NamedTypeInfo[]
    const { declaringTypeColumns, typeNameColumns } = flattenNamedTypeInfo(assemblyName, namedTypeInfo(allTypeInfo));
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
  }

  log("save reflected.assemblyMethods");

  const getTypeId: GetTypeId = getMethodTypeId(table);

  const allCallColumns: CallColumns[] = [];
  const allLocalsTypeColumns: LocalsTypeColumns[] = [];

  for (const [assemblyName, methodDictionary] of Object.entries(reflected.assemblyMethods)) {
    const { callColumns, methodColumns, badMethodInfos, localsTypeColumns } = flattenMethodDictionary(
      assemblyName,
      methodDictionary,
      getTypeId
    );

    // => errorsTable
    if (badMethodInfos.length) {
      const found = table.error.selectOne({ assemblyName });
      const columns: ErrorColumns = {
        assemblyName,
        badTypeInfos: found?.badTypeInfos ?? [],
        badMethodInfos,
      };
      if (found) table.error.update(columns);
      else table.error.insert(columns);
    }

    // => MethodColumns[]
    table.method.insertMany(methodColumns);

    // => CallColumns[]
    table.call.insertMany(callColumns);
    // => LocalsTypeColumns[]
    table.localsType.insertMany(localsTypeColumns);

    allCallColumns.push(...callColumns);
    allLocalsTypeColumns.push(...localsTypeColumns);
  }

  const compilerMethodColumns = flattenCompilerMethods(
    reflected,
    allCallColumns,
    allLocalsTypeColumns,
    allCompilerTypes,
    getTypeAndMethodNames(table)
  );
  table.compilerMethod.insertMany(compilerMethodColumns);
};
