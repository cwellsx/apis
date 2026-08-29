import type { DisplayApi, MainApiAsync, SecondDisplay } from "../contracts-app";
import { createAppWindow } from "../input";
import { MethodNodeId } from "../nodeIds";
import { showReflected } from "../output";
import { createSqlLoadedFromCoreJson, createSqlLoadedFromDotNet, SqlLoaded } from "../sql";
import { RuntimeContext } from "./runtimeContext";

const openAppWindow = async (sqlLoaded: SqlLoaded, runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  const { display, appConfig, setMenuItems } = runtimeContext;
  const showMethod = async (methodNodeId: MethodNodeId): Promise<void> => {
    const secondDisplay: SecondDisplay = (newDisplay: DisplayApi): Promise<MainApiAsync> => {
      const newShow = showReflected(newDisplay, sqlLoaded);
      return createAppWindow(sqlLoaded, appConfig, newShow, setMenuItems, showMethod, methodNodeId);
    };
    await display.createSecondDisplay(secondDisplay);
  };

  const show = showReflected(display, sqlLoaded);
  return await createAppWindow(sqlLoaded, appConfig, show, setMenuItems, showMethod, undefined);
};

export const openFromDotNet = async (runtimeContext: RuntimeContext): Promise<MainApiAsync> =>
  await openAppWindow(await createSqlLoadedFromDotNet(runtimeContext.dataSource), runtimeContext);

export const openFromCoreJson = async (runtimeContext: RuntimeContext): Promise<MainApiAsync> =>
  await openAppWindow(await createSqlLoadedFromCoreJson(runtimeContext.dataSource), runtimeContext);
