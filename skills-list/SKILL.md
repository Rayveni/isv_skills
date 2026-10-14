---
name: skills-list
description: >-
  Print the catalog of skills available in this session into chat —
  each skill's name, what it does, its trigger phrases, and how to
  invoke it — with a total count, or a filtered view when the user
  asks which skill fits a task. Use when the user asks what skills
  exist, wants the full skill list in chat, asks which skill to
  use for something, or asks about the assistant's capabilities.
  Triggers (en): "list skills", "show skills", "available skills",
  "skills catalog", "what skills are there", "which skill to use",
  "what can you do", "your capabilities", "help".
  Triggers (ru): «список скиллов», «вывести скиллы в чат»,
  «какие скиллы есть», «каталог скиллов», «какой скилл использовать»,
  «твои возможности», «что ты умеешь», «помощь».
---

# Session skill catalog → chat

Turns «выведи список скиллов» / "list your skills" into a complete, readable table of the session's available skills, printed in chat. The chat message is the only deliverable — no files are created, nothing is saved.

The model auto-loads this skill when the user asks what skills exist, wants the full list, asks which skill fits a task, or asks what the assistant can do; the user can also trigger it directly with `/skills-list`.

**Language rule:** this body is English; the chat output — including the table headers — is in the user's language.

**When to use:** the user asks for the skill list, the catalog, which skill fits a task, or the assistant's capabilities. It only reads the session catalog — it does not create, fix, or edit skills (that is the `skill-creator` skill's job).

**Source priority:**

1. **Primary:** the session's available-skills catalog injected by the harness at session start (the `<available_skills>` list in context). Names and descriptions come from it verbatim.
2. **Fallback (only if the catalog is not in context):** `glob` over the skill roots in this order — `/root/.dsh/skills/*/SKILL.md`, `<workspace>/.dsh/skills/*/SKILL.md`, `<workspace>/.agents/skills/*/SKILL.md`, `<workspace>/*/SKILL.md` — and `read` each file's frontmatter for `name` and `description`.

**Process:**

1. **Read** the catalog per the source priority above.
2. **Deduplicate by `name`** (fallback only): the same skill can live in several roots; keep the first occurrence in root-priority order and drop the rest — one row per unique name.
3. **Build** the data for one row per skill: the verbatim `name` (kebab-case, lowercase), a faithful one-or-two-line essence of the frontmatter `description`, the trigger phrases, and the invocation form `/name`.
   - **Trigger extraction:** if the `description` contains a `Triggers` block («Triggers (ru): …», "Triggers (en): …"), take the phrases from it (both languages, keep the quotes). If there is no `Triggers` block, put `—` («не указаны» / "not specified").
   - **Missing `description`:** the essence cell is `—` («нет описания» / "no description"); the row still appears.
4. **Sort** the rows alphabetically by `name`, count them, and lead the message with the count ("N skills available" / «N скиллов доступно»).
5. **Post** the list in chat as a numbered Markdown table, sorted by name, with headers localized to the user's language:
   - ru: `| № | Скилл | Что делает | Триггеры | Вызов |`
   - en: `| № | Skill | What it does | Triggers | Invoke |`

   One row per skill, `№` starting at 1, invocation as `/name` in the last column. Write nothing to disk — no `write`, no `edit`, no `present`.
6. **Filter on request:** if the user asks about a capability («что у тебя для диаграмм?»), a skill matches when the query appears (case-insensitive substring) in its `name`, `description`, or `triggers`. List only the matches, sorted by name, one row each saying why it matched; lead with the total count for context and state how many matched («N из M совпали» / "N of M match"). **No matches:** output the line «0 из M совпали для «запрос»» / "0 of M match for «query»" and suggest broader terms — no table rows.

**Examples.**

Full list (lead line = total count; one numbered row per skill, sorted by name; ru headers shown — use en headers for English output):

> 13 скиллов доступно
>
> | № | Скилл | Что делает | Триггеры | Вызов |
> |---|-------|-----------|----------|-------|
> | 1 | code-review | Ревью кода (diff, PR, коммиты, репозиторий): корректность, безопасность, производительность, стиль, тесты; проверка по правилам проекта; отчёт с file:line | «код-ревью», «проверь код», "code review", "review this PR" | `/code-review` |
> | 2 | plantuml | Диаграммы PlantUML из запроса «нарисуй диаграмму»; исходник + картинка в чате, .puml и PNG на диск после подтверждения | «визуализируй», "draw a diagram" | `/plantuml` |
> | … | … | … | … | … |

Filtered list (lead line = total for context, then matching count; only matches; why each matched):

> 13 скиллов доступно, 2 совпали для «диаграммы»
>
> | № | Скилл | Почему совпал | Вызов |
> |---|-------|---------------|-------|
> | 1 | plantuml | Диаграммы любого вида (процесс, архитектура, данные) в PlantUML | `/plantuml` |
> | 2 | text-diagrams | Текстовые схемы/ASCII-диаграммы без нотации | `/text-diagrams` |

Zero matches:

> 13 скиллов доступно, 0 совпали для «видео» — попробуйте более широкие слова, например «диаграммы» или «документы»

**Edge cases:**

- **Empty catalog (0 skills):** say «0 скиллов доступно» / "0 skills available", note that no skill roots were found, and stop — no table.
- **No matches on filter:** the «0 из M» line only, plus a broader-term suggestion; no table.
- **Missing `description` in frontmatter:** the row still appears; the essence cell is `—`.
- **No `Triggers` block:** the trigger cell is `—` («не указаны» / "not specified").

**Verification (before sending):**

- **Full list:** every catalog skill appears exactly once; names are verbatim from the catalog (kebab-case, lowercase); no duplicate names; the count line equals the number of rows.
- **Filtered list:** every matching skill appears exactly once, every non-matching skill is absent; names are verbatim; the count line states the total catalog size and the matching count, and the matching count equals the number of rows; zero matches produce the «0 из M» line, not an empty table.
- Numbers run 1..N in name order with no gaps or duplicates.
- Trigger cells come from the `Triggers` block when present, otherwise `—`.
- Descriptions are faithful to each frontmatter — no invented capabilities.
- Nothing was written to disk; the deliverable is the chat message itself.

**Quality bar:** complete (nothing silently dropped), verbatim names, honest descriptions, chat-only output. In filtered mode "complete" means every match is present and every non-match is absent.
