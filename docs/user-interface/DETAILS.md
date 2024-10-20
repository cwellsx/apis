---
title: "Details in the right-hand pane"
nav_order: 7
layout: home
parent: User interface
---

# Details in the right-hand pane
{: .no_toc }

- TOC
{:toc}

## Introduction

Depending on the type of view, there may see further details, by clicking on leaf node or a connector.

If a leaf node or connector has a green outline, when you hover with a mouse, that means details are available if you click it.

The details are typically shown in a pane to the right of the graph:

- View menu -- select the view type
- Left pane -- view options and node visibility
- Middle pane -- the graph
- Right pane -- details after clicking on the graph

## References -- assembly details

When you click on an assembly in the References view, the details are everything in that assembly:

- This is a conventional tree of all the namespaces, types, and members.
- It's similar to what you see in the Solution Explorer of Visual Studio, or when you run ILSpy.

![Alt text](../screenshots.tiny/Screenshot%202024-05-30%20221107.png)

TO DO:

- Hide compiler-generated backing field

## References -- synthetic call stack

If you click on any method in the type details above, it shows a tree of all possible call stacks which include the selected method.

For example, this is the result of clicking on the AssemblyReader.Add method:

- It's only called from `MethodReader.LoadAssemblies`, which in turn is called from `Program.Main`
- It calls `GetAssemblyName` and something in the `MethodReader` type, which can be expanded in turn

![Alt text](../screenshots.tiny/Screenshot%202024-05-30%20222207.png)

I call this a "synthetic call stack" -- because it is the call stack, calculated (synthesized) at design-time, instead of captured at run-time.

This view was the original reason why I wrote this application:

- When I'm working with a method in a large or unknown code-base, I want to know, "Where is this method called from?", as well as, "What does it call as subroutines?"
- Answering this question is difficult (i.e. time-consuming and distracting) to discover manually, especially up or down many levels, and especially across multiple assemblies

TO DO:

- Hide compiler-generated types, like they're already removed from the APIs view
- Define view options for this view, e.g. to show the labels on the graph instead of only as tooltips
- Reconsider how this is displayed in a secondary window:
  - Consider a new tabbed window instead
  - Don't display the main File and View menus on it
- When a node is removed i.e. hidden, also hide other nodes (i.e. the whole subtree) which are no longer reachable from the method in question

## Call stack -- source code

When a synthetic call stack is displayed, you can click on any method in the stack to show the associated source code --
and so you can browse source code, up and down the call stack, by clicking on different methods in the graph.

![Alt text](../screenshots.tiny/Screenshot%202024-05-30%20225010.png)

TO DO:

- Reduce the tab size
- Implement some line wrap, to avoid too-long lines
- Review the decompilation options re. generated source code
- Try some highlighting, maybe using a simple "find whole word", to identify the line-of-code or method-name on the stack
- Maybe consider how to integrate with source code, on the local machine or a remote repository
