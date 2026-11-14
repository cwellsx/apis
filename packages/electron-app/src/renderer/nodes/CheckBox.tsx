import * as React from "react";
import { Codeicons } from "../images.tsx";
import "./CheckBox.scss";

// SVG icons
const svgCheck = <Codeicons.SvgCheck viewBox="0 0 16 16" />;
const svgDash = <Codeicons.SvgDash viewBox="0 0 16 16" />;
const svgNone = <></>;

type CheckBoxProps = { checked: boolean | "mixed"; onToggle: () => void };

export const CheckBox: React.FC<CheckBoxProps> = ({ checked, onToggle }) => {
  const element = (() => {
    switch (checked) {
      case true:
        return svgCheck;
      case false:
        return svgNone;
      case "mixed":
        return svgDash;
    }
  })();

  return (
    <div className="checkbox" role="checkbox" aria-checked={checked} tabIndex={0} onClick={onToggle}>
      {element}
    </div>
  );
};
