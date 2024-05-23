import { GoodTypeInfo, MethodDetails, MethodMember } from "../loaded";

export type TypeAndMethodDetails = {
  type: GoodTypeInfo;
  method: MethodMember;
  methodDetails: MethodDetails;
};
