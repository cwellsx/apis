import * as React from "react";
import type { SVGProps } from "react";
const SvgFieldPublic = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
    <defs>
      <style>
        {
          ".FieldPublic_svg__canvas{fill:none;opacity:0}.FieldPublic_svg__light-blue,.FieldPublic_svg__light-blue-10{fill:#005dba;opacity:.1}.FieldPublic_svg__light-blue{opacity:1}"
        }
      </style>
    </defs>
    <g id="FieldPublic_svg__level-1">
      <g
        style={{
          opacity: 0.75,
        }}
      >
        <path
          d="M14.5 5.5V10l-9 5-4-4V6.5l9-5Z"
          className="FieldPublic_svg__light-blue-10"
        />
        <path
          d="m14.854 5.146-4-4-.6-.083-9 5L1 6.5V11l.146.354 4 4 .6.083 9-5L15 10V5.5ZM14 9.706 6 14.15V10.5H5v3.293l-3-3v-4l8.413-4.673L14 5.707Z"
          className="FieldPublic_svg__light-blue"
        />
      </g>
      <path
        d="m14.5 5.5-9 5-4-4 9-5Z"
        className="FieldPublic_svg__light-blue-10"
      />
      <path
        d="m10.854 1.146-.6-.083-9 5-.111.791 4 4 .6.083 9-5 .111-.791ZM5.587 9.88 2.322 6.615l8.091-4.495 3.265 3.265Z"
        className="FieldPublic_svg__light-blue"
      />
    </g>
  </svg>
);
export default SvgFieldPublic;
