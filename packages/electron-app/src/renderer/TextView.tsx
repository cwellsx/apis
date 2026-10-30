import { AppOptions, TextView as TextViewData } from "backend-ui";
import * as React from "react";
import { Message } from "./elements";
import { OnAppOptions } from "./onEvent";
import "./TextView.scss";
import { OnWheel } from "./useZoomPercent";

type TextViewProps = {
  view: TextViewData;
  fontSize: number;
  onWheelFontSize: OnWheel;
  appOptions: AppOptions;
  onAppOptions: OnAppOptions;
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

const getText = (props: TextViewProps): React.ReactNode => {
  const { view } = props;

  return <Message message={view.text} />;
};
