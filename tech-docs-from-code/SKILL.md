---
name: tech-docs-from-code
description: >-
  Write technical documentation from source code: survey a repository, extract facts from code and
  config, and produce a document with sections Overview & Purpose, Business Logic, Architecture &
  Context, API & Contracts, Data Model, Configuration, Monitoring & Logs, plus PlantUML diagrams
  (checked .puml sources and rendered PNGs). Use when asked to document an existing service,
  repository, or module, or to write onboarding, operations, or API documentation from sources.
  Triggers (ru): «задокументируй код/сервис», «сделай техдок», «опиши архитектуру и API по исходникам».
whenToUse: >-
  Requests to document existing code, a service, or a repository. Not for editing code, and not for a
  standalone diagram — the `plantuml` skill covers a single diagram.
metadata:
  owner: Kart
  version: 2
---

# Technical documentation from code

Documentation is built **from code**, not from prose or README. Every claim carries a source anchor:
`path:line`, a config filename, or a command output. Anything absent from the code is marked as an
assumption or an open question — never invented.

Seven mandatory sections, fixed order: Overview & Purpose → Business Logic → Architecture & Context →
API & Contracts → Data Model → Configuration → Monitoring & Logs. Extra sections (glossary, open
questions, changelog) only on request or when genuinely needed. Skeleton: `templates/document.md`.

Write the document in the request's language (default Russian); keep code identifiers, endpoints, and
field names exactly as in code. This process file is in English for token economy.

## Workflow

1. **Scope and revision.** Decide what is documented: repository, service, module, library. In a
   monorepo, list the services and their boundaries. Record the revision: `git rev-parse --short HEAD`,
   date, version from the manifest. Audience (developers / operations / external API consumers) sets
   depth: externals need contracts and data, operations need config, logs, metrics.
2. **Inventory.** Top-level tree, dependency manifests, directory layout, tests, CI, infrastructure.
   Identify the stack and entry points. Do not read the repository linearly — start from entry points,
   manifests, and configs. Artifact→fact map: `references/evidence-map.md`.
3. **Extract facts.** Walk each section's artifact list; per-section instructions:
   `references/sections.md`.
4. **Draft.** Fill `templates/document.md`. Statements short and verifiable: "Orders are created
   synchronously; `order.created` is published after commit — `app/api/orders.py:42`,
   `app/services/order_service.py:88`."
5. **Diagrams.** One per question; minimum set: context, components, key scenario, data model,
   deployment. Skeletons and rules: `references/diagrams.md`. Check and render every diagram before it
   enters the document.
6. **Self-review** against the checklist below.
7. **Deliver** into the documented repository's `docs/`, list the files in the answer, and attach via
   `present` (document + 1–2 key diagrams).

## Fact rules

- One claim = one statement + one anchor.
- README, comments, and wiki are hypotheses, not truth: any conflict with code goes to "Open questions".
- Never print secret values — only variable names and a "secret/env" marker. Not even as examples.
- Unknown is a valid answer: "not found in code". Do not invent owners, limits, or plans.
- Take versions, limits, timeouts, and batch sizes from config and code.
- Expand abbreviations at first use; keep domain terms as the code names them.

## Diagrams

One file per diagram, with `@startuml`/`@enduml`, `title`, and explicit `skinparam`. Layout:

```
docs/
  README.md                      ← the document (<service>-techdoc.md is fine too)
  diagrams/<topic>.puml + <topic>.png
```

Put the diagram after the paragraph it illustrates: `![Контекст системы](diagrams/context.png)` plus a
caption stating what it shows and what follows from it.

Check and render are mandatory — load the `plantuml` skill and use its script (Node from
`load_workspace_dependencies`; `<plantuml-skill>` is that skill's base directory):

```sh
node "<plantuml-skill>/scripts/plantuml.mjs" check  docs/diagrams/context.puml
node "<plantuml-skill>/scripts/plantuml.mjs" render docs/diagrams/context.puml -o docs/diagrams/context.png
```

`check` prints ASCII art or fails with the server's line number — fix and re-check. After rendering,
**read the PNG as an image**: clipped labels, overlapping boxes, arrows across the whole canvas, legend
mismatching colors, text too small. Never ship an unchecked diagram, and never call a diagram verified
when only the text check ran.

## Pre-delivery checklist

- [ ] All seven sections present; none empty — facts or an explicit "not found in code".
- [ ] Every fact has an anchor (`path:line` or config file).
- [ ] No `TODO`/`TBD` without an owner; unknowns collected under "Open questions".
- [ ] Every `.puml` passed `check`; every `.png` rendered and reviewed.
- [ ] Revision and document date present.
- [ ] No secrets or real key values anywhere in the text.
- [ ] Abbreviations expanded at first use.
- [ ] "New developer" test: Overview + Architecture explain what the system does, what it is made of,
      and how to run it.

In the final answer state explicitly: what was established from code, what needs owner confirmation,
which sections stayed incomplete and why.

## Boundaries

- Do not modify code: this skill only reads the repository and writes documentation.
- More than one service or ~200+ source files: do not force a single document — propose an overview
  plus per-service documents, and start with the overview.
- Documenting third-party code: do not invent business context; derive Overview from actual behavior
  (endpoints, models, config) and say so.
