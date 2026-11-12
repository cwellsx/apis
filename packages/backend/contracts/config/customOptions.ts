// There are no options of the custom view yet. This is the type the custom view's own options will have, and until
// they exist it is a type which can hold nothing.
export type CustomOptions = Record<string, never>;
export const defaultCustomOptions: CustomOptions = {};
