// this defines all public functions
// the public types are defined in contacts-app

export { hello } from "./hello";
export { openDataSource } from "./openDataSource"; // factory exported by this package
export { createSqlAppConfig } from "./sqlAppConfig";
export { assert, existsSync, getErrorString, log, pathJoin, setPaths } from "./utils";
