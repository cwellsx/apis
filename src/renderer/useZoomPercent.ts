import * as React from "react";

// divisor is set to halve after 6 clicks i.e. 1.122462
const zooms = [
  20, 22, 25, 28, 31, 35, 40, 45, 50, 56, 63, 75, 80, 90, 100, 110, 125, 140, 160, 180, 200, 225, 250, 280,
];

type SetNumber = (value: number) => void;

export function useZoomPercent(
  setAppPercent: SetNumber
): [zoomPercent: number, setZoomPercent: SetNumber, onWheel: (event: React.WheelEvent) => void] {
  const [zoomPercent, setZoomPercent] = React.useState(100);
  const onWheel = (event: React.WheelEvent): void => {
    // I tried `const delta = event.deltaY * -0.01`
    // like the example at https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event
    // however exact value of event.deltaY is unreliable, sometimes 100 or -100, sometimes e.g. -91.28
    const delta = -Math.sign(event.deltaY);
    const index = Math.max(Math.min(zooms.indexOf(zoomPercent) + delta, zooms.length - 1), 0);
    // use setAppPercent instead of setZoomPercent to round-trip the new value via setAppOptions
    setAppPercent(zooms[index]);
  };
  return [zoomPercent, setZoomPercent, onWheel];
}
