---
name: requirements-collector
description: "Requirements collection through a clarifying interview: context, stakeholders, goals/KPI, user stories, BR/StR/FR/NFR/BRU/CON/ASM/DEP/INT/DAT, traceability, Given-When-Then acceptance criteria. Outputs: full spec (ТЗ), AI-context, MoSCoW list. Saves to ./requirements. Replaces requirements-analyzer. Triggers: «собери требования», «уточни требования», «сбор требований», «collect requirements», «gather requirements», «requirements interview»."
whenToUse: When the user wants to formalize requirements from a description, messages, or documents before design, estimation, or implementation. Prefer over requirements-analyzer (deprecated).
metadata:
  tags: [requirements, interview, documents]
  replaces: requirements-analyzer
---

# Requirements Collector

This skill turns a raw task description, user input, or source documents into a structured requirements document, produced through a clarifying interview. It works stage by stage: context & boundaries, stakeholders, goals & KPI, user stories, BR/StR/FR/NFR/BRU/CON/ASM/DEP/INT/DAT, traceability, acceptance criteria (Given-When-Then). On start it asks: which templates to fill (multi-select: full human spec / AI-context / MoSCoW list) and where to save (default `./requirements`). Then it interviews the user, formalizes the requirements, confirms, and writes the selected documents.

**Language rule:** the interview and the generated documents are in the user's language (Russian by default) — templates in `templates/` stay in Russian.

**Service tags are always Russian**, in this file and in every document: `[подтверждено]` (confirmed), `[предположение]` (assumption). Never mix in `[ASSUMPTION]` or other spellings.

## When to use

- The user describes a task/project and wants requirements captured and formalized.
- Requirements arrive as documents, messages, or a raw idea and must become a document.
- Gaps must be surfaced through clarifying questions before work starts.
- A human-readable spec (ТЗ), an AI-context file, or a prioritized MoSCoW list is needed.

**Relation to other skills:** replaces `requirements-analyzer` (deprecated — do not use it). Output feeds `development-brief` (formal ТЗ/SOW), `system-designer` (architecture), and `implementation-planner` (task breakdown). If the user needs a full development brief/ТЗ for a contractor, run `development-brief` after this skill. Reference files: references/requirements-taxonomy.md (codes, formats, checklists, antipatterns), references/risk-model.md (risk grading), references/verification-checklist.md (process/quality checklists).

## Process

### 1. Startup questions (always ask first)

Ask in one `ask_user_question` call, two questions:

1. **Templates to fill** (multi-select): `full-spec` (human-readable ТЗ/спецификация), `ai-context` (compact, for passing into a model), `moscow` (MoSCoW-prioritized requirements list). At least one must be chosen.
2. **Save folder** (free text via follow-up or use the answer): default `<cwd>/requirements`. Create it if missing.

If the user says "no questions" — skip and mark every gap as an open question or `[предположение]`. Record in the document: user declined questions; templates and folder defaulted.

### 2. Reading the input

Input is anything: chat text, uploaded files, or document paths. If files are named, read them entirely (read) — never guess content. If `@path` references are given, resolve them against the workspace root. If nothing is provided, proceed from the chat description alone.

Extract and keep stable IDs: goals (G-01…), user stories (US-01…), acceptance criteria (AC-01…), test cases (TC-01…), open questions (Q-01…), scope items, constraints, integrations. Requirements keep these IDs across all templates (BR-01, StR-01, FR-01, NFR-01, BRU-01, CON-01, ASM-01, DEP-01, INT-01, DAT-01, RISK-01, GLOSS-01). One ID pattern everywhere: `<TYPE>-<NN>` — no hybrids like `RISK/R-01`, no bare `R1`.

### 3. Work stage by stage (12 stages, in order)

12 content stages: 1) Context & boundaries 2) Stakeholders 3) Goals & KPI 4) BR/StR 5) User stories 6) FR 7) NFR 8) BRU 9) CON/ASM/DEP 10) INT/DAT 11) AC/TC 12) Trace matrix. Process steps (startup questions → interview → analysis → confirmation → generation) frame these stages.

Each content stage feeds the next. If input material ends before a stage, do not invent content: stop at facts, then ask clarifying questions (§4) or record open questions.

### 4. Clarification interview

**Ask at most 5 questions per `ask_user_question` call.** If more questions remain, ask the next batch after the answers arrive. Never invent answers to your own questions.

**Collect sources** for every requirement (which stakeholder, document, or user story it came from) and MoSCoW priority as you go.

Pick the 5 most blocking questions from this priority list:

1. Goal and success criteria (what does "done" mean)?
2. Users / consumers of the result (humans or a model)?
3. What exactly is **in scope**?
4. What exactly is **out of scope** (boundaries, exclusions)?
5. Constraints: technologies, deadlines, budget, regulations, security.
6. Integrations and external dependencies (APIs, systems, data).
7. Volumes and expected load (if applicable).
8. What already exists / is ready — where do we start?

If the user asks for "no questions" — skip and mark every gap as an open question or `[предположение]`.

**Stop condition:** at most **3 batches (15 questions) per interview round** — one round = one skill invocation (one session); up to 3 batches within that session. After the third batch, move all remaining questions to open questions (Q-01…) with the answering role — do not keep interviewing. If the user skips a batch or answers partially, answered items become `[подтверждено]`, unanswered items become open questions; never re-ask the same question twice.

### 4a. Edge cases

- **Input file unreadable/corrupt:** do not guess content; record an open question naming the file, who can re-provide it, and what it blocks; continue with the remaining input.
- **Massively contradictory input (many conflicts, not a pair):** stop analysis; present a compact conflict summary (top conflicts first); ask the user to resolve the top conflicts or mark them all as open questions. Do not silently pick winners.
- **Project too large for one 12-stage pass:** run partial passes by stage groups (1–3 context/goals, 4–6 business/functional, 7–9 rules/constraints, 10–12 trace/validation); record explicitly which stages are covered in this document and which are deferred; IDs stay stable across passes.
- **Partial answers:** see the stop condition above — answered = `[подтверждено]`, unanswered = open question.

### 5. Classification and NFR rules

Classify every requirement with the taxonomy codes (codes, formats, checklists: references/requirements-taxonomy.md):
- **BR** — бизнес-требования: зачем, ценность, KPI, эффект.
- **StR** — требования заинтересованных сторон.
- **FR** — функциональные: что система должна делать.
- **NFR** — нефункциональные: как система должна работать.
- **BRU** — бизнес-правила.
- **CON** — ограничения. **ASM** — допущения. **DEP** — зависимости.
- **INT** — интерфейсы и интеграции. **DAT** — требования к данным.
- **RISK** — риски (не приоритизируются по MoSCoW). **GLOSS** — глоссарий (только в full-spec и ai-context).

**Every NFR must have a category and a measurable metric** (e.g. "Performance: p95 latency ≤ 300 мс"). NFR categories and metrics: references/requirements-taxonomy.md. Every NFR = category + metric + target + goal link.

If a requirement is not measurable — propose how to make it measurable (add a metric and a target value) instead of leaving it vague; if no metric is possible, move it to open questions.

**MoSCoW rules (single source of truth): references/requirements-taxonomy.md** — grade is an attribute of every requirement; the ≤40%-cap and per-item rationale apply only to the moscow document. In short: deliverables (BR, StR, FR, NFR, BRU) count toward the cap; context (CON, ASM, DEP, INT, DAT) does not; RISK and GLOSS are not prioritized at all.

### 6. Requirement formats and quality

Formats (user stories, AC Given-When-Then, NFR template) and antipatterns: references/requirements-taxonomy.md. No requirement is accepted without: unique ID, type, source, priority, AC/TC (verification method) and a link to a business goal (G-x).

### 7. Traceability

Trace chain: бизнес-цель (G-01) → бизнес-требование (BR-01) / user story (US-01) → FR-01, NFR-01 → критерий приёмки (AC-01) → тест-кейс (TC-01). Record as a matrix in the full spec and as compact chains in the AI-context file. Every FR/NFR must name its goal (G-01); orphan requirements are flagged as open questions. Fan-out is allowed: one requirement may have several AC and TC — list them comma-separated in the same matrix row (e.g. `AC-01, AC-02` / `TC-01, TC-02`). ID patterns (`<TYPE>-<NN>`: G-01, US-01, AC-01, TC-01, RISK-01) and per-type field formats: references/requirements-taxonomy.md and templates/.

### 8. Analysis

- Split scope into In-scope / Out-of-scope — each item concrete and verifiable, no "etc.".
- Identify risks with categories: technical, requirements, organizational, external, data, security. Each risk: description, probability (В/С/Н), impact (В/С/Н), level (В×В → Критич./Высокий), mitigation or the question that removes the uncertainty. Details and the risk matrix live in [references/risk-model.md](references/risk-model.md). **Placement rule:** risks with a grading basis go to the risk table; risks without a basis (no probability/impact data) go to open questions (Q-01) instead — they are not listed in the risk table with an invented grade.
- Tag every statement: `[подтверждено]` (confirmed), `[предположение]` (assumption), or open question with the answering role and what it blocks. Service tags are always Russian — see Language rule.

### 9. Conflicts

If requirements conflict (with each other, with constraints, or between stakeholders), state the conflict explicitly and propose at least two resolution options with trade-offs; the user/stakeholder chooses. An unresolved conflict becomes an open question — never silently pick one.

### 10. MoSCoW prioritization

See §5 — grading rules (attribute always, 40% cap and rationale for the moscow document only) live there. Generate the moscow document per §12 when selected.

### 11. Confirmation

Present in chat: goals and boundaries (in/out), the requirements list with IDs and classification, MoSCoW grades (attribute — always present, even if the moscow template is not selected), the trace matrix summary, top risks, conflicts and their options, open questions. Ask for explicit confirmation via `ask_user_question` (confirm / adjust). Do not write files without it.

**Document is done — stop iterating — when:** all Verification items pass; every requirement has ID, type, source, priority, verification method and a goal link; no open question blocks the next stage (design/estimation); the user confirmed. If any of these fails, iterate; otherwise stop.

### 12. Document generation

Fill the selected templates from `templates/`:

- `full-spec.md` → `<folder>/<project>-spec.md` — full human-readable ТЗ/спецификация (all stages + user stories, risks, conflicts, glossary; quality checklist and antipatterns link to references/requirements-taxonomy.md).
- `ai-context.md` → `<folder>/<project>-ai-context.md` — compact machine-facing context with classification codes and trace chains.
- `moscow.md` → `<folder>/<project>-requirements-moscow.md` — prioritized requirements with classification.

Rules:

- Invent nothing: confirmed facts, tagged assumptions, noted gaps only.
- Same IDs across documents; each requirement is one verifiable statement.
- `<project>` comes from the task name; if unnamed, use `requirements` (e.g. `requirements-spec.md`).
- Save (write) into the chosen folder and show each file via `present`.

## Verification & Quality

Full checklists (process verification + result quality) — [references/verification-checklist.md](references/verification-checklist.md). Three critical gates:

- [ ] Interview respected the 5-questions-per-batch limit (≤3 batches = ≤15 questions, or user asked to continue).
- [ ] Document done: no open question blocks the next stage; user confirmed; checklists from references/verification-checklist.md and references/requirements-taxonomy.md passed.
- [ ] User confirmed before writing; files saved into the chosen folder; each shown via `present`.
