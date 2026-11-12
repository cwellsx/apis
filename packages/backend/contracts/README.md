No cyclic dependencies:

1. dotnet - no dependencies
2. config - no dependencies
3. ui - depends on dotnet because some of those types are displayed, and on config because an event carries the app options
4. app - depends on ui because the ui displays some types used in the app api, and on config for the app options
