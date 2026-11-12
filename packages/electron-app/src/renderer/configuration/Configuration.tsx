import * as React from "react";
import type { ConfigurationProperty, ConfigurationSchema } from "backend-config";
import "./Configuration.scss";

// --- Helpers ---

const stripSectionPrefix = (key: string, section: string): string => {
  const prefix = `${section}.`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
};

// `zoomPercent` as the settings editor shows its name: `Zoom Percent`
const toName = (key: string): string =>
  key
    .replace(/[-_]/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (first) => first.toUpperCase());

// The settings editor shows settings in lexicographical order, rather than the order in which a schema happens
// to declare them, and this is that order. Compared ordinally rather than by a locale, so that the panel reads
// the same whatever the machine is set to.
const sortKeys = (keys: string[]): string[] => [...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));

const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

const isNumber = (v: unknown): v is number => typeof v === "number" && !Number.isNaN(v);

const isString = (v: unknown): v is string => typeof v === "string";

const validateValue = (prop: ConfigurationProperty, value: unknown): string | null => {
  switch (prop.type) {
    case "boolean":
      return isBoolean(value) ? null : `expected boolean, got ${typeof value}`;
    case "number": {
      if (!isNumber(value)) return `expected number, got ${typeof value}`;
      if (prop.enum && !prop.enum.includes(value)) return `value ${value} not in enum [${prop.enum.join(", ")}]`;
      if (prop.minimum !== undefined && value < prop.minimum) return `value ${value} below minimum ${prop.minimum}`;
      if (prop.maximum !== undefined && value > prop.maximum) return `value ${value} above maximum ${prop.maximum}`;
      return null;
    }
    case "string": {
      if (!isString(value)) return `expected string, got ${typeof value}`;
      if (prop.enum && !prop.enum.includes(value)) return `value "${value}" not in enum [${prop.enum.join(", ")}]`;
      return null;
    }
    case "array":
      return Array.isArray(value) ? null : `expected array, got ${typeof value}`;
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value)
        ? null
        : `expected object, got ${typeof value}`;
    default:
      return `unknown type ${String(prop.type)}`;
  }
};

// --- Configuration instance (WorkspaceConfiguration analogue) ---

type ConfigurationChangeListener = (key: string, value: unknown) => void;

type Configuration<T extends Record<string, unknown> = Record<string, unknown>> = {
  readonly section: string;
  readonly schema: ConfigurationSchema;
  keys: () => string[];
  has: (key: string) => boolean;
  get: {
    <K extends keyof T>(key: K): T[K];
    <U = unknown>(key: string, defaultValue?: U): U;
    (key: string, defaultValue?: unknown): unknown;
  };
  update: (key: string, value: unknown) => void;
  reset: () => void;
  toObject: () => T;
  onChange: (listener: ConfigurationChangeListener) => () => void;
  offChange: (listener: ConfigurationChangeListener) => void;
  getProperty: (key: string) => ConfigurationProperty | undefined;
  getTitle: () => string;
};

export const getConfiguration = <T extends Record<string, unknown> = Record<string, unknown>>(
  section: string,
  schema: ConfigurationSchema,
  initialValues?: Partial<T>
): Configuration<T> => {
  const properties: Record<string, ConfigurationProperty> = {};
  const defaults: Record<string, unknown> = {};
  for (const [fullKey, prop] of Object.entries(schema.properties)) {
    const shortKey = stripSectionPrefix(fullKey, section);
    properties[shortKey] = prop;
    if (prop.default !== undefined) defaults[shortKey] = prop.default;
  }

  const values: Record<string, unknown> = {};
  for (const shortKey of Object.keys(properties)) {
    if (defaults[shortKey] !== undefined) {
      values[shortKey] = defaults[shortKey];
    }
  }

  if (initialValues) {
    for (const [k, v] of Object.entries(initialValues)) {
      if (properties[k] === undefined) continue;
      const prop = properties[k];
      const err = validateValue(prop, v);
      if (err) {
        console.warn(`Configuration: invalid initial value for "${k}": ${err}; using default.`);
        continue;
      }
      values[k] = v;
    }
  }

  const listeners = new Set<ConfigurationChangeListener>();

  const has = (key: string): boolean => Object.prototype.hasOwnProperty.call(properties, key);

  const get = (key: string, defaultValue?: unknown): unknown => {
    if (!has(key)) {
      console.warn(`Configuration: unknown key "${key}" for section "${section}".`);
    }
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key];
    }
    if (defaultValue !== undefined) return defaultValue;
    return defaults[key];
  };

  const update = (key: string, value: unknown): void => {
    const prop = properties[key];
    if (!prop) {
      throw new Error(`Configuration: unknown key "${key}" for section "${section}".`);
    }
    const err = validateValue(prop, value);
    if (err) throw new Error(`Configuration: invalid value for "${key}": ${err}.`);
    values[key] = value;
    for (const listener of listeners) listener(key, value);
  };

  const reset = (): void => {
    for (const key of Object.keys(values)) delete values[key];
    Object.assign(values, defaults);
    for (const key of Object.keys(values)) {
      for (const listener of listeners) listener(key, values[key]);
    }
  };

  const toObject = (): T => ({ ...values }) as T;

  const onChange = (listener: ConfigurationChangeListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const offChange = (listener: ConfigurationChangeListener): void => {
    listeners.delete(listener);
  };

  const keys = (): string[] => Object.keys(properties);

  const getProperty = (key: string): ConfigurationProperty | undefined => properties[key];

  const getTitle = (): string => schema.title;

  return {
    section,
    schema,
    keys,
    has,
    get: get as unknown as Configuration<T>["get"],
    update,
    reset,
    toObject,
    onChange,
    offChange,
    getProperty,
    getTitle,
  };
};

// --- React component ---

// One source of options: the section they belong to, the schema or schemas which describe them, the values they
// currently have, and where an edit is reported. Several are shown at once -- the app's options and a view's --
// and this is what tells one from another.
type ConfigurationSource = {
  section?: string;
  // one schema, or several: several are shown as groups, each under its own title, which is how the settings
  // editor shows the configuration of an extension
  schema: ConfigurationSchema | ConfigurationSchema[];
  data?: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
};

// One group of one source, with everything needed to render it: a group belongs to a source, so it reads that
// source's values and reports through that source's listener.
type ConfigurationGroup = {
  key: string;
  title: string;
  section: string;
  configuration: Configuration;
  values: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
};

type ConfigurationViewProps = {
  sources: ConfigurationSource[];
  // which groups are open. Where that is kept is the caller's business: here it is the window's state, so a
  // group stays open until the window closes, and is closed until it is opened.
  openGroups?: string[];
  onToggleGroup?: (group: string, isOpen: boolean) => void;
};

export const ConfigurationView: React.FC<ConfigurationViewProps> = ({ sources, openGroups, onToggleGroup }) => {
  // One configuration object per group, here for the schema and not for the values: the keys, the properties
  // and the validation. They are not stores, so an edit cannot be written into one -- see `report` below.
  const groups = React.useMemo(
    () =>
      sources.flatMap((source) => {
        const section = source.section ?? "configuration";
        const schemas = Array.isArray(source.schema) ? source.schema : [source.schema];

        // What this source displays: the values it was given, with a schema default for any key they don't
        // mention. Keys no schema describes are kept as they are, so editing one option cannot lose another.
        const values: Record<string, unknown> = { ...source.data };

        return schemas.map((schema) => {
          const configuration = getConfiguration<Record<string, unknown>>(section, schema);
          configuration.keys().forEach((key) => {
            if (values[key] === undefined) {
              const defaultValue = configuration.getProperty(key)?.default;
              if (defaultValue !== undefined) values[key] = defaultValue;
            }
          });
          const title = configuration.getTitle() || "Options";
          // the key of a group is qualified by its section, so that two sources may use the same title
          return { key: `${section}.${title}`, title, section, configuration, values, onChange: source.onChange };
        });
      }),
    [sources]
  );

  // A value which is typed rather than chosen is committed when the edit ends -- on blur, or on Enter -- and
  // not on each keystroke: every commit is a round trip, and a round trip re-renders the graph. The draft is
  // what such an input shows meanwhile, and it is discarded as soon as the edit is reported.
  const [draft, setDraft] = React.useState<Record<string, string>>({});

  const clearDraft = (key: string): void =>
    setDraft((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

  // Report an edit rather than applying it, to the source the group belongs to. The value is validated here, so
  // that one the schema refuses is never sent, and the input falls back to the displayed value, which comes from
  // outside this component.
  const report = (group: ConfigurationGroup, key: string, value: unknown): void => {
    const prop = group.configuration.getProperty(key);
    const error = prop ? validateValue(prop, value) : `unknown key`;
    if (error) {
      console.warn(`Configuration: invalid value for "${key}": ${error}.`);
      return;
    }
    group.onChange?.({ ...group.values, [key]: value });
  };

  // The options of a select are strings, so a number has to be found again by its text, to keep its type
  const toOptionValue = (options: (string | number)[], text: string): string | number =>
    options.find((option) => String(option) === text) ?? text;

  // A typed input shows text, and the value it was given is a string or a number -- or missing
  const toInputText = (value: unknown): string =>
    typeof value === "string" || typeof value === "number" ? String(value) : "";

  // A select for a value which must be one of a list, whether the values are strings or numbers. A value which
  // is not in the list is shown anyway, rather than leaving the select blank: it is what is displayed.
  const renderSelect = (
    group: ConfigurationGroup,
    key: string,
    options: (string | number)[],
    value: unknown,
    labels?: string[]
  ): React.ReactNode => {
    const all = options.includes(value as string | number) ? options : [value as string | number, ...options];
    // a label is only for showing: the value the option stands for is unchanged. A value which is not among the
    // options is shown by its own text, and is labelled with that.
    const toLabel = (option: string | number): string => {
      const index = options.indexOf(option);
      return (index >= 0 ? labels?.[index] : undefined) ?? String(option);
    };
    return (
      <select
        aria-label={key}
        className="configuration-control"
        value={String(value)}
        onChange={(e) => report(group, key, toOptionValue(options, e.target.value))}
      >
        {all.map((option) => (
          <option key={String(option)} value={String(option)}>
            {toLabel(option)}
          </option>
        ))}
      </select>
    );
  };

  // An input for a value which is typed: it shows the draft while it is being edited, and reports the value
  // when the edit ends, so that typing does not cause a round trip for every keystroke.
  const renderTypedInput = (
    group: ConfigurationGroup,
    key: string,
    prop: ConfigurationProperty,
    value: unknown,
    toValue: (text: string) => unknown
  ): React.ReactNode => {
    // a draft belongs to one control of one group, so it is keyed by the section as well as the key
    const draftKey = `${group.section}.${key}`;
    const commit = (text: string): void => {
      clearDraft(draftKey);
      report(group, key, toValue(text));
    };
    return (
      <input
        type={prop.type === "number" ? "number" : "text"}
        aria-label={key}
        className="configuration-control"
        value={draft[draftKey] ?? toInputText(value)}
        min={prop.minimum}
        max={prop.maximum}
        onChange={(e) => setDraft({ ...draft, [draftKey]: e.target.value })}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.value);
          if (e.key === "Escape") clearDraft(draftKey);
        }}
      />
    );
  };

  // A description, in place of the markdown one where there is one. The markdown is not rendered as such:
  // `code spans` are marked up, which is as much of it as these descriptions use.
  const renderDescription = (prop: ConfigurationProperty): React.ReactNode => {
    const text = prop.markdownDescription ?? prop.description;
    if (!text) return null;
    return (
      <div className="configuration-description">
        {text
          .split("`")
          .map((part, index) =>
            index % 2 === 1 ? <code key={index}>{part}</code> : <React.Fragment key={index}>{part}</React.Fragment>
          )}
      </div>
    );
  };

  // A setting is laid out the way the settings editor this schema is written for lays one out: a bold name, the
  // description under it in the same size but muted, and the control under both. A checkbox is the exception:
  // there the description is the control's own label, as it is there. Both front ends use this schema, so the
  // closer the two renderings, the less there is to explain. The classes are in Configuration.scss.
  const renderRow = (key: string, prop: ConfigurationProperty, control: React.ReactNode): React.ReactNode => (
    <div key={key} className="configuration-row">
      <div className="configuration-name">{toName(key)}</div>
      {prop.type === "boolean" ? (
        <div className="configuration-inline">
          {control}
          {renderDescription(prop)}
        </div>
      ) : (
        <>
          {renderDescription(prop)}
          <div>{control}</div>
        </>
      )}
    </div>
  );

  const renderControl = (group: ConfigurationGroup, key: string): React.ReactNode => {
    const prop = group.configuration.getProperty(key);
    if (!prop) return null;
    const value = group.values[key];
    const onChange = (newValue: unknown) => {
      try {
        report(group, key, newValue);
      } catch (e) {
        console.error(e);
      }
    };

    switch (prop.type) {
      case "boolean":
        return renderRow(
          key,
          prop,
          <input type="checkbox" aria-label={key} checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        );
      case "number":
        return renderRow(
          key,
          prop,
          prop.enum && prop.enum.length
            ? renderSelect(group, key, prop.enum, value, prop.enumItemLabels)
            : renderTypedInput(group, key, prop, value, Number)
        );
      case "string":
        return renderRow(
          key,
          prop,
          prop.enum && prop.enum.length
            ? renderSelect(group, key, prop.enum, value, prop.enumItemLabels)
            : renderTypedInput(group, key, prop, value, (text) => text)
        );
      default:
        return renderRow(key, prop, <code>{JSON.stringify(value)}</code>);
    }
  };

  return (
    <div id="options">
      {groups.map((group) => (
        <details
          key={group.key}
          open={openGroups?.includes(group.title) ?? false}
          onToggle={(e) => onToggleGroup?.(group.title, e.currentTarget.open)}
        >
          <summary>{group.title}</summary>
          <div className="configuration-group">
            {sortKeys(group.configuration.keys()).map((key) => renderControl(group, key))}
          </div>
        </details>
      ))}
    </div>
  );
};
