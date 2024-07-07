import * as React from "react";
import type {
  AppOptions,
  DetailEvent,
  FilterEvent,
  GraphEvent,
  OnUserEvent,
  ViewDetails,
  ViewGraph,
  ViewOptions,
} from "../shared-types";
import { nodeIdToText, textToNodeId } from "../shared-types";
import { AssemblyDetails } from "./AssemblyDetails";
import { Graph } from "./Graph";
import { Message } from "./Message";
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
  const viewOptions = view.graphViewOptions;
  const { leafVisible, groupExpanded } = view.graphFilter;
  return (
    <>
      <ChooseGraphViewOptions
        viewOptions={view.graphViewOptions}
        onViewOptions={onViewOptions}
        appOptions={appOptions}
        onAppOptions={onAppOptions}
      />
      <Tree
        nodes={view.groups}
        leafVisible={leafVisible.map(nodeIdToText)}
        groupExpanded={groupExpanded.map(nodeIdToText)}
        setLeafVisible={(names) =>
          onGraphFilter({ viewOptions, graphFilter: { leafVisible: names.map(textToNodeId), groupExpanded } })
        }
        setGroupExpanded={(names) =>
          onGraphFilter({ viewOptions, graphFilter: { leafVisible, groupExpanded: names.map(textToNodeId) } })
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
  }
};
