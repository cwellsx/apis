import type { DisplayApi, MainApiAsync, SecondDisplay } from "../contracts-app";
import { createAppWindow } from "../input";
import { MethodNodeId } from "../nodeIds";
import { showReflected } from "../output";
import { createSqlLoadedFromCoreJson, createSqlLoadedFromDotNet, SqlLoaded } from "../sql";
import { RuntimeContext } from "./runtimeContext";
import { Tuple } from "./tuple";

const openAppWindow = async (sqlLoaded: SqlLoaded, runtimeContext: RuntimeContext): Promise<Tuple> => {
  const { display, appConfig, setMenuItems } = runtimeContext;
  const showMethod = async (methodNodeId: MethodNodeId): Promise<void> => {
    const secondDisplay: SecondDisplay = (newDisplay: DisplayApi): Promise<MainApiAsync> => {
      const newShow = showReflected(newDisplay, sqlLoaded);
      return createAppWindow(sqlLoaded, appConfig, newShow, setMenuItems, showMethod, methodNodeId);
    };
    await display.createSecondDisplay(secondDisplay);
  };

  const show = showReflected(display, sqlLoaded);
  const mainApi = await createAppWindow(sqlLoaded, appConfig, show, setMenuItems, showMethod, undefined);
  return [mainApi, show];
};

export const openFromDotNet = async (runtimeContext: RuntimeContext): Promise<Tuple> =>
  await openAppWindow(await createSqlLoadedFromDotNet(runtimeContext.dataSource), runtimeContext);

export const openFromCoreJson = async (runtimeContext: RuntimeContext): Promise<Tuple> =>
  await openAppWindow(await createSqlLoadedFromCoreJson(runtimeContext.dataSource), runtimeContext);
