import * as React from "react";
import type { ApiViewOptions, GraphViewOptions, ReferenceViewOptions } from "../shared-types";
import "./Options.css";

type OptionsProps = {
  viewOptions: GraphViewOptions;
  setViewOptions: (viewOptions: GraphViewOptions) => void;
};

type ShowGrouped = ReferenceViewOptions | ApiViewOptions;

const getShowGrouped = (
  viewOptions: GraphViewOptions,
  setViewOptions: (viewOptions: GraphViewOptions) => void
): JSX.Element | undefined => {
  const isShowGrouped = (viewOptions: GraphViewOptions): viewOptions is ShowGrouped =>
    Object.keys(viewOptions).includes("showGrouped");

  if (!isShowGrouped(viewOptions)) return undefined;

  const checked = viewOptions.showGrouped;
  const onChange = () => setViewOptions({ ...viewOptions, showGrouped: !checked });

  return (
    <label>
      <input type="checkbox" checked={checked} onChange={onChange} />
      Groups as subgraphs
    </label>
  );
};

export const Options: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  const { viewOptions, setViewOptions } = props;
  if (viewOptions.viewType == "methods") return <></>;

  return (
    <fieldset id="options">
      <legend>Options</legend>
      {getShowGrouped(viewOptions, setViewOptions)}
    </fieldset>
  );
};
