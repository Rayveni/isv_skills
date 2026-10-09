---
name: plantuml
description: >-
  Диаграммы и схемы в PlantUML: превращает запрос «нарисуй диаграмму», «визуализируй» или «покажи схему» в исходник PlantUML — процесс, архитектура, взаимодействие, модель данных, жизненный цикл, сравнение; нотация при этом не названа. Сначала предложи вариант(ы) исходника прямо в чат вместе с отрендеренной картинкой каждого, доведи их правками до согласия и сохраняй .puml и изображение на диск только после явного подтверждения пользователя; также используй, чтобы исправить, переоформить или отрендерить существующий .puml-файл.
  Turn a "draw me a diagram" request into PlantUML. Use when the user asks to draw, visualize, or diagram a process, architecture, interaction, data model, lifecycle, or comparison without naming a notation - propose the source variant(s) in chat together with the rendered picture of each, iterate on feedback, and write the .puml plus its image to disk only after the user confirms saving. Also use to fix, restyle, or render an existing .puml file.
---

# Diagram request to PlantUML

The user usually asks for "a diagram", not for a notation. Your job: infer what the picture must show, choose the suitable PlantUML variant(s), write the source, check it — and agree on it in chat **before** anything reaches the disk. The source and its picture are one answer: show the render together with the code, always.

**The process, in order:**

1. **Read** the request and pick the variant (§1–2).
2. **Propose in chat** — the full PlantUML source in a fenced block **and the rendered picture of that source in the same message**, with the variant name and the reason. No files in the user's directory yet (§3).
3. **Iterate** on the user's corrections, re-checking and re-showing the render every round, still without writing into the user's directory (§4).
4. **Offer to save** — name the exact `.puml` and image paths and ask (§5).
5. **Save, only after the user confirms** — write the source and the rendered image, then present both (§6).

Code and render travel together: a source block is never posted without its picture, and a picture is never posted without the source it came from. This holds for the first proposal, for every correction round, and for the saved files.

The gate in one sentence: nothing is written into the user's working directory until the user has confirmed the save.

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
- Prefer the simplest variant that carries the meaning: an activity diagram beats a sequence diagram for a hand-wavy business process, and a component diagram beats a class diagram for a coarse architecture.
- Keep the alternatives for §3 — the choice between variants is discussed in chat, not silently resolved by writing a file.

## 3. Propose in chat

- Post the **complete source** in one fenced `plantuml` block — it is the primary deliverable and the thing the user reviews and edits. Give the source in the chat even when the user asked for a picture.
- **Always post the render next to the source, in the same message.** Write the draft to the scratch file, `render` it to a PNG in the scratch directory, read that PNG back with the image-reading tool, and display it in the message (`![<short description>](<scratch>/v1.png)`). The user must be able to judge the picture without leaving the chat, without opening a file, and without asking for it. A source block alone is an incomplete answer — this is the default, not something the user has to request.
- Add one line each: the chosen variant and why ("sequence — the question is the order of API calls"), the assumption you made if the request was thin, and the runner-up variant you would use instead.
- If several variants are credible, or the user asked for options ("предложи варианты", "show me options"): give up to three variants of the *same content* in different notations, mark one as the recommended default, and keep the alternates as lean as the content allows. Render **each** variant and show its picture next to its source block — never just the recommended one.
- **Nothing is saved at this stage.** Do not create `.puml` or `.png` files in the user's working directory or project.
- To syntax-check and preview while proposing, write the draft to a scratch path outside the project — `$env:TEMP\plantuml-draft\` on Windows, `${TMPDIR:-/tmp}/plantuml-draft/` elsewhere — one file per variant (`v1.puml`, `v2.puml`) plus its preview (`v1.png`). Scratch files are throwaway, not the deliverable. Never post a draft whose render you have not produced and looked at.
- Optionally hand over the `encode` URL as an extra, so the user can open the picture in a browser without any file being written (privacy caveat in "Data handling and fallbacks"). It supplements the inline render, it does not replace it.

### Source rules

One diagram per `.puml` file, `@startuml` / `@enduml` guards, a `title`, explicit `skinparam` styling.

- Close every quote. A label like `: "text` without the closing quote silently swallows the rest of the line and the next line.
- Use explicit aliases: `component "billing (архив)" as ba1`, then reference `ba1`.
- Style arrows by meaning (`a -[#D9534F]-> b` for the current/manual path, `-[#5CB85C,bold]->` for the target path) and put the legend in a `legend` block.
- `skinparam componentStyle rectangle`, `skinparam shadowing false`, `skinparam backgroundColor #FFFFFF` keep exports flat and printable.
- Write the labels in the user's language; keep aliases ASCII.
- Past ~30 elements the picture stops being readable: split by scenario and keep one overview diagram.

## 4. Iterate on feedback

- Apply the corrections, re-check the source (scratch file), and post the **full updated source again together with its freshly re-rendered picture** — the chat is the single source of truth; never answer with "look at the draft file", "the render is unchanged", or a bare description of what changed.
- Render previews into the scratch directory and read the PNG back as an image to catch clipped labels, boxes overlapping their frame, arrows crossing the whole canvas, a legend that no longer matches the colors, or a variant that turned out to be the wrong choice. Re-check and re-show after **every** source change, however small (a renamed role, a reworded step, a recolored arrow).
- Never deliver an unchecked diagram, and never claim a diagram was visually verified when only the text check ran. Never show a picture that came from an older revision of the source on display.
- Preview files in the scratch directory are not a save: they are throwaway, and the user's directory stays untouched.
- When the user accepts the diagram, or stops asking for changes, go to §5. Do not save on your own initiative.

## 5. Offer to save

Ask once, plainly, with real paths:

> Сохранить? Предлагаю `docs/diagrams/context.puml` и `docs/diagrams/context.png`.

- Resolve the target directory from the user's request — their working directory by default — propose kebab-case file names that match the topic, and state which image format you will write (`.png` for review and slides, `.svg` for documentation).
- Then **stop and wait**: never write files in the same turn as the question.
- **Explicit pre-authorization counts:** if the request itself already named the file to write ("сохрани в `docs/diagrams/context.puml`", "отрендери `diagram.puml` в png"), the user consented to that path and format — announce the exact files and save once the source is settled, without repeating the question. That consent covers only what was named; a different name, directory, or format still needs a question.
- A correction, a request for another variant, or an unrelated message is **not** consent. If the user confirms with a condition ("save it, but rename it"), apply the condition and save.
- If the user declines, keep the agreed source in the chat and offer the `encode` URL instead of files. The agreed source still goes out with its render (§3).
- If the target file already exists, say so and propose another name, or ask before overwriting.

## 6. Save (only after confirmation)

- Write the approved source **verbatim** to `<name>.puml` (one diagram per file, `@startuml` / `@enduml`, `title`), then render the image next to it in the format you announced.
- Save both: code and image are one deliverable. If the user asked only for the code, ask whether the image should be saved too.
- Read the saved image back once before presenting it — unless the identical source already passed an image review in §4, in which case that read stands. Say what you saw.
- Report the absolute paths, show the saved image inline in the same message, then call `present({"files":[{"path":"<name>.puml"},{"path":"<name>.png"}]})` with those real paths.
- If the write is refused (sandbox, read-only location, no permission), do not retry blindly: report the refusal and deliver the checked source in chat together with its render, plus the `encode` URL.
- Never say a diagram was saved unless the file exists at the path you named.

## Checking and rendering (mechanics)

No local PlantUML or Java exists here, so the bundled script talks to a PlantUML server. Get the Node executable from `load_workspace_dependencies`, and treat `<skill-directory>` as this loaded skill's resource base:

```sh
"<node>" "<skill-directory>/scripts/plantuml.mjs" check  <scratch>/diagram.puml
"<node>" "<skill-directory>/scripts/plantuml.mjs" render <scratch>/diagram.puml -o <scratch>/diagram.png
"<node>" "<skill-directory>/scripts/plantuml.mjs" render <name>.puml -o <name>.png    # the confirmed save
"<node>" "<skill-directory>/scripts/plantuml.mjs" encode <name>.puml
```

`check` prints ASCII art or exits non-zero with the server's syntax error. `render` checks first, then writes `.svg`, `.png`, `.pdf`, or `.txt` (format from `-o` or `--format`). `encode` prints a shareable `https://www.plantuml.com/plantuml/svg/...` URL for the user's browser. Diagnose a rejected diagram from the reported line, fix, re-check.

The proposal loop, every time and in this order: write the source to the scratch file → `check`/`render` it to PNG → read the PNG back as an image and look at it → post the source block and that picture in the same message. The render step is part of writing the answer, not an optional extra: if the render fails (server down, refused request), say so explicitly, still post the checked source, give the `encode` URL, and state that no picture was produced — never quietly drop the picture.

## Data handling and fallbacks

The default server is public: the source leaves the machine, both for `check`/`render` and for the `encode` URL. For confidential systems, names, or client data, use a local renderer — a self-hosted server (`--server http://localhost:8080`) or an existing `plantuml.jar` with Java (`java -jar plantuml.jar -tsvg diagram.puml`); check availability instead of assuming it, and say which renderer produced the image. If the network or server is unavailable, still return the checked source plus the `encode` URL and state that no image was produced — the missing render is announced, not hidden.
