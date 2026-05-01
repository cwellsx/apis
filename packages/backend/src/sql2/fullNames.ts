import { assert, getOrThrow } from "../utils";
import { isGenericParamId, isMethodDefId, isTypeDefId } from "./idTest";
import type * as Id from "./idTypes";
import {
  Assemblies,
  FullNames,
  GenericParams,
  MethodNames,
  Namespaces,
  SignatureTypes,
  TypeNames,
  TypeReferences,
} from "./schema";

type Tables = {
  assemblies: Assemblies[];
  namespaces: Namespaces[];
  genericParams: GenericParams[];
  signatureTypes: SignatureTypes[];
  typeNames: TypeNames[];
  typeReferences: TypeReferences[];
  methodNames: MethodNames[];
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

export const fullNames = (tables: Tables): FullNames[] => {
  const assemblies = tables.assemblies.map((value) => ({ id: value.id, fullName: value.name }));
  const namespaces = tables.namespaces.map((value) => ({ id: value.id, fullName: value.name }));

  const mapNamespaces = new Map<Id.NamespaceId, string>(namespaces.map((value) => [value.id, value.fullName]));

  const ownedGenericParamArrays = mapArrays<Id.AnyDefId, string, GenericParams>(
    tables.genericParams,
    (row) => row.name
  );
  const ownedSignatureTypeArrays = mapArrays<Id.AnyOwnerId, Id.TypeId, SignatureTypes>(
    tables.signatureTypes,
    (row) => row.argument
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
    (typeNames) => typeNames.id,
    (typeNames, resolve) =>
      (typeNames.declaringType
        ? `${resolve(typeNames.declaringType)}.${typeNames.name}` // recurse
        : typeNames.namespace
          ? `${getOrThrow(mapNamespaces, typeNames.namespace)}.${typeNames.name}`
          : typeNames.name) + ownedGenericParamArray(typeNames.id)
  );

  const mapTypeRefFullNames = makeNameResolver(
    tables.typeReferences,
    (typeReferences) => typeReferences.id,
    (typeReferences, resolve) => {
      const getTypeIdName = (id: Id.TypeId): string =>
        isTypeDefId(id)
          ? getOrThrow(mapTypeDefFullNames, id)
          : isGenericParamId(id)
            ? getOrThrow(allGenericParameters, id)
            : resolve(id);

      const resolvedName = getTypeIdName(typeReferences.resolved);
      const typeArguments = ownedSignatureTypeArray(typeReferences.id, getTypeIdName);
      return `${resolvedName}${typeArguments}${typeReferences.suffix}}`;
    }
  );

  //   const [getMethodDefName, mapMethodDefFullNames] = makeNameResolver(
  //     tables.methodNames,
  //     (methodNames) => methodNames.id,
  //     (methodNames, resolve) => `${"foo"}`
  //   );
  //   tables.typeNames.forEach((value) => getTypeDefName(value));

  //   // similarly calculate the names of type references on-demand
  //   const mapTypeReferences = new Map<Id.TypeRefId, TypeReferences>(
  //     tables.typeReferences.map((value) => [value.id, value])
  //   );
  //   const mapTypeRefFullNames = new Map<Id.TypeRefId, string>();

  //   const getTypeRefName = (typeReferences: TypeReferences): string => {
  //     const typeRefId = typeReferences.id;
  //     let fullName = mapTypeRefFullNames.get(typeRefId);
  //     if (fullName) return fullName;
  //     const genericArguments = mapSignatureTypes.get(typeRefId);
  //   };

  const typeDefFullNames = [...mapTypeDefFullNames.entries()].map((entry) => ({ id: entry[0], fullName: entry[1] }));
  return [...assemblies, ...namespaces, ...typeDefFullNames];
};
