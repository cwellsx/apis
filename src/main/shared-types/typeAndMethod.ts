import { GoodTypeInfo, MethodDetails, MethodMember } from "../loaded";

export type TypeAndMethod = {
  type: GoodTypeInfo;
  method: MethodMember;
  methodDetails: MethodDetails;
};
