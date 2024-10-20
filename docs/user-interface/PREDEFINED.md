---
title: "Predefined `.NET` and `3rd-party` groups"
nav_order: 6
layout: home
parent: User interface
---

# Predefined `.NET` and `3rd-party` groups
{: .no_toc }

Two groups of assemblies are created automatically, named `.NET` and `3rd-party`.

## `.NET`

The `.NET` group is for all the `Microsoft.*` and `System.*` and similar assemblies.

I assume you already know the .NET API and are not especially interested in seeing where it's used.

- The application doesn't disassemble .NET assemblies
- The APIs view ignores (doesn't show) calls to .NET types

## `3rd-party`

When it scans a data source, the application notes the names of any `*.exe`:

- These are assumed to be "your application"
- Other assemblies with a similar name are assumed to be "yours" as well.

For example, `Core.IL.dll` is assumed to be from the same manufacturer as `Core.exe`.

Other assemblies are assumed to be `3rd-party`:

- If they are not similar to the name of the application
- And if they are not `.NET` assemblies

Unlike `.NET` assemblies, these are decompiled and calls to them are recorded and optionally shown.

Classifying them into a grouped named `3rd-party` is just a guess and a convenience,
e.g. so that you can show or hide all these as one cluster.

- The `3rd-party` group is for all the assemblies whose names are not similar to the name of the `*.exe` in the assembly
