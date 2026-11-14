// An MCP server for the commands an agent runs while working in this repository, so that they can be allowed in
// advance instead of approved one at a time.
//
// Each tool builds a fixed command from typed arguments -- none of them takes a command string, so allowing
// these tools cannot run anything else. Paths are checked to be inside the repository.

import { execFile } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
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
  // the repository itself is allowed, as well as what is under it
  if (full !== repo && !full.startsWith(`${repo}${path.sep}`)) throw new Error(`not inside the repository: ${file}`);
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

// --- reading, which is done with node rather than with a shell command, so that a range of lines has no quoting
// to get wrong and cannot come back stale

const readLines = async (file, start, end) => {
  const lines = (await readFile(isInside(file), "utf8")).split(/\r?\n/);
  const first = Math.max(1, start ?? 1);
  const last = Math.min(lines.length, end ?? first + 399);
  const numbered = lines.slice(first - 1, last).map((line, index) => `${first + index}: ${line}`);
  return numbered.join("\n") + (last < lines.length ? `\n… ${lines.length - last} more lines` : "");
};

server.registerTool(
  "read_lines",
  {
    title: "Read lines of a file",
    description: "a range of lines of a file, numbered, resolved against the repository root; 400 lines by default",
    inputSchema: { path: z.string(), start: z.number().int().optional(), end: z.number().int().optional() },
  },
  async ({ path: file, start, end }) => text(await readLines(file, start, end))
);

const listFiles = async (dir, pattern, recursive) => {
  const root = isInside(dir ?? ".");
  const match = pattern ? new RegExp(pattern, "i") : undefined;
  const cap = 400;
  const lines = [];
  const walk = async (current) => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((x, y) => x.name.localeCompare(y.name))) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const full = path.join(current, entry.name);
      const relative = path.relative(repo, full);
      if (entry.isDirectory()) {
        lines.push(`${relative}${path.sep}`);
        if (recursive && lines.length < cap) await walk(full);
      } else if (!match || match.test(entry.name)) lines.push(`${relative}  ${(await stat(full)).size}`);
      if (lines.length >= cap) return;
    }
  };
  await walk(root);
  return lines.join("\n") + (lines.length >= cap ? "\n… more" : "");
};

server.registerTool(
  "list_files",
  {
    title: "List files",
    description: "files under a directory with their sizes, skipping node_modules and dist; recursive on request",
    inputSchema: { dir: z.string().optional(), pattern: z.string().optional(), recursive: z.boolean().optional() },
  },
  async ({ dir, pattern, recursive }) => text(await listFiles(dir, pattern, recursive))
);

const search = async (pattern, paths, include) => {
  const roots = (paths?.length ? paths : ["."]).map(isInside);
  const includeMatch = include ? new RegExp(include, "i") : undefined;
  const patternMatch = new RegExp(pattern);
  const skip = /[\\/](node_modules|dist|out|bin|obj|\.git)[\\/]/;
  const cap = 200;
  const hits = [];
  let total = 0;
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (skip.test(full)) continue;
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const relative = path.relative(repo, full);
        if (includeMatch && !includeMatch.test(relative)) continue;
        if ((await stat(full)).size > 1024 * 1024) continue;
        const lines = (await readFile(full, "utf8")).split(/\r?\n/);
        lines.forEach((line, index) => {
          if (!patternMatch.test(line)) return;
          ++total;
          if (hits.length < cap) hits.push(`${relative}:${index + 1}: ${line.trim()}`);
        });
      }
    }
  };
  for (const root of roots) await walk(root);
  const more = total > hits.length ? `\n… ${total - hits.length} more matches` : "";
  return (hits.join("\n") || "no matches") + more;
};

server.registerTool(
  "search",
  {
    title: "Search files",
    description: "a regular expression over the files under the given paths, as path:line: text",
    inputSchema: { pattern: z.string(), paths: z.array(z.string()).optional(), include: z.string().optional() },
  },
  async ({ pattern, paths, include }) => text(await search(pattern, paths, include))
);

server.registerTool(
  "git_log",
  {
    title: "Git log",
    description: "recent commits, one line each",
    inputSchema: { count: z.number().int().optional() },
  },
  async ({ count }) => text(await run("git", ["--no-pager", "log", "-n", String(count ?? 10), "--oneline"]))
);

await server.connect(new StdioServerTransport());
