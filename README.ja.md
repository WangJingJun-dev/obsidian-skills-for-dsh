# Obsidian Skills for DSH

[中文](README.md) | [English](README.en.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Русский](README.ru.md)

[Obsidian 公式 Agent Skills](https://github.com/obsidianmd/obsidian-skills) のスキルを、DeepSeek Harness プラグインとして軽量にパッケージします。プラグイン詳細ページで上流バージョンを確認し、選択した Release に更新できます。

## DSH 専用版を用意した理由

Obsidian はまだ DeepSeek Harness プラグインを提供していません。このリポジトリは DSH 側を補完し、公式スキルの原文を再利用して DSH プラグインマニフェスト、上流バージョン確認、ツリー全体の更新を追加します。

## 上流との整合

上流 `1.2.3` 時点の公式 README では、Claude、ChatGPT/Codex、Cursor、Grok Bot、Hermes Agent がプラグイン入口として案内されています。インストール手順には Claude Code、Codex、npx skills、Gemini CLI、OpenCode も含まれます。対応範囲は上流リリースごとに変わるため、[上流のインストール手順](https://github.com/obsidianmd/obsidian-skills#installation)を正としてください。このリポジトリは各クライアント設定を複製せず、DeepSeek Harness の入口だけを補完します。

## 特長

- **軽量**：上流のスキルのみを登録し、外部プロセスを起動しません。
- **ローカルツールを使用**：CLI バイナリは同梱せず、DSH セッション経由でローカルにインストールされた `obsidian`、`ob`、`defuddle`、`knap` を呼び出します。
- **クリーン**：MCP サーバー、常駐プロセス、テレメトリー、認証情報はありません。GitHub へのアクセスはバージョン確認と更新時だけです。
- **追跡可能**：同梱している上流バージョンと commit を記録します。
- **更新可能**：上流の最新 GitHub Release を確認し、その Release に更新できます。新しいスキルもツリー全体の同期で追加されます。

## 含まれるスキル

| スキル | 用途 |
|---|---|
| `obsidian-markdown` | Obsidian Flavored Markdown：wikilink、埋め込み、callout、properties |
| `obsidian-bases` | `.base` のビュー、フィルター、数式、集計 |
| `json-canvas` | `.canvas` のノード、エッジ、グループ、レイアウト |
| `obsidian-cli` | Obsidian CLI で vault を読み書きし、プラグインとテーマを開発 |
| `obsidian-headless` | デスクトップアプリなしで `ob` による vault の同期と公開 |
| `defuddle` | Web ページから読みやすい Markdown を抽出 |
| `knap` | JSON/CSV データから Markdown テンプレートをレンダリング |

スキルファイルにツールは含まれません。使用時は DSH がセッションのシェルまたは既存のネイティブツール経由で、ローカルにインストールされた `obsidian`、`ob`、`defuddle`、`knap` を呼び出します。これらの呼び出しは DSH の権限と承認に従います。

## インストール

DSH の **プラグイン** で **プラグインを追加** を選び、次を入力します。

```text
https://github.com/WangJingJun-dev/obsidian-skills-for-dsh
```

インストール後に新しいセッションを開き、スキルカタログを読み込みます。同名スキルを登録する別プラグインがある場合、DSH の登録優先順位により 1 つだけが残ります。

## 上流バージョンの確認と更新

プラグイン詳細ページの **上流スキルバージョン** セクションでは、次の情報を表示します。

- 同梱している上流バージョン、commit、同期時刻
- ページを開いたときに `obsidianmd/obsidian-skills` の最新 GitHub Release を確認
- 新しいバージョンがあれば **vX に更新** と Release リンクを表示
- **再確認** を押すと短時間のキャッシュを回避

更新では選択した Release の tag を取得してバックアップし、`skills/` ディレクトリ全体を置き換えます。追加、変更、削除されたスキルが Release と正確に一致します。失敗時はロールバックし、部分更新を残しません。ローカルに `git` が必要で、インストール先ディレクトリへの書き込み権限も必要です。

## 範囲と権限

- プラグインは Obsidian vault に直接書き込みません。
- 書き込みを説明するスキルは実際のツールを使い、DSH の権限と承認に従います。
- MCP サーバー、常駐デーモン、テレメトリー、アカウント認証情報は含みません。
- 更新はインストール済みプラグインのディレクトリを変更します。読み取り専用のインストールでは部分更新せず失敗を報告します。

## 出典とライセンス

上流：[obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills)、MIT License。[LICENSE.upstream](LICENSE.upstream) を参照してください。このプラグインはスキルのみをパッケージし、上流の本文は変更しません。アイコンは上流の原本で、Obsidian は Dynalist Inc. の商標です。このプロジェクトは非公式です。

開発には DeepSeek が参加しました。クレジットと GitHub Contributors の制約は [CONTRIBUTORS.md](CONTRIBUTORS.md) を参照してください。
