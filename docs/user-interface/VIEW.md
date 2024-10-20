---
title: View menu
nav_order: 2
layout: home
parent: User interface
---

# View menu
{: .no_toc }

- TOC
{:toc}

After a data source is opened and data is loaded, the View menu offers different ways to view it.

## `References`

This view was the easiest to implement (and perhaps least useful for you).

It shows the dependencies obtained via the `Assembly.GetReferencedAssemblies()` API,
i.e. which are defined as project and package references in the `*.csproj`.

![Alt text](../screenshots.tiny/Screenshot%202024-05-30%20081413.png)

As an example, this is showing the dependencies of the `Core.exe` program:

## `APIs`

The APIs view is more interesting and a reason why I developed this application.

It explains (among other things) the inter-assembly architecture.

It shows not only that there is an assembly reference, but also why -- i.e., which are the public methods being called.

This example diagram shows, that the `Program` type (in the `Core` assembly)
calls methods of the types named `Connection` and `ConnectionBuilder` (in the `ElectronCGI.DotNet` assembly):

![Alt text](../screenshots.tiny/Screenshot%202024-05-30%20082901.png)

The labels show the names of the called types or methods:

- Types, if the connection is to the target assembly -- when the assembly is not expanded and therefore hides its types
- Methods, if the connection is to the target type -- when the assembly is expanded and therefore exposes its types

This diagram shows the target assembly opened (and other 3rd-party assemblies hidden)
-- now you can see the names of the methods being called, for each type:

![Alt text](../screenshots.tiny/Screenshot%202024-05-30%20135130.png)

## `Custom`

This is the view displayed when you use the second File menu item to load your own, hand-written, custom JSON data.

I won't show an example here.

## `Errors`

If there are any errors when loading (reflecting and decompiling) from the data source,
then there's an Errors menu item in the View menu.