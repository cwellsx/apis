import * as React from "react";

// the modifier keys the UI reacts to, e.g. to anchor the popup instead of letting it follow the cursor
export type KeyboardState = { shiftKey: boolean; ctrlKey: boolean };

const noKeys: KeyboardState = { shiftKey: false, ctrlKey: false };

const toKeyboardState = (event: KeyboardEvent): KeyboardState => ({
  shiftKey: event.shiftKey,
  ctrlKey: event.ctrlKey,
});

// 'keydown' repeats while a key is held, so return the current state unchanged when nothing changed:
// React then bails out of the re-render and the repeats cost nothing
const sameKeyboardState = (x: KeyboardState, y: KeyboardState): boolean =>
  x.shiftKey === y.shiftKey && x.ctrlKey === y.ctrlKey;

export const useKeyboard = (): KeyboardState => {
  const [keyboard, setKeyboard] = React.useState<KeyboardState>(noKeys);

  React.useEffect(() => {
    // like https://github.com/donavon/use-event-listener

    const onKey = (event: KeyboardEvent): void =>
      setKeyboard((current) => {
        const next = toKeyboardState(event);
        return sameKeyboardState(current, next) ? current : next;
      });

    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
    };
  }, []);

  return keyboard;
};