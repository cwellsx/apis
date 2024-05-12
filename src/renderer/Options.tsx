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

const getGroupedBy = (
  viewOptions: GraphViewOptions,
  setViewOptions: (viewOptions: GraphViewOptions) => void
): JSX.Element | undefined => {
  if (viewOptions.viewType !== "custom") return <></>;
  const nodeProperties = viewOptions.nodeProperties;

  const onChange = (value: string): void =>
    setViewOptions({ ...viewOptions, groupedBy: value === none ? [] : [value] });
  const none = "(none)";
  const current = viewOptions.groupedBy && viewOptions.groupedBy.length ? viewOptions.groupedBy[0] : none;
  return (
    <p>
      Group by:
      <br />
      <select value={current} onChange={(event) => onChange(event.target.value)}>
        <option value={none}></option>
        {nodeProperties.map((key) => (
          <option value={key}>{key}</option>
        ))}
      </select>
    </p>
  );
};

const getFilteredBy = (
  viewOptions: GraphViewOptions,
  setViewOptions: (viewOptions: GraphViewOptions) => void
): JSX.Element | undefined => {
  if (viewOptions.viewType !== "custom") return <></>;
  const tags = viewOptions.tags;
  if (!tags.length) return <></>;

  const onChange = (value: string): void => {
    const found = tags.find((element) => element.tag === value);
    if (!found) return; // shouldn't happen
    found.shown = !found.shown;
    setViewOptions({ ...viewOptions });
  };

  return (
    <p>
      Filter by:
      <br />
      {tags.map((element, index) => (
        <>
          <input
            type="checkbox"
            checked={element.shown}
            value={element.tag}
            onChange={(event) => onChange(event.target.value)}
          />
          {element.tag}
          <br />
        </>
      ))}
    </p>
  );
};

export const Options: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  const { viewOptions, setViewOptions } = props;
  if (viewOptions.viewType == "methods") return <></>;

  return (
    <fieldset id="options">
      <legend>Options</legend>
      {getShowGrouped(viewOptions, setViewOptions)}
      {getGroupedBy(viewOptions, setViewOptions)}
      {getFilteredBy(viewOptions, setViewOptions)}
    </fieldset>
  );
};
