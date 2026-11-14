# agent

An MCP server for what an agent needs while working in this repository — `type_check`, `eslint`, `prettier_write`,
`git_status`, `git_diff`, `git_log`, `read_lines`, `list_files`, `search` — so that they can be allowed in advance
instead of approved one at a time.

The command tools build a fixed command from typed arguments. None of them takes a command string, and every path
is checked to be inside the repository, so allowing these tools cannot run anything else. The reading tools use
node's filesystem directly, which is why a range of lines comes back numbered and cannot be stale.

The repository root is taken to be the folder above this one, so the server has to live inside the repo it works
on.

## Registering it

Install its dependencies once:

```powershell
cd C:\Dev\apis\agent
npm install @modelcontextprotocol/sdk zod
```

Add it to `~/.cline/data/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "apis-agent": {
      "command": "node",
      "args": ["C:\\Dev\\apis\\agent\\server.mjs"],
      "alwaysAllow": [
        "type_check",
        "eslint",
        "prettier_write",
        "git_status",
        "git_diff",
        "git_log",
        "read_lines",
        "list_files",
        "search"
      ]
    }
  }
}
```

Then reload the window, or restart the MCP servers, so that the server is spawned. `alwaysAllow` is the classic
setting; if the current version ignores it, the same toggle is in the MCP panel, per tool.
