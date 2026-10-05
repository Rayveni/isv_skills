---
name: plantuml
description: >-
  Диаграммы и схемы в PlantUML: превращает запрос «нарисуй диаграмму», «визуализируй» или «покажи схему» в исходник PlantUML — процесс, архитектура, взаимодействие, модель данных, жизненный цикл, сравнение; нотация при этом не названа. Выбери подходящий вариант диаграммы, напиши и проверь исходник и верни его; также используй, чтобы исправить, переоформить или отрендерить существующий .puml-файл.
  Turn a "draw me a diagram" request into PlantUML. Use when the user asks to draw, visualize, or diagram a process, architecture, interaction, data model, lifecycle, or comparison without naming a notation - pick the suitable PlantUML diagram variant(s), write and check the source, and return it. Also use to fix, restyle, or render an existing .puml file.
---

# Diagram request to PlantUML

The user usually asks for "a diagram", not for a notation. Your job: infer what the picture must show, choose the suitable PlantUML variant(s), write the source, check it, and return the source (plus a rendered image when a picture was wanted).

Return the PlantUML source in a fenced code block **every time** — it is the primary deliverable, even when you also render an image.

## 1. Read the request

Extract before writing anything: what changes over time, what the parts are, who talks to whom, what the states are, the language and audience, and whether a current-vs-target comparison is implied. If the request is a single diagram request with no detail, pick a sensible variant from the evidence you have and state the assumption in one line rather than stalling on questions.

## 2. Choose the variant

Match the request's dominant question to one primary variant. The full mapping, decision signals, and a syntax skeleton for each variant are in [references/diagram-types.md](references/diagram-types.md); the common cases:

| The request is really asking | Primary variant | Trigger keywords |
| --- | --- | --- |
| How does this work, step by step? | Activity (new syntax) | процесс, flow, алгоритм, шаги, сценарий |
| Who calls whom, in what order? | Sequence | обмен, API, запросы, интеграция, вызовы |
| What is the system made of? | Component | архитектура, сервисы, компоненты, схема системы |
| What states can it be in? | State | статус, жизненный цикл, переходы |
| What is the data model? | Class / ER | сущности, модель данных, таблицы, связи |
| Where does it run? | Deployment | окружения, ноды, развёртывание, инфраструктура |
| Who can do what? | Use case | роли, акторы, возможности |
| What is the plan? | Gantt / WBS | сроки, этапы, план, декомпозиция |
| Compare current and target | Component or Activity with `package` + `frame` per side | AS IS / TO BE, было / стало |

Selection rules:

- One diagram answers one question. Do not blend a sequence into a component diagram; if two questions matter, produce two diagrams and say which answers which.
- When the request names several plausible variants or explicitly asks for options ("предложи варианты", "show me options"), return up to three renderings of the *same content* in different variants, mark one as the recommended default, and keep the others short.
- Otherwise return one diagram. Do not pad a clear request with alternatives.
- Prefer the simplest variant that carries the meaning: an activity diagram beats a sequence diagram for a hand-wavy business process, and a component diagram beats a class diagram for a coarse architecture.

## 3. Write the source

One `.puml` file per diagram, `@startuml` / `@enduml` guards, a `title`, explicit `skinparam` styling.

- Close every quote. A label like `: "text` without the closing quote silently swallows the rest of the line and the next line.
- Use explicit aliases: `component "billing (архив)" as ba1`, then reference `ba1`.
- Style arrows by meaning (`a -[#D9534F]-> b` for the current/manual path, `-[#5CB85C,bold]->` for the target path) and put the legend in a `legend` block.
- `skinparam componentStyle rectangle`, `skinparam shadowing false`, `skinparam backgroundColor #FFFFFF` keep exports flat and printable.
- Write the labels in the user's language; keep aliases ASCII.
- Past ~30 elements the picture stops being readable: split by scenario and keep one overview diagram.

## 4. Check and render

No local PlantUML or Java exists here, so the bundled script talks to a PlantUML server. Get the Node executable from `load_workspace_dependencies`, and treat `<skill-directory>` as this loaded skill's resource base:

```sh
"<node>" "<skill-directory>/scripts/plantuml.mjs" check diagram.puml
"<node>" "<skill-directory>/scripts/plantuml.mjs" render diagram.puml -o diagram.png
"<node>" "<skill-directory>/scripts/plantuml.mjs" render diagram.puml -o diagram.svg
"<node>" "<skill-directory>/scripts/plantuml.mjs" encode diagram.puml
```

`check` prints ASCII art or exits non-zero with the server's syntax error. `render` checks first, then writes `.svg`, `.png`, `.pdf`, or `.txt` (format from `-o` or `--format`). `encode` prints a shareable `https://www.plantuml.com/plantuml/svg/...` URL for the user's browser. Diagnose a rejected diagram from the reported line, fix it, re-check.

When a picture was requested, read the rendered PNG back with image reading and fix what it shows: clipped labels, boxes overlapping their frame, arrows crossing the whole canvas, a legend that no longer matches the colors, or a variant that turned out to be the wrong choice. Re-render after each source change.

Never deliver an unchecked diagram, and never claim a diagram was visually verified when only the text check ran.

## 5. Return

Give the source first, then the picture. Name the chosen variant and the one-line reason ("sequence — the question is the order of API calls"), note the assumption you made if the request was thin, and offer the most likely alternative variant in a single sentence.

Keep the source and image together and call `present({"files":[{"path":"diagram.puml"},{"path":"diagram.png"}]})` with the real paths.

## Data handling and fallbacks

The default server is public: the source leaves the machine. For confidential systems, names, or client data, use a local renderer — a self-hosted server (`--server http://localhost:8080`) or an existing `plantuml.jar` with Java (`java -jar plantuml.jar -tsvg diagram.puml`); check availability instead of assuming it, and say which renderer produced the image. If the network or server is unavailable, still return the checked source plus the `encode` URL and state that no image was produced.
