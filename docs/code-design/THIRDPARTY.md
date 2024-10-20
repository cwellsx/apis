---
title: Third-party components
nav_order: 2
layout: home
parent: Code design
---

# Third-party components
{: .no_toc }

- TOC
{:toc}

## SQLite

The SQLite component caches the API data which the .NET component reads.
It also stores any user-configurable display options.

## Graphviz

The Graphviz process creates image files of the selected APIs, to be displayed by the renderer.

## Electron

This toolkit lets you write code which runs:

- In a window, using a browser engine (e.g. using React, and/or HTML, CSS, JS, etc.)
- In another 'main' process, which can access the Node API and the local file system etc.
- Between the two, application-specific APIs to exchange data between the main process and the browser window

## Electron CGI

This package lets you invoke an external process from the Electron application
and communicate with it via JSON over the standard input and output streams.
I use it to communicate with the .NET process.

## Electron Forge

This is scripts and config files to build and package an Electron application like this one.

## React

The renderer component uses React.

## Npm components

The renderer code uses these React components from npm:

- `split-pane-react`
- `react-image-mapper2`
- `react-checkbox-tree`

The main (i.e. backend) code uses these:

- `better-sqlite3`
- `xml-js`
- `electron-cgi`

## Icons

A README in the `./icons` folder lists the provenance of the icons in this application.