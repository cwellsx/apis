Use eslint to sanitize barrel files -- see "Evaluating ESLint configuration opt.txt"

Don't export DotNetApi nor createDotNetApi -- instead pass CORE_EXE into setAppDataPath

Move convert\* etc. to ./output

Keep the factory module i.e. openDataSource in the ./

Move the remainer to ./api

Keep the name "contracts-ui"

Extract "loaded-types" from "loaded"

Naming:

- Prefer getX instead of createX
- A module which contains getX may be named x
- Prefer getXFromY instead of convertYToX
