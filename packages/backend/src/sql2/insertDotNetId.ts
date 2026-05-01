import * as DotNet from "../../contracts/dotnet2";
import { assert, getOrThrow } from "../utils";
import type { IdCreate } from "./idCreate";

import type {
  AnyDefId,
  AnyOwnerId,
  AssemblyId,
  BaseTypeId,
  GenericParamId,
  MethodDefId,
  MethodId,
  TypeId,
} from "./idTypes";
import type { GenericParams, MethodReferences, SignatureTypes, TypeReferences } from "./schema";

type ToTypeId = (id: DotNet.TypeId) => TypeId;
type MapGenericParams = Map<string, GenericParamId>;

export const parseTypeIds = (assemblyIds: Map<string, AssemblyId>) => {
  const getAssemblyId = (assemblyName: string): AssemblyId => getOrThrow(assemblyIds, assemblyName);

  const typeReferences: TypeReferences[] = [];
  const methodReferences: MethodReferences[] = [];
  const signatureTypes: SignatureTypes[] = [];
  const genericParams: GenericParams[] = [];

  const ownGenericParams = new Map<AnyDefId, GenericParams[]>();
  const allGenericParams = new Map<AnyDefId, MapGenericParams>();

  const toGenericParams = (
    ownerId: AnyDefId,
    assemblyName: string,
    genericParameters: string[],
    idCreate: IdCreate,
    previousOwner?: AnyDefId
  ): MapGenericParams => {
    const result = genericParameters.map((value, index) => ({
      id: idCreate.newGenericParamId(getAssemblyId(assemblyName)),
      ownerId,
      seqno: index,
      name: value,
    }));
    genericParams.push(...result);
    ownGenericParams.set(ownerId, result);

    const previous = previousOwner ? ownGenericParams.get(previousOwner) : undefined;
    const combined = [...(previous ? previous : []), ...result];
    const map = new Map<string, GenericParamId>(combined.map((value) => [value.name, value.id]));
    allGenericParams.set(ownerId, map);
    return map;
  };

  const toSignatureTypes = (ownerId: AnyOwnerId, typeIds: DotNet.TypeId[], toTypeId: ToTypeId) => {
    typeIds.forEach((argument, index) => signatureTypes.push({ ownerId, seqno: index, argument: toTypeId(argument) }));
  };

  const getToTypeId = (assemblyName: string, genericParameters: MapGenericParams, idCreate: IdCreate): ToTypeId => {
    // toTypeId is closure
    const toTypeId = (id: DotNet.TypeId) => {
      const toTypeDefId = (
        // shadow so don't overwrite value of assemblyName at closure scope
        assemblyName: string,
        // id is number | string => TypeDefId
        id: number | string
      ): BaseTypeId => {
        if (typeof id === "string") {
          const genericParamId =
            id[0] === "!" ? getOrThrow(genericParameters, id.substring(1)) : genericParameters.get(id);
          if (genericParamId) return genericParamId;

          const split = id.split("|");
          assert(split.length == 2, `Expect ${id} to contain "|"`);
          id = Number.parseInt(split[1]);
          assemblyName = split[0];
        }

        return idCreate.makeTypeDefId(id, getAssemblyId(assemblyName), false);
      };

      if (!Array.isArray(id)) return toTypeDefId(assemblyName, id);

      // first element is resolved
      const firstElement = id[0];
      assert(!Array.isArray(firstElement), "First element is resolved TypeDefId");
      const resolved = toTypeDefId(assemblyName, firstElement);
      const typeRefId = idCreate.newTypeRefId(getAssemblyId(assemblyName));

      // last element is optionally suffix
      const last = id[id.length - 1];
      const suffix: string | undefined = typeof last === "string" && !last.includes("|") ? last : undefined;

      // remove front and optionally remove back
      const array = id.slice(1, suffix ? -1 : undefined);

      typeReferences.push({ id: typeRefId, resolved, suffix });
      toSignatureTypes(typeRefId, array, toTypeId);
      return resolved;
    };

    return toTypeId;
  };

  const toMethodId = (id: DotNet.MethodId, assemblyName: string, fromId: MethodDefId, idCreate: IdCreate): MethodId => {
    // id is number | string => MethodDefId
    const toMethodeDefId = (assemblyName: string, id: number | string): MethodDefId => {
      if (typeof id === "string") {
        const split = id.split("|");
        assert(split.length == 2, `Expect ${id} to contain "|"`);
        id = Number.parseInt(split[1]);
        assemblyName = split[0];
      }
      return idCreate.makeMethodDefId(id, getAssemblyId(assemblyName), false);
    };

    if (!Array.isArray(id)) return toMethodeDefId(assemblyName, id);

    // first element is resolved
    const firstElement = id[0];
    assert(!Array.isArray(firstElement), "First element is resolved MethodDefId");
    const resolved = toMethodeDefId(assemblyName, firstElement);
    const array = id.slice(1); // remove front

    const methodRefId = idCreate.newMethodRefId(getAssemblyId(assemblyName));
    methodReferences.push({ id: methodRefId, resolved });

    const genericParameters = getOrThrow(allGenericParams, fromId);
    const toTypeId = getToTypeId(assemblyName, genericParameters, idCreate);
    toSignatureTypes(methodRefId, array, toTypeId);

    return methodRefId;
  };

  const getTypeReferences = () => ({ typeReferences, signatureTypes, genericParams, methodReferences });

  return { toGenericParams, getToTypeId, getTypeReferences, toSignatureTypes, toMethodId };
};
