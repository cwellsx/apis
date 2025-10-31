import { CompilerMethod, LocalsType, ViewCompiler } from "backend/shared-types";
import * as React from "react";

type TextCompilerProps = {
  view: ViewCompiler;
  chooseOptions: JSX.Element;
};
export const TextCompiler: React.FunctionComponent<TextCompilerProps> = (props: TextCompilerProps) => {
  const { view, chooseOptions } = props;
  const errorsOnly = view.textViewOptions.errorsOnly;

  const join = (parts: string[], separator: JSX.Element): React.ReactNode =>
    parts.map((part, index) =>
      !index ? (
        <React.Fragment key={index}>{part}</React.Fragment>
      ) : (
        <React.Fragment key={index}>
          {separator}
          <wbr />
          {part}
        </React.Fragment>
      )
    );

  const split = (text: string): React.ReactNode => (!text ? "" : join(text.split("+"), <br />));

  // it's already sorted alphabetically but now also group by assembly
  const assemblyMethods = new Map<string, CompilerMethod[]>();
  view.compilerMethods.forEach((compilerMethod) => {
    let found = assemblyMethods.get(compilerMethod.assemblyName);
    if (!found) {
      found = [];
      assemblyMethods.set(compilerMethod.assemblyName, found);
    }
    found.push(compilerMethod);
  });

  const assemblyLocals = new Map<string, LocalsType[]>();
  view.localsTypes.forEach((localsType) => {
    let found = assemblyLocals.get(localsType.assemblyName);
    if (!found) {
      found = [];
      assemblyLocals.set(localsType.assemblyName, found);
    }
    found.push(localsType);
  });

  const getLocal = (compilerMethod: CompilerMethod): JSX.Element => {
    const found = assemblyLocals
      .get(compilerMethod.assemblyName)
      ?.find((local) => local.compilerType === compilerMethod.compilerType);
    return found ? (
      <p>
        ({found.ownerType}
        <br />
        {found.ownerMethod})
      </p>
    ) : (
      <></>
    );
  };

  const getOwnerCell = (compilerMethod: CompilerMethod): JSX.Element =>
    compilerMethod.error ? (
      <>
        <ul>
          {compilerMethod.callstack?.map((methodNameStrings, index) => (
            <li key={index}>
              {methodNameStrings.declaringType}
              <br />
              {methodNameStrings.methodMember}
            </li>
          ))}
        </ul>
        {getLocal(compilerMethod)}
      </>
    ) : compilerMethod.info ? (
      <>{compilerMethod.info}</>
    ) : (
      <>
        {split(compilerMethod.ownerType)}
        <br />
        {compilerMethod.ownerMethod}
      </>
    );

  const showCompiler = (assemblyName: string, compilerMethods: CompilerMethod[]): JSX.Element => (
    <React.Fragment key={assemblyName}>
      <h3>{assemblyName}</h3>
      <table className="compiler">
        <thead>
          <tr>
            <th rowSpan={3}>Error</th>
            <th>Namespace / Declared In</th>
          </tr>
          <tr>
            <th>Compiler Method</th>
          </tr>
          <tr>
            <th>Called By Method</th>
          </tr>
        </thead>
        <tbody>
          {compilerMethods
            .filter((compilerMethod) => !errorsOnly || compilerMethod.error)
            .map((compilerMethod, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td rowSpan={3} className="error">
                    {compilerMethod.error}
                  </td>
                  <td className="container">
                    {compilerMethod.compilerNamespace}
                    <br />
                    {compilerMethod.declaringType}
                  </td>
                </tr>
                <tr>
                  <td>
                    {split(compilerMethod.compilerType)} ({compilerMethod.compilerTypeId})
                    <br />
                    {compilerMethod.compilerMethod} ({compilerMethod.compilerMethodId})
                  </td>
                </tr>
                <tr>
                  <td className="owner">{getOwnerCell(compilerMethod)}</td>
                </tr>
              </React.Fragment>
            ))}
        </tbody>
      </table>
    </React.Fragment>
  );

  const showLocalsTypes = (assemblyName: string, localsTypes: LocalsType[]): JSX.Element => (
    <React.Fragment key={assemblyName}>
      <h3>{assemblyName}</h3>
      <table className="compiler">
        <thead>
          <tr>
            <th>Owner Method</th>
            <th>Compiler Type</th>
          </tr>
        </thead>
        <tbody>
          {localsTypes.map((localsType, index) => (
            <React.Fragment key={index}>
              <tr>
                <td className="container">
                  {localsType.ownerType}
                  <br />
                  {localsType.ownerMethod}
                </td>
                <td>{split(localsType.compilerType)}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </React.Fragment>
  );

  return (
    <>
      <h2>Compiler-generated types</h2>
      {chooseOptions}
      {[...assemblyMethods.entries()].map(([assemblyName, compilerMethods]) =>
        !errorsOnly || compilerMethods.some((column) => column.error) ? (
          showCompiler(assemblyName, compilerMethods)
        ) : (
          <></>
        )
      )}
      {!errorsOnly ? (
        <>
          <h2>Locals types</h2>
          {[...assemblyLocals.entries()].map(([assemblyName, localsTypes]) =>
            showLocalsTypes(assemblyName, localsTypes)
          )}
        </>
      ) : (
        <></>
      )}
    </>
  );
};
