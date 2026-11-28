# Obsidian for DSH

[中文](README.md) | [English](README.en.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Русский](README.ru.md)

A DeepSeek Harness plugin that wraps the official Obsidian CLI as native DSH tools and packages the official Obsidian agent skills. The plugin detail page checks the upstream version and can update the skills to a selected release.

## Why a DSH-specific build

Obsidian does not currently provide a DeepSeek Harness plugin. This repository adds the missing layer: seven `obsidian_*` native tools, the official skill text, upstream version checks, and full-tree updates.

## Alignment with upstream

As of upstream `1.2.3`, the official README lists plugin entries for Claude, ChatGPT/Codex, Cursor, Grok Bot, and Hermes Agent. Its installation guide also covers Claude Code, Codex, npx skills, Gemini CLI, and OpenCode. The supported client set changes with upstream releases; use the [upstream installation guide](https://github.com/obsidianmd/obsidian-skills#installation) as the source of truth. This repository does not copy those client configurations; it only adds the DeepSeek Harness entry.

## Highlights

- **Native tools**: registers seven `obsidian_*` tools that call the local Obsidian CLI.
- **Official skills**: packages every upstream agent skill and updates the tree from a release.
- **Clean**: no MCP server, background daemon, telemetry, or credentials; GitHub is contacted only for version checks or updates.
- **Traceable**: records the included upstream version and commit.
- **Updatable**: checks the latest upstream GitHub Release and can update to that release; new skills arrive with the full-tree sync.

## Included skills

| Skill | Purpose |
|---|---|
| `obsidian-markdown` | Obsidian Flavored Markdown: wikilinks, embeds, callouts, properties |
| `obsidian-bases` | `.base` views, filters, formulas, and summaries |
| `json-canvas` | `.canvas` nodes, edges, groups, and layout |
| `obsidian-cli` | Read and write a vault through the Obsidian CLI; develop plugins and themes |
| `obsidian-headless` | Sync and publish vaults with `ob` without the desktop app |
| `defuddle` | Extract clean Markdown from web pages |
| `knap` | Render Markdown templates from JSON or CSV data |

The skill files do not contain the tools themselves. Native tools call the local Obsidian CLI through `obsidian_*`; Defuddle, Knap, and similar skills call locally installed commands through the session shell or existing native tools. Those calls remain subject to DSH permissions and approvals.

## Native tools

| Tool | Purpose |
|---|---|
| `obsidian_vault` | Vault info, files/folders, search, tags, properties, Bases, workspace |
| `obsidian_note` | Read/create/append/move/rename/delete notes; outline, links, daily notes, templates |
| `obsidian_property` | Read, write, or remove one frontmatter property |
| `obsidian_base` | List, inspect, query, and create Bases entries |
| `obsidian_task` | Markdown tasks, TaskNotes, time tracking, pomodoro |
| `obsidian_plugin` | Plugins, commands, hotkeys, enable/disable, reload |
| `obsidian_cli` | Escape hatch for arbitrary Obsidian CLI commands |

The plugin also registers the `Obsidian CLI Behavior Contract` system prompt and the `/obsidian-status` command.

## Install

In DSH, open **Plugins**, choose **Add plugin**, and enter:

```text
https://github.com/WangJingJun-dev/obsidian-for-dsh
```

Open a new session after installation so the skill catalog loads. If another plugin registers a skill with the same name, DSH keeps one according to its registration precedence.

## Upstream version check and updates

The **Upstream skill version** section on the plugin detail page:

- shows the included upstream version, commit, and sync time;
- checks the latest `obsidianmd/obsidian-skills` GitHub Release when the page opens;
- shows **Update to vX** and a release link when a newer version exists;
- bypasses the short cache when you select **Check again**.

An update fetches the tag for the selected release, creates a backup, and **replaces the complete `skills/` tree**. New, changed, and deleted skills therefore match that release exactly. A failed update rolls back and never leaves a partially updated tree. Updating requires `git` on the local machine and write access to the installed plugin directory.

## Scope and permissions

- The plugin does not write to your Obsidian vault.
- Skills that describe writes use the actual tools and remain subject to DSH permissions and approvals.
- No MCP server, background daemon, telemetry, or account credentials are included.
- Updates modify the installed plugin directory; a read-only installation reports a failure instead of partially updating.

## Source and license

Upstream: [obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills), MIT License; see [LICENSE.upstream](LICENSE.upstream). This plugin wraps the official Obsidian CLI and packages the official skills without modifying their text. The icon is the original upstream asset; Obsidian is a trademark of Dynalist Inc., and this is an unofficial project.

DeepSeek assisted during development; see [CONTRIBUTORS.md](CONTRIBUTORS.md).
