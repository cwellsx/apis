import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const ignorePaths = ["packages/electron-app/src/renderer/3rd-party/**"];

export default defineConfig([
  {
    ignores: ignorePaths,
    extends: [eslint.configs.recommended, tseslint.configs.recommended],
  },
]);
