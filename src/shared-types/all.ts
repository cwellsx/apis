import { MethodBody } from "./methodBody";
import { Types } from "./types";
import { ErrorsViewOptions, GreetingViewOptions, MethodViewOptions, ReferenceViewOptions } from "./viewOptions";
import { ViewGraph, ViewGreeting } from "./views";

export type AllViewOptions = ReferenceViewOptions | MethodViewOptions | ErrorsViewOptions | GreetingViewOptions;

export type ViewType = "references" | "methods" | "errors" | "greeting";

// export type DataSourceId = {
//   cachedWhen: string;
//   hash: string;
// };

export type View = ViewGraph | ViewGreeting; // & { dataSourceId: DataSourceId };

export type ViewDetails = MethodBody | Types;
