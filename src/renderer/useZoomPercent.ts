import * as React from "react";

const zooms = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];

export function useZoomPercent(): [zoomPercent: number, onWheel: (event: React.WheelEvent) => void] {
  const [zoomPercent, setZoomPercent] = React.useState(100);
  const onWheel = (event: React.WheelEvent): void => {
    const delta = event.deltaY * -0.01; // example https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event
    const index = Math.max(Math.min(zooms.indexOf(zoomPercent) + delta, zooms.length - 1), 0);
    setZoomPercent(zooms[index]);
  };
  return [zoomPercent, onWheel];
}
