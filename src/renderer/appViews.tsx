import * as React from "react";
import type {
  OnDetailClick,
  OnGraphClick,
  View,
  ViewDetails,
  ViewErrors,
  ViewGreeting,
  ViewOptions,
} from "../shared-types";
import { nodeIdToText, textToNodeId } from "../shared-types";
import { Details } from "./Details";
import { ErrorDetails } from "./ErrorDetails";
import { Graph } from "./Graph";
import { Message } from "./Message";
import { MethodDetails } from "./MethodDetails";
import { Options } from "./Options";
import { Tree } from "./Tree";

export function isGreeting(view: View): view is ViewGreeting {
  return view.viewOptions.viewType === "greeting";
}
export function isErrors(view: View): view is ViewErrors {
  return view.viewOptions.viewType === "errors";
}

export const getLeft = (view: View, onViewOptions: (viewOptions: ViewOptions) => void): JSX.Element => {
  if (isGreeting(view) || isErrors(view)) return <></>;

  const viewOptions = view.viewOptions;
  return (
    <>
      <Options viewOptions={view.viewOptions} setViewOptions={onViewOptions} />
      <Tree
        nodes={view.groups}
        leafVisible={viewOptions.leafVisible.map(nodeIdToText)}
        groupExpanded={viewOptions.groupExpanded.map(nodeIdToText)}
        setLeafVisible={(names) => onViewOptions({ ...viewOptions, leafVisible: names.map(textToNodeId) })}
        setGroupExpanded={(names) => onViewOptions({ ...viewOptions, groupExpanded: names.map(textToNodeId) })}
      />
    </>
  );
};

export const getCenter = (view: View, onGraphClick: OnGraphClick, zoomPercent: number): JSX.Element => {
  if (isGreeting(view)) return <Message message={view.greeting} />;

  if (isErrors(view))
    return (
      <>
        {view.customErrors?.map((customError, index) => (
          <ErrorDetails error={customError} key={index} />
        ))}
        {view.methods?.map((methodBody, index) => (
          <MethodDetails methodBody={methodBody} key={index} />
        ))}
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

export const getRight = (details: ViewDetails | undefined, onDetailClick: OnDetailClick): JSX.Element => {
  if (!details) return <></>;
  if (details.detailType === "types") return <Details types={details} onDetailClick={onDetailClick} />;
  return <MethodDetails methodBody={details} />;
};
