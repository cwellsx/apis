This contains the script which is loaded into the `Webview` -- therefore:

- The JS must not use CommonJS module syntax which is not supported in browsers
- The JS must not include any type of export statement

To fix/implement this:

- There's a different `tsconfig.json`
- The `sript.ts` cannot specify `import`

Therefore the shared types are defined in a `*.d.ts`.

The next question was how to include these type definitions into the script.

- I tried using `include` in the `tsconfig.json` ...
  that worked for `compile.cmd` but not for IntelliSense
  i.e. the IDE was showing missing types.
- I also tried `references` in the top-level `tsconfig.json` and
  `"composite": true` in this folder, but that didn't fix it.

The eventual solution, which fixes both `compile.cmd` and the IDE,
is to specify this "TypeScript triple-slash directive" in the `script.ts`:

```ts
/// <reference path="./ipc.d.ts" />
```

Another difference between this script and the others is that
it's compiled with the DOM library
so it can reference `window` and `HTMLElement` etc.
