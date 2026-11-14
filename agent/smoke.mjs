// A smoke test: spawn the server, list its tools, and call one of them. Run it with `node agent/smoke.mjs`.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const server = fileURLToPath(new URL("./server.mjs", import.meta.url));
const transport = new StdioClientTransport({ command: "node", args: [server] });
const client = new Client({ name: "apis-agent-smoke", version: "0.0.1" });

await client.connect(transport);

const { tools } = await client.listTools();
console.log("tools:", tools.map((tool) => tool.name).join(", "));

const result = await client.callTool({ name: "git_status", arguments: {} });
console.log("git_status: ", result.content[0].text || "(clean)");

const formatted = await client.callTool({ name: "prettier_write", arguments: { files: ["agent/server.mjs"] } });
console.log("prettier_write: ", formatted.content[0].text);

const lines = await client.callTool({
  name: "read_lines",
  arguments: { path: "agent/package.json", start: 1, end: 4 },
});
console.log("read_lines:\n" + lines.content[0].text);

const found = await client.callTool({ name: "search", arguments: { pattern: "clusterTypes", include: "viewState" } });
console.log("search:\n" + found.content[0].text.split("\n").slice(0, 3).join("\n"));

const listed = await client.callTool({ name: "list_files", arguments: { dir: "agent", pattern: "mjs" } });
console.log("list_files:\n" + listed.content[0].text);

const log = await client.callTool({ name: "git_log", arguments: { count: 2 } });
console.log("git_log:\n" + log.content[0].text);

await client.close();
