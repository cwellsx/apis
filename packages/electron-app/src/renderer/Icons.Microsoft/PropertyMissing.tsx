import * as React from "react";
import type { SVGProps } from "react";
const SvgPropertyMissing = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
    <defs>
      <style>
        {
          ".PropertyMissing_svg__canvas{fill:none;opacity:0}.PropertyMissing_svg__light-defaultgrey{fill:#212121;opacity:1}"
        }
      </style>
    </defs>
    <g id="PropertyMissing_svg__level-1">
      <g
        style={{
          opacity: 0.75,
        }}
      >
        <path
          d="M8 8.451c-1.883 1.894-4.507 4.5-5.92 5.816-.861.75-2.077-.651-1.418-1.4 1.335-1.4 3.981-4.026 5.875-5.874A3.9 3.9 0 0 0 8 8.451"
          style={{
            fill: "#212121",
            opacity: 0.1,
          }}
        />
        <path
          d="M8.475 8.679c-1.83 1.842-4.561 4.56-6.057 5.954a1.35 1.35 0 0 1-.892.346 1.5 1.5 0 0 1-1.056-.47 1.444 1.444 0 0 1-.187-1.973c1.383-1.448 4.122-4.167 6.022-6.018a4 4 0 0 0 .506.9c-1.858 1.817-4.466 4.408-5.791 5.8-.134.153.009.441.158.591a.4.4 0 0 0 .57.087C3.173 12.563 5.755 10 7.567 8.174a4 4 0 0 0 .908.505"
          className="PropertyMissing_svg__light-defaultgrey"
        />
      </g>
      <path
        d="M14 5a4 4 0 0 1-8 0 3.96 3.96 0 0 1 4-4 4.2 4.2 0 0 1 1.441.241L8.559 4.2 10.8 6.441l2.959-2.882A4.2 4.2 0 0 1 14 5M13.854 13 16 15.146l-.707.708-2.147-2.147L11 15.854l-.707-.708L12.439 13l-2.146-2.146.707-.708 2.146 2.147 2.147-2.147.707.708Z"
        className="PropertyMissing_svg__light-defaultgrey"
      />
    </g>
  </svg>
);
export default SvgPropertyMissing;
