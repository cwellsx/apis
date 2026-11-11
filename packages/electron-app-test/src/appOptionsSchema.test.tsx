import { render, screen } from "@testing-library/react";
import { defaultAppOptions } from "backend-ui";
import { appOptionsSchemas, appOptionsSection } from "../../electron-app/src/renderer/appOptionsSchema";
import { ConfigurationView } from "../../electron-app/src/renderer/configuration";
import { zooms } from "../../electron-app/src/renderer/useZoomPercent";

test("describes every option of the app, grouped, using the same zoom steps as the mouse wheel", () => {
  const { container } = render(
    <ConfigurationView
      section={appOptionsSection}
      schema={appOptionsSchemas}
      data={defaultAppOptions}
      openGroups={appOptionsSchemas.map((group) => group.title)}
    />
  );

  // the settings editor shows settings in lexicographical order, whatever order the schema declares them in
  const shown = [...container.querySelectorAll("[aria-label]")].map((element) => element.getAttribute("aria-label"));
  expect(shown).toEqual(["fontSize", "zoomPercent", "clusterNamespaces"]);

  // the groups, and what each of them holds: the options are assigned to a group by construction
  expect(appOptionsSchemas.map((group) => group.title)).toEqual(["Size", "Progressive Reveal"]);
  expect(Object.keys(appOptionsSchemas[0].properties)).toEqual(["apis.zoomPercent", "apis.fontSize"]);
  expect(Object.keys(appOptionsSchemas[1].properties)).toEqual(["apis.clusterNamespaces"]);

  // zoom is a list, and it is the list the wheel moves through, so that the two cannot disagree
  const zoom = screen.getByLabelText<HTMLSelectElement>("zoomPercent");
  expect(Array.from(zoom.options).map((option) => Number(option.value))).toEqual(zooms);
  expect(zoom.value).toBe(String(defaultAppOptions.zoomPercent));
  // the labels say what the numbers mean, without changing what they are
  expect(zoom.selectedOptions[0].textContent).toBe(`${defaultAppOptions.zoomPercent}%`);

  // font size is a number, typed and committed when the edit ends
  const fontSize = screen.getByLabelText<HTMLInputElement>("fontSize");
  expect(fontSize.type).toBe("number");
  expect(fontSize.value).toBe(String(defaultAppOptions.fontSize));

  // the option which turns namespace clustering on and off, off by default being the new behaviour
  const clusterNamespaces = screen.getByLabelText<HTMLInputElement>("clusterNamespaces");
  expect(clusterNamespaces.type).toBe("checkbox");
  expect(clusterNamespaces.checked).toBe(defaultAppOptions.clusterNamespaces);

  // only the fields of AppOptions are shown, so anything the model no longer has is not shown at all
  expect(screen.queryByLabelText("showCompilerGeneratedTypes")).toBeNull();
  expect(screen.queryByLabelText("showCompilerGeneratedMethod")).toBeNull();
  expect(screen.queryByLabelText("detailsClosed")).toBeNull();
});
