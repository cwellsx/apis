import * as React from "react";
import type { GraphViewOptions } from "../shared-types";
import "./Options.css";

type OptionsProps = {
  viewOptions: GraphViewOptions;
  setViewOptions: (viewOptions: GraphViewOptions) => void;
};

export const Options: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  const { viewOptions } = props;
  const showGrouped = typeof viewOptions.showGrouped === "undefined" ? true : viewOptions.showGrouped;

  const onShowGrouped = () => props.setViewOptions({ ...viewOptions, showGrouped: !showGrouped });

  return (
    <fieldset id="options">
      <legend>Options</legend>
      <label>
        <input type="checkbox" checked={showGrouped} onChange={onShowGrouped} />
        Groups as subgraphs
      </label>
    </fieldset>
  );
};
