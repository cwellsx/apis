---
title: Problems?
nav_order: 8
layout: home
parent: User interface
---

# Problems?
{: .no_toc }

- TOC
{:toc}

## Loading a data source is slow

Yes on my machine it takes a few seconds per assembly.

It's disassembling everything, so it's like compiling, it takes seconds.

Bug after that's done once, loading data from SQLite seems very quick, less than a second, even for a lot of data.

TO DO:

- Implement a progress indicator when it's reflecting assemblies

## Changing view options is slow

Regenerating the graph may take seconds, when you change the view options.

It's Graphviz which takes the time, so perhaps I can do nothing about that.

All the data processing in `src/main` (apart from running Graphviz) is quick even if it's synchronous.

- The time it take Graphviz seems closely related to the number of elements on the graph.
- Nodes which are hidden (either invisible, or inside a non-expanded group) take no time.
- A graph with too many dozen of elements might not be readable anyway
- So you can minimize time, by using this application's filtering to keep the graphs relatively small

## There's an exception at run-time

Oops.

That's obviously an Issue to be reported and/or fixed.

## The Errors view is non-empty

There may be errors or warnings in Core.exe when it loads a code-base.

Hopefully at least most of the code will load without error.