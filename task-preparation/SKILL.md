---
name: task-preparation
description: "Prepare task documents for AI development from an implementation plan: reads the plan (including its references to other documents), creates the agent_tasks/ directory if missing, and generates one English stage<N>.md file per plan stage — complete, implementation-only, AI-optimized instructions for a model to execute. Non-implementation details (interviews, process notes, governance) are excluded. Triggers (ru): «подготовь задачи для модели», «подготовка задач на разработку», «создай agent_tasks», «разбей план на задачи для AI», «task document for AI». Triggers (en): \"prepare tasks for AI\", \"task preparation\", \"create agent_tasks\", \"stage documents from plan\", \"prepare task files for model\"."
---

# Task Preparation

This skill turns an implementation plan into a set of AI-ready task documents. Input: a plan file (often referencing other documents). Output: `agent_tasks/stage<N>.md` — one English document per plan stage, containing everything an AI model needs to implement that stage and nothing else.

**Language rule:** this skill file itself is in English. The user-facing interview and in-chat summary are in the user's language. The generated documents `agent_tasks/stage<N>.md` are always in **English**, regardless of the user's language, because their recipient is an AI model.

## When to use

- The user asks to prepare tasks for an AI model from a plan: «подготовь задачи для модели», "prepare tasks for AI", "create agent_tasks".
- An implementation plan exists (output of `implementation-planner` or any plan document) and work must be handed to an AI model stage by stage.
- The plan references other documents (requirements analysis, development brief, system design) whose content must be folded into the task documents.

**Relation to other skills:** `requirements-analyzer` → `development-brief` → `system-designer` → `implementation-planner` produce the inputs. This skill consumes the plan (+ referenced docs) and produces the per-stage task documents. `development-executor` can then execute a stage document directly.

## Process

### 1. Reading the input

Read the plan file entirely (read). Follow its references: when the plan cites another document (by filename, path, or section), read that document entirely too — never guess its content. If a referenced document is missing, note it as a gap (§5) and continue with what exists.

Extract and keep the IDs and facts the tasks will need:
- Stage structure: stage number, name, goal, gate, tasks (ID, name, estimate, dependencies, traced requirements FR-/NFR-…, acceptance criteria).
- Subtasks of each task (ID, name, estimate, acceptance).
- From referenced documents: scope (in/out), requirements with IDs, constraints, architecture/design decisions, API contracts, data models, integrations, environment facts, tech stack, conventions.
- Open questions, assumptions, and confirmed facts — they shape the document's "Open questions" and "Constraints" sections.

### 2. Clarification interview (only if needed)

If the inputs leave gaps that block document generation, ask up to 5 key questions in one `ask_user_question` call. Priority:

1. Where should `agent_tasks/` be created (default: current working directory)?
2. Which stages to include — all, or a subset (skip/merge)?
3. Any additional context documents beyond those the plan references?
4. Target model/executor constraints (repo access, tool permissions, style conventions)?
5. Should estimates/owners be carried into the documents, or stripped (implementation-only)?

If the user asks for "no questions" — skip the interview and mark every gap as an assumption or open question inside the documents.

### 3. Create agent_tasks/

If `agent_tasks/` does not exist in the target directory, create it (mkdir or the write tool's auto-creation). If it already exists, reuse it — do not delete existing files; overwrite only the stage documents being regenerated.

### 4. Generate stage documents

For **each stage** of the plan, create `agent_tasks/stage<N>.md` (N = the stage number from the plan, e.g., `stage1.md`, `stage2.md`). Fill the template `templates/stage.md` with these rules:

- **English only.** Translate all content from the source documents; keep IDs (FR-01, NFR-01, 1.2, R1, Q1) verbatim.
- **Implementation-only content:** goal, scope boundaries (in/out for this stage), concrete work items with acceptance criteria, dependencies, environment/tech facts, and the contracts the code must satisfy (APIs, data models, schemas). Every fact must be actionable — something the model can implement or verify against.
- **Exclude non-implementation details:** interview history, how the plan was built, process/governance notes, stakeholder names, communication rules, change-management procedures, document status headers. If a fact does not change what the model writes or how it verifies it, drop it.
- **Resolve references:** inline everything the stage needs from the plan and any referenced documents. **Never mention sources:** the document names no plan file, no referenced document, no chat, no section numbers of inputs — every required fact is simply present in the document itself. The model executes it without reading anything else.
- **Carry over, marked:** assumptions as `[ASSUMPTION]`, open questions as an "Open questions" table (question, who answers, what it blocks), confirmed facts only where they constrain implementation.
- **Conditional tracks:** when the plan says "execute only tracks shown by profiling" (or similar), keep the conditional structure verbatim — list every track with its enable condition, so the model knows which to run and which to skip.
- **Dependencies between stages:** each document states its input gate (what must be true before starting — usually the previous stage's gate) and its output gate.
- Keep the document dense but complete: no preamble, no motivation prose, no filler. Prefer tables and checklists.

### 5. Verification

Before finishing, check:

- One `stage<N>.md` per plan stage, numbering matches the plan exactly, no gaps or duplicates.
- Every leaf task and subtask from the plan appears in its stage document exactly once, with an acceptance criterion.
- Each document is self-sufficient and source-free: it names no input file, no "see plan/section/chat" — all required data is inlined.
- No non-implementation content survived (grep the documents for interview/process words and for input file names from the source).
- `agent_tasks/` exists and contains exactly the generated files (plus any pre-existing user files).

### 6. Output

Present in chat (user's language): the list of generated files with one-line summaries, the stages covered, carried-over open questions, and any gaps (missing referenced documents). Save the files with the write tool. Show the directory to the user via `present` (the stage files).

## Quality

- Faithfulness: documents reflect the plan and referenced docs; nothing invented — unconfirmed items are marked `[ASSUMPTION]` or listed as open questions.
- Source-free output: documents contain all required data and mention no sources — no input file names, no citations, no "see plan section X".
- AI-readiness: a model given only `stage<N>.md` can implement the stage and prove its acceptance criteria without other context.
- Completeness of traceability: every task carries its source task ID and requirement IDs (FR-/NFR-…).
- Minimality: zero non-implementation content; every sentence earns its place by changing what or how the model builds.
- Deterministic naming: `agent_tasks/stage<N>.md`, N = plan stage number.
