# Obsidian for DSH

[中文](README.md) | [English](README.en.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Русский](README.ru.md)

Obsidian 공식 CLI를 DSH 네이티브 도구로 감싸고, Obsidian 공식 Agent Skills를 함께 패키징합니다. 플러그인 상세 페이지에서 업스트림 버전을 확인하고 선택한 Release로 업데이트할 수 있습니다.

## DSH 전용 버전을 만든 이유

Obsidian은 아직 DeepSeek Harness 플러그인을 제공하지 않습니다. 이 저장소는 DSH 쪽을 보완합니다. 7개의 `obsidian_*` 네이티브 도구, 공식 스킬 원문, 업스트림 버전 확인, 전체 트리 업데이트를 추가합니다.

## 업스트림과 정렬

업스트림 `1.2.3` 기준 공식 README의 플러그인 항목에는 Claude, ChatGPT/Codex, Cursor, Grok Bot, Hermes Agent가 있습니다. 설치 안내에는 Claude Code, Codex, npx skills, Gemini CLI, OpenCode도 포함됩니다. 지원 범위는 업스트림 릴리스에 따라 바뀌므로 [업스트림 설치 안내](https://github.com/obsidianmd/obsidian-skills#installation)를 기준으로 확인하세요. 이 저장소는 해당 클라이언트 설정을 복제하지 않고 DeepSeek Harness 항목만 보완합니다.

## 특징

- **네이티브 도구**: 로컬 Obsidian CLI를 호출하는 7개의 `obsidian_*` 도구를 등록합니다.
- **공식 스킬**: 업스트림 Agent Skills 전체를 패키징하고 Release에 맞춰 전체 트리를 업데이트합니다.
- **깔끔함**: MCP 서버, 백그라운드 상주 프로세스, 텔레메트리, 자격 증명이 없습니다. GitHub는 버전 확인과 업데이트 때만 접근합니다.
- **추적 가능**: 내장된 업스트림 버전과 commit을 기록합니다.
- **업데이트 가능**: 최신 업스트림 GitHub Release를 확인하고 해당 Release로 업데이트할 수 있으며, 새 스킬도 전체 트리 동기화로 함께 추가됩니다.

## 포함된 스킬

| 스킬 | 용도 |
|---|---|
| `obsidian-markdown` | Obsidian Flavored Markdown: wikilink, embed, callout, properties |
| `obsidian-bases` | `.base` 뷰, 필터, 수식, 요약 |
| `json-canvas` | `.canvas` 노드, 연결선, 그룹, 레이아웃 |
| `obsidian-cli` | Obsidian CLI로 vault 읽기/쓰기, 플러그인과 테마 개발 |
| `obsidian-headless` | 데스크톱 앱 없이 `ob`로 vault 동기화 및 게시 |
| `defuddle` | 웹 페이지에서 깨끗한 Markdown 추출 |
| `knap` | JSON/CSV 데이터로 Markdown 템플릿 렌더링 |

스킬 파일에는 도구가 포함되지 않습니다. 네이티브 도구는 `obsidian_*`로 로컬 Obsidian CLI를 호출하고, Defuddle/Knap 등의 스킬은 세션 셸 또는 기존 네이티브 도구를 통해 로컬 명령을 호출합니다. DSH 권한과 승인 규칙을 따릅니다.

네이티브 도구: `obsidian_vault`, `obsidian_note`, `obsidian_property`, `obsidian_base`, `obsidian_task`, `obsidian_plugin`, `obsidian_cli`. 시스템 프롬프트 `Obsidian CLI Behavior Contract`와 `/obsidian-status` 명령도 등록합니다.

## 설치

DSH의 **플러그인**에서 **플러그인 추가**를 선택하고 다음을 입력합니다.

```text
https://github.com/WangJingJun-dev/obsidian-for-dsh
```

설치 후 새 세션을 열어 스킬 카탈로그를 불러옵니다. 다른 플러그인이 같은 이름의 스킬을 등록한 경우 DSH의 등록 우선순위에 따라 하나만 유지됩니다.

## 업스트림 버전 확인 및 업데이트

플러그인 상세 페이지의 **업스트림 스킬 버전** 영역은 다음을 제공합니다.

- 내장된 업스트림 버전, commit, 동기화 시간 표시
- 페이지를 열 때 `obsidianmd/obsidian-skills`의 최신 GitHub Release 확인
- 새 버전이 있으면 **vX로 업데이트**와 Release 링크 표시
- **다시 확인**을 누르면 짧은 캐시를 우회

업데이트는 선택한 Release의 tag를 가져와 백업한 뒤 `skills/` 디렉터리 전체를 교체합니다. 따라서 추가, 수정, 삭제된 스킬이 해당 Release와 정확히 일치합니다. 실패하면 롤백하며 일부만 갱신된 상태를 남기지 않습니다. 로컬에 `git`이 설치되어 있어야 하며 설치 디렉터리 쓰기 권한이 필요합니다.

## 범위와 권한

- 플러그인은 Obsidian vault에 직접 쓰지 않습니다.
- 쓰기를 설명하는 스킬은 실제 도구를 사용하며 DSH 권한과 승인을 따릅니다.
- MCP 서버, 백그라운드 데몬, 텔레메트리, 계정 자격 증명을 포함하지 않습니다.
- 업데이트는 설치된 플러그인 디렉터리를 수정합니다. 읽기 전용 설치에서는 부분 업데이트 없이 실패를 보고합니다.

## 출처 및 라이선스

업스트림: [obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills), MIT License; [LICENSE.upstream](LICENSE.upstream)을 참고하세요. 이 플러그인은 공식 CLI를 감싸고 공식 스킬을 패키징하며 업스트림 본문을 수정하지 않습니다. 아이콘은 업스트림 원본이며 Obsidian은 Dynalist Inc.의 상표입니다. 이 프로젝트는 비공식입니다.

개발에는 DeepSeek이 참여했습니다. 기여 표기와 GitHub Contributors 제한은 [CONTRIBUTORS.md](CONTRIBUTORS.md)를 참고하세요.
