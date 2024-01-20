import * as React from "react";

const zooms = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];

export function useZoomPercent(): [zoomPercent: number, onWheel: (event: React.WheelEvent) => void] {
  const [zoomPercent, setZoomPercent] = React.useState(100);
  const onWheel = (event: React.WheelEvent): void => {
    // I tried `const delta = event.deltaY * -0.01`
    // like the example at https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event
    // however exact value of event.deltaY is unreliable, sometimes 100 or -100, sometimes e.g. -91.28
    const delta = -Math.sign(event.deltaY);
    const index = Math.max(Math.min(zooms.indexOf(zoomPercent) + delta, zooms.length - 1), 0);
    setZoomPercent(zooms[index]);
  };
  return [zoomPercent, onWheel];
}
