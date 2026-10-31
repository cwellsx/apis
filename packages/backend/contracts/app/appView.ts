import { AnyView } from "../ui";
import { MenuItem } from "./menuApi";

export type AppView = AnyView | { type: "menuItems"; payload: MenuItem[] };
