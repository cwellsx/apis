Add openViewType to MainApiAsync

Refactor ./sql to contain factory, tables, read, write, and filter
Refactor to extract filter into a separate database.

Nove createViewMenu i.e. call setViewMenu within openDataSource

Don't try/catch in createAppWindow and createCustomWindow

rename createAppWindow to openReflected and createCustomWindow to openCustom and move these to main-api/

rename customJson to isCustomJson, move it to istype/ togather with isRfeflected

avoid importing backend-utils

Move convert\* etc. to ./output

Sanitize try/catch handling - search for random try and replace then, probably in wrapApi and openDataSource

Keep the factory module i.e. openDataSource in the ./

Move the remainer to ./api

Naming:

- Prefer getX instead of createX
- A module which contains getX may be named x
- Prefer getXFromY instead of convertYToX
