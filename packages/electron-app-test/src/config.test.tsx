import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigurationSchema, ConfigurationView } from "../../electron-app/src/renderer/configuration";

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

// A group is closed until the caller opens it, and the tests are about what is inside one, so they open it --
// which in the app is the window's own state, not the component's.
const view = (data: Record<string, unknown>, onChange: (values: Record<string, unknown>) => void) => (
  <ConfigurationView
    section="myExtension"
    schema={exampleSchema}
    data={data}
    openGroups={["My Extension Options"]}
    onChange={onChange}
  />
);

test("renders and edits form", async () => {
  const data = { showEdges: true, opacity: 0.8, layoutMode: "grid" };
  const onChange = vi.fn();
  const user = userEvent.setup();

  render(view(data, onChange));

  expect(screen.getByLabelText<HTMLInputElement>("showEdges").checked).toBe(true);

  // Each edit is reported on its own: the values it was given, with only the edited key changed. So the second
  // report still says showEdges is true, because the panel never applied the first edit -- the app is what
  // decides what becomes of it.
  await user.click(screen.getByLabelText("showEdges"));
  expect(onChange).toHaveBeenNthCalledWith(1, { showEdges: false, opacity: 0.8, layoutMode: "grid" });

  await user.selectOptions(screen.getByLabelText("layoutMode"), "tree");
  expect(onChange).toHaveBeenNthCalledWith(2, { showEdges: true, opacity: 0.8, layoutMode: "tree" });

  expect(onChange).toHaveBeenCalledTimes(2);
});

test("reports an edit without applying it, and follows the value it is given", async () => {
  const data = { showEdges: true, opacity: 0.8, layoutMode: "grid" };
  const onChange = vi.fn();
  const user = userEvent.setup();

  const { rerender } = render(view(data, onChange));

  await user.selectOptions(screen.getByLabelText("layoutMode"), "tree");

  // the edit is reported, and nothing else happens: the control still shows the value it was given
  expect(onChange).toHaveBeenCalledWith({ showEdges: true, opacity: 0.8, layoutMode: "tree" });
  expect(screen.getByLabelText<HTMLSelectElement>("layoutMode").value).toBe("grid");

  // it changes when -- and only when -- the new value arrives from outside
  rerender(view({ ...data, layoutMode: "tree" }, onChange));
  expect(screen.getByLabelText<HTMLSelectElement>("layoutMode").value).toBe("tree");
});

test("commits a typed value when the edit ends, and not on each keystroke", async () => {
  const data = { showEdges: true, opacity: 0.8, layoutMode: "grid" };
  const onChange = vi.fn();
  const user = userEvent.setup();

  render(view(data, onChange));

  const opacity = screen.getByLabelText("opacity");
  await user.click(opacity);

  // Typing is not reported. jsdom refuses "0." as an intermediate value of a number input, so the keystrokes
  // are set directly rather than typed.
  fireEvent.change(opacity, { target: { value: "0" } });
  fireEvent.change(opacity, { target: { value: "0.5" } });
  expect(onChange).not.toHaveBeenCalled();

  // moving on ends the edit, and that is what is reported
  await user.tab();
  expect(onChange).toHaveBeenCalledWith({ showEdges: true, opacity: 0.5, layoutMode: "grid" });
});

test("refuses a value the schema does not allow, and shows the value it was given again", async () => {
  const data = { showEdges: true, opacity: 0.8, layoutMode: "grid" };
  const onChange = vi.fn();
  const user = userEvent.setup();
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  render(view(data, onChange));

  const opacity = screen.getByLabelText("opacity");
  await user.click(opacity);
  fireEvent.change(opacity, { target: { value: "2" } }); // above the maximum of 1
  await user.tab();

  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByLabelText<HTMLInputElement>("opacity").value).toBe("0.8");
  warn.mockRestore();
});

test("shows a schema as a group, closed until the caller opens it", async () => {
  const data = { showEdges: true, opacity: 0.8, layoutMode: "grid" };
  const onToggleGroup = vi.fn();
  const user = userEvent.setup();

  // no openGroups, which is what a group which has never been opened looks like
  render(
    <ConfigurationView
      section="myExtension"
      schema={exampleSchema}
      data={data}
      onToggleGroup={onToggleGroup}
      onChange={vi.fn()}
    />
  );

  const summary = screen.getByText("My Extension Options");
  expect(summary.closest("details")?.open).toBe(false);

  // opening it is reported rather than done: the caller is what remembers that it is open
  await user.click(summary);
  expect(onToggleGroup).toHaveBeenCalledWith("My Extension Options", true);
});
