import { TypeKind } from "./loadedAccess";

export type TypeId = {
  assemblyName: string;
  namespace?: string;
  name: string;
  genericTypeArguments?: TypeId[];
  declaringType?: TypeId;
  TypeKind?: TypeKind;
  elementType?: TypeId;
  metadataToken: number;
};
