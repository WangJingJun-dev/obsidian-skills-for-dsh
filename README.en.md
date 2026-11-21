# Obsidian Skills for DSH

[中文](README.md) | [English](README.en.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Русский](README.ru.md)

A lightweight DeepSeek Harness plugin for the [official Obsidian agent skills](https://github.com/obsidianmd/obsidian-skills). The plugin detail page checks the upstream version and can update the skills to a selected release.

## Why a DSH-specific build

Obsidian does not currently provide a DeepSeek Harness plugin. This repository fills that gap: it reuses the official skill text and adds the DSH bundle manifest, upstream version checks, and full-tree updates.

## Highlights

- **Lightweight**: registers seven skills and starts no external process.
- **Skills only**: does not bundle the Obsidian, Defuddle, or Knap command-line tools.
- **Clean**: no MCP server, background daemon, telemetry, or credentials; GitHub is contacted only for version checks or updates.
- **Traceable**: records the included upstream version and commit.
- **Updatable**: checks the latest upstream GitHub Release and can update to that release.

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

The skills contain instructions only and do not include the actual tools. `obsidian`, `ob`, `defuddle`, and `knap` are not bundled and remain subject to the current DSH session's permissions and approvals.

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

Upstream: [obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills), MIT License.

The plugin icon comes from the upstream `plugins/obsidian/assets/icon.png` and keeps its transparent background. The icon is included in the MIT-licensed upstream repository, but the Obsidian name, logo, and app icon are trademarks. The [Obsidian brand guidelines](https://obsidian.md/brand) require the mark to remain unmodified and direct commercial use to Obsidian. This unofficial plugin is not affiliated with or endorsed by Obsidian.

The plugin only packages and updates the skills; it does not modify the upstream skill bodies. See [LICENSE.upstream](LICENSE.upstream) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

DeepSeek assisted during development. See [CONTRIBUTORS.md](CONTRIBUTORS.md) for attribution and the GitHub Contributors limitation.
