const path = require("path");
const { defineConfig } = require("vitest/config");

// the renderer imports its contracts through these aliases (see packages/electron-app/tsconfig.json)
const alias = { "backend-ui": path.resolve(__dirname, "../backend/contracts/ui/index.ts") };

module.exports = defineConfig({ resolve: { alias }, test: { environment: "jsdom", globals: true } });
