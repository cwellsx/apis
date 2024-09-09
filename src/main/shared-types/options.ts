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
  maxImageSize: {
    nodes: 400,
    edges: 1000,
  },
};
