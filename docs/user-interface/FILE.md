---
title: File menu
nav_order: 1
layout: home
parent: User interface
---

# File menu
{: .no_toc }

- TOC
{:toc}

Use the File menu to select the data source you want to view.

- The application reads the data source (which is slow, i.e. a few seconds per assembly)
- It stores the reflected data into an internal SQLite database
- The data subsequently comes from SQLite, which is much faster (less than a second total)

When you reopen the application:

- It reopens the same data source as before (from SQLite).
- Or you can open a different data source instead.

Beneath the standard menu items is a list of the data sources (i.e. paths) which you have opened.

The data is reloaded from the data source, instead from the SQLite cache:

- If the data source is updated, i.e. if the date of a file-on-disk is newer than the date of the SQLite cache
- If you edit the `schemaVersion` or the `alwaysReload` option, in the application source code

![alt text](../screenshots.tiny/Screenshot%202024-05-29%20225134.png)

## `Directory containing binary .NET assemblies`

Use this to select a directory which contains .NET assemblies, for example:

- The `bin\*` directory which contains the results of a project's or a solution's build
- Or an installation directory, which contains installed assemblies

The tool will then read from (i.e. disassemble) these assemblies, using the .NET Reflection APIs.

TO DO: A future version may implement a progress indicator and a Cancel button

## `JSON file containing id and dependencies`

Use this to select a JSON file, which contains the data to display.

Creating this file is out-of-scope -- you may create it manually.
The purpose of this feature is to let you:

- Define an architecture which doesn't exist yet (i.e. which hasn't been coded)
- Then display your definition using this application's interactive graphs:

  - Cluster nodes (grouped by custom "layers")
  - Zoom in and out of clusters
  - Show and hide nodes and clusters
  - Labels and/or tooltips on connectors
  - Automatic graph layout

The format of your JSON file must be as follows:

- An array of nodes, where every node is an object with the following properties:
  - `id` required, must be unique
  - `label` optional, default is the `id` value
  - `tags` optional, an array of strings
  - `dependencies` required, an array of objects with required `id` and `label` fields
- Any node or dependency may have other optional named properties, whose type is one of `string`, `number`, or `boolean`

This data format is defined with TypeScript, in this source file:

- [`src/main/customJson.ts`](../src/main/customJson.ts)

## `Core.json file created by running Core.exe`

`Core.exe` is the program which load and reads .NET assemblies via the Reflection API.

This program is usually run automatically/transparently (via the first option on the File menu).

- You can also run this program from the command-line (i.e. without the Electron application)
- If so then it will create a `Core.json` data file
- You can copy this data file, and load it into Electron, using this third File menu item