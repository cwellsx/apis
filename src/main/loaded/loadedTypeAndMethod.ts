import { MethodMember } from "./loadedMembers";
import { MethodDetails } from "./loadedMethodCalls";
import { GoodTypeInfo } from "./loadedTypeInfo";

export type TypeAndMethod = {
  type: GoodTypeInfo;
  method: MethodMember;
  methodDetails: MethodDetails;
};
