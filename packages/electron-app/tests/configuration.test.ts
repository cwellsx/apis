import { getConfiguration, ConfigurationSchema } from "../src/renderer/components/Configuration";

const exampleSchema: ConfigurationSchema = {
  title: "My Extension Options",
  properties: {
    "myExtension.showEdges": {
      type: "boolean",
      default: true,
      description: "Show edges in the graph.",
    },
    "myExtension.opacity": {
      type: "number",
      default: 0.8,
      minimum: 0,
      maximum: 1,
      description: "Opacity of nodes.",
    },
    "myExtension.layoutMode": {
      type: "string",
      enum: ["grid", "tree", "force"],
      default: "grid",
      description: "Layout mode.",
    },
  },
};

const run = (): void => {
  const config = getConfiguration("myExtension", exampleSchema, {
    showEdges: true,
    opacity: 0.8,
    layoutMode: "grid",
  });

  const showEdges = config.get<boolean>("showEdges");
  const opacity = config.get<number>("opacity");
  const layoutMode = config.get<string>("layoutMode");

  console.log("showEdges =", showEdges);
  console.log("opacity =", opacity);
  console.log("layoutMode =", layoutMode);

  if (showEdges !== true) throw new Error("initial showEdges expected true");
  if (opacity !== 0.8) throw new Error("initial opacity expected 0.8");
  if (layoutMode !== "grid") throw new Error("initial layoutMode expected grid");

  config.update("opacity", 0.5);
  if (config.get<number>("opacity") !== 0.5) throw new Error("update opacity failed");
  if (config.toObject().opacity !== 0.5) throw new Error("toObject opacity failed");

  let threw = false;
  try {
    config.update("layoutMode", "nope");
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected validation error for invalid enum");

  const c2 = getConfiguration("myExtension", exampleSchema, { opacity: 99 } as any);
  if (c2.get<number>("opacity") !== 0.8) throw new Error("invalid initial should fall back to default");

  const unknown = config.get<number>("doesNotExist", 42);
  if (unknown !== 42) throw new Error("default value for unknown key failed");

  console.log("configuration.test: succeeded");
};
run();
