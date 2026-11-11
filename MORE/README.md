Read my codebase, `package.json`, and existing design documentation to understand what this project does, how it is built, and how to run it.

Then, write a comprehensive yet highly readable `README.md` for this open-source repository.

### Project Context & Audience

- **What it is:** An Electron desktop app and/or VS Code extension that analyzes existing software structure and displays it interactively (e.g., call graphs, dependency maps) using progressive reveal.
- **Target Audience:** Software developers and software architects working on large codebases and distributed applications.
- **Core Philosophy:** Just like the tool itself, this README must use **progressive disclosure**. Do not dump every technical detail, parser architecture, or configuration flag in the opening paragraphs. Reveal complexity gradually as the reader scrolls.

### Tone & Writing Style

- Write like a sharp, pragmatic senior engineer talking to a peer.
- Use crisp, active sentences. Avoid marketing fluff, hype words (e.g., "revolutionary," "seamless," "empower"), and robotic AI transitions.
- Keep paragraphs short (2–3 sentences max). Use bold lead-ins for bullet points so busy developers can skim.

### Required Structure (Strict Top-to-Bottom Order)

1. **Title & Value Hook (Max 3 sentences)**
   - State clearly what the tool does and the exact pain point it solves (navigating massive, distributed codebases without drowning in spaghetti diagrams).
   - Do not mention Electron, ASTs, or implementation details yet.

2. **Visual Placeholder**
   - Insert a clean placeholder block (`![Demo GIF or Screenshot](assets/demo.gif)`) with a brief caption explaining what the user is seeing (e.g., progressive expansion of a distributed call graph).

3. **Why This Exists / Core Capabilities (For Evaluators)**
   - 3–4 concise bullet points highlighting _why_ this is better than static diagrams or standard IDE "Find All References" (focus on progressive reveal, scale for large/distributed repos, and dual Desktop + VS Code workflow).

4. **Quickstart (For Users)**
   - Separate clearly into **VS Code Extension** and **Electron Desktop App** installation/launch steps.
   - Keep this strictly to the minimum commands/steps needed to open a repo and see a graph.

5. **How It Works & Key Features (For Architects & Power Users)**
   - Briefly explain the progressive reveal workflow, supported languages/frameworks (extract these accurately from the repo), and how it handles distributed boundaries.

6. **Architecture & Contributing (For Contributors)**
   - Summarize how the Electron shell, VS Code extension host, and core analysis engine share code (based on my design docs).
   - Link to the existing design docs rather than repeating them here.
   - Include standard build-from-source commands and a welcoming, low-friction note for contributors.

Before generating the file, check the actual scripts and dependencies in the repo so every command, supported language, and feature mentioned is 100% accurate to the current state of the code.
