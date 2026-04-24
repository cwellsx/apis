import * as DotNet from "../../contracts/dotnet2";

export const getLocalTypeId = (id: DotNet.LocalTypeId): number => {
  if ((typeof id as unknown) !== "number") {
    throw new TypeError(`${id} must be a number`);
  }
  return id;
};
