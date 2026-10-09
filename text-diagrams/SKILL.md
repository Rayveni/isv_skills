---
name: text-diagrams
description: >-
  Text diagrams (ASCII art) that stay as text: turns a "draw me a diagram"
  request into an aligned plain-text diagram inside a fenced ```text block —
  tree, flowchart, decision, sequence, state machine, org chart, comparison,
  mind map, network, gantt — when the destination is a README, a terminal,
  a code comment, or a chat message, and no renderer or image is wanted.
  Propose the diagram in chat, run the alignment checker, iterate on feedback,
  and write the .md (or .txt) to disk only after the user confirms saving.
  Also use to fix or re-align an existing text diagram. For polished images
  or formal notations (UML, BPMN, ER), use the `plantuml` skill instead.
  Triggers (en): "text diagram", "ascii diagram", "draw in text", "ascii art",
  "diagram in the README", "terminal diagram", "no renderer".
  Triggers (ru): «текстовая диаграмма», «ascii-схема», «нарисуй текстом»,
  «схема в ридми», «диаграмма в терминале», «без рендера».
---

# Diagram request to text (ASCII art)

The user asks for a diagram whose home is **text** — a README, a terminal, a code comment, a chat message — not a rendered image. Your job: infer what the picture must show, choose the suitable text variant, draw it in aligned plain text, check it — and agree on it in chat **before** anything reaches the disk. The text block *is* the deliverable; there is no image and no renderer.

**The process, in order:**

1. **Read** the request and pick the variant (§1–2).
2. **Propose in chat** — the full diagram in one fenced ` ```text ` block, with the variant name and the reason. No files in the user's directory yet (§3).
3. **Check** the block with `scripts/check.mjs` and fix whatever it flags (§3, "Checking").
4. **Iterate** on the user's corrections, re-checking and re-showing the block every round, still without writing into the user's directory (§4).
5. **Offer to save** — name the exact `.md` (or `.txt`) path and ask (§5).
6. **Save, only after the user confirms** — write the file, then present it (§6).

The diagram and its check travel together: a ` ```text ` block is never posted without having passed the checker. This holds for the first proposal and for every correction round.

The gate in one sentence: nothing is written into the user's working directory until the user has confirmed the save.

## 1. Read the request

Extract before drawing anything: what changes over time, what the parts are, who talks to whom, what the states are, the language and audience, and whether a current-vs-target comparison is implied. Confirm the destination is text — if the user wants a polished image or names a formal notation (UML, BPMN, ER), hand off to the `plantuml` skill instead. If the request is a single diagram request with no detail, pick a sensible variant from the evidence you have and state the assumption in one line rather than stalling on questions.

## 2. Choose the variant

Match the request's dominant question to one primary variant. The full mapping, decision signals, and a checked skeleton for each variant are in [references/diagram-types.md](references/diagram-types.md); the common cases:

| The request is really asking | Primary variant | Trigger keywords |
| --- | --- | --- |
| What is inside / how is it laid out? | Tree | структура, файлы, папки, breakdown |
| How does this work, step by step? | Flowchart | процесс, flow, шаги, сценарий |
| Which path does the logic take? | Decision tree | решение, если/то, ветвление |
| Who calls whom, in what order? | Sequence | обмен, API, запросы, вызовы |
| What states can it be in? | State machine | статус, жизненный цикл, переходы |
| Who reports to whom? | Hierarchy / org | иерархия, подчинение, оргструктура |
| Before vs. after, or options? | Comparison | AS IS / TO BE, было / стало, сравнить |
| Radial brainstorm? | Mind map | mindmap, идеи, topics |
| Where does it run? | Network | окружения, ноды, инфраструктура |
| What is the schedule? | Gantt | сроки, этапы, план, timeline |

Selection rules:

- One diagram answers one question. Do not blend a sequence into a flowchart; if two questions matter, produce two diagrams and say which answers which.
- Prefer the simplest variant that carries the meaning: a tree beats a flowchart for a package layout, a comparison beats two flowcharts for before/after.
- Keep the alternatives for §3 — the choice between variants is discussed in chat, not silently resolved by writing a file.

## 3. Propose in chat

- Post the **complete diagram** in one fenced ` ```text ` block — it is the primary deliverable and the thing the user reviews and edits. Give the text in the chat even when the user asked for a picture.
- Add one line each: the chosen variant and why ("sequence — the question is the order of API calls"), the assumption you made if the request was thin, and the runner-up variant you would use instead.
- If several variants are credible, or the user asked for options: give up to three variants of the *same content* in different notations, mark one as the recommended default, and keep the alternates as lean as the content allows.
- **Nothing is saved at this stage.** Do not create files in the user's working directory or project.
- To check while proposing, write the draft to a scratch path outside the project — `${TMPDIR:-/tmp}/text-diagram-draft/` — one file per variant (`v1.md`, `v2.md`) and run the checker on it. Scratch files are throwaway, not the deliverable.

### Source rules

One diagram per block, a ` ```text ` fence, a title or a label row where it helps.

- **Spaces only, never tabs** — tabs align differently in every viewer and break the picture.
- Close every box: a `+---+` / `┌───┐` border must have its right border on every interior row, or the box reads as two fragments.
- Keep arrows horizontal or vertical; diagonals (`\`, `/`) do not align and drift across lines.
- Align columns by counting characters, not by eye — then let the checker confirm.
- Write the labels in the user's language; keep the drawing glyphs ASCII where the destination is a plain terminal.
- Past ~40 elements the picture stops being readable: split by scenario and keep one overview diagram.

### Checking

```sh
"<node>" "<skill-directory>/scripts/check.mjs  <scratch>/v1.md
"<node>" "<skill-directory>/scripts/check.mjs  <name>.md    # the confirmed save
```

`check.mjs` has no notion of diagram grammar — it validates what makes text readable as text: balanced fences, no tabs, width under ~120, box borders that close on every interior row, and at least one connector. It exits 0 when the block passes, 1 otherwise, and prints one line per issue with its rule. Diagnose from the reported line, fix, re-check. Never post a block the checker has not seen, and never claim a diagram was checked when only your eye ran over it.

## 4. Iterate on feedback

- Apply the corrections, re-check the source (scratch file), and post the **full updated block again** — the chat is the single source of truth; never answer with "look at the draft file" or a bare description of what changed.
- Re-check and re-show after **every** source change, however small (a renamed role, a reworded step, a widened box). Alignment shifts silently; a rename can break a border.
- Never deliver an unchecked diagram, and never show a block that came from an older revision of the source.
- Preview files in the scratch directory are not a save: they are throwaway, and the user's directory stays untouched.
- When the user accepts the diagram, or stops asking for changes, go to §5. Do not save on your own initiative.

## 5. Offer to save

Ask once, plainly, with a real path:

> Save? I propose `docs/diagrams/context.md`.

- Resolve the target directory from the user's request — their working directory by default — propose kebab-case file names that match the topic, and state the format you will write (`.md` for docs, `.txt` for a standalone file).
- Then **stop and wait**: never write files in the same turn as the question.
- **Explicit pre-authorization counts:** if the request itself already named the file to write ("save to `docs/diagrams/context.md`"), the user consented to that path and format — announce the exact file and save once the source is settled, without repeating the question. That consent covers only what was named; a different name, directory, or format still needs a question.
- A correction, a request for another variant, or an unrelated message is **not** consent. If the user confirms with a condition ("save it, but rename it"), apply the condition and save.
- If the user declines, keep the agreed diagram in the chat. The agreed block still goes out with its check (§3).
- If the target file already exists, say so and propose another name, or ask before overwriting.

## 6. Save (only after confirmation)

- Write the approved block **verbatim** to `<name>.md` (or `.txt`), inside its ` ```text ` fence, then run the checker on the saved file.
- Read the saved file back once before presenting it — unless the identical source already passed the checker in §4, in which case that run stands. Say what you saw.
- Report the absolute path and show the saved diagram inline in the same message, then call `present({"files":[{"path":"<name>.md"}]})` with the real path.
- If the write is refused (sandbox, read-only location, no permission), do not retry blindly: report the refusal and deliver the checked diagram in chat.
- Never say a diagram was saved unless the file exists at the path you named.

## Data handling and fallbacks

Text diagrams are fully local: no server, no network, nothing leaves the machine. If the checker cannot run (no Node), fall back to a careful manual review — spaces not tabs, closed borders, aligned columns — and say that the automated check did not run. If the destination turns out to need a rendered image after all, switch to the `plantuml` skill and carry the content over.
