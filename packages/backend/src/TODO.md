Refactor ./sql to contain factory, tables, read, write, and filter

Refactor to extract filter into a separate database.

rename customJson to isCustomJson, move it to istype/ togather with isRfeflected

Sanitize try/catch handling - search for random try and replace then, probably in wrapApi and openDataSource

Keep the factory module i.e. openDataSource in the ./

Move the remainer to ./api

Separate view state for each window

Naming:

- Prefer getX instead of createX
- A module which contains getX may be named x
- Prefer getXFromY instead of convertYToX

Reimplement windows in electron app

- instead of several BrowserWindow
- use several BrowserView or WebConectentsView in tabs
