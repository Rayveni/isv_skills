---
name: implementation-planner
description: "Implementation plan for a task or project from whatever inputs exist — requirements, constraints, architecture, all together or just one of them: breaks the work into stages and, where needed, subtasks, adds diagrams (Gantt/WBS/flow) when they help, and ends with a checklist. Asks clarifying questions only when the inputs leave gaps, presents the plan in chat, and — only after the user's confirmation — saves a structured Russian Markdown file with a checklist. Triggers (ru): «план реализации», «план задачи», «разбей на этапы», «декомпозиция задачи», «план проекта», «дорожная карта», «чек-лист задач», «WBS», «план внедрения». Triggers (en): \"implementation plan\", \"task breakdown\", \"break into stages\", \"project plan\", \"roadmap\", \"task checklist\", \"WBS\", \"plan from requirements\"."
---

# Implementation Planner

This skill turns requirements, constraints, and architecture — all of them together, or any single one of them — into an implementation plan: stages, subtasks where needed, optional diagrams, and a final checklist. Only after the user confirms the plan is the Russian Markdown file written to disk.

**Language rule:** this skill file itself is in English. The user-facing interview and the generated plan document are in Russian (the user's language) — the template `templates/implementation-plan.md` stays in Russian.

## When to use

- The user asks to plan a task or project: «план реализации», «разбей на этапы», "implementation plan", "task breakdown".
- Inputs are partial on purpose: only requirements, or only constraints, or only an architecture sketch — any subset is a valid input.
- The work must be decomposed into stages (and subtasks for large stages) and tracked with a checklist.
- The plan must be confirmed before anything is written to disk.

## Process

### 1. Reading the input
Inputs come in any mix: a requirements file (output of `requirements-analyzer`), a system-design file (output of `system-designer`), an architecture description, or a raw task in chat. If the user names files, read them entirely (read) — never guess their content. If nothing is named, ask which sources exist; a chat description alone is a valid input.

Extract and keep the IDs: goals and success criteria, scope (in/out), functional and non-functional requirements (FR-/NFR-…), constraints (deadlines, budget, tech, regulations), architecture and components, integrations, risks, milestones. Traceability of tasks back to requirements depends on these IDs.

### 2. Clarification interview (only if needed)
If the inputs leave gaps that block planning, ask up to 8 key questions in one `ask_user_question` call. Priority:

1. Deadline, milestones, release date — or is the plan untimed?
2. Team: size, skills, how many parallel workstreams?
3. Starting point: greenfield or an existing codebase?
4. Granularity: stages only, or stages + subtasks? Estimate unit (S/M/L, hours, days)?
5. Sequencing constraints: external dependencies, contracts, releases that cannot move?
6. Definition of done / acceptance criteria for the work?
7. Environments and release path (dev/staging/prod, CI/CD)?
8. What else belongs in the plan: owners, estimates, diagrams, risks?

If the user asks for "no questions" — skip the interview and mark every gap as an assumption or open question in the document.

### 3. Decomposition strategy
Choose and justify the split: by phases (discovery/design → build → test → release), by component, by feature, or a hybrid. Derive the choice from the constraints (deadline → milestone-driven; many components → component tracks; small task → single stage, no subtasks).

Rule for subtasks: split a stage item when it exceeds the agreed size threshold (default: more than ~2 days), has a distinct owner or acceptance, or blocks other work. Otherwise keep the stage flat.

### 4. Task breakdown
Every task gets: ID (N.M), name, estimate (only if the user asked for estimates), dependencies, traced requirements (FR-/NFR-…), acceptance criterion. Each stage has an explicit goal and a completion gate. Order tasks by dependencies; derive the critical path and call out what gates the finish date.

### 5. Diagrams (only when they help)
Pick by the question the plan must answer:
- Schedule/timeline matters → Gantt (`plantuml` skill, gantt syntax).
- Decomposition overview → WBS/tree (text diagram per `text-diagrams`, or PlantUML WBS).
- Cross-stage flow or decision points → activity/flowchart.
- Small plans (≤ ~8 tasks) → no diagram; tables suffice — say so explicitly.

Propose diagram sources in chat per the chosen diagram skill's process (source + render for PlantUML, checker-validated block for text). Diagrams land in the document only together with the confirmed plan.

### 6. Checklist generation
Every leaf task becomes exactly one `- [ ]` checkbox, grouped by stage, in execution order; each stage ends with its gate checkbox. The checklist is complete: every task from §4 appears once, nothing extra. No task without an acceptance criterion reaches the checklist.

### 7. Final confirmation
Before writing, present: the stage list (one line each), the total number of tasks, the critical path, the proposed diagrams (with renders), and open questions. Ask for explicit confirmation via `ask_user_question` (confirm / adjust). Do not write the file without it.

### 8. Document generation
Fill the template `templates/implementation-plan.md`. Rules:
- Output in Russian.
- Invent nothing: only confirmed facts from the inputs, explicitly marked assumptions, and noted gaps.
- Cite the requirement or constraint each task serves (e.g., «для FR-02»).
- Include only the diagrams agreed at §5–§7.
- Filename: `implementation-plan.md` in the current working directory (or `<project>-implementation-plan.md` if the project is named).
- Save (write) and show the file to the user via `present`.

## Quality

- Traceability both ways: every requirement maps to ≥1 task, and every task traces to a requirement or constraint.
- Stages have explicit goals and gates; subtasks appear only where the size rule demands them.
- The checklist equals the leaf tasks — no more, no less.
- Estimates appear only when requested; no fabricated precision.
- The document is self-sufficient: a team member receiving the file can execute without the chat history.
