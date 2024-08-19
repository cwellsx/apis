import * as React from "react";
import type {
  AnyGraphViewOptions,
  AppOptions,
  CompilerViewOptions,
  CustomViewOptions,
  GraphViewOptions,
  OptionsType,
  ReferenceViewOptions,
} from "../shared-types";
import { isCustomManual } from "../shared-types";
import "./Options.css";
import { log } from "./log";

// types

type BooleanState = [value: boolean, setValue: (newValue: boolean) => void];

// get data from AnyGraphViewOptions

const getShowEdgeLabels = (viewOptions: AnyGraphViewOptions): AnyGraphViewOptions["showEdgeLabels"] | undefined =>
  viewOptions["showEdgeLabels"];

const getShowClustered = (viewOptions: AnyGraphViewOptions): AnyGraphViewOptions["showClustered"] | undefined =>
  viewOptions["showClustered"];

const getShowInternalCalls = (viewOptions: AnyGraphViewOptions): BooleanState | undefined => {
  const value = viewOptions["showInternalCalls"];
  if (value === undefined) return undefined;
  const setValue = (newValue: boolean): void => {
    viewOptions["showInternalCalls"] = newValue;
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

const ShowIntraAssemblyCalls: React.FunctionComponent<ChooseGraphViewOptionsProps> = (
  props: ChooseGraphViewOptionsProps
) => {
  const { viewOptions, onViewOptions } = props;
  const booleanState = getShowInternalCalls(viewOptions);
  if (!booleanState) return <></>;
  const [value, setValue] = booleanState;
  return (
    <p>
      <Checkbox
        label="Show internals"
        checked={value}
        onChange={(newValue: boolean) => {
          setValue(newValue);
          onViewOptions(viewOptions);
        }}
      />
    </p>
  );
};

const ShowCustom: React.FunctionComponent<ChooseGraphViewOptionsProps> = (props: ChooseGraphViewOptionsProps) => {
  const { viewOptions, onViewOptions } = props;
  if (!isCustomViewOptions(viewOptions)) return <></>;

  const groupBy = isCustomManual(viewOptions) ? (
    <Select
      label="Group by"
      value={viewOptions.clusterBy.length ? viewOptions.clusterBy[0] : undefined}
      options={viewOptions.nodeProperties}
      onChange={(newValue: string | undefined) => {
        viewOptions.clusterBy = !newValue ? [] : [newValue];
        onViewOptions(viewOptions);
      }}
      isOptional={true}
    />
  ) : (
    <></>
  );

  return (
    <p>
      {groupBy}
      <Checkboxes
        label="Filter by"
        options={viewOptions.tags.map((tag) => ({ checked: tag.shown, label: tag.tag, key: tag.tag }))}
        onChange={(key: string, newValue: boolean) => {
          const found = viewOptions.tags.find((tag) => tag.tag === key);
          if (!found) return; // shouldn't happen
          found.shown = newValue;
          onViewOptions(viewOptions);
        }}
      />
    </p>
  );
};

const ShowEdgeLabels: React.FunctionComponent<ChooseGraphViewOptionsProps> = (props: ChooseGraphViewOptionsProps) => {
  const { viewOptions, onViewOptions } = props;
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
          onViewOptions(viewOptions);
        }}
      />
      <br />
      <Checkbox
        label="Leaf edges"
        checked={showEdgeLabels.leafs}
        onChange={(newValue) => {
          showEdgeLabels.leafs = newValue;
          onViewOptions(viewOptions);
        }}
      />
    </p>
  );
};

const ShowClustered: React.FunctionComponent<ChooseGraphViewOptionsProps> = (props: ChooseGraphViewOptionsProps) => {
  const { viewOptions, onViewOptions } = props;
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
              onViewOptions(viewOptions);
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
          onViewOptions(viewOptions);
        }}
      />
      <p>
        <Checkbox
          label="Nested clusters"
          checked={showClustered.nestedClusters}
          onChange={(newValue: boolean) => {
            showClustered.nestedClusters = newValue;
            onViewOptions(viewOptions);
          }}
        />
      </p>
    </>
  );
};

type ChooseGraphViewOptionsProps = {
  viewOptions: GraphViewOptions;
  onViewOptions: (viewOptions: GraphViewOptions) => void;
  appOptions: AppOptions;
  onAppOptions: (appOptions: AppOptions) => void;
};

export const ChooseGraphViewOptions: React.FunctionComponent<ChooseGraphViewOptionsProps> = (
  props: ChooseGraphViewOptionsProps
) => {
  const { viewOptions, appOptions, onAppOptions } = props;
  const { isClosed, onToggle } = detailsClosed(appOptions, onAppOptions, viewOptions.viewType);

  return (
    <details open={!isClosed} onToggle={(event) => onToggle(event.currentTarget)}>
      <summary>Options</summary>
      {ShowClustered(props)}
      {ShowCustom(props)}
      {ShowEdgeLabels(props)}
      {ShowIntraAssemblyCalls(props)}
    </details>
  );
};

const detailsClosed = (
  appOptions: AppOptions,
  onAppOptions: (appOptions: AppOptions) => void,
  viewType: OptionsType
) => {
  const isClosed = appOptions.detailsClosed?.includes(viewType) ?? false;

  const onToggle = (element: HTMLDetailsElement) => {
    log(`open=${element.open}`);
    const isOpen = element.open;
    const detailsClosed = appOptions.detailsClosed;
    let isChanged = false;
    if (!detailsClosed) {
      if (!isOpen) {
        appOptions.detailsClosed = [viewType];
        isChanged = true;
      }
    } else if (isOpen && detailsClosed.includes(viewType)) {
      detailsClosed.splice(detailsClosed.indexOf(viewType), 1);
      isChanged = true;
    } else if (!isOpen && !detailsClosed.includes(viewType)) {
      detailsClosed.push(viewType);
      isChanged = true;
    }
    if (isChanged) onAppOptions(appOptions);
  };
  return { isClosed, onToggle };
};

type ChooseAppOptionsProps = {
  appOptions: AppOptions;
  onAppOptions: (appOptions: AppOptions) => void;
};
export const ChooseAppOptions: React.FunctionComponent<ChooseAppOptionsProps> = (props: ChooseAppOptionsProps) => {
  const { appOptions, onAppOptions } = props;
  const { isClosed, onToggle } = detailsClosed(appOptions, onAppOptions, "app");

  return (
    <details open={!isClosed} onToggle={(event) => onToggle(event.currentTarget)}>
      <summary>Options</summary>
      <p>
        Show compiler-defined types:
        <br />
        <Checkbox
          label="Types"
          checked={!!appOptions.showCompilerGeneratedTypes}
          onChange={(newValue) => {
            appOptions.showCompilerGeneratedTypes = newValue;
            onAppOptions(appOptions);
          }}
        />
        <br />
        <Checkbox
          label="Methods"
          checked={!!appOptions.showCompilerGeneratedMethod}
          onChange={(newValue) => {
            appOptions.showCompilerGeneratedMethod = newValue;
            onAppOptions(appOptions);
          }}
        />
        <br />
        <Checkbox
          label="View menu"
          checked={!!appOptions.showCompilerGeneratedMenuItem}
          onChange={(newValue) => {
            appOptions.showCompilerGeneratedMenuItem = newValue;
            onAppOptions(appOptions);
          }}
        />
      </p>
    </details>
  );
};

type ChooseCompilerViewOptionsProps = {
  viewOptions: CompilerViewOptions;
  onViewOptions: (viewOptions: CompilerViewOptions) => void;
  appOptions: AppOptions;
  onAppOptions: (appOptions: AppOptions) => void;
};

export const ChooseCompilerViewOptions: React.FunctionComponent<ChooseCompilerViewOptionsProps> = (
  props: ChooseCompilerViewOptionsProps
) => {
  const { viewOptions, onViewOptions, appOptions, onAppOptions } = props;
  const { isClosed, onToggle } = detailsClosed(appOptions, onAppOptions, viewOptions.viewType);

  return (
    <details open={!isClosed} onToggle={(event) => onToggle(event.currentTarget)}>
      <summary>Options</summary>
      <p>
        <Checkbox
          label="Show errors only"
          checked={viewOptions.errorsOnly}
          onChange={(newValue: boolean) => {
            viewOptions.errorsOnly = newValue;
            onViewOptions(viewOptions);
          }}
        />
      </p>
    </details>
  );
};
