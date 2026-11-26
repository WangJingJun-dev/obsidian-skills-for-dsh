# Obsidian Skills for DSH

[中文](README.md) | [English](README.en.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Русский](README.ru.md)

A lightweight DeepSeek Harness plugin for the [official Obsidian agent skills](https://github.com/obsidianmd/obsidian-skills). The plugin detail page checks the upstream version and can update the skills to a selected release.

## Why a DSH-specific build

Obsidian does not currently provide a DeepSeek Harness plugin. This repository fills that gap: it reuses the official skill text and adds the DSH bundle manifest, upstream version checks, and full-tree updates.

## Alignment with upstream

As of upstream `1.2.3`, the official README lists plugin entries for Claude, ChatGPT/Codex, Cursor, Grok Bot, and Hermes Agent. Its installation guide also covers Claude Code, Codex, npx skills, Gemini CLI, and OpenCode. The supported client set changes with upstream releases; use the [upstream installation guide](https://github.com/obsidianmd/obsidian-skills#installation) as the source of truth. This repository does not copy those client configurations; it only adds the DeepSeek Harness entry.

## Highlights

- **Lightweight**: registers the upstream skills and starts no external process.
- **Uses local tools**: does not bundle CLI binaries; skills call the locally installed `obsidian`, `ob`, `defuddle`, and `knap` through the DSH session.
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

The skill files do not contain the tools themselves. In use, DSH calls the locally installed `obsidian`, `ob`, `defuddle`, and `knap` through the session shell or existing native tools; those calls remain subject to DSH permissions and approvals.

## Install

In DSH, open **Plugins**, choose **Add plugin**, and enter:

```text
https://github.com/WangJingJun-dev/obsidian-skills-for-dsh
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

Upstream: [obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills), MIT License; see [LICENSE.upstream](LICENSE.upstream). This plugin packages the skills without modifying their text. The icon is the original upstream asset; Obsidian is a trademark of Dynalist Inc., and this is an unofficial project.

DeepSeek assisted during development; see [CONTRIBUTORS.md](CONTRIBUTORS.md).
