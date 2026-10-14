---
name: development-brief
description: "Development brief (постановка на разработку, ТЗ, SOW) for a task or project from whatever inputs exist — requirements, design, architecture, or a raw idea: formalizes goals, scope boundaries, requirements, deliverables, and acceptance criteria into a structured English document a team or contractor can start work from. Document preparation only — no solution research and no implementation analysis (those are the next stages). Asks clarifying questions only when the inputs leave gaps, presents the brief outline in chat, and — only after the user's confirmation — saves a structured English Markdown file. Triggers (ru): «постановка на разработку», «задание на разработку», «бриф на разработку», «составь ТЗ», «техническое задание», «опиши задачу для разработчиков», «задача подрядчику», «SOW». Triggers (en): \"development brief\", \"brief for developers\", \"terms of reference\", \"statement of work\", \"SOW\", \"task brief\"."
---

# Development Brief

This skill turns requirements, designs, architecture — or a single raw idea — into a development brief: a **complete-information document** that fixes WHAT is delivered and HOW it is accepted. The next stages — research, system design, implementation planning, development — must be able to start from this file alone, without the chat history. Only after the user confirms the brief is the English Markdown file written to disk.

**Document-only skill:** the brief is the deliverable. This skill does NOT research solutions, compare technologies, analyze implementation approaches, estimate effort, or build a task plan — those are separate next stages (`system-designer`, `implementation-planner`, `development-executor`). Anything that would require research or design analysis becomes an open question or an assumption in the document, never an invented answer.

**Language rule:** this skill file, the template `templates/development-brief.md`, and the generated document are in English. The user-facing interview stays in the user's language.

## When to use

- The user asks to formalize development work: «постановка на разработку», «составь ТЗ», "development brief", "SOW".
- Work is being handed to a team (internal or external) and needs pinned-down scope, deliverables, and acceptance.
- Inputs are partial on purpose: only a requirements file, only a design, or a chat description — any subset is valid.
- The document must be confirmed before anything is written to disk.

**Relation to other skills:** `requirements-analyzer` discovers and structures requirements; `system-designer` produces the architecture; `implementation-planner` breaks confirmed work into stages, tasks, and a checklist. This skill is the brief that fixes WHAT is delivered and HOW it is accepted — the shared input for all of them. It may consume any of those files as input, but it does not itself research solutions, produce a design, a task plan, or estimates.

## Process

### 1. Reading the input
Inputs come in any mix: a requirements file (output of `requirements-analyzer`), a system-design file (output of `system-designer`), an architecture description, a vendor RFP, or a raw task in chat. If the user names files, read them entirely (read) — never guess their content. If nothing is named, ask which sources exist; a chat description alone is a valid input.

Extract and keep the IDs: goals and success criteria, scope (in/out), functional and non-functional requirements (FR-/NFR-…), integrations. Deliverable-to-requirement traceability depends on these IDs.

### 2. Clarification interview (only if needed)
If the inputs leave gaps that block a complete document, ask up to 5 key questions in one `ask_user_question` call. Priority:

1. Who receives the brief: internal team, contractor/outsourcer, or the model for implementation?
2. Deliverables: code only, or also documentation, tests, deployment, CI/CD, training, source materials?
3. Acceptance: how is the result checked — demo, UAT, test plan, signed act?
4. Starting point: greenfield or existing codebase? Fixed stack or free choice?
5. Integrations and third parties to name explicitly (payment, delivery, auth, storage)?

Questions serve completeness of the document, not design: do not ask "how should it be built" — that is the next stage's job. If the user asks for "no questions" — skip the interview and mark every gap as an assumption or open question in the document.

### 3. Scope strategy
State the boundary explicitly: everything in the brief is in-scope unless listed otherwise; everything in the out-of-scope list is excluded even if it "looks obvious". Derive the boundary from the requirements and inputs: a narrow, well-defined input → narrow scope with named deferrals («later», «next phase»); broad or ambiguous inputs → exhaustive out-of-scope so the brief stays executable.

### 4. Deliverables and acceptance
Every deliverable gets: ID (D-1…), name, description/format (repo, doc, access, artifact), traced requirements (FR-/NFR-…), and a testable acceptance criterion («дано X → тогда Y» or a checkable artifact). Acceptance must be checkable without the chat history: who checks, how, and what passes.

### 5. Requirements traceability
Keep the FR-/NFR-… IDs from the sources verbatim; add brief-local items as BR-… only when the sources have none. Every requirement maps to ≥1 deliverable; every deliverable traces to a requirement.

### 6. Completeness check
Before presenting the brief for confirmation, verify the document carries complete information for the next stages — nothing essential lives only in the chat:

- context, goal, and success criteria;
- explicit scope boundary (in/out);
- requirements with stable IDs;
- deliverables with acceptance criteria;
- integrations and dependencies (who provides each);
- constraints (time, budget, platform, legal, etc. — as stated, not researched);
- assumptions and confirmed facts, each tagged;

### 7. Final confirmation
Before writing, present: the section outline (one line each), the deliverables table with acceptance criteria, the scope boundaries (in/out), and open questions. Ask for explicit confirmation via `ask_user_question` (confirm / adjust). Do not write the file without it.

### 8. Document generation
Fill the template `templates/development-brief.md`. Rules:
- Output in English.
- Invent nothing: only confirmed facts from the inputs, explicitly marked assumptions, and noted gaps.
- Cite the requirement each deliverable serves (e.g., "for FR-05").
- No solution research, no implementation analysis, no estimates, no task breakdown — if the inputs contain none of these, the document says so explicitly rather than producing them.
- **Destination folder:** always save into the `dev-briefs/` subdirectory of the current working directory (create it if missing).
- **Filename:** `<source-file-stem>-development-brief.md`, where `<source-file-stem>` is the name of the file the brief was based on, without extension — when an input file was passed (e.g., brief from `requirements-analysis.md` → `dev-briefs/requirements-analysis-development-brief.md`). If several files were passed, use the primary one named first by the user. If no file was passed (chat description only), use `development-brief.md`, or `<project>-development-brief.md` if the project is named.
- Save (write) and show the file to the user via `present`.

## Quality

- Every deliverable has a testable acceptance criterion; "done" is never «появится, когда увидим».
- Scope has an explicit out-of-scope — unsaid ≠ included.
- Traceability both ways: every requirement maps to ≥1 deliverable, every deliverable traces to a requirement.
- The document is self-sufficient: an implementer or a later-stage skill can execute from the file alone.
- Document-only: no research, no implementation analysis, no estimates, no task plan (implementation-planner's job) unless the user asks for them.
- Open questions are concrete: each names who answers and what it blocks.
