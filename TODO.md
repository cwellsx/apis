# To do

This may be out-of-date and updated occasionally.

There is no "Done" section in this document, instead see the history of updates/commits.

## Refactor and improve

- API view:
  - Hide compiler-generated types
- Click on edge to show APIs as a detail
- Better naming of nested types
- Precomputed type and method names
- Precomputed declaring types
- Sanitize the Error schema in the Reflected data
- Add tooltips to edges -- names of methods or types depending on whether the target is expanded
- Maybe normalize the database, plus materialize various joins at save-time

## Features

- Demo on another machine
  - Deploy to or build on another machine
  - Try running it on that machine
- Read projects (instead of assemblies) to group by source directory
- Read assemblies from multiple subdirectories and group by subdirectory
- Find and show inter-process connections e.g. WCF and gRPC
- Read and show target framework (from assembly or project)

## Tasks

## SQL

- Make ViewState e.g. isShown and isSelected a table joined to the node key
  - Add FOREIGN KEY REFERENCES
  - Use SELECT LEFT JOIN
- Store groups IDs in a table (but can recalculate the group memberships on-the-fly)
- Make GroupState e.g. groupExpanded and leafSelected a table joined to the group key
- Create a table and database-type for the data injected via readCustomNodes

Also read about document-oriented DBs.
