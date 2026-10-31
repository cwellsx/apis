// this is declared in contracts/app not in contracts/ui
// because it's implemented and used in the app, not in the front-end
// therefore AppEvent and AppView extend the AnyEvent and AnyView types

export type MenuItem =
  | { type: "radio"; label: string; picked: boolean; menuItemId: string }
  | { type: "separator" }
  | { type: "normal"; label: string; menuItemId: string };
