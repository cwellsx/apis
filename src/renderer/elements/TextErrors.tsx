import * as React from "react";
import { BadMethodInfoAndNames, ErrorsInfo, MethodName, ViewErrors } from "../../shared-types";
import { BadMethodCallsDetails, BadMethodException } from "./BadMethodCallsDetails";
import { BadTypeInfoDetails } from "./BadTypeInfoDetails";

type TextErrorsProps = {
  view: ViewErrors;
};
export const TextErrors: React.FunctionComponent<TextErrorsProps> = (props: TextErrorsProps) => {
  const { view } = props;
  const getBadMethodInfo = (badMethodInfo: BadMethodInfoAndNames, index: number, assemblyName: string): JSX.Element => {
    // TODO display badMethodInfo.exception

    const title: MethodName = {
      assemblyName,
      declaringType: badMethodInfo.declaringType,
      methodMember: badMethodInfo.methodMember,
    };

    const badMethodCalls = badMethodInfo.badMethodCalls ? (
      <>
        <h4>Caller errors</h4>
        <BadMethodCallsDetails badMethodCalls={badMethodInfo.badMethodCalls} title={title} />
      </>
    ) : (
      <></>
    );

    const localsTypeError = badMethodInfo.badLocalsTypes ? (
      <>
        <h4>Locals errors</h4>
        {badMethodInfo.badLocalsTypes.map((failLocalsType, index) => (
          <BadMethodException key={index} exception={failLocalsType.error} title={title} />
        ))}
      </>
    ) : (
      <></>
    );

    const exception = badMethodInfo.exception ? (
      <>
        <h4>Decompiler error</h4>
        <BadMethodException exception={badMethodInfo.exception} title={title} />
      </>
    ) : (
      <></>
    );

    return (
      <React.Fragment key={index}>
        {exception}
        {badMethodCalls}
        {localsTypeError}
      </React.Fragment>
    );
  };

  const getErrorsInfo = (errorsInfo: ErrorsInfo, index: number): JSX.Element => {
    // TODO display BadTypeInfo

    const badTypeInfos =
      errorsInfo.badTypeInfos.length > 0 ? (
        <>
          <h4>Type reflection errors</h4>
          <BadTypeInfoDetails badTypeInfos={errorsInfo.badTypeInfos} />
        </>
      ) : (
        <></>
      );

    const assemblyName = errorsInfo.assemblyName;
    return (
      <React.Fragment key={index}>
        <h3>{assemblyName}</h3>
        {badTypeInfos}
        {errorsInfo.badMethodInfos.map((badMethodInfo, index) => getBadMethodInfo(badMethodInfo, index, assemblyName))}
      </React.Fragment>
    );
  };

  return (
    <>
      <h2>Errors</h2>
      {view.errors?.map(getErrorsInfo)}
    </>
  );
};
