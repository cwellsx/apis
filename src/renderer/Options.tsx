import * as React from "react";
import type { AnyGraphViewOptions, CustomViewOptions, GraphViewOptions, ReferenceViewOptions } from "../shared-types";
import "./Options.css";

// types

type OptionsProps = {
  viewOptions: GraphViewOptions;
  setViewOptions: (viewOptions: GraphViewOptions) => void;
};

type BooleanState = [value: boolean, setValue: (newValue: boolean) => void];

// get data from AnyGraphViewOptions

const getShowEdgeLabels = (viewOptions: AnyGraphViewOptions): AnyGraphViewOptions["showEdgeLabels"] | undefined =>
  viewOptions["showEdgeLabels"];

const getShowClustered = (viewOptions: AnyGraphViewOptions): AnyGraphViewOptions["showClustered"] | undefined =>
  viewOptions["showClustered"];

const getShowIntraAssemblyCalls = (viewOptions: AnyGraphViewOptions): BooleanState | undefined => {
  const value = viewOptions["showIntraAssemblyCalls"];
  if (value === undefined) return undefined;
  const setValue = (newValue: boolean): void => {
    viewOptions["showIntraAssemblyCalls"] = newValue;
  };
  return [value, setValue];
};

const isReferenceViewOptions = (viewOptions: GraphViewOptions): viewOptions is ReferenceViewOptions =>
  viewOptions.viewType === "references";

const isCustomViewOptions = (viewOptions: GraphViewOptions): viewOptions is CustomViewOptions =>
  viewOptions.viewType === "custom";

// agnostic/reusable React element groups

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (newValue: boolean) => void;
};
const Checkbox: React.FunctionComponent<CheckboxProps> = (props: CheckboxProps) => {
  const { label, checked, onChange } = props;

  return (
    <label>
      <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} />
      {label}
    </label>
  );
};

type SelectProps = {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (newValue: string | undefined) => void;
  isOptional: boolean;
};
const Select: React.FunctionComponent<SelectProps> = (props: SelectProps) => {
  const { label, value, options, onChange, isOptional } = props;

  if (!options.length) return <></>;
  const allOptions = isOptional ? [undefined, ...options] : options;

  const none = "(none)";
  const input = (option: string | undefined) => option ?? none;
  const output = (option: string) => (option === none ? undefined : option);

  return (
    <p>
      {label}:
      <br />
      <select value={value} onChange={(event) => onChange(output(event.target.value))}>
        <option value={none}></option>
        {allOptions.map(input).map((key) => (
          <option value={key}>{key}</option>
        ))}
      </select>
    </p>
  );
};

type CheckboxesProps = {
  label: string;
  options: { key: string; checked: boolean; label: string }[];
  onChange: (key: string, newValue: boolean) => void;
};
const Checkboxes: React.FunctionComponent<CheckboxesProps> = (props: CheckboxesProps) => {
  const { label, options, onChange } = props;

  if (!options.length) return <></>;

  const checkBoxes = options.map((option) => (
    <>
      <br />
      <Checkbox
        label={option.label}
        checked={option.checked}
        onChange={(newValue: boolean) => onChange(option.key, newValue)}
      />
    </>
  ));

  return (
    <p>
      {label}:{checkBoxes}
    </p>
  );
};

type RadiosProps = {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (newValue: string) => void;
};
const Radios: React.FunctionComponent<RadiosProps> = (props: RadiosProps) => {
  const { label, name, value, options, onChange } = props;

  const toUpper = (option: string) => option[0].toLocaleUpperCase() + option.substring(1);

  const radios = options.map((option) => (
    <React.Fragment key={option}>
      <br />
      <label>
        <input
          type="radio"
          name={name}
          checked={option === value}
          value={option}
          onChange={(event) => onChange(event.target.value)}
        />
        {toUpper(option)}
      </label>
    </React.Fragment>
  ));

  return (
    <p>
      {label}:{radios}
    </p>
  );
};

// React elements

const ShowIntraAssemblyCalls: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  const { viewOptions, setViewOptions } = props;
  const booleanState = getShowIntraAssemblyCalls(viewOptions);
  if (!booleanState) return <></>;
  const [value, setValue] = booleanState;
  return (
    <p>
      <Checkbox
        label="Show internals"
        checked={value}
        onChange={(newValue: boolean) => {
          setValue(newValue);
          setViewOptions(viewOptions);
        }}
      />
    </p>
  );
};

const ShowCustom: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  const { viewOptions, setViewOptions } = props;
  if (!isCustomViewOptions(viewOptions)) return <></>;

  return (
    <p>
      <Select
        label="Group by"
        value={viewOptions.clusterBy.length ? viewOptions.clusterBy[0] : undefined}
        options={viewOptions.nodeProperties}
        onChange={(newValue: string | undefined) => {
          viewOptions.clusterBy = !newValue ? [] : [newValue];
          setViewOptions(viewOptions);
        }}
        isOptional={true}
      />
      <Checkboxes
        label="Filter by"
        options={viewOptions.tags.map((tag) => ({ checked: tag.shown, label: tag.tag, key: tag.tag }))}
        onChange={(key: string, newValue: boolean) => {
          const found = viewOptions.tags.find((tag) => tag.tag === key);
          if (!found) return; // shouldn't happen
          found.shown = newValue;
          setViewOptions(viewOptions);
        }}
      />
    </p>
  );
};

const ShowEdgeLabels: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  const { viewOptions, setViewOptions } = props;
  const showEdgeLabels = getShowEdgeLabels(viewOptions);
  if (!showEdgeLabels) return <></>;

  return (
    <p>
      Show edge labels:
      <br />
      <Checkbox
        label="Cluster edges"
        checked={showEdgeLabels.groups}
        onChange={(newValue) => {
          showEdgeLabels.groups = newValue;
          setViewOptions(viewOptions);
        }}
      />
      <br />
      <Checkbox
        label="Leaf edges"
        checked={showEdgeLabels.leafs}
        onChange={(newValue) => {
          showEdgeLabels.leafs = newValue;
          setViewOptions(viewOptions);
        }}
      />
    </p>
  );
};

const ShowClustered: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  const { viewOptions, setViewOptions } = props;
  const showClustered = getShowClustered(viewOptions);
  if (!showClustered) {
    if (isReferenceViewOptions(viewOptions))
      return (
        <p>
          <Checkbox
            label="Nested clusters"
            checked={viewOptions.nestedClusters}
            onChange={(newValue: boolean) => {
              viewOptions.nestedClusters = newValue;
              setViewOptions(viewOptions);
            }}
          />
        </p>
      );
    if (isCustomViewOptions(viewOptions)) return <></>;
    throw new Error("Unhandled view type");
  }
  return (
    <>
      <Radios
        label="Cluster by"
        name="clusterType"
        value={showClustered.clusterBy}
        options={["assembly", "namespace"]}
        onChange={(newValue: string) => {
          showClustered.clusterBy = newValue as "assembly" | "namespace";
          setViewOptions(viewOptions);
        }}
      />
      <p>
        <Checkbox
          label="Nested clusters"
          checked={showClustered.nestedClusters}
          onChange={(newValue: boolean) => {
            showClustered.nestedClusters = newValue;
            setViewOptions(viewOptions);
          }}
        />
      </p>
    </>
  );
};

export const Options: React.FunctionComponent<OptionsProps> = (props: OptionsProps) => {
  return (
    <fieldset id="options">
      <legend>Options</legend>
      {ShowClustered(props)}
      {ShowCustom(props)}
      {ShowEdgeLabels(props)}
      {ShowIntraAssemblyCalls(props)}
    </fieldset>
  );
};
