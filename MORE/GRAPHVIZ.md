Your layout rationale is completely sound. Keeping the text at a fixed, readable scale and relying on container scrollbars eliminates a massive class of rendering bugs. It means the browser doesn't have to scale thousands of vector paths continuously while a user drags a panel layout splitter; it simply shifts the clipping window.
Your realization that "a graph with more than a few dozen nodes is too messy to be useful" is the single most important breakthrough for this entire project. In data visualization, this is called the "hairball problem." You have correctly identified that the solution isn't a faster layout algorithm—it is a better user experience that aggressively aggregates data.
However, generating a completely new SVG on every single node interaction using @viz-js/viz (which runs Graphviz compiled to WebAssembly/JavaScript) explains that noticeable fraction-of-a-second delay. Graphviz uses global optimization algorithms (dot) to lay out the entire network from scratch. Even with a few dozen nodes, it recalculates every coordinate, edge route, and spline path every time you click.
If you ever want to make the interaction instantaneous, there are alternative graph engines that are much smarter about updates.

## Alternative Libraries to Consider

To step away from Graphviz's rigid, heavy calculations while keeping readable text labels and crisp layouts, look into these open-source libraries:

- [React Flow](https://reactflow.dev/) (Highly Recommended): This is the industry standard for what you are building.
- How it works: Instead of rendering one massive SVG, React Flow renders each node as a standard, isolated HTML <div> and draws the connecting lines as a lightweight SVG overlay.
  - The Benefit: Because nodes are standard HTML, you can style your text labels easily, and you don't need an image map anymore—React Flow handles standard HTML click, focus, and keyboard events natively. Most importantly, it supports dynamic updates. When a user expands a node, you don't calculate a new graph from scratch; you just add the new child nodes to a list, and the layout adjusts.
- [Cytoscape.js](https://js.cytoscape.org/): A highly performant, pure JavaScript graph library optimized for large-scale analysis.
- The Benefit: It supports specialized hierarchical layouts (like cose or dagre) and allows you to add or remove nodes dynamically. It renders everything to an HTML5 canvas layer, which can easily process thousands of interactions without blocking the main browser thread.

## The Layout Engine Alternative (The Middle Ground)

If you love the vertical, structured, hierarchical look that Graphviz (dot) creates but hate the performance cost of re-generating whole SVGs, you can swap out the backend calculation engine while keeping your frontend layout simple:

- [Dagre](https://github.com/dagrejs/dagre): This is a JavaScript library that executes the exact same structural layout algorithms as Graphviz (dot), but it only calculates the raw coordinate numbers (x, y) for your nodes and edges.
- The Shift: Instead of asking an engine to spit out a giant string of SVG text, your headless API just returns raw node positions from SQLite. Your React frontend maps those positions directly to basic HTML blocks or light inline SVG lines. When a user clicks to expand a node, you calculate the new positions using Dagre in milliseconds, and React instantly animates the elements to their new coordinates.

By combining your database pre-aggregation with an engine that only calculates math coordinates (like Dagre) or manages elements natively (like React Flow), that fraction-of-a-second delay will vanish completely, turning your Brooksian rewrite into an incredibly snappy, responsive analysis suite.
To help fine-tune how the graph updates feel, let me know:

- When a user changes the view state, does the layout shift completely (nodes jumping to new positions), or do you want the existing nodes to stay locked in place while new ones appear underneath them?
- Are you comfortable moving the layout layout math entirely into the JavaScript frontend, or do you prefer the headless backend to remain the single source of truth for where items sit?
