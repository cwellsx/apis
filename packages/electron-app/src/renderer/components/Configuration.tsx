import * as React from "react";

// --- Schema types (mirror VS Code's contributes.configuration) ---

export type ConfigurationPropertyType = "boolean" | "number" | "string" | "array" | "object";

export type ConfigurationProperty = {
  type: ConfigurationPropertyType;
  default?: unknown;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  items?: ConfigurationProperty;
};

export type ConfigurationSchema = {
  title: string;
  properties: Record<string, ConfigurationProperty>;
};

export type ContributionSchema = {
  contributes: {
    configuration: ConfigurationSchema | ConfigurationSchema[];
  };
};

// --- Helpers ---

const stripSectionPrefix = (key: string, section: string): string => {
  const prefix = `${section}.`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
};

const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

const isNumber = (v: unknown): v is number => typeof v === "number" && !Number.isNaN(v);

const isString = (v: unknown): v is string => typeof v === "string";

const validateValue = (prop: ConfigurationProperty, value: unknown): string | null => {
  switch (prop.type) {
    case "boolean":
      return isBoolean(value) ? null : `expected boolean, got ${typeof value}`;
    case "number": {
      if (!isNumber(value)) return `expected number, got ${typeof value}`;
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
      return value !== null && typeof value === "object" && !Array.isArray(value) ? null : `expected object, got ${typeof value}`;
    default:
      return `unknown type ${String(prop.type)}`;
  }
};

// --- Configuration instance (WorkspaceConfiguration analogue) ---

export type ConfigurationChangeListener = (key: string, value: unknown) => void;

export type Configuration<T extends Record<string, unknown> = Record<string, unknown>> = {
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
  initialValues?: Partial<T>,
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

  const toObject = (): T => ({ ...values } as T);

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

export type ConfigurationViewProps = {
  section?: string;
  schema: ConfigurationSchema;
  data?: Record<string, unknown>;
  className?: string;
  onChange?: (values: Record<string, unknown>) => void;
};

export const ConfigurationView: React.FC<ConfigurationViewProps> = ({
  section = "configuration",
  schema,
  data,
  className,
  onChange: onChangeProp,
}) => {
  const configuration = React.useMemo(() => getConfiguration<Record<string, unknown>>(section, schema, data), [section, schema, data]);
  const [, setTick] = React.useState(0);
  React.useEffect(() => configuration.onChange(() => setTick((t) => t + 1)), [configuration]);

  const renderControl = (key: string): React.ReactNode => {
    const prop = configuration.getProperty(key);
    if (!prop) return null;
    const value = configuration.get(key);
    const onChange = (newValue: unknown) => {
      try {
        configuration.update(key, newValue);
        if (onChangeProp) onChangeProp(configuration.toObject());
      } catch (e) {
                console.error(e);
      }
    };

    switch (prop.type) {
      case "boolean":
        return (
          <label key={key} style={{ display: "block", marginBottom: 4 }}>
            <input type="checkbox" aria-label={key} checked={!!value} onChange={(e) => onChange(e.target.checked)} />
            {" "}
            {key}
            {prop.description ? <span style={{ marginLeft: 8, color: "#666", fontSize: 12 }}>{prop.description}</span> : null}
          </label>
        );
      case "number":
        return (
          <label key={key} style={{ display: "block", margin: "4px 0" }}>
            {key}:
            <br />
            <input
              type="number"
              aria-label={key}
              value={value as number}
              min={prop.minimum}
              max={prop.maximum}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            {prop.description ? <span style={{ marginLeft: 8, color: "#666", fontSize: 12 }}>{prop.description}</span> : null}
          </label>
        );
      case "string":
        if (prop.enum && prop.enum.length) {
          return (
            <label key={key} style={{ display: "block", margin: "4px 0" }}>
              {key}:
              <br />
              <select aria-label={key} value={value as string} onChange={(e) => onChange(e.target.value)}>
                {prop.enum.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {prop.description ? <span style={{ marginLeft: 8, color: "#666", fontSize: 12 }}>{prop.description}</span> : null}
            </label>
          );
        }
        return (
          <label key={key} style={{ display: "block", margin: "4px 0" }}>
            {key}:
            <br />
            <input type="text" aria-label={key} value={value as string} onChange={(e) => onChange(e.target.value)} />
            {prop.description ? <span style={{ marginLeft: 8, color: "#666", fontSize: 12 }}>{prop.description}</span> : null}
          </label>
        );
      default:
        return (
          <p key={key} style={{ margin: "4px 0" }}>
            {key}: <code>{JSON.stringify(value)}</code>
          </p>
        );
    }
  };

  return (
    <details className={className} open>
      <summary>{configuration.getTitle() || "Options"}</summary>
      <div style={{ paddingLeft: 8 }}>{configuration.keys().map(renderControl)}</div>
    </details>
  );
};

// --- Hook ---

export const useConfiguration = (section: string, schema: ConfigurationSchema, initialValues?: Partial<Record<string, unknown>>) => {
  const config = React.useMemo(() => getConfiguration<Record<string, unknown>>(section, schema, initialValues), [section, schema, initialValues]);
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => config.onChange(() => setVersion((v) => v + 1)), [config]);
  return { config, version };
};
