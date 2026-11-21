# Obsidian Skills for DSH

[中文](README.md) | [English](README.en.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Русский](README.ru.md)

把 [Obsidian 官方 Agent Skills](https://github.com/obsidianmd/obsidian-skills) 轻量打包为 DeepSeek Harness 插件。插件详情页可查看上游版本，并按 Release 更新技能。

## 为什么单独做 DSH 版本

Obsidian 尚未提供 DeepSeek Harness 插件版。本仓库补齐这一端：复用官方技能原文，增加 DSH 插件清单、上游版本检查和整树更新。

## 特点

- **轻量**：仅注册 7 个技能，不启动外部进程。
- **仅打包**：不捆绑 Obsidian、Defuddle、Knap 等命令行工具。
- **干净**：无 MCP、无后台常驻、无遥测、无凭据；只有检查或更新时访问 GitHub。
- **可追溯**：记录内置上游版本和对应 commit。
- **可更新**：详情页检查上游 GitHub Release，并可更新到所选版本。

## 包含技能

| 技能 | 用途 |
|---|---|
| `obsidian-markdown` | Obsidian 风格 Markdown：wikilink、嵌入、callout、properties |
| `obsidian-bases` | `.base` 文件的视图、过滤、公式和汇总 |
| `json-canvas` | `.canvas` 节点、连线、分组和布局 |
| `obsidian-cli` | 通过 Obsidian CLI 读写 vault、开发插件和主题 |
| `obsidian-headless` | 用 `ob` 同步和发布 vault，无需桌面应用 |
| `defuddle` | 从网页提取干净的 Markdown |
| `knap` | 用 JSON/CSV 数据渲染 Markdown 模板 |

技能仅包含说明，不包含实际工具。`obsidian`、`ob`、`defuddle`、`knap` 需要单独安装，并遵守当前 DSH 会话的权限和审批规则。

## 安装

在 DSH 的 **插件** 页选择 **添加插件**，输入：

```text
https://github.com/WangJingJun-dev/obsidian-skills-for-dsh
```

安装后请新开一个会话，以加载技能目录。若已有其他插件注册同名技能，DSH 会按注册优先级只保留一个。

## 上游版本检查与更新

插件详情页的「上游技能版本」区域会：

- 显示内置的上游版本、commit 和同步时间；
- 打开详情页时检查 `obsidianmd/obsidian-skills` 的最新 GitHub Release；
- 发现新版本时显示「更新到 vX」和 Release 链接；
- 点击「重新检查」可绕过短时缓存。

更新会拉取所选 Release 的 tag，先备份，再**整树替换** `skills/` 目录，因此新增、修改和删除的技能都与该 Release 一致。失败会回滚，不会留下部分更新的状态。更新需要本机已安装 `git`，并拥有插件目录写权限。

## 权限与边界

- 插件不写入你的 Obsidian vault。
- 技能涉及的写操作由实际工具执行，并受 DSH 权限和审批约束。
- 不包含 MCP 服务、后台守护进程、遥测或账号凭据。
- 更新会修改已安装插件目录；只读安装会报错，不会部分写入。

## 来源与许可

上游：[obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills)，MIT License。

插件图标来自上游 `plugins/obsidian/assets/icon.png`，保留透明背景。图标文件包含在采用 MIT 许可的上游仓库中，但 Obsidian 名称、Logo 和应用图标是商标；根据 [Obsidian 品牌指南](https://obsidian.md/brand)，不得编辑、改色或变形，商业用途需联系 Obsidian。本项目为非官方插件，与 Obsidian 无隶属关系，也未获其背书。

本插件只负责打包和更新，不修改上游技能正文。完整版权信息见 [LICENSE.upstream](LICENSE.upstream) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

开发过程中使用了 DeepSeek 协助；署名和 GitHub Contributors 的限制见 [CONTRIBUTORS.md](CONTRIBUTORS.md)。
