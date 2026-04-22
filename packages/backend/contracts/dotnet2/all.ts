import { Access } from "./access";
import { Id, MetadataToken, MethodId, TypeId } from "./id";
import { EventMember, FieldMember, MethodMember, PropertyMember } from "./members";

type AssemblyMap<T> = { [assemblyName: string]: T };

type TypeInfo = {
  localTypeId: Id;
  namespace?: string;
  name: string;
  declaringType?: Id;
  attributes?: string[];
  baseType?: Id;
  interfaces?: Id[];
  genericTypeParameters?: string;
  access: Access;
  // members
  fieldMembers?: FieldMember[];
  eventMembers?: EventMember[];
  propertyMembers?: PropertyMember[];
  nestedTypes?: TypeId[];
  methodMembers?: MethodMember[];
};

type AssemblyInfo = { referencedAssemblies: string[]; typeInfos: TypeInfo[] };

type MethodInfo = { asText: string; called?: MethodId[]; argued?: MethodId[]; locals?: TypeId[] };

export type All = {
  assemblies: AssemblyMap<AssemblyInfo>;
  version: string;
  exes: string[];
  assemblyMethods: AssemblyMap<{ [metadataToken: string]: MethodInfo }>;
  compilerMethods: AssemblyMap<{ [metadataToken: string]: MetadataToken }>;
  microsoftAssemblies: AssemblyMap<AssemblyInfo>;
};
