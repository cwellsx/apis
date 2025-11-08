No cyclic dependencies:

1. dotnet - no dependencies
2. ui - depends on dotnet because some of those types are displayed
3. app - depends on ui because the ui displays some types used in the app api
