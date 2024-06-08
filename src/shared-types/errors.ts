import type { BadCallDetails, BadTypeInfo } from "./loaded";

export type ErrorsInfo = { assemblyName: string; badTypeInfos: BadTypeInfo[]; badCallDetails: BadCallDetails[] };
