# To do

This may be out-of-date and updated occasionally.

The priorities are:

1. What's being done now/next
2. Fix anything broken
3. Improve what exists already
4. Start new features
5. Technical perfection

The process is:

- New items are added to `2.` through `5.` -- these are the backlog
- What I want to do now is defined in `1.` -- this is the sprint

Generally:

- The backlog exists before the current sprint
- The sprint is defined to address one or more items in the backlog
- When tasks are completed, list items are deleted from the sprint and from the backlog
- There may be a sequence of Git commits per task

## What's being done now/next

- `*.cs`
  - Improve the content of the Errors record
- `*.ts`
  - Implement a view option to group by namespace instead of by assembly name
- `*.md`
  - Use the new view to improve the screenshot of `Core.exe` internals
  - Make a section to document this as an example of round-tripping
  - Also improve the format of all screenshots (scale and blockquote)
- `*.ts` and `*.tsx`
  - Improve the Errors view to use the improved Errors record
- `*.cs`
  - Use the improved Errors view to diagnose and fix disassembly warnings/errors
- `*.ts`
  - Remove compiler-generated types, and backing fields
- `*.md`
  - Review whether the screenshots are A-OK

## Fix anything broken

- `Core.exe` generates a warning, if not an error, when decompiling some assemblies
- Display edge labels as tooltips
- Fix the cursor not changing when the `[Ctrl]` key is pressed
- Implement blue instead of red for leaf nodes without detail (i.e. which are not green)

## Improve what exists already

### Urgent

- The `Errors` view isn't fit for purpose

### Unsorted

- Simplify schema:
  - Remove `MethodColumns` table
  - Remove `TypeNameColumns` table
  - Rename `MethodNameColumns` to `MemberNameColumns` and use it for type names also
- Include `Core.IL` as much as possible
- Improve the `USER.md`
  - The `USER.md` should be improved with `<details>` and `<summary>` tags
  - Remove the "TO DO" messages from the current `USER.md`
  - Add namespaces to `Core.exe` and recapture screenshots
  - Add a View option to cluster types by their namespace, within an assembly or instead of by assembly
  - Add a View option to hide `.ctor` calls which only construct a type without calling any other of its methods
  - Block-quote and resize the screenshots
  - Add [Alerts](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts)
- Display progress messages when loading from `Core.exe`
- `[Ctrl]`-click to hide should work with all nodes on all view types
- Hide compiler-generated backing field
- Improve the CSS e.g. for paragraph spacing -- using CSS reset etc.
- Method view
  - Hide compiler-generated types, like they're already removed from the APIs view
  - Define view options for this view, e.g. to show the labels on the graph instead of only as tooltips
  - Reconsider how this is displayed in a secondary window:
    - Consider a new tabbed window instead
    - Don't display the main File and View menus on it
  - When a node is removed i.e. hidden, also hide other nodes (i.e. the whole subtree) which are no longer reachable from the method in question
- Source code view
  - Reduce the tab size
  - Implement some line wrap, to avoid too-long lines
  - Review the `DecompilerSettings` re. generated source code
  - Try some highlighting, maybe using a simple "find whole word", to identify the line-of-code or method-name on the stack

### Not now

## Start new features

- Use base types and interfaces to find the concrete subclasses used in a code-base which does dependency injection
- Read assemblies from multiple subdirectories and group by subdirectory
- Find and show inter-process connections e.g. WCF and gRPC
- Read and show target framework (from assembly or project)
- Support TypeScript source as another type of data source -- simply parse the `import` and `export` statements
- Cancel button to cancel running `Core.exe` and/or ability to run it asynchronously in the background
- Maybe consider how to integrate with source code, on the local machine or a remote repository

## Technical perfection

In general there should be no "technical debt" --
instead the code should be refactored routinely to keep it easy-to-work-with.

This section contains "counsel of perfection" items which I'm not doing now because I see no immediate value:

- Normalize the SQL database (make it relational), plus materialize various joins at save-time
  - Add FOREIGN KEY REFERENCES and use SELECT LEFT JOIN
  - For example store groups IDs in a table and make groupExpanded and leafSelected a table joined to the group key
- Update to the latest versions of React, Electron, Electron Forge, etc.
- Read about document-oriented DBs
- Publish release builds
