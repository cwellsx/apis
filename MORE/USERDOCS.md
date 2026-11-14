If the user documentation is screenshots I don't want to capture them by hand
because software changes => screenshots obsolete => capture them all again.

So when the time comes I'd like to script somehow a series screenshots like

- open the document
- click this node
- hover over that edge
- change this option
- right-click etc ...

What tool might you recommend eventually, for that? Don't install it now

---

Playwright, driving the app's own Electron — that's the one I'd pick, and it fits your scenario list almost word for word.

```ts
const app = await electron.launch({ args: ["packages/electron-app"] });
const page = await app.firstWindow();

await page.click("#<assembly node id>"); // expand a node
await page.click('[role="checkbox"][aria-label="Core.Id"]'); // in the Explorer tree
await page.keyboard.down("Shift"); // freeze, so the popup stays put
await page.locator("#<fromId>||<toId>").hover(); // the edge's SVG group
await page.locator(".edge-popup").screenshot({ path: "docs/user/images/popup.png" });
```

Why it fits here in particular:

- **Electron support is built in** (`_electron.launch`), and it drives the app's _own_ Chromium — so there's no browser download, just one package. WebdriverIO's Electron service would also work and is heavier for no gain.
- **Element screenshots**, not window screenshots: `locator.screenshot()` on `.edge-popup` gives you the popup alone, cropped, which is what a document wants.
- **The selectors already exist.** The graph is SVG with `class="node"`/`"edge"`/`"cluster"` and an id per element — the same ids the backend uses, and stable for the same data. The tree and the options panel are React, so role/label selectors work there.

Three gotchas worth knowing now, because they'll shape the work more than the tool does:

**Determinism is the hard part, not the clicking.** A scenario needs a known starting state: which data source is open, and which nodes are expanded, hidden or collapsed. Those node states live in SQLite per view, and the app's data source is chosen at startup — so a screenshot run wants a scratch database seeded from the same `core.json` the print test uses, and a way to open it without a dialog. That's the design decision; the tool is the easy half.

**The freeze is how a hover becomes a screenshot.** The popup follows the mouse and hides when it leaves, so the script holds Shift. And since you found the freeze doesn't work while the Inspector is open, the scenarios that photograph the popup should keep it closed — a small, known constraint on the script.

**Edge ids are discoverable but opaque.** `fromId||toId` is stable, and a script can also just take the first `.edge` on the graph if it only needs a representative one.

Two things I'd keep separate from it: the **component-level** screenshots and layout assertions (the popup alone, "the arrows are in one column") belong in Vitest's browser mode, since the component renders without the app; and the **regeneration** should be on demand — `npm run docs:shots` — not a golden-file comparison, because a diff of pixels is noise where a diff of `printForest` text is signal.

I'd put it in its own package with its own runner rather than inside `electron-app-test`: it's a documentation generator that happens to click, not part of `npm test`.
