import * as React from "react";
import "./CheckBox.scss";
import { Codeicons } from "./images.tsx";

// SVG icons
const svgCheck = <Codeicons.SvgCheck viewBox="0 0 16 16" />;
const svgDash = <Codeicons.SvgDash viewBox="0 0 16 16" />;
const svgNone = <></>;

export type Checked = boolean | "mixed";

type CheckBoxProps = { checked: Checked; onToggle: () => void };

export const CheckBox: React.FC<CheckBoxProps> = ({ checked, onToggle }) => {
  const [state, element] = (() => {
    switch (checked) {
      case true:
        return ["checked", svgCheck];
      case false:
        return ["unchecked", svgNone];
      case "mixed":
        return ["mixed", svgDash];
    }
    return ["d", "d"];
  })();

  return (
    <div className="checkbox" role="checkbox" aria-checked={checked} tabIndex={0} onClick={onToggle}>
      {element}
    </div>
  );
};
