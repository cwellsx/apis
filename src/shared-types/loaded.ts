export type { BadMethodCall, BadMethodInfo, Error as LoadedMethodError } from "../main/loaded";

// this is the only place where a module in shared-types does an import from outside itself
// beware not to create cyclic dependencies by doing this
// it should be OK because main/loaded declares the C# types and needn't (doesn't) import anything from shared-types
