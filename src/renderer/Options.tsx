import * as React from "react";
import type { ViewOptions } from "../shared-types";

type OptionsProps = {
  viewOptions: ViewOptions;
  setViewOptions: (viewOptions: ViewOptions) => void;
};

export const Options: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  const { viewOptions } = props;
  const showGrouped = typeof viewOptions.showGrouped === "undefined" ? true : viewOptions.showGrouped;

  const onShowGrouped = () => props.setViewOptions({ ...viewOptions, showGrouped: !showGrouped });

  return (
    <fieldset>
      <legend>Options</legend>
      <label>
        <input type="checkbox" checked={showGrouped} onChange={onShowGrouped} />
        Groups as subgraphs
      </label>
    </fieldset>
  );
};
