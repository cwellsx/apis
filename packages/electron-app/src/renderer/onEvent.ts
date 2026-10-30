import { AppOptions, FilterEvent, GraphEvent } from "backend-ui";

type OnUserEvent<T> = (event: T) => void;

export type OnAppOptions = OnUserEvent<AppOptions>;
export type OnGraphEvent = OnUserEvent<GraphEvent>;
export type OnFilterEvent = OnUserEvent<FilterEvent>;
//export type OnDetailEvent = OnUserEvent<OnDetailEvent>;
