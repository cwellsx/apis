import { getMapped, getOrSet, mapOfMaps, remove } from "../../shared-types";
import { CallColumns, WantedTypeColumns } from "./columns";
import { Tables } from "./tables";

export type SetWantedMethods = (assemblyName: string, callColumns: CallColumns[]) => void;

const addError = (wantedType: WantedTypeColumns, error: string): void => {
  let found = wantedType.errors;
  if (!found) {
    found = [];
    wantedType.errors = found;
  }
  if (!found.includes(error)) found.push(error);
};

const removeError = (wantedType: WantedTypeColumns, error: string): void => {
  if (!wantedType.errors) return;
  remove(wantedType.errors, error);
  if (!wantedType.errors.length) wantedType.errors = null;
};

const setWantedMethod = (wantedType: WantedTypeColumns, fromMethodId: number): void => {
  if (!wantedType.wantedMethod) wantedType.wantedMethod = fromMethodId;
  else if (wantedType.wantedMethod != fromMethodId) addError(wantedType, "Expected call from only one method");
};

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

  const setWantedMethods: SetWantedMethods = (assemblyName: string, assemblyCallColumns: CallColumns[]): void => {
    const wantedTypes = assemblyWantedTypes.get(assemblyName);
    if (!wantedTypes) return;

    const siblingTypes = new Map<number, Set<number>>();

    // iterate calls to find methods from the declaringType which call this type
    assemblyCallColumns.forEach((callColumns) => {
      if (callColumns.fromTypeId === callColumns.toTypeId) return;
      const wantedType = wantedTypes.get(callColumns.toTypeId);
      if (!wantedType) return;

      wantedType.calledFrom.push({ fromMethodId: callColumns.fromMethodId, toMethodId: callColumns.toMethodId });

      const toDeclaringType = getMapped(assemblyDeclaringTypes, assemblyName, wantedType.nestedType);
      const fromDeclaringType = assemblyDeclaringTypes.get(assemblyName)?.get(callColumns.fromTypeId);
      const isFromDeclaringType = callColumns.fromTypeId === toDeclaringType;
      const isFromSiblingType = fromDeclaringType == toDeclaringType;

      if (!isFromDeclaringType && !isFromSiblingType)
        addError(wantedType, "Expected call from declaringType or from sibling type");

      if (isFromSiblingType) {
        const found = getOrSet(siblingTypes, wantedType.nestedType, () => new Set<number>());
        found.add(callColumns.fromTypeId);
        return;
      }

      setWantedMethod(wantedType, callColumns.fromMethodId);
    });

    const setFromSiblingTypes = (wantedType: WantedTypeColumns): boolean => {
      if (wantedType.wantedMethod) return false;
      const set = siblingTypes.get(wantedType.nestedType);
      if (!set) {
        // no sibling types
        addError(wantedType, "No callers");
        return false;
      }

      const errorSiblingNotCompilerGenerated = "Sibling not compiler-generated";
      const errorSiblingHasNoCallers = "No callers (with siblings)";

      [...set.values()].forEach((siblingId) => {
        const siblingType = wantedTypes.get(siblingId);
        if (!siblingType) {
          // this is theoretically possible
          // if it happens then we need to find which method calls this non-compiler-generated type
          addError(wantedType, errorSiblingNotCompilerGenerated);
          return;
        }
        if (!siblingType.wantedMethod) addError(wantedType, errorSiblingHasNoCallers);
        else setWantedMethod(wantedType, siblingType.wantedMethod);
      });

      if (!wantedType.wantedMethod) return false;
      removeError(wantedType, errorSiblingNotCompilerGenerated);
      removeError(wantedType, errorSiblingHasNoCallers);
      return true;
    };

    // if there aren't any calls from methods of the declaring type, look for any calls from sibling types
    while ([...wantedTypes.values()].some((wantedType) => setFromSiblingTypes(wantedType)));
  };

  const updateWantedTypes = (): void => {
    table.wantedType.deleteAll();
    table.wantedType.insertMany(allWantedTypes);
  };

  return { setWantedMethods, updateWantedTypes };
};
