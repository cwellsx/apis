# Migration

    The last time I looked a while ago, Node.js had some experimental support for SQLite.
    I'd prefer SQLite built-in like this instead of better-sqlite3 because the latter needs to be built which is fragile.
    Can you tell me whether it's supported now -- in Node.js -- and in the current version of VS Code which uses some older version of Node.js?

Yes, built-in SQLite support is now supported in Node.js and is also available in the current versions of VS Code. [1]

## Node.js Support

The native, zero-dependency node:sqlite module was introduced and unflagged in Node.js v22.5.0. You no longer need the --experimental-sqlite flag to run it, though the API may still carry an experimental stability status depending on your exact version branch. It exposes a synchronous database API (DatabaseSync) explicitly designed to mimic the shape of better-sqlite3 without requiring any native C++ build or compilation steps. [2, 3, 4, 5]

```js
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("my-database.db");
// Execute a statement
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  );
`);
// Prepare and run a statementconst insert = db.prepare('INSERT INTO users (name) VALUES (?)');
insert.run("Alice");
// Query dataconst query = db.prepare('SELECT * FROM users');
console.log(query.all());
```

## VS Code Support

The current versions of Visual Studio Code bundle Node.js v24.15.0 (via Electron 42) or Node.js v22.22.1 (via Electron 39). Because both of these embedded runtimes are well above the Node.js v22.5.0 requirement, you can natively use node:sqlite directly within VS Code extensions or scripts executed by its internal runtime without any binary-compilation errors. [1, 3, 6]
Are you planning to use this inside a VS Code Extension or just running scripts through the integrated terminal? If you're building an extension, I can show you how to safely manage the database path within the extension context.

[1] [https://github.com](https://github.com/ewanharris/vscode-versions)
[2] [https://www.reddit.com](https://www.reddit.com/r/node/comments/1q1r5s1/nodesqlite3_was_just_deprecated/)
[3] [https://github.com](https://github.com/bytebase/dbhub/issues/317)
[4] [https://zenn.dev](https://zenn.dev/hiruno_tarte/articles/node-builtin-sqlite?locale=en)
[5] [https://www.girishsahu.com](https://www.girishsahu.com/myagent/post/6340)
[6] [https://github.com](https://github.com/cline/cline/issues/8726)

---

    What are the disadvantages if any to moving from better-sqlite3?

While the built-in node:sqlite module eliminates native compilation issues, it is still a younger and less feature-rich implementation than better-sqlite3.
The primary disadvantages of migrating to node:sqlite include:

## 1. Missing Performance & Optimization Features

- No Built-in Statement Caching: better-sqlite3 automatically caches prepared statements when using its .prepare() method. In node:sqlite, you must manually manage your prepared statements to avoid the overhead of re-compiling SQL strings on every execution.
- Lack of Advanced Binding Performance: better-sqlite3 is highly optimized for transferring data across the V8 bridge. For extremely heavy, throughput-critical batch inserts, better-sqlite3 can still outperform the native module.

## 2. API Limitations

- No Int64 Support via BigInt: SQLite support for 64-bit integers is seamlessly mapped to JavaScript BigInt in better-sqlite3. The native node:sqlite module traditionally truncates or struggles with large 64-bit integers that exceed the safe JavaScript Number.MAX_SAFE_INTEGER limits.
- No Custom Functions or Aggregates: You cannot register custom JavaScript functions (db.function()) or custom aggregate functions (db.aggregate()) to run inside your SQL queries as you can with better-sqlite3.
- Missing db.transaction() Helper: better-sqlite3 provides a robust, high-performance .transaction() function that automatically handles BEGIN, COMMIT, and ROLLBACK for you if an exception is thrown. With node:sqlite, you must write standard SQL statements (db.exec('BEGIN'), etc.) and handle the try/catch rollback logic manually.

## 3. Ecosystem & Ecosystem Tooling

- ORMs and Query Builders: Many popular Node.js database tools (like Prisma, Drizzle, or Kysely) have native, optimized drivers explicitly built for better-sqlite3. While some have added support for node:sqlite, you may run into compatibility gaps or need to write raw SQL wrappers.

## Verdict

- Stay on better-sqlite3 if: You heavily rely on automatic statement caching, JS-defined SQL functions, managed transaction wrappers, or 64-bit integer precision.
- Move to node:sqlite if: Your queries are straightforward, and your primary pain point is the fragility of pre-gyp/native compilation steps in CI/CD pipelines or extension packaging.

Are you using a query builder / ORM (like Drizzle, Kysely, or Prisma), or are you writing raw SQL? I can let you know if your current query style requires a manual workaround.

---

    I wrote my own ORM.
    Tell me about BigInt and Node.js "traditionally struggling"?

Since you wrote your own ORM, understanding how the underlying drivers map SQLite's 64-bit signed integers (INTEGER) to JavaScript is critical. [1]

## The Problem: JavaScript Number vs. SQLite INTEGER

In JavaScript, standard Number types are IEEE 754 double-precision floats. They can only accurately represent integers up to 2⁵³ - 1 (Number.MAX_SAFE_INTEGER, or 9,007,199,254,740,991). [2, 3, 4, 5]
SQLite, however, natively stores integers as 64-bit signed integers (up to 2⁶³ - 1, or 9,223,372,036,854,775,807).
When a driver maps a large SQLite integer into a JavaScript Number:

-
- Values above 2⁵³ silently lose precision and mutate (e.g., 9007199254740993 might suddenly read back as 9007199254740992).
- Legacy Node.js drivers (like the old sqlite3) historically ignored this, causing subtle bugs in things like snowflake IDs, high-precision timestamps, or ledger balances. [2, 4, 6, 7]
- ***

## How better-sqlite3 Handled It

better-sqlite3 implemented a seamless safety fallback. It reads numbers as JavaScript Number types by default, but if an integer exceeds MAX_SAFE_INTEGER, it automatically upgrades that single value to a JavaScript native BigInt (e.g., 9223372036854775807n). [7, 8]
For custom ORM authors, this has a slight quirk: a single column like id could return a JS number for row 1, but a JS bigint for row 10,000,000. better-sqlite3 allows you to pass a configuration option to force all integers to return as BigInt if you want strict type uniformity.

---

## How Built-in node:sqlite Handles It (The "Struggle")

When node:sqlite first launched, it forced strict protection over this boundary but lacked fine-grained configuration. Instead of seamlessly auto-upgrading big integers like better-sqlite3, it did this:

1.  The Out-of-Range Throw: By default, it maps SQLite integers to JavaScript Number. If it hits a row where the database value is outside the safe range (> 2⁵³), it refuses to lose precision and throws an ERR_OUT_OF_RANGE error, crashing the query execution. [9, 10]
2.  The "All-or-Nothing" Toggle: To fix this, Node.js introduced options to force BigInt output. However, depending on the version of Node.js running inside your environment, you have to handle it differently:

- In newer Node.js versions (v24.4.0+): You can set a global flag when instantiating the database:
  const db = new DatabaseSync('db.sqlite', { readBigInts: true });
  - In older Node.js versions (like the v22.x lines found in some VS Code versions): The database-level option didn't exist yet. You have to configure it per-statement via a method call: [9, 10, 11, 12, 13]
    const stmt = db.prepare('SELECT \* FROM users');
    stmt.setReadBigInts(true); // Must be explicitly called on every statement object

## What this means for your ORM architecture

If you toggle readBigInts: true (or use .setReadBigInts(true)), every single integer—even a tiny integer like 0, 1, or a boolean flag stored as 0/1—will come back from node:sqlite as a JavaScript BigInt (0n, 1n). [1, 12]
This introduces two challenges you must account for in your ORM code:

1.  Math Mixing: In JavaScript, you cannot implicitly mix Number and BigInt (e.g., row.id + 1 will throw a TypeError if row.id is a BigInt). Your ORM users will be forced to write row.id + 1n.
2.  JSON Serialization: Native BigInt values cannot be serialized by JSON.stringify(). If your ORM returns objects directly to a user who passes them to an Express API or fs.writeFileSync, their application will crash with TypeError: Do not know how to serialize a BigInt. Your ORM will likely need a serialization or hydration layer to map columns back to standard JS numbers if they are safely within bounds. [3, 7, 14]

Would you like to see how to write a data-hydration utility for your ORM query parser that dynamically converts BigInts back into standard Numbers when they are safe to use?

[1] [https://nodejs.org](https://nodejs.org/api/sqlite.html)
[2] [https://github.com](https://github.com/TryGhost/node-sqlite3/issues/922)
[3] [https://dev.to](https://dev.to/krishnamoorthy_k_0f3f8d93/fixing-bigint-serialization-error-in-nodejs-express-a-beginner-friendly-explanation-5fe6)
[4] [https://stackoverflow.com](https://stackoverflow.com/questions/60803903/what-are-the-downsides-of-javascripts-bigint-and-when-should-i-avoid-it)
[5] [https://www.youtube.com](https://www.youtube.com/watch?v=OuKcHXvnKR0&t=58)
[6] [https://github.com](https://github.com/prisma/prisma/discussions/22589)
[7] [https://www.youtube.com](https://www.youtube.com/watch?v=QUssVD41DjU)
[8] [https://stackoverflow.com](https://stackoverflow.com/questions/14355004/what-sqlite-to-use-with-nodejs)
[9] [https://nodejs.org](https://nodejs.org/download/nightly/v24.0.0-nightly202412035ef4985175/docs/api/sqlite.html)
[10] [https://beta.docs.nodejs.org](https://beta.docs.nodejs.org/sqlite)
[11] [https://nodejs.org](https://nodejs.org/download//v8-canary/v24.0.0-v8-canary202411278286b208f6/docs/api/sqlite.html)
[12] [https://github.com](https://github.com/denoland/deno/issues/31346)
[13] [https://r2.nodejs.org](https://r2.nodejs.org/docs/v22.5.1/api/sqlite.html)
[14] [https://flaviocopes.com](https://flaviocopes.com/node-sqlite/)

---

    I think I'm alright then.

    I do statement.safeIntegers(true) if the JS type includes big integers, then rehydrate to big or normal integers depending on the type of the JS element -- so to port this I simply change safeIntegers to setReadBigInts

    Is the porting of all methods, from one API to the other, straightforward?

No, porting all methods is not completely straightforward, because while the core query execution methods match, node:sqlite alters how it handles method chaining, statement lifecycles, and parameter bindings compared to better-sqlite3.Since you wrote your own ORM, you will need to adjust your driver abstraction layer to account for the following primary structural differences:

## 1. No Method Chaining on .run()

In better-sqlite3, .prepare().run() returns an information object containing { changes, lastInsertRowid }

.In node:sqlite, .run() returns undefined. To capture execution metrics, you have to query the database instance metadata rather than picking it up inline from the statement execution:

```js
// better-sqlite3 style (Chained metadata)
const info = db.prepare("INSERT INTO users (name) VALUES (?)").run("Alice");
const id = info.lastInsertRowid;

// node:sqlite style (Separate context lookups)
const stmt = db.prepare("INSERT INTO users (name) VALUES (?)");
stmt.run("Alice");
// You must query the DB constants or issue a PRAGMA / changes lookup depending on the version
```

## 2. Manual Statement Finalization (Garbage Collection vs C++)

better-sqlite3 relies heavily on V8 garbage collection hooks to clean up underlying C++ allocations when statements drop out of scope.

node:sqlite follows standard native handle paradigms. Depending on how long your ORM holds references to statement objects, you should call stmt.close() (or .finalize() depending on the minor Node version runtime) to prevent internal SQLite memory drift when disposing of ephemeral queries.

## 3. Named Bind Parameter Syntax Stripping

If your ORM uses named parameters (e.g., :id, @id, $id), better-sqlite3 maps object keys seamlessly whether they include the prefix symbol or not.

node:sqlite strictly requires the symbol prefix in the object keys by default. To make it behave like better-sqlite3, your ORM must explicitly opt-in per-statement using:

```js
setAllowBareNamedParameters(true);
```

API Mapping Reference Table

| Feature / Method  | better-sqlite3                   | node:sqlite                           | Migration Complexity                                              |
| ----------------- | -------------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| Instantiation     | new Database(path)               | new DatabaseSync(path)                | Easy (Rename class)                                               |
| Get single rows   | tmt.get(...)                     | stmt.get(...)                         | Easy (Identical signature)                                        |
| Get multiple rows | stmt.all(...)                    | stmt.all(...)                         | Easy (Identical signature)                                        |
| Safe Int Flag     | stmt.safeIntegers(true)          | stmt.setReadBigInts(true)             | Easy (Rename method)                                              |
| Mutate data       | stmt.run(...) (returns metadata) | stmt.run(...) (returns undefined)     | Moderate (Breaks inline row ID logic)                             |
| Transactions      | db.transaction(fn)               | Not Implemente                        | dHard (Must manually implement BEGIN/COMMIT/ROLLBACK try-catches) |
| Iterators         | stmt.iterate(...)                | stmt.iterate(...) (Only in Node v24+) | Conditional (May require polyfilling array iteration on v22)      |

## Summary for your ORM

To successfully port your engine, you will need to wrap your statement preparation pipeline in a helper function that sets up your flags sequentially:

```js
function prepareORMStatement(db, sql) {
  const stmt = db.prepare(sql);

  // Conform integer mapping and bare parameters to better-sqlite3 behavior
  stmt.setReadBigInts(true);
  stmt.setAllowBareNamedParameters(true);

  return stmt;
}
```

Would you like help rewriting your ORM's transaction handler or insert execution wrapper to safely fetch the execution metadata without breaking your current interface?

---

    Out of curiosity -- my ORM is in TypeScript and depends on the better-sqlite3 API.
    What technique would you use to make it support Node.js interchangeably?
    I guess it needs simply a thin abstraction layer, injected into it for it to use, to hide the difference between the two APIs.
    Does this abstraction layer exist already? I presume other tools might have wanted/developed it.

Yes, a thin abstraction layer (the Adapter Pattern) is exactly how modern ORMs bridge the gap between various JavaScript engines (Node.js, Bun, Cloudflare Workers, etc.). [1]

## Do readymade adapter layers exist?

No community-standard, standalone library provides a transparent, zero-overhead wrapper exclusively mapping node:sqlite back to better-sqlite3. Large ORMs like Drizzle and Prisma maintain their own internal implementation drivers to isolate driver quirks. [2, 3]
Because the node:sqlite API explicitly mirrors the shape of better-sqlite3, you can easily build your own lightweight, type-safe adapter layer in TypeScript.

---

## Implementation Strategy: The Structural Adapter Pattern

You can define a unified SQLiteDriver interface based on better-sqlite3's structure, then implement adapters for both drivers.

## 1. Define the Unified Type Layer

export interface StatementAdapter {
all(...params: any[]): any[];
get(...params: any[]): any | undefined;
run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
}
export interface DatabaseAdapter {
prepare(sql: string): StatementAdapter;
exec(sql: string): void;
// Your ORM only interacts with this abstract shape
}

## 2. Create the node:sqlite Implementation Wrapper

Because node:sqlite has a undefined return value on .run() and requires specific method flags, your wrapper will conform it on initialization [2]:

```js
import type { DatabaseSync } from 'node:sqlite';
export class NodeSqliteAdapter implements DatabaseAdapter {
constructor(private db: DatabaseSync) {}

prepare(sql: string): StatementAdapter {
const stmt = this.db.prepare(sql);

    // Normalize behavior to better-sqlite3 standards
    stmt.setReadBigInts(true);
    stmt.setAllowBareNamedParameters(true);

    return {
      all: (...params) => stmt.all(...params),
      get: (...params) => stmt.get(...params),
      run: (...params) => {
        stmt.run(...params);

        // node:sqlite returns undefined. We must pluck execution metadata
        // using underlying database primitives.
        const changesResult = this.db.prepare("SELECT changes() as c").get() as { c: number };
        const lastIdResult = this.db.prepare("SELECT last_insert_rowid() as id").get() as { id: bigint };

        return {
          changes: changesResult?.c ?? 0,
          lastInsertRowid: lastIdResult?.id ?? 0n
        };
      }
    };

}

exec(sql: string): void {
this.db.exec(sql);
}
}
```

## 3. Create the better-sqlite3 Implementation Wrapper

This requires zero overhead since your code was natively modeled after it:

```js
import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
export class BetterSqliteAdapter implements DatabaseAdapter {
constructor(private db: BetterSqliteDatabase) {}

prepare(sql: string): StatementAdapter {
const stmt = this.db.prepare(sql);
stmt.safeIntegers(true); // Retain your existing BigInt strategy
return stmt;
}

exec(sql: string): void {
this.db.exec(sql);
}
}
```

## Dependency Injection in Your ORM

Instead of instantiating connections directly inside your core query engine, require the adapter during initialization:

```js
export class MyCustomORM {
constructor(private client: DatabaseAdapter) {}

async findUser(id: number) {
// This looks identical regardless of the underlying runtime
return this.client.prepare('SELECT \* FROM users WHERE id = ?').get(id);
}
}
```

This pattern fully decouples your code. It ensures that running your ORM inside a native Node.js script or a VS Code extension runtime requires nothing more than changing the adapter class passed during startup.
Would you like help mapping out a strategy for handling transactions inside this unified adapter layer, or do you want to explore adding support for other runtimes (like Bun) using the same pattern? [4]

[1] [https://www.pkgpulse.com](https://www.pkgpulse.com/guides/better-sqlite3-vs-libsql-vs-sql-js-sqlite-nodejs-2026)
[2] [https://www.prisma.io](https://www.prisma.io/docs/orm/v6/overview/databases/sqlite)
[3] [https://orm.drizzle.team](https://orm.drizzle.team/docs/sqlite/get-started-sqlite)
[4] [https://github.com](https://github.com/oven-sh/bun/discussions/27092)

---

    If I put my ORM in a repo and package it using NPM, then other projects can use it.
    They may need to build its bindings too but I guess that can be handled with a script in the package.

    My question is, when someone is debugging a TypeScript application, can they also use the debugger to step into the ORM? And see that as TypeScript?

    I had trouble with this when I tried it. The debugger saw the package as JS. For this reason the ORM isn't currently a separate package, instead it's part of a monorepo.

Yes, you can absolutely step directly into your ORM’s TypeScript source files while debugging a consumer application.
The reason the debugger saw the package as compiled JavaScript is because your published NPM package lacked source maps and the original TypeScript source files (.ts), or the package.json didn't point the debugger to them.
When you publish a package, Node.js runs the compiled JavaScript, but debuggers (like the VS Code debugger) look for a mapping path back to the TypeScript code. If you fix your build configuration, you can safely pull the ORM out of your monorepo into a separate NPM package.
Here is exactly how to configure your ORM project so that consumers can step into its TypeScript code:

## 1. Configure tsconfig.json to Publish Maps and Sources

You must tell tsc to generate source maps and include the actual raw .ts files inside those maps (inline sources). Update your ORM's tsconfig.json:

{
"compilerOptions": {
"target": "ES2022",
"module": "NodeNext",
"declaration": true, // Generates .d.ts files for types
"sourceMap": true, // Generates .js.map files for the debugger
"inlineSources": true, // Embeds the original .ts code directly inside the maps
"outDir": "./dist"
},
"include": ["src/**/*"]
}

Why inlineSources is critical: By default, source maps only point to relative file paths (e.g., ../src/index.ts). If a consumer installs your package from NPM, those original src/ files won't exist on their hard drive unless you explicitly bundle them or use inlineSources to bake the raw TypeScript directly into the .js.map files.

## 2. Configure package.json to Ship the Map Files

Ensure your published package includes the compiled distribution directory and points to the correct entry files:

{
"name": "my-custom-orm",
"version": "1.0.0",
"main": "./dist/index.js",
"types": "./dist/index.d.ts",
"files": [
"dist"
]
}

(The files array ensures that the entire dist folder—including your .js, .d.ts, and .js.map files—is packed and uploaded to NPM).

## 3. Ensure Consumer Projects Have Source Maps Enabled

For the consumer's debugger to respect your package's source maps, the consumer's execution tool must be told to look for them.

- If running via standard Node.js: Node.js does not look for source maps by default. The consumer must run their app with the --enable-source-maps flag:

node --enable-source-maps dist/app.js

- If running via ts-node or tsx: These development runners handle source maps automatically.
- If debugging in VS Code (launch.json): Ensure the consumer's launch configuration has sourceMaps enabled (it is usually true by default, but can be forced):

{
"type": "node",
"request": "launch",
"name": "Launch Program",
"program": "${workspaceFolder}/src/index.ts",
"sourceMaps": true
}

Once this is set up, a developer debugging the consumer application can place a breakpoint on a line executing your ORM (e.g., db.users.find()) and hit Step Into (F11). VS Code will seamlessly open a virtual, read-only tab showing your exact TypeScript source file and track the call stack perfectly.
Would you like help setting up a modern, lightweight build script using a bundler like tsup or esbuild to automate this configuration, or would you like to review how to write the NPM install scripts for handling those native bindings?

---

    Is better-sqlite3 deprecated, will people stop using it, now that a similar API supported in Node.js itself?

No, better-sqlite3 is not deprecated, and it remains a key ecosystem project with over 6.3 million weekly downloads. In fact, the old legacy driver node-sqlite3 is the library that was officially deprecated and archived, while better-sqlite3 remains under active development (releasing v13.0 to switch to modern N-API prebuilds). [1, 2, 3, 4]
People will not stop using better-sqlite3 anytime soon, because node:sqlite was intentionally built as a lightweight, zero-dependency engine rather than a complete feature-for-feature replacement.
Developers will continue using better-sqlite3 for production applications due to several long-term factors:

## 1. High-Performance Features

-
- Statement Caching: better-sqlite3 automatically compiles and caches your SQL queries behind the scenes. With node:sqlite, your ORM has to manually store and reuse statement objects, or suffer heavy performance penalties by constantly parsing raw SQL strings. [5]
- Optimized V8 Bridge: better-sqlite3 has undergone years of highly specific native C++ tuning to ensure that moving data across the JavaScript/C++ boundary is incredibly fast. For extreme, high-throughput batch operations, it still beats the native runtime implementation. [5, 6]
-

## 2. Missing Advanced Capabilities in Node.js Core

node:sqlite lacks several essential SQLite features that heavy production systems require, including:

-
- Custom Functions and Aggregates: You cannot register JavaScript handlers to run inside your SQL logic (db.function()).
- Managed Transactions: There is no built-in .transaction() safety wrapper to auto-rollback on query failure.
- Database Extensions & Encryption: Advanced setups that rely on extensions (like spatial queries or better-sqlite3-multiple-ciphers for database encryption) cannot load into the native core module. [3, 7]
-

## 3. Ecosystem Inertia

Major tools, ORMs, and query builders (like Drizzle, Prisma, and Kysely) are optimized specifically for better-sqlite3's exact behavior. While they are building compatibility drivers for node:sqlite, most large projects will stick with the stability of better-sqlite3 to avoid breaking changes or handling raw connection wrappers.

## Summary

The addition of node:sqlite into Node.js core is fantastic for scripts, lightweight CLIs, tooling, and VS Code extensions where native C++ installation errors are a dealbreaker. However, for full-scale applications and custom ORMs needing advanced performance tuning, better-sqlite3 remains the industry standard.
If you want to start building the abstraction layer for your ORM, I can help you implement a safe, automatic rollback transaction runner for the node:sqlite driver. Would that be helpful?

[1] [https://www.reddit.com](https://www.reddit.com/r/node/comments/1q1r5s1/nodesqlite3_was_just_deprecated/)
[2] [https://security.snyk.io](https://security.snyk.io/package/npm/better-sqlite3)
[3] [https://codenote.net](https://codenote.net/en/posts/electron-encrypted-sqlite-libraries-comparison/)
[4] [https://github.com](https://github.com/WiseLibs/better-sqlite3/releases)
[5] [https://www.npmjs.com](https://www.npmjs.com/package/better-sqlite3)
[6] [https://dev.to](https://dev.to/lovestaco/understanding-better-sqlite3-the-fastest-sqlite-library-for-nodejs-4n8)
[7] [https://www.npmjs.com](https://www.npmjs.com/package/better-sqlite3-multiple-ciphers?activeTab=readme)
