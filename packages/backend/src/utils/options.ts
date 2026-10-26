// there's currently no GUI to set these options

export const options = {
  groupDotNet: true,
  group3rdParty: true,
  ungroupSingle: true,
  shortLeafNames: true,
  noSelfEdges: true,
  alwaysReload: false,
  showCompilerGeneratedAttributes: true,
  showCompilerGeneratedTypes: false,
  logApi: false,
  verticalClusters: true,
  customFolders: false, // disable if Graphviz older than v10 then rendering of edge-to-cluster doesn't work well
  // 400 and 4000 takes > hour to render
  // 300 and 800 may be safe
  // 400 and 1500 may be slow
  // more sensitive to number of edges than number of rows
  maxImageSize: { nodes: 300, edges: 800 },
};
