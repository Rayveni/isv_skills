---
name: development-brief
description: "Development brief (постановка на разработку, ТЗ, SOW) for a task or project from whatever inputs exist — requirements, design, architecture, or a raw idea: formalizes goals, scope boundaries, requirements, deliverables, acceptance criteria, constraints, timeline, team, and risks into a structured Russian document a team or contractor can start work from. Asks clarifying questions only when the inputs leave gaps, presents the brief outline in chat, and — only after the user's confirmation — saves a structured Russian Markdown file. Triggers (ru): «постановка на разработку», «задание на разработку», «бриф на разработку», «составь ТЗ», «техническое задание», «опиши задачу для разработчиков», «задача подрядчику», «SOW». Triggers (en): \"development brief\", \"brief for developers\", \"terms of reference\", \"statement of work\", \"SOW\", \"task brief\"."
---

# Development Brief

This skill turns requirements, designs, architecture — or a single raw idea — into a development brief (постановка на разработку / ТЗ / SOW): the formal document a team or contractor starts work from. Only after the user confirms the brief is the Russian Markdown file written to disk.

**Language rule:** this skill file itself is in English. The user-facing interview and the generated document are in Russian (the user's language) — the template `templates/development-brief.md` stays in Russian.

## When to use

- The user asks to formalize development work: «постановка на разработку», «составь ТЗ», "development brief", "SOW".
- Work is being handed to a team (internal or external) and needs pinned-down scope, deliverables, acceptance, and deadlines.
- Inputs are partial on purpose: only a requirements file, only a design, or a chat description — any subset is valid.
- The document must be confirmed before anything is written to disk.

**Relation to other skills:** `requirements-analyzer` discovers and structures requirements; `system-designer` produces the architecture; `implementation-planner` breaks confirmed work into stages, tasks, and a checklist. This skill is the brief that fixes WHAT is delivered and HOW it is accepted. It may consume any of those files as input, but it does not itself produce a task plan or estimates.

## Process

### 1. Reading the input
Inputs come in any mix: a requirements file (output of `requirements-analyzer`), a system-design file (output of `system-designer`), an architecture description, a vendor RFP, or a raw task in chat. If the user names files, read them entirely (read) — never guess their content. If nothing is named, ask which sources exist; a chat description alone is a valid input.

Extract and keep the IDs: goals and success criteria, scope (in/out), functional and non-functional requirements (FR-/NFR-…), constraints (deadline, budget, tech, regulations), integrations, risks. Deliverable-to-requirement traceability depends on these IDs.

### 2. Clarification interview (only if needed)
If the inputs leave gaps that block the brief, ask up to 8 key questions in one `ask_user_question` call. Priority:

1. Who receives the brief: internal team, contractor/outsourcer, or the model for implementation?
2. Deadline and budget — fixed or flexible? Hard release date?
3. Team: who executes (size, skills); is there an owner/PM on the client side?
4. Deliverables: code only, or also documentation, tests, deployment, CI/CD, training, source materials?
5. Acceptance: how is the result checked — demo, UAT, test plan, signed act?
6. Starting point: greenfield or existing codebase? Fixed stack or free choice?
7. Integrations and third parties to name explicitly (payment, delivery, auth, storage)?
8. Legal/process sections needed: IP rights, NDA, change procedure, warranty?

If the user asks for "no questions" — skip the interview and mark every gap as an assumption or open question in the document.

### 3. Scope strategy
State the boundary explicitly: everything in the brief is in-scope unless listed otherwise; everything in the out-of-scope list is excluded even if it "looks obvious". Derive the boundary from the constraints: a fixed short deadline → narrow scope with named deferrals («позже», «следующая фаза»); a fixed-price contract → exhaustive out-of-scope.

### 4. Deliverables and acceptance
Every deliverable gets: ID (D-1…), name, description/format (repo, doc, access, artifact), traced requirements (FR-/NFR-… or constraints), and a testable acceptance criterion («дано X → тогда Y» or a checkable artifact). Acceptance must be checkable without the chat history: who checks, how, and what passes.

### 5. Requirements traceability
Keep the FR-/NFR-… IDs from the sources verbatim; add brief-local items as BR-… only when the sources have none. Every requirement maps to ≥1 deliverable; every deliverable traces to a requirement or constraint.

### 6. Constraints, timeline, team, process
- Constraints: deadline, budget, stack, regulations — restate verbatim from sources.
- Timeline: only if dates exist in the inputs; otherwise a milestone table with relative order and a note «даты не зафиксированы».
- Team and roles: executor side vs. client side, named responsibilities.
- Process (when the receiver is a contractor): reporting cadence, communication channel, change-request procedure, IP/warranty.

### 7. Final confirmation
Before writing, present: the section outline (one line each), the deliverables table with acceptance criteria, the scope boundaries (in/out), and open questions. Ask for explicit confirmation via `ask_user_question` (confirm / adjust). Do not write the file without it.

### 8. Document generation
Fill the template `templates/development-brief.md`. Rules:
- Output in English.
- Invent nothing: only confirmed facts from the inputs, explicitly marked assumptions, and noted gaps.
- Cite the requirement or constraint each deliverable serves (e.g., «для FR-05»).
- Filename: `development-brief.md` in the current working directory (or `<project>-development-brief.md` if the project is named).
- Save (write) and show the file to the user via `present`.

## Quality

- Every deliverable has a testable acceptance criterion; "done" is never «появится, когда увидим».
- Scope has an explicit out-of-scope — unsaid ≠ included.
- Traceability both ways: every requirement maps to ≥1 deliverable, every deliverable traces to a requirement or constraint.
- No task-level plan or estimates (implementation-planner's job) unless the user asks for them.
- The document is self-sufficient: a contractor can price and execute from the file alone.
