import type {
  AppOptions,
  DetailEvent,
  FilterEvent,
  GraphEvent,
  OnUserEvent,
  ViewDetails,
  ViewGraph,
  ViewOptions,
} from "backend-types";
import { nodeIdToText, textToNodeId } from "backend-types";
import * as React from "react";
import { AssemblyDetails } from "./AssemblyDetails";
import { CustomDetails } from "./CustomDetails";
import { Message } from "./elements";
import { Graph } from "./Graph";
import { MethodDetails } from "./MethodDetails";
import { ChooseGraphViewOptions } from "./Options";
import { Tree } from "./Tree";

export const getLeft = (
  view: ViewGraph,
  onViewOptions: (viewOptions: ViewOptions) => void,
  onGraphFilter: (filterEvent: FilterEvent) => void,
  appOptions: AppOptions,
  onAppOptions: (appOptions: AppOptions) => void
): JSX.Element => {
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
      <Tree
        checkModel={checkModel}
        nodes={view.groups}
        leafVisible={leafVisible.map(nodeIdToText)}
        groupExpanded={groupExpanded.map(nodeIdToText)}
        setLeafVisible={(names) =>
          onGraphFilter({ viewOptions, graphFilter: { ...graphFilter, leafVisible: names.map(textToNodeId) } })
        }
        setGroupExpanded={(names) =>
          onGraphFilter({ viewOptions, graphFilter: { ...graphFilter, groupExpanded: names.map(textToNodeId) } })
        }
      />
    </>
  );
};

export const getCenter = (view: ViewGraph, onGraphEvent: OnUserEvent<GraphEvent>, zoomPercent: number): JSX.Element => {
  // display a message, or an image if there is one
  if (typeof view.image === "string") return <Message message={view.image} />;

  return (
    <Graph
      imagePath={view.image.imagePath}
      areas={view.image.areas}
      now={view.image.now}
      zoomPercent={zoomPercent}
      onGraphEvent={onGraphEvent}
      useKeyStates={view.graphViewOptions.viewType == "references"}
      viewType={view.graphViewOptions.viewType}
    />
  );
};

export const getRight = (
  details: ViewDetails | undefined,
  onDetailEvent: OnUserEvent<DetailEvent>
): JSX.Element | undefined => {
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
