import type { AppConfig, DisplayApi } from "../contracts-app";
import { Sql } from "../sql2";

export const showCore = (display: DisplayApi, sqlTables: Sql.Tables, appConfig: AppConfig, dataSourcePath: string) => {
  const showReferences = async (): Promise<void> => {
    // const graphData = convertLoadedToReferences(
    //   sqlLoaded.readAssemblyReferences(),
    //   sqlLoaded.viewState.referenceViewOptions,
    //   sqlLoaded.readGraphFilter("references", "assembly"),
    //   sqlLoaded.viewState.exes
    // );
    // const viewGraph = await createViewGraph(graphData);
    // display.showView(viewGraph);
  };

  return { showReferences };
};
