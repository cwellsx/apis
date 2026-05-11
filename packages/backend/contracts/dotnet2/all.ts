import { Access } from "./access";
import { LocalTypeId, MethodId, TypeId } from "./id";
import { EventMember, FieldMember, MethodMember, PropertyMember } from "./members";

export type AssemblyMap<T> = { [assemblyName: string]: T };

export type TypeInfo = {
  id: LocalTypeId;
  namespace?: string;
  name: string;
  declaringType?: LocalTypeId;
  attributes?: string[];
  baseType?: TypeId;
  interfaces?: TypeId[];
  genericParameters?: string[];
  access: Access;
  // members
  fieldMembers?: FieldMember[];
  eventMembers?: EventMember[];
  propertyMembers?: PropertyMember[];
  nestedTypes?: LocalTypeId[];
  methodMembers?: MethodMember[];
};

type AssemblyInfo = { referencedAssemblies: string[]; typeInfos: TypeInfo[] };

export type MethodInfo = { asText: string; called?: MethodId[]; argued?: MethodId[]; locals?: TypeId[] };

export type All = {
  assemblies: AssemblyMap<AssemblyInfo>;
  version: string;
  exes: string[];
  assemblyMethods: AssemblyMap<{ [metadataToken: string]: MethodInfo }>;
  microsoftAssemblies: AssemblyMap<AssemblyInfo>;
};
