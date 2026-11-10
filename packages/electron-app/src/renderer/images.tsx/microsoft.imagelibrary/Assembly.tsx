import * as React from "react";
import type { SVGProps } from "react";
const SvgAssembly = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
    <defs>
      <style>
        {
          ".Assembly_svg__light-defaultgrey-10{fill:#212121;opacity:.1}.Assembly_svg__light-defaultgrey{fill:#212121;opacity:1}"
        }
      </style>
    </defs>
    <g id="Assembly_svg__level-1">
      <path d="M9.5 5.5v8h-8v-8Z" className="Assembly_svg__light-defaultgrey-10" />
      <path d="M9.5 5h-8l-.5.5v8l.5.5h8l.5-.5v-8ZM9 13H2V6h7Z" className="Assembly_svg__light-defaultgrey" />
      <g
        style={{
          opacity: 0.75,
        }}
      >
        <path d="M13.5 9.5h-2v2H10v-6L9.5 5h-6V3.5h2v-2h8Z" className="Assembly_svg__light-defaultgrey-10" />
        <path
          d="M13.5 1h-8l-.5.5V3H3.5l-.5.5V5h1V4h7v7h-1v1h1.5l.5-.5V10h1.5l.5-.5v-8ZM13 9h-1V3.5l-.5-.5H6V2h7Z"
          className="Assembly_svg__light-defaultgrey"
        />
      </g>
    </g>
  </svg>
);
export default SvgAssembly;
