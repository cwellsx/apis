// An MCP server for the commands an agent runs while working in this repository, so that they can be allowed in
// advance instead of approved one at a time.
//
// Each tool builds a fixed command from typed arguments -- none of them takes a command string, so allowing
// these tools cannot run anything else. Paths are checked to be inside the repository.

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// the repository is the folder above this one, which is why the server can live inside it
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const quote = (value) => `"${value}"`;

const isInside = (file) => {
  const full = path.resolve(repo, file);
  if (!full.startsWith(`${repo}${path.sep}`)) throw new Error(`not inside the repository: ${file}`);
  return full;
};

// the shell is needed on Windows, where npm and npx are .cmd shims; the arguments are built here and quoted,
// so nothing from the caller reaches the shell as syntax. NO_COLOR keeps the tools from emitting ANSI escapes,
// which are noise in the text an agent reads.
const run = (command, args, cwd) =>
  new Promise((resolve) => {
    const options = {
      cwd: cwd ?? repo,
      shell: true,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    };
    execFile(command, args, options, (error, stdout, stderr) => {
      const exitCode = error ? (error.code ?? "failed") : 0;
      // trimEnd, not trim: the first column of `git status --short` is a space, and it means something
      resolve([`exit ${exitCode}`, stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join("\n"));
    });
  });

const text = (value) => ({ content: [{ type: "text", text: value }] });

const server = new McpServer({ name: "apis-agent", version: "0.0.1" });

server.registerTool(
  "type_check",
  {
    title: "Type-check a package",
    description: "npm run type-check -w <package>",
    inputSchema: { package: z.enum(["apis", "backend-test", "electron-app-test"]) },
  },
  async ({ package: name }) => text(await run("npm", ["run", "type-check", "-w", name]))
);

server.registerTool(
  "eslint",
  {
    title: "Lint files",
    description: "eslint on the given files, which are resolved against the repository root",
    inputSchema: { files: z.array(z.string()).min(1) },
  },
  async ({ files }) => {
    // the config is found from the working directory, which is where the lint script runs
    const cwd = path.join(repo, "packages", "electron-app");
    const relative = files.map((file) => quote(path.relative(cwd, isInside(file))));
    return text(await run("npx", ["--no-install", "eslint", ...relative], cwd));
  }
);

server.registerTool(
  "prettier_write",
  {
    title: "Format files",
    description: "prettier --write on the given files, which are resolved against the repository root",
    inputSchema: { files: z.array(z.string()).min(1) },
  },
  async ({ files }) =>
    text(await run("npx", ["--no-install", "prettier", "--write", ...files.map((file) => quote(isInside(file)))]))
);

server.registerTool(
  "git_status",
  { title: "Git status", description: "git status --short", inputSchema: {} },
  async () => text(await run("git", ["--no-pager", "status", "--short"]))
);

server.registerTool(
  "git_diff",
  {
    title: "Git diff",
    description: "git diff of the working tree, of the index, or of everything since HEAD",
    inputSchema: { scope: z.enum(["unstaged", "staged", "head"]) },
  },
  async ({ scope }) => {
    const scopes = { unstaged: [], staged: ["--cached"], head: ["HEAD"] };
    return text(await run("git", ["--no-pager", "diff", ...scopes[scope]]));
  }
);

await server.connect(new StdioServerTransport());
