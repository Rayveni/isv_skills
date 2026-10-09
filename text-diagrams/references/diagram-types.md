# Variant selection reference

Read this when the request's dominant question is unclear, or when you need a starting skeleton. Pick **one** primary variant, then write it in the user's language.

Text diagrams are plain text inside a fenced ` ```text ` block. They are the deliverable — no renderer, no image. The reader sees exactly the characters you write, so alignment is the whole game: **spaces only, never tabs**, and every box border must close on every interior row. `scripts/check.mjs` verifies this; every skeleton below passes it.

## Picking order

1. What changes over time? → behavior variants: Flowchart, Sequence, State, Gantt.
2. What exists at rest? → structure variants: Tree, Hierarchy/Org, Network, Comparison.
3. Neither (radial brainstorm)? → Mind map.
4. Still ambiguous? Choose the cheapest variant that shows the answer and name the alternative in one line.

Ask "what will the reader do with this?" — a debugging aid wants a sequence, a design review wants hierarchy, a management update wants a comparison or a gantt.

## When to choose text over a rendered notation

Reach for a text diagram when the picture must live **as text**: READMEs, terminal output, code comments, Slack/PR descriptions, anywhere a `.png` will not load or a PlantUML server is not available. Reach for PlantUML (the `plantuml` skill) when the user wants a polished, printable image, many elements, or a formal notation (UML, BPMN, ER).

Rule of thumb: **under ~40 elements and the destination is text → text diagram; more, or a formal notation → PlantUML.** If the user asks "draw a diagram" without naming a destination, offer both and let them pick.

## Tree — filesystem, package layout, decomposition

Signals: дерево, структура файлов, иерархия папок, breakdown, "what's inside", directory listing.

```text
project/
├── src/
│   ├── main.ts
│   └── util.ts
├── tests/
│   └── main.test.ts
├── package.json
└── README.md
```

Notes: `├──` for "more below", `└──` for the last child, `│` to continue a parent's column. Keep names short; wrap long ones rather than widening the tree.

## Flowchart — process, algorithm, decision steps

Signals: процесс, алгоритм, шаги, сценарий, flow, decision, "how does it work", manual vs automatic.

```text
  +-----------+      +-------+
  |  Client   | ---> |  API  |
  +-----------+      +---+---+
                         |
                    +----v----+
                    |   DB    |
                    +---------+
```

Notes: `+---+` boxes, `--->` / `<---` arrows, `+----v----+` where an arrow enters the top. One question per diamond-free box; branch with a second box and two arrows. Keep arrows horizontal or vertical — diagonals do not align.

## Decision tree — branching logic

Signals: решение, если/то, ветвление, rules, "which path", classifier.

```text
            [Request]
                |
        +-------v--------+
        | Authenticated? |
        +-------+--------+
           yes /     \ no
            /         \
     +-----v---+   +---v------+
     |  Allow  |   |   401    |
     +---------+   +----------+
```

Notes: `[Question]` for the decision node, `yes / \ no` labels on the branches. Two branches max per node; nest deeper decisions as their own small tree.

## Sequence — message order, interactions, API calls

Signals: обмен, API, запросы, интеграция, вызовы, "who calls whom", handshake, retries, timeouts.

```text
Client          API            DB
  |  POST /x    |              |
  |------------>|              |
  |             |  INSERT      |
  |             |------------->|
  |             |    ok        |
  |             |<-------------|
  |   201       |              |
  |<------------|              |
```

Notes: lifelines are `|` columns; `----->` sends, `<-----` returns; put the label above the arrow. `activate`/`deactivate` do not exist — show scope by starting/stopping the lifeline or with a `[ ]` group marker.

## State machine — statuses, lifecycle

Signals: статус, состояния, жизненный цикл, переходы, "what next", state machine, retry.

```text
        +--------+
        | draft  |
        +---+----+
            | submit
        +---v----+
        | review |<----+
        +---+----+     |
            | approve  | reject
        +---v----+  +--v-----+
        | merged |  | changes|
        +--------+  +--------+
```

Notes: state names go inside boxes, transition labels on the arrows. A loop-back arrow (`<----+`) shows a return to an earlier state. Keep one arrow per transition; label events, not prose.

## Hierarchy / org chart — reporting lines, containment

Signals: оргструктура, иерархия, подчинение, кто кому подчиняется, ownership, tree of people/teams.

```text
             +-------+
             |  CEO  |
             +---+---+
                 |
       +---------+---------+
       |                   |
  +----v----+         +---v-----+
  | VP Eng  |         | VP Sales|
  +----+----+         +---------+
       |
  +----v----+
  |  Lead   |
  +---------+
```

Notes: a vertical `|` from a box's bottom center, a `+---+---+` horizontal span to distribute to children, then a `|` down into each child's top. The span must sit between the parent's bottom and the children's tops — never through a box.

## Comparison — AS IS / TO BE, before / after, options side by side

Signals: AS IS / TO BE, было / стало, сравнить, до и после, варианты, trade-off.

```text
  AS IS              TO BE
  +----------+       +----------+
  |  manual  | ----> |   API    |
  |  export  |       |  export  |
  +----------+       +----------+
```

Notes: same box shape and same element names on both sides so differences pop; one `----->` from old to new. More than two options → one diagram per option, or a table instead.

## Mind map — radial brainstorm, topic breakdown

Signals: mindmap, brainstorm, идеи, topics, radial, "what relates to what".

```text
              +----------+
              |  Design  |
              +----+-----+
                   |
       +-----------+-----------+
       |                       |
  +----v----+            +----v----+
  |Frontend |            | Backend |
  +---------+            +---------+
```

Notes: center box, one span below it, children under the span. Only two levels deep — deeper radial trees do not align in text; use a tree variant instead.

## Network / deployment — zones, nodes, topology

Signals: окружения, ноды, кластеры, инфраструктура, где что живёт, prod/dev, Kubernetes, сети.

```text
   [ Internet ]
        |
   +----v-----+      +----------+
   |    LB    | ---> |  web-01  |
   +----+-----+      +----------+
        |
   +----v-----+
   |  web-02  |
   +----------+
```

Notes: `[ Zone ]` for the outside world or a subnet, boxes for nodes, arrows labeled with the protocol or port. Nesting is by indentation, not by nested boxes.

## Gantt — schedule, timeline

Signals: сроки, этапы, план, дорожная карта, timeline, who does what when.

```text
        1    2    3    4    5    6
        |    |    |    |    |    |
Aud.   [====]
Des.         [========]
Bld.                 [==============]
Tst.                             [====]
```

Notes: a ruler row of tick marks, one `[====]` bar per task on its own line, aligned to the ruler. Task labels go left of the bars; keep them short so the bars start at the same column.

## Also available

- **Table** — when the answer is rows×columns of values, not a picture; use a Markdown table, not art.
- **ASCII "salt" wireframe** — rough UI layout with `+---+` boxes; only when the request names a screen.

## Checked against the checker, not the docs

Text diagrams fail silently: a tab, a box border that does not close, or a trailing space looks fine in the editor and breaks in every renderer. Always run `scripts/check.mjs` before delivering, and never post a block the checker has not seen.
