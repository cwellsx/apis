import type { CustomOptions } from "./customOptions";
import type { DotnetOptions } from "./dotnetOptions";

// What a view's options may be. The two back ends do not know each other's options -- each schema takes its own
// type -- but one front end drives both, and an event carries whichever it is, so the union is here.
export type AnyOptions = DotnetOptions | CustomOptions;

// The dotnet options are the ones which have a field to look for: the custom view has nothing to configure yet.
export const isDotnetOptions = (options: AnyOptions): options is DotnetOptions => "clusterNamespaces" in options;
