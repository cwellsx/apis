import type { ConfigurationSchema } from "backend-config";
import { getConfiguration } from "../../electron-app/src/renderer/configuration/Configuration";

// The store behind ConfigurationView. The view itself is tested in config.test.tsx; this is the half which holds
// values, validates them and reports them, which is reached through it but can be used without it.

const exampleSchema: ConfigurationSchema = {
  title: "My Extension Options",
  properties: {
    "myExtension.showEdges": { type: "boolean", default: true, description: "Show edges in the graph." },
    "myExtension.opacity": { type: "number", default: 0.8, minimum: 0, maximum: 1, description: "Opacity of nodes." },
    "myExtension.layoutMode": {
      type: "string",
      enum: ["grid", "tree", "force"],
      default: "grid",
      description: "Layout mode.",
    },
  },
};

const initialValues = { showEdges: true, opacity: 0.8, layoutMode: "grid" };

test("reads what it is given, and the schema's default for what it is not", () => {
  const config = getConfiguration("myExtension", exampleSchema, { opacity: 0.5 });

  expect(config.get<boolean>("showEdges")).toBe(true); // from the schema
  expect(config.get<number>("opacity")).toBe(0.5); // from the caller
  expect(config.get<string>("layoutMode")).toBe("grid");
});

test("answers the default it is given for a key it does not have, and says the key is unknown", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const config = getConfiguration("myExtension", exampleSchema, initialValues);

  expect(config.get<number>("doesNotExist", 42)).toBe(42);
  expect(warn).toHaveBeenCalled();

  warn.mockRestore();
});

test("accepts a valid update, and reports it through toObject", () => {
  const config = getConfiguration("myExtension", exampleSchema, initialValues);

  config.update("opacity", 0.5);

  expect(config.get<number>("opacity")).toBe(0.5);
  expect(config.toObject().opacity).toBe(0.5);
});

test("refuses a value the schema does not allow, and keeps the value it had", () => {
  const config = getConfiguration("myExtension", exampleSchema, initialValues);

  expect(() => config.update("layoutMode", "nope")).toThrow();
  expect(config.get<string>("layoutMode")).toBe("grid");
});

test("falls back to the default when an initial value is invalid, and says so", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  // 99 is a number, so the types are satisfied: it is the schema's maximum which refuses it
  const config = getConfiguration("myExtension", exampleSchema, { opacity: 99 });

  expect(config.get<number>("opacity")).toBe(0.8);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});
