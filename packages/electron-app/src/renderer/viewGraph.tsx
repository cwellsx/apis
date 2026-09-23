import type {
  AppOptions,
  OnAppOptions,
  OnDetailEvent,
  OnFilterEvent,
  OnGraphEvent,
  OnViewOptions,
  ViewDetails,
  ViewGraph,
} from "backend-ui";
import * as React from "react";
import { AssemblyDetails } from "./AssemblyDetails";
import { CustomDetails } from "./CustomDetails";
import { Message } from "./elements";
import { Graph } from "./Graph";
import { MethodDetails } from "./MethodDetails";
import { Nodes } from "./Nodes";
import { ChooseGraphViewOptions } from "./Options";

export const getLeft = (
  view: ViewGraph,
  onViewOptions: OnViewOptions,
  onFilterEvent: OnFilterEvent,
  appOptions: AppOptions,
  onAppOptions: OnAppOptions
): React.ReactNode => {
  const { graphViewOptions: viewOptions, graphFilter } = view;
  const { leafVisible, groupExpanded, isCheckModelAll } = graphFilter;
  const checkModel = isCheckModelAll ? "all" : "leaf";
  return (
    <>
      <ChooseGraphViewOptions
        viewOptions={view.graphViewOptions}
        onViewOptions={onViewOptions}
        appOptions={appOptions}
        onAppOptions={onAppOptions}
      />
      <Nodes checkModel={checkModel} nodes={view.groups} onFilterEvent={onFilterEvent} />
    </>
  );
};

export const getCenter = (view: ViewGraph, onGraphEvent: OnGraphEvent, zoomPercent: number): React.ReactNode => {
  // display a message, or an image if there is one
  if (typeof view.image === "string") return <Message message={view.image} />;

  return (
    <Graph
      imagePath={view.image.imagePath}
      areas={view.image.areas}
      now={view.image.now}
      zoomPercent={zoomPercent}
      onGraphEvent={onGraphEvent}
      useKeyStates={view.graphViewOptions.graphType == "references"}
    />
  );
};

export const getRight = (
  details: ViewDetails | undefined,
  onDetailEvent: OnDetailEvent
): React.ReactNode | undefined => {
  if (!details) return undefined;
  switch (details.detailType) {
    case "assemblyDetails":
      return <AssemblyDetails types={details} onDetailEvent={onDetailEvent} />;
    case "methodDetails":
      return <MethodDetails methodBody={details} />;
    case "customDetails":
      return <CustomDetails details={details} />;
  }
};
