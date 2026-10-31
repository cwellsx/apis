import { AppEvent } from "./appEvent";
import { AppView } from "./appView";

export type PresenterApi = (events: AppEvent[]) => Promise<AppView[]>;
