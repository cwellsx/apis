import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const ignorePaths = [
  // per-file override: do not use project-based type-checking for the config file itself
  "eslint.config.mjs",
  // won't lint the vitest config files
  "packages/electron-app-test/vitest.config.js",
  // don't lint 3rd-party source code
  "packages/electron-app/src/renderer/3rd-party/**",
  // won't lint the webpack config files
  "packages/electron-app/webpack.*.config.ts",
  // svgr index template (CommonJS build tooling, not app source)
  "packages/electron-app/src/renderer/images.org/**",
];

export default defineConfig([
  {
    ignores: ignorePaths,
    languageOptions: { parserOptions: { projectService: true } },
    extends: [eslint.configs.recommended, tseslint.configs.recommendedTypeChecked],

    // register plugins for flat config
    plugins: {
      // key is the plugin name used in rule keys (import/...)
      import: importPlugin,
    },

    // plugin rule enablement
    rules: {
      // enable no-internal-modules; adjust options as needed
      "import/no-internal-modules": [
        "error",
        {
          allow: [
            // any css module by extension anywhere
            // e.g. because these can't be exported instead by a barrel file
            "**/*.css",
            // // any path segment named 3rd-party
            // "**/3rd-party/**",
            // react
            "react-dom/client",
            // // src/contracts-*.ts are facade modules
            // "**/contracts/**",
            // // test can reach anywhere and have a ./utils folder
            // "**/backend-test/**",
            // "**/electron-app-test/**",
          ],
        },
      ],
      "import/no-cycle": ["error", { maxDepth: 5 }],
    },

    // make eslint-plugin-import resolve using your tsconfig paths
    settings: {
      "import/resolver": {
        // use the TypeScript resolver which understands tsconfig "paths"
        typescript: {
          // path to the tsconfig file(es) you want the resolver to read
          // can be a single path string or an array of paths
          project: "./packages/electron-app/tsconfig.json",

          // optional: prefer @types/* when resolving
          alwaysTryTypes: true,
        },
      },
    },
  },
  // Test packages are integration-style: they may reach into any source module
  // (including other packages' src/) and use their own ./utils folders, so the
  // no-internal-modules boundary rule does not apply there.
  {
    files: ["packages/backend-test/**/*", "packages/electron-app-test/**/*", "packages/backend/src/contracts-*.ts"],
    rules: { "import/no-internal-modules": "off" },
  },
  // React's rules of hooks, whole: this is the plugin's `recommended-latest` preset, which in v7 is the
  // compiler-era set rather than the two rules it used to be. The rules look at calls named like hooks, so
  // they apply to the files which use React -- the renderer and its tests -- and not to the backend.
  {
    files: ["packages/electron-app/src/renderer/**/*.{ts,tsx}", "packages/electron-app-test/**/*.{ts,tsx}"],
    ...reactHooks.configs["recommended-latest"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs["recommended-latest"].rules,
      // A ref handed down as an ordinary prop is this code's design, not a mistake: React 19 treats `ref` as a
      // normal prop, and this rule then reports every read of that props object during render -- in EdgePopup
      // it reports seven, six of which are not about refs at all.
      "react-hooks/refs": "off",
    },
  },
]);
