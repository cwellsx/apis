import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigurationSchema, ConfigurationView } from "../../electron-app/src/renderer/components/Configuration";

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

test("renders and edits form", async () => {
  const data = { showEdges: true, opacity: 0.8, layoutMode: "grid" };
  const onChange = vi.fn();
  const user = userEvent.setup();

  render(<ConfigurationView section="myExtension" schema={exampleSchema} data={data} onChange={onChange} />);

  expect((screen.getByLabelText("showEdges") as unknown as HTMLInputElement).checked).toBe(true);

  await user.click(screen.getByLabelText("showEdges"));
  await user.selectOptions(screen.getByLabelText("layoutMode"), "tree");

  expect(onChange).toHaveBeenCalledWith({ showEdges: false, opacity: 0.8, layoutMode: "tree" });
});
