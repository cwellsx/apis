# Core Objective

[State the exact goal in 1 clear sentence. E.g., "Implement a secure, type-safe IPC channel between Electron's main process and a Vite-based React frontend for SQLite transactions."]

# Environmental Constraints

- Language/Runtime: [e.g., TypeScript 5.6, Node.js 22]
- Key Frameworks/Libs: [e.g., Electron 32.x, SQLite3, VS Code API v1.94]
- Strict Boundaries: [e.g., "Strict Null Checks enabled", "No third-party IPC wrappers", "No any types allowed"]

# Current Architecture & Context

[Insert the relevant code snippets, schema, or type definitions here. Keep it concise, exactly like a StackOverflow Minimal Reproducible Example.]

# The Failure Mode / Core Dilemma

[Describe exactly what is failing, the error log, or the architectural trade-off you are stuck on. E.g., "When passing the database buffer across the IPC boundary, serialization fails with error X. I need to avoid blocking the main thread."]

# Analytical Instructions (For Your Thinking Chain)

Before writing any code or final recommendations, use your internal thinking process to:

1. Isolate the exact root cause of the limitation or failure in the provided code.
2. Identify at least two viable architectural patterns to solve this, listing the performance/type-safety tradeoffs of each.
3. Select the objectively superior pattern based on the constraints above.

# Expected Output Format

1. **Root Cause Analysis:** A 2-sentence explanation of why the current approach fails.
2. **The Solution:** The clean, idiomatic code implementing the chosen pattern. Highlight only the changed files/functions.
3. **Edge Cases to Watch:** 2-3 bullet points on memory leaks, type gaps, or performance pitfalls specific to this implementation.
