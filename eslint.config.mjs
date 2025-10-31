import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const ignorePaths = [
  // per-file override: do not use project-based type-checking for the config file itself
  "eslint.config.mjs",
  // don't lint 3rd-party source code
  "packages/electron-app/src/renderer/3rd-party/**",
  // won't lint the webpack config files
  "packages/electron-app/webpack.*.config.ts",
];

export default defineConfig([
  {
    ignores: ignorePaths,
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    extends: [eslint.configs.recommended, tseslint.configs.recommendedTypeChecked],
  },
]);
