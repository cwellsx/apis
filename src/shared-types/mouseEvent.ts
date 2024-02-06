// avoid importing this type into the renderer-side code, use the OnClick type instead
// because it can be confusing because there's also a React.MouseEvent and a DOM MouseEvent
export type MouseEvent = {
  altKey: boolean;
  button: number;
  buttons: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export type OnClick = (id: string, event: MouseEvent) => void;
