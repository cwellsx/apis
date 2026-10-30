import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
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
      "import/no-cycle": ["error", { maxDepth: 2 }],
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
]);
