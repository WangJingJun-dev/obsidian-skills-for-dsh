# Obsidian Skills for DSH

[中文](README.md) | [English](README.en.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Русский](README.ru.md)

[Obsidian 公式 Agent Skills](https://github.com/obsidianmd/obsidian-skills) の 7 スキルを、DeepSeek Harness プラグインとして軽量にパッケージします。プラグイン詳細ページで上流バージョンを確認し、選択した Release に更新できます。

## DSH 専用版を用意した理由

Obsidian はまだ DeepSeek Harness プラグインを提供していません。このリポジトリは DSH 側を補完し、公式スキルの原文を再利用して DSH プラグインマニフェスト、上流バージョン確認、ツリー全体の更新を追加します。

## 特長

- **軽量**：7 つのスキルを登録するだけで、外部プロセスを起動しません。
- **スキルのみ同梱**：Obsidian、Defuddle、Knap の CLI ツールは同梱しません。
- **クリーン**：MCP サーバー、常駐プロセス、テレメトリー、認証情報はありません。GitHub へのアクセスはバージョン確認と更新時だけです。
- **追跡可能**：同梱している上流バージョンと commit を記録します。
- **更新可能**：上流の最新 GitHub Release を確認し、その Release に更新できます。

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

スキルは説明のみを提供し、実際のツールは含みません。`obsidian`、`ob`、`defuddle`、`knap` は同梱されず、現在の DSH セッションの権限と承認ルールに従います。

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

上流：[obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills)、MIT License。

プラグインのアイコンは上流 `plugins/obsidian/assets/icon.png` を使用し、透明背景を保持しています。アイコンは MIT ライセンスの上流リポジトリに含まれますが、Obsidian の名称、ロゴ、アプリアイコンは商標です。[Obsidian ブランドガイドライン](https://obsidian.md/brand)に従い、編集、改変、再着色はせず、商用利用は Obsidian に問い合わせる必要があります。この非公式プラグインは Obsidian と提携しておらず、承認も受けていません。

このプラグインはスキルのパッケージと更新のみを担当し、上流スキルの本文は変更しません。詳細は [LICENSE.upstream](LICENSE.upstream) と [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

開発には DeepSeek が参加しました。クレジットと GitHub Contributors の制約は [CONTRIBUTORS.md](CONTRIBUTORS.md) を参照してください。
