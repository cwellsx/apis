import type {
  AppOptions,
  DetailEvent,
  FilterEvent,
  GraphEvent,
  GraphOptions,
  OnUserEvent,
  ViewDetails,
  ViewGraph,
} from "backend-ui";
import { nodeIdToText, textToNodeId } from "backend-ui";
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
  onViewOptions: (viewOptions: GraphOptions.Any) => void,
  onGraphFilter: (filterEvent: FilterEvent) => void,
  appOptions: AppOptions,
  onAppOptions: (appOptions: AppOptions) => void
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
      <Nodes
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

export const getCenter = (
  view: ViewGraph,
  onGraphEvent: OnUserEvent<GraphEvent>,
  zoomPercent: number
): React.ReactNode => {
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
  onDetailEvent: OnUserEvent<DetailEvent>
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
