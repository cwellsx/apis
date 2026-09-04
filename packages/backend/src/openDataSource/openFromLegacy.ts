import type { DataSource, DisplayApi, MainApiAsync, RuntimeContext, SecondDisplay } from "../contracts-app";
import { createAppWindow } from "../input";
import { MethodNodeId } from "../nodeIds";
import { showReflected } from "../output";
import { createSqlLoadedFromCoreJson, createSqlLoadedFromDotNet, SqlLoaded } from "../sql";

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

export const openFromLegacy = async (dataSource: DataSource, runtimeContext: RuntimeContext): Promise<MainApiAsync> =>
  await openAppWindow(await createSqlLoadedFromDotNet(dataSource), runtimeContext);

export const openFromCoreJson = async (dataSource: DataSource, runtimeContext: RuntimeContext): Promise<MainApiAsync> =>
  await openAppWindow(await createSqlLoadedFromCoreJson(dataSource), runtimeContext);
