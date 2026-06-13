import { assert, getOrThrow } from "../utils";
import { isGenericParamId, isMethodDefId, isTypeDefId } from "./idTest";
import type * as Id from "./idTypes";
import {
  Assembly,
  FullName,
  GenericParam,
  MethodName,
  MethodSpec,
  Namespace,
  SignatureType,
  TypeName,
  TypeSpec,
} from "./schema";

type Tables = {
  assemblies: Assembly[];
  namespaces: Namespace[];
  genericParams: GenericParam[];
  signatureTypes: SignatureType[];
  typeNames: TypeName[];
  typeSpecs: TypeSpec[];
  methodNames: MethodName[];
  methodSpecs: MethodSpec[];
};

const mapArrays = <TKey, TValue, T extends { ownerId: TKey; seqno: number }>(
  rows: T[],
  getValue: (row: T) => TValue
): Map<TKey, TValue[]> => {
  const result = new Map<TKey, TValue[]>();
  rows.forEach((row) => {
    const ownerId = row.ownerId;
    let values = result.get(ownerId);
    if (!values) {
      values = [];
      result.set(ownerId, values);
    }
    assert(values.length === row.seqno);
    values.push(getValue(row));
  });
  return result;
};

export const getFullNames = (tables: Tables): FullName[] => {
  const assemblies = tables.assemblies.map((value) => ({ id: value.id, fullName: value.name }));
  const namespaces = tables.namespaces.map((value) => ({ id: value.id, fullName: value.name }));

  const mapNamespaces = new Map<Id.NamespaceId, string>(namespaces.map((value) => [value.id, value.fullName]));

  const ownedGenericParamArrays = mapArrays<Id.AnyDefId, string, GenericParam>(tables.genericParams, (row) => row.name);
  const ownedSignatureTypeArrays = mapArrays<Id.AnyOwnerId, Id.TypeId, SignatureType>(
    tables.signatureTypes,
    (row) => row.argumentId
  );

  const allGenericParameters = new Map<Id.GenericParamId, string>(
    tables.genericParams.map((value) => [value.id, value.name])
  );

  const makeNameResolver = <TKey extends bigint, TValue extends object>(
    values: TValue[],
    getKey: (value: TValue) => TKey,
    compute: (value: TValue, resolve: (arg: TKey | TValue) => string) => string
  ): Map<TKey, string> => {
    // sorting typeNames so that declaringType is earlier than its nested types would be complicated,
    // because it's potentially a multi-level tree, so instead calculate the names on-demand
    const mapValues = new Map<TKey, TValue>(values.map((value) => [getKey(value), value]));
    const mapFullNames = new Map<TKey, string>();

    const resolve = (arg: TKey | TValue): string => {
      const key = typeof arg === "object" ? getKey(arg) : arg;
      let fullName = mapFullNames.get(key);
      if (fullName) return fullName;
      const value = typeof arg === "object" ? arg : getOrThrow(mapValues, arg);

      fullName = compute(value, resolve);
      mapFullNames.set(key, fullName);
      return fullName;
    };

    values.forEach((value) => resolve(value));

    return mapFullNames;
  };

  const ownedGenericParamArray = (id: Id.AnyDefId): string => {
    const genericParams = ownedGenericParamArrays.get(id);
    return genericParams ? `<${genericParams.join(",")}>` : "";
  };

  const ownedSignatureTypeArray = (id: Id.AnyOwnerId, getTypeIdName: (typeId: Id.TypeId) => string): string => {
    const signatureTypes = ownedSignatureTypeArrays.get(id);
    if (!signatureTypes) return "";
    const joined = signatureTypes.map((value) => getTypeIdName(value)).join(",");
    return isMethodDefId(id) ? `(${joined})` : `<${joined}>`;
  };

  const mapTypeDefFullNames = makeNameResolver(
    tables.typeNames,
    (value) => value.id,
    (value, resolve) =>
      (value.declaringTypeId
        ? `${resolve(value.declaringTypeId)}.${value.name}` // recurse
        : value.namespaceId
          ? `${getOrThrow(mapNamespaces, value.namespaceId)}.${value.name}`
          : value.name) + ownedGenericParamArray(value.id)
  );

  const makeGetTypeIdName = (resolve: (id: Id.TypeSpecId) => string) => {
    const getTypeIdName = (id: Id.TypeId): string =>
      isTypeDefId(id)
        ? getOrThrow(mapTypeDefFullNames, id)
        : isGenericParamId(id)
          ? getOrThrow(allGenericParameters, id)
          : resolve(id);
    return getTypeIdName;
  };

  const mapTypeRefFullNames = makeNameResolver(
    tables.typeSpecs,
    (value) => value.id,
    (value, resolve) => {
      const getTypeIdName = makeGetTypeIdName(resolve);
      const resolvedName = getTypeIdName(value.resolvedId);
      const typeArguments = ownedSignatureTypeArray(value.id, getTypeIdName);
      const suffix = value.suffix ?? "";
      return `${resolvedName}${typeArguments}${suffix}`;
    }
  );

  const mapMethodDefFullNames = makeNameResolver(
    tables.methodNames,
    (value) => value.id,
    (value) => {
      const getTypeRefId = (id: Id.TypeSpecId): string => getOrThrow(mapTypeRefFullNames, id);
      const getTypeIdName = makeGetTypeIdName(getTypeRefId);
      const returnType = getTypeIdName(value.returnTypeId);
      const genericParameters = ownedGenericParamArray(value.id);
      const parameters = ownedSignatureTypeArray(value.id, getTypeIdName);
      return `${returnType} ${value.name}${genericParameters}${parameters}`;
    }
  );

  const mapMethodNames = new Map<Id.MethodDefId, MethodName>(tables.methodNames.map((value) => [value.id, value]));

  const mapMethodRefFullNames = makeNameResolver(
    tables.methodSpecs,
    (value) => value.id,
    (methodRef) => {
      const getTypeRefId = (id: Id.TypeSpecId): string => getOrThrow(mapTypeRefFullNames, id);
      const getTypeIdName = makeGetTypeIdName(getTypeRefId);
      const value = getOrThrow(mapMethodNames, methodRef.resolvedId);
      const returnType = getTypeIdName(value.returnTypeId);
      const genericArguments = ownedSignatureTypeArray(methodRef.id, getTypeIdName);
      const parameters = ownedSignatureTypeArray(value.id, getTypeIdName);
      return `${returnType} ${value.name}${genericArguments}${parameters}`;
    }
  );

  const typeDefFullNames = [...mapTypeDefFullNames.entries()].map((entry) => ({ id: entry[0], fullName: entry[1] }));
  const typeRefFullNames = [...mapTypeRefFullNames.entries()].map((entry) => ({ id: entry[0], fullName: entry[1] }));
  const methodDefFullNames = [...mapMethodDefFullNames.entries()].map((entry) => ({
    id: entry[0],
    fullName: entry[1],
  }));
  const methodRefFullNames = [...mapMethodRefFullNames.entries()].map((entry) => ({
    id: entry[0],
    fullName: entry[1],
  }));
  return [
    ...assemblies,
    ...namespaces,
    ...typeDefFullNames,
    ...typeRefFullNames,
    ...methodDefFullNames,
    ...methodRefFullNames,
  ];
};
