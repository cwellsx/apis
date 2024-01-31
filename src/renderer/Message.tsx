import * as React from "react";
import "./Message.css";

type MessageProps = {
  message: string;
};

export const Message: React.FunctionComponent<MessageProps> = (props: MessageProps) => {
  const { message } = props;
  return <div id="greeting">{message}</div>;
};
