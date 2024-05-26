import * as React from "react";
import type { GetSetBoolean, GraphViewOptions } from "../shared-types";
import { getShowEdgeLabels, getShowGrouped, getShowIntraAssemblyCalls } from "../shared-types";
import "./Options.css";

type OptionsProps = {
  viewOptions: GraphViewOptions;
  setViewOptions: (viewOptions: GraphViewOptions) => void;
};

const getSetBoolean = (
  viewOptions: GraphViewOptions,
  setViewOptions: (viewOptions: GraphViewOptions) => void,
  tuple: GetSetBoolean | undefined,
  label: string
): JSX.Element | undefined => {
  if (tuple === undefined) return undefined;
  const [showBoolean, setShowBoolean] = tuple;
  const onChange = () => {
    setShowBoolean(!showBoolean);
    setViewOptions(viewOptions);
  };

  return (
    <label>
      <input type="checkbox" checked={showBoolean} onChange={onChange} />
      {label}
    </label>
  );
};

const displayShowGrouped = (
  viewOptions: GraphViewOptions,
  setViewOptions: (viewOptions: GraphViewOptions) => void
): JSX.Element | undefined =>
  getSetBoolean(viewOptions, setViewOptions, getShowGrouped(viewOptions), "Groups as subgraphs");

const displayShowIntraAssemblyCalls = (
  viewOptions: GraphViewOptions,
  setViewOptions: (viewOptions: GraphViewOptions) => void
): JSX.Element | undefined =>
  getSetBoolean(viewOptions, setViewOptions, getShowIntraAssemblyCalls(viewOptions), "Show intra-assembly calls");

const displayCustom = (
  viewOptions: GraphViewOptions,
  setViewOptions: (viewOptions: GraphViewOptions) => void
): JSX.Element | undefined => {
  if (viewOptions.viewType !== "custom") return undefined;

  const customGroupedBy = (): JSX.Element => {
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

  const customFilteredBy = (): JSX.Element => {
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

  return (
    <>
      {customGroupedBy()}
      {customFilteredBy()}
    </>
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

const displayShowEdgeLabels = (
  viewOptions: GraphViewOptions,
  setViewOptions: (viewOptions: GraphViewOptions) => void
): JSX.Element | undefined => {
  const showEdgeLabels = getShowEdgeLabels(viewOptions);
  if (!showEdgeLabels) return undefined;

  const onGroupedChange = (): void => {
    showEdgeLabels.groups = !showEdgeLabels.groups;
    setViewOptions(viewOptions);
  };

  const onLeafChange = (): void => {
    showEdgeLabels.leafs = !showEdgeLabels.leafs;
    setViewOptions(viewOptions);
  };

  return (
    <p>
      Show edge labels:
      <br />
      <label>
        <input type="checkbox" checked={showEdgeLabels.groups} onChange={onGroupedChange} />
        Grouped edges
      </label>
      <br />
      <label>
        <input type="checkbox" checked={showEdgeLabels.leafs} onChange={onLeafChange} />
        Leaf edges
      </label>
      <br />
    </p>
  );
};

export const Options: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  const { viewOptions, setViewOptions } = props;
  if (viewOptions.viewType == "methods") return <></>;
  return (
    <fieldset id="options">
      <legend>Options</legend>
      {displayShowGrouped(viewOptions, setViewOptions)}
      {displayCustom(viewOptions, setViewOptions)}
      {displayShowEdgeLabels(viewOptions, setViewOptions)}
      {displayShowIntraAssemblyCalls(viewOptions, setViewOptions)}
    </fieldset>
  );
};
