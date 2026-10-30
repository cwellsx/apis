import { AnyEvent } from "./events";
import { AnyView } from "./views";

export type PresenterApi = (events: AnyEvent[]) => Promise<AnyView[]>;
