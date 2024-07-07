import * as React from "react";
import type {
  AppOptions,
  FilterEvent,
  OnDetailClick,
  OnGraphClick,
  ViewDetails,
  ViewGraph,
  ViewOptions,
} from "../shared-types";
import { nodeIdToText, textToNodeId } from "../shared-types";
import { AssemblyDetails } from "./AssemblyDetails";
import { Graph } from "./Graph";
import { Message } from "./Message";
import { MethodDetails } from "./MethodDetails";
import { AppOptionsDetails, ViewOptionsDetails } from "./Options";
import { Tree } from "./Tree";

export const getLeft = (
  view: ViewGraph,
  onViewOptions: (viewOptions: ViewOptions) => void,
  onGraphFilter: (filterEvent: FilterEvent) => void,
  appOptions: AppOptions,
  setAppOptions: (appOptions: AppOptions) => void
): JSX.Element => {
  const viewOptions = view.graphViewOptions;
  const { leafVisible, groupExpanded } = view.graphFilter;
  return (
    <>
      <ViewOptionsDetails
        viewOptions={view.graphViewOptions}
        setViewOptions={onViewOptions}
        appOptions={appOptions}
        setAppOptions={setAppOptions}
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

export const getCenter = (view: ViewGraph, onGraphClick: OnGraphClick, zoomPercent: number): JSX.Element => {
  // display a message, or an image if there is one
  if (typeof view.image === "string") return <Message message={view.image} />;

  return (
    <Graph
      imagePath={view.image.imagePath}
      areas={view.image.areas}
      now={view.image.now}
      zoomPercent={zoomPercent}
      onGraphClick={onGraphClick}
      useKeyStates={view.graphViewOptions.viewType == "references"}
      viewType={view.graphViewOptions.viewType}
    />
  );
};

export const getRight = (details: ViewDetails | undefined, onDetailClick: OnDetailClick): JSX.Element | undefined => {
  if (!details) return undefined;
  switch (details.detailType) {
    case "assemblyDetails":
      return <AssemblyDetails types={details} onDetailClick={onDetailClick} />;
    case "methodDetails":
      return <MethodDetails methodBody={details} />;
  }
};

export const getAppOptions = (appOptions: AppOptions, setAppOptions: (appOptions: AppOptions) => void): JSX.Element => {
  return <AppOptionsDetails appOptions={appOptions} setAppOptions={setAppOptions} />;
};
