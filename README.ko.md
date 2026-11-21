# Obsidian Skills for DSH

[中文](README.md) | [English](README.en.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [Русский](README.ru.md)

[Obsidian 공식 Agent Skills](https://github.com/obsidianmd/obsidian-skills) 7종을 DeepSeek Harness 플러그인으로 가볍게 패키징했습니다. 플러그인 상세 페이지에서 업스트림 버전을 확인하고 선택한 Release로 업데이트할 수 있습니다.

## DSH 전용 버전을 만든 이유

Obsidian은 아직 DeepSeek Harness 플러그인을 제공하지 않습니다. 이 저장소는 DSH 쪽을 보완합니다. 공식 스킬 원문을 재사용하고 DSH 플러그인 매니페스트, 업스트림 버전 확인, 전체 트리 업데이트를 추가합니다.

## 특징

- **가벼움**: 스킬 7개만 등록하며 외부 프로세스를 실행하지 않습니다.
- **스킬만 포함**: Obsidian, Defuddle, Knap 명령줄 도구를 포함하지 않습니다.
- **깔끔함**: MCP 서버, 백그라운드 상주 프로세스, 텔레메트리, 자격 증명이 없습니다. GitHub는 버전 확인과 업데이트 때만 접근합니다.
- **추적 가능**: 내장된 업스트림 버전과 commit을 기록합니다.
- **업데이트 가능**: 최신 업스트림 GitHub Release를 확인하고 해당 Release로 업데이트할 수 있습니다.

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

스킬은 설명만 제공하며 실제 도구를 포함하지 않습니다. `obsidian`, `ob`, `defuddle`, `knap`은 포함되지 않으며, 현재 DSH 세션의 권한과 승인 규칙을 따릅니다.

## 설치

DSH의 **플러그인**에서 **플러그인 추가**를 선택하고 다음을 입력합니다.

```text
https://github.com/WangJingJun-dev/obsidian-skills-for-dsh
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

업스트림: [obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills), MIT License.

플러그인 아이콘은 업스트림 `plugins/obsidian/assets/icon.png`에서 가져왔으며 투명 배경을 유지합니다. 아이콘은 MIT 라이선스 저장소에 포함되어 있지만 Obsidian 이름, 로고, 앱 아이콘은 상표입니다. [Obsidian 브랜드 가이드라인](https://obsidian.md/brand)에 따라 편집, 변형, 재색칠하지 않아야 하며 상업적 사용은 Obsidian에 문의해야 합니다. 이 비공식 플러그인은 Obsidian과 제휴하거나 Obsidian의 보증을 받지 않았습니다.

이 플러그인은 스킬 패키징과 업데이트만 담당하며 업스트림 스킬 본문은 수정하지 않습니다. 자세한 내용은 [LICENSE.upstream](LICENSE.upstream)과 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 참고하세요.

개발에는 DeepSeek이 참여했습니다. 기여 표기와 GitHub Contributors 제한은 [CONTRIBUTORS.md](CONTRIBUTORS.md)를 참고하세요.
