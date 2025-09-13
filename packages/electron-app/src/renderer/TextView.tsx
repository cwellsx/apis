import * as React from "react";
import { AppOptions, OnUserEvent, ViewOptions, ViewText } from "../shared-types";
import { Message, TextCompiler, TextCustomErrors, TextErrors } from "./elements";
import { ChooseCompilerViewOptions } from "./Options";
import "./TextView.scss";
import { OnWheel } from "./useZoomPercent";

type TextViewProps = {
  view: ViewText;
  fontSize: number;
  onWheelFontSize: OnWheel;
  onViewOptions: OnUserEvent<ViewOptions>;
  appOptions: AppOptions;
  onAppOptions: OnUserEvent<AppOptions>;
};
export const TextView: React.FunctionComponent<TextViewProps> = (props: TextViewProps) => {
  const { fontSize, onWheelFontSize } = props;
  const style = { fontSize: fontSize };

  const text = getText(props);
  return (
    <div id="textView" onWheel={onWheelFontSize} style={style}>
      {text}
      <div className="zoom bottom">{`${fontSize}px`}</div>
    </div>
  );
};

const getText = (props: TextViewProps): JSX.Element => {
  const { view } = props;
  switch (view.viewType) {
    case "greeting":
      return <Message message={view.greeting} />;
    case "errors":
      return <TextErrors view={view} />;
    case "customErrors":
      return <TextCustomErrors view={view} />;
    case "compiler": {
      const { onViewOptions, appOptions, onAppOptions } = props;
      const chooseOptions = (
        <ChooseCompilerViewOptions
          viewOptions={view.textViewOptions}
          onViewOptions={onViewOptions}
          appOptions={appOptions}
          onAppOptions={onAppOptions}
        />
      );
      return <TextCompiler view={view} chooseOptions={chooseOptions} />;
    }
  }
};
