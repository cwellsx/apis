import * as React from "react";
import type { SVGProps } from "react";
const SvgEventMissing = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
    <defs>
      <style>{".EventMissing_svg__canvas{fill:none;opacity:0}"}</style>
    </defs>
    <g id="EventMissing_svg__level-1">
      <path
        d="m11.5 6.5-8 8H2l3.5-6H2l4-7h5.387L7 6.5Z"
        style={{
          fill: "#996f00",
          opacity: 0.1,
        }}
      />
      <path
        d="M11.5 6H8.1l3.659-4.17-.372-.83H6l-.434.252-4 7L2 9h2.63l-3.062 5.248L2 15h1.5l.354-.146 8-8Zm-8.207 8h-.422l3.061-5.248L5.5 8H2.862L6.29 2h3.993L6.624 6.17 7 7h3.293Z"
        style={{
          fill: "#996f00",
          opacity: 1,
        }}
      />
      <path
        d="m13.707 13 2.147 2.146-.708.708L13 13.707l-2.146 2.147-.708-.708L12.293 13l-2.147-2.146.708-.708L13 12.293l2.146-2.147.708.708Z"
        style={{
          fill: "#212121",
          opacity: 1,
        }}
      />
    </g>
  </svg>
);
export default SvgEventMissing;
