Read it. Good bones: short, scannable, no marketing fluff, and the voice is consistent — it reads like a practitioner, which is most of what you asked for. The problems are compression and ordering, not tone.

## If you change only three things

**1. The two-dimensional idea is your pitch, and it's buried in a detail section.** It sits under `## Views / ### Call stacks`, phrased abstractly, and then loses its way. It belongs at the top, said once. Two versions:

> Source code is two-dimensional: files and lines, one after another. The third dimension is the interconnections — who calls whom — and you normally build that picture in your head as you read. API Viewer builds it from your code and lets you explore it, so you don't have to synthesise it from listings.

Or tighter:

> Reading source gives you a flat picture — files, lines, one method at a time. The call graph is the third dimension, and you assemble it in your head as you go. This tool builds it for you and lets you explore it directly.

Both keep your line about interconnections being the third dimension, which is the good part. What they drop is the What / How / Context / Connections list, which isn't parallel — "What each API is — the content" doesn't say anything — and the closing "**why** each API exists", which doesn't follow from what precedes it.

**2. ".NET only" is in a collapsed block near the bottom.** That's the first thing a practitioner needs to know. It should be visible near the top, or at least not folded away. Status (alpha) too.

**3. The opening restates the pitch three times in eight lines** — the colon-and-bullets, then "This is interactive and up-to-date, a map that complements source code". One paragraph, then sections. Related: `## Views` and `### Views` (under "How it's implemented") both exist; rename the second.

## Smaller things

- "Views include the call stacks and entry points" — drop "the", and call stacks aren't a view. Your view _types_ are calls and references; entry points are a topic, not a view.
- "See an overview and select details to reveal" reads awkwardly. "Start with an overview and reveal detail as you need it."
- "**Tokenizes** code elements" — token is your model's vocabulary, but a reader will hear lexical analysis. "Identifies" would land better.
- The entry-point taxonomy is good; "In network processes" overlaps "long-running processes" — "In servers" is more concrete.
- **Typography is mixed**: `High‑level` and `up-to-date` use different hyphen characters, and `software's` uses a curly apostrophe. Invisible in isolation, visible in a diff. Pick one of each.
- The `</details>` blocks at the end have no blank lines between them, so they render as a run. Add blank lines.

## Missing, and worth adding

- **How to get and run it.** Even "not packaged yet" — or a pointer to `docs/INSTALLATION.md`, which exists. Right now a reader who's interested has nowhere to go.
- **A screenshot** (you know), best placed immediately after the opening paragraph.
- Consider moving **Use cases** up, since it's what a reader recognises themselves in.

## Shape I'd aim for

1. Title, then one paragraph: the 2D/3D pitch.
2. Screenshot.
3. What you get: view types, entry points, the interactions.
4. Why it's different: interactive, high-level and code-level, always current, local.
5. What it needs: .NET only, alpha.
6. Use cases.
7. Getting it.
8. `<details>` for implementation and third-party components.

That keeps everything you have — the model description, the privacy section, the third-party list — but moves the contributor-facing detail into the collapsed block where it belongs, and lets the top of the file do one job.

Want me to draft the rewrite in that shape for you to edit, or would you rather take it from here?
