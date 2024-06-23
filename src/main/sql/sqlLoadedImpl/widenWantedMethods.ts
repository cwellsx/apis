import { methodNodeId, typeNodeId } from "../../../shared-types";
import { logJson } from "../../log";
import { getMapped, getOrSet, mapOfMaps } from "../../shared-types";
import { CallColumns } from "./columns";
import { getTypeAndMethodNames } from "./getTypeAndMethodNames";
import { Tables } from "./tables";

export type SetWantedMethods = (assemblyName: string, callColumns: CallColumns[]) => void;

export const widenWantedMethods = (
  table: Tables
): { setWantedMethods: SetWantedMethods; updateWantedTypes: () => void } => {
  const allWantedTypes = table.wantedType.selectAll();
  const assemblyWantedTypes = mapOfMaps(
    allWantedTypes.map((wantedType) => [wantedType.assemblyName, wantedType.nestedType, wantedType])
  );

  const allDeclaringTypes = table.declaringType.selectAll();
  const assemblyDeclaringTypes = mapOfMaps(
    allDeclaringTypes.map((columns) => [columns.assemblyName, columns.nestedType, columns.declaringType])
  );

  const { getTypeName, getMethodName } = getTypeAndMethodNames(table);

  type Error = { message: string; from?: string; to?: string; extra?: string };
  const errors: Error[] = [];
  const addError = (error: Error): void => {
    logJson(error.message, error);
    errors.push(error);
  };

  type GetExtra = () => string;

  const assertCallColumns = (b: boolean, message: string, callColumns: CallColumns, getExtra: GetExtra) => {
    if (b) return;
    const fromType = getTypeName(typeNodeId(callColumns.fromAssemblyName, callColumns.fromTypeId));
    const fromMethod = getMethodName(methodNodeId(callColumns.fromAssemblyName, callColumns.fromMethodId));
    const from = `${fromType}.${fromMethod}`;
    const toType = getTypeName(typeNodeId(callColumns.toAssemblyName, callColumns.toTypeId));
    const toMethod = getMethodName(methodNodeId(callColumns.toAssemblyName, callColumns.toMethodId));
    const to = `${toType}.${toMethod}`;
    addError({ message, extra: getExtra(), from, to });
  };

  const assert = (b: boolean, message: string, getExtra: GetExtra) => {
    if (b) return;
    addError({ message, extra: getExtra() });
  };

  const setWantedMethods: SetWantedMethods = (assemblyName: string, assemblyCallColumns: CallColumns[]): void => {
    const wantedTypes = assemblyWantedTypes.get(assemblyName);
    if (!wantedTypes) return;

    const siblingTypes = new Map<number, Set<number>>();

    assemblyCallColumns.forEach((callColumns) => {
      if (callColumns.fromTypeId === callColumns.toTypeId) return;
      const wantedType = wantedTypes.get(callColumns.toTypeId);
      if (!wantedType) return;
      if (wantedType.wantedMethod === callColumns.fromMethodId) return;

      const toDeclaringType = getMapped(assemblyDeclaringTypes, assemblyName, wantedType.nestedType);
      const fromDeclaringType = assemblyDeclaringTypes.get(assemblyName)?.get(callColumns.fromTypeId);
      const isFromContainingMethod = callColumns.fromTypeId === toDeclaringType;
      const isFromSiblingType = fromDeclaringType == toDeclaringType;

      assertCallColumns(isFromContainingMethod || isFromSiblingType, "unexpected declaringType", callColumns, () =>
        getTypeName(typeNodeId(assemblyName, toDeclaringType))
      );

      if (isFromSiblingType) {
        const found = getOrSet(siblingTypes, wantedType.nestedType, () => new Set<number>());
        found.add(callColumns.fromTypeId);
        return;
      }

      assertCallColumns(!wantedType.wantedMethod, "duplicate wantedMethod", callColumns, () =>
        getMethodName(methodNodeId(assemblyName, wantedType.wantedMethod))
      );
      wantedType.wantedMethod = callColumns.fromMethodId;
    });

    const fromSiblingType = (nestedType: number): number | string => {
      const set = siblingTypes.get(nestedType);
      if (!set) return "no sibling types";
      let isSiblingNotCompilerGenerated = false;
      let isSiblingUnknownWantedMethod = false;

      let result = 0;
      [...set.values()].forEach((id) => {
        const wantedType = wantedTypes.get(id);
        if (!wantedType) {
          isSiblingNotCompilerGenerated = true;
          return;
        }
        if (!wantedType.wantedMethod) {
          isSiblingUnknownWantedMethod = true;
          return;
        }
        if (result && result !== wantedType.wantedMethod) return "several sibling methods";
        result = wantedType.wantedMethod;
      });
      if (result) return result;
      return isSiblingNotCompilerGenerated && isSiblingUnknownWantedMethod
        ? "both sibling error"
        : isSiblingNotCompilerGenerated
        ? "sibling not compiler-generated"
        : "sibling unknown method";
    };

    [...wantedTypes.values()].forEach((wantedType) => {
      if (wantedType.wantedMethod) return;
      // if we've only been called by sibling types then hope that one of those types knows the containing method
      const result = fromSiblingType(wantedType.nestedType);
      if (typeof result === "number") {
        wantedType.wantedMethod = result;
        return;
      }
      assert(false, `missing wantedMethod: ${result}`, () =>
        getTypeName(typeNodeId(assemblyName, wantedType.nestedType))
      );
    });
  };

  const updateWantedTypes = (): void => {
    table.wantedType.deleteAll();
    table.wantedType.insertMany(allWantedTypes);
  };

  return { setWantedMethods, updateWantedTypes };
};
