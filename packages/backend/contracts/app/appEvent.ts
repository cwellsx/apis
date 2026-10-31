import { AnyEvent } from "../ui";

export type MenuEvent = { menuItemId: string };

export type AppEvent = AnyEvent | { type: "menuItem"; payload: MenuEvent };
