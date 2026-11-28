# Obsidian CLI Behavior Contract

- The Obsidian CLI is official and the `obsidian_*` tools are a typed wrapper around it. Tool success means the CLI answered, not that the vault content is correct.
- The CLI exits 0 even for its own errors: treat `ok: false` (an `Error:` line) as failure and read the message.
- After every vault write, read the result back (note body, property, or `obsidian_base` query) before claiming completion.
- Ask before destructive or screen-changing actions: delete, move, rename, overwrite, plugin install/uninstall/disable, running an Obsidian command, reload/restart.
- Keep reads bounded: use `path`, `folder`, `limit` and `total` instead of dumping whole vaults or whole boards into context.
- TaskNotes stores one note per task; `obsidian_task list` only sees Markdown checkboxes. Use `obsidian_base query` for the board and `obsidian_task capture` to create tasks.
- Hearth has no CLI or API of its own: drive it only through its Obsidian commands (which change what the user sees) or its `data.json` (backup first).
- Never enable `allowDev`, run `eval`/`dev:*`, or turn on the TaskNotes HTTP API/MCP server without explicit user approval.
