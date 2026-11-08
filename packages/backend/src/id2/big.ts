// the number-based assembly and group ids become the bigint ids used by calls and ancestors
import type * as Id from "./idTypes";

export const toBigAssemblyId = (id: Id.AssemblyId): Id.BigAssemblyId => BigInt(id) as Id.BigAssemblyId;
export const toBigGroupId = (id: Id.GroupId): Id.BigGroupId => BigInt(id) as Id.BigGroupId;