import * as React from "react";
import type {
  AppOptions,
  FilterEvent,
  OnDetailClick,
  OnGraphClick,
  View,
  ViewDetails,
  ViewErrors,
  ViewGraph,
  ViewGreeting,
  ViewOptions,
  ViewWanted,
} from "../shared-types";
import { nodeIdToText, textToNodeId } from "../shared-types";
import { AssemblyDetails } from "./AssemblyDetails";
import { Graph } from "./Graph";
import { Message } from "./Message";
import { BadCallDetails, MethodDetails } from "./MethodDetails";
import { AppOptionsDetails, ViewOptionsDetails } from "./Options";
import { Tree } from "./Tree";

const isGreeting = (view: View): view is ViewGreeting => view.viewOptions.viewType === "greeting";
const isErrors = (view: View): view is ViewErrors => view.viewOptions.viewType === "errors";
const isWanted = (view: View): view is ViewWanted => view.viewOptions.viewType === "wanted";
export const isViewGraph = (view: View): view is ViewGraph => !isGreeting(view) && !isErrors(view) && !isWanted(view);

export const getLeft = (
  view: View,
  onViewOptions: (viewOptions: ViewOptions) => void,
  onGraphFilter: (filterEvent: FilterEvent) => void,
  appOptions: AppOptions,
  setAppOptions: (appOptions: AppOptions) => void
): JSX.Element => {
  if (!isViewGraph(view)) return <></>;

  const viewOptions = view.viewOptions;
  const { leafVisible, groupExpanded } = view.graphFilter;
  return (
    <>
      <ViewOptionsDetails
        viewOptions={view.viewOptions}
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

export const getCenter = (view: View, onGraphClick: OnGraphClick, zoomPercent: number): JSX.Element => {
  if (isGreeting(view)) return <Message message={view.greeting} />;

  if (isErrors(view))
    return (
      <>
        <h2>Errors</h2>
        {view.customErrors?.map((customError, index) => (
          <section className="errorDetails" key={index}>
            <header>{customError.messages.join("\r\n")}</header>
            <pre>{customError.elementJson}</pre>
          </section>
        ))}
        {view.errors?.map((errorsInfo) =>
          errorsInfo.badCallDetails.map((badCall, index) => (
            <BadCallDetails badCall={badCall} key={errorsInfo.assemblyName + index} />
          ))
        )}
      </>
    );

  if (isWanted(view))
    return (
      <>
        <h2>Compiler-generated types</h2>
        <table>
          <thead>
            <tr>
              <th>Assembly</th>
              <th>Declared In</th>
              <th>This</th>
              <th>Resolved Type</th>
              <th>Resolved Method</th>
            </tr>
          </thead>
          <tbody>
            {view.wanted.map((wanted) => (
              <tr>
                <th>{wanted.assemblyName}</th>
                <th>{wanted.declaringType}</th>
                <th>{wanted.nestedType}</th>
                <th>{wanted.wantedType}</th>
                <th>{wanted.wantedMethod}</th>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );

  // display a message, or an image if there is one
  if (typeof view.image === "string") return <Message message={view.image} />;

  return (
    <Graph
      imagePath={view.image.imagePath}
      areas={view.image.areas}
      now={view.image.now}
      zoomPercent={zoomPercent}
      onGraphClick={onGraphClick}
      useKeyStates={view.viewOptions.viewType == "references"}
      viewType={view.viewOptions.viewType}
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
