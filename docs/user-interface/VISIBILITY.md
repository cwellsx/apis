---
title: Expanding or hiding nodes
nav_order: 5
layout: home
parent: User interface
---

# Expanding or hiding nodes
{: .no_toc }

Depending on which [View menu](./VIEW.md) item is selected, different Options are available.

- TOC
{:toc}

## Using the tree of nodes in the left pane

Below the view options on the left pane is a tree of all the nodes:

- Visible nodes (shown with checkbox enable)
- Invisible nodes (show with checkbox disabled)
- Clusters (shown as parent nodes)

Note:

- Expanding or collapsing a parent node does the same to the corresponding cluster on the graph
  (unless the `Group as subgraphs` option is disabled)
- Toggle the visibility of a parent node to toggle the visibility of all its child nodes
- The `+` and `-` icons lets you expand or collapse every parent node in the tree

## Clicking on nodes and clusters in the graph

Clusters:

- When you hover over a cluster in the graph, its outline is highlighted in red.
- Click on it, to expand if its currently collapsed, or to collapse if its currently expanded
- This is the same as (therefore an alternative to) expanding and collapsing parents in the tree

Leaf nodes:

- When you hover over a leaf in the graph, its outline is highlighted in green or blue.
- Use `[Ctrl]`-click to hide it
- This is the same as disabling its checkbox in the tree

  TO DO:

  - Make this work on the APIs view not only on the References view
  - Fix the cursor not changing when the `[Ctrl]` key is pressed
  - Implement blue instead of red for leaf nodes without detail (i.e. which are not green)

