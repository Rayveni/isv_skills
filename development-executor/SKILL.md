---
name: development-executor
description: "Full-cycle development of a task or feature: takes whatever exists — a development brief, an implementation plan, a system design, or a raw task in chat — and turns it into working, tested code: sets up the environment, writes the code, runs tests and linters, self-reviews, updates documentation, and saves a structured Russian execution report. Asks clarifying questions only when the inputs leave gaps, presents the execution outline in chat, and — after the user's confirmation — implements and verifies. Triggers (ru): «разработай», «реализуй», «напиши код», «сделай фичу», «выполни задачу», «закоди», «реализация задачи», «кодинг». Triggers (en): \"implement\", \"develop\", \"write the code\", \"implement the feature\", \"code task\", \"development\", \"execute task\"."
---

# Development Executor

This skill executes development work end to end: it consumes a development brief, an implementation plan, a system design, existing code, or a raw chat task, and delivers working, tested code with updated documentation and a structured execution report. Only after the user confirms the execution outline does implementation start.

**Language rule:** this skill file itself is in English. The user-facing interview, the in-chat outline, and the generated report are in Russian (the user's language) — the template `templates/development-report.md` stays in Russian.

## When to use

- The user asks to implement, code, or develop: «реализуй», «напиши код», "implement", "develop".
- Inputs are partial on purpose: only a brief, only a plan, only a task description — any subset is valid.
- The result must be working code with tests passing and documentation updated — not just a patch sketch.
- The work plan must be confirmed before code is written.

**Relation to other skills:** `requirements-analyzer` discovers requirements, `system-designer` produces architecture, `development-brief` fixes WHAT is delivered, `implementation-planner` breaks work into stages/tasks. This skill EXECUTES: it picks the next task (or the given task) and delivers it. It does not re-analyze requirements or re-plan the whole project — it consumes those files as inputs when present.

## Process

### 1. Reading the input

Inputs come in any mix: a development brief (`development-brief.md`), an implementation plan (`implementation-plan.md`), a system design, an existing repository, or a raw task in chat. If the user names files, read them entirely (read) — never guess their content. If nothing is named, ask which sources exist; a chat task alone is a valid input.

Survey the codebase before touching it (glob/grep/read): structure, stack, build/test commands, conventions, existing patterns. Extract and keep the IDs: FR-/NFR-…, task IDs (N.M), deliverable IDs (D-…) — the report traces back to them.

### 2. Clarification interview (only if needed)

If the inputs leave gaps that block implementation, ask up to 8 key questions in one `ask_user_question` call. Priority:

1. Exact task to implement now (if the input is a whole plan: which task/feature first)?
2. Stack, framework versions, and where the code must live (repo structure)?
3. Build / test / lint commands, or should they be discovered from the repo?
4. Style/convention constraints (existing patterns to follow, libraries allowed/forbidden)?
5. Acceptance criterion for this task — what does "done" mean (tests? demo? checklist item)?
6. Data and environments: test data, test mode of external APIs (payment sandboxes)?
7. Docs to update: README, API docs, changelog — which ones?
8. Branch/PR workflow: branch name, commit conventions, PR required?

If the user asks for "no questions" — skip the interview and mark every gap as an assumption or open question in the report.

### 3. Execution outline

Before writing code, present in chat: the task being executed, the files/modules to touch, the approach (key design decisions with alternatives when non-trivial), the test plan, and the acceptance criterion. Keep it short — a dozen lines, not a design doc.

For non-trivial design decisions (new module, API shape, data model change): present 2–3 alternatives with a recommendation before implementing. Trivial changes (fix typo, add field) need no alternatives.

### 4. Environment and conventions

- Run the project's existing build/test/lint commands exactly as documented (README, package.json, Makefile, CI config) — discover them before inventing new ones.
- Follow existing code style and patterns; only introduce new dependencies when the task requires them.
- Secrets stay out of code and files — env vars, config files outside the repo, or test placeholders.
- If the task is larger than ~2 days of work, propose splitting it into subtasks (implementation-planner rule) rather than implementing blindly.

### 5. Implementation

- Write code for the confirmed outline only; the scope of the chat task is the scope of the change (do not implement adjacent "improvements" — note them as follow-ups in the report instead).
- Keep changes reviewable: small commits with clear messages, or one coherent patch; no drive-by refactors.
- When the implementation hits a contradiction in the inputs (brief says X, code says Y), stop and ask — do not silently pick one.

### 6. Verification (mandatory)

Run, in this order, and fix what fails:

1. Build/typecheck (if the project has one).
2. Lint/format with the project's own tooling.
3. Tests: existing suite must stay green; new code gets tests covering the acceptance criterion.
4. Manual smoke check of the user-visible path (run the app / call the endpoint / execute the command).

A task without a runnable check gets an explicit, user-verifiable acceptance step in the report («запустите X, ожидайте Y»). Never claim tests pass without running them — check exit codes, investigate failures before moving on.

### 7. Self-review

Re-read the diff before finishing (read the changed files). Check:

- Correctness vs. the acceptance criterion; edge cases and error handling.
- Security: no secrets, no injection paths, auth checks where needed, input validation.
- Docs updated: README, inline comments where non-obvious, API docs, changelog.
- Nothing outside scope; leftovers (TODO, debug prints, commented code) removed.

Fix findings directly; if a finding changes the approach, return to §3 and re-confirm with the user.

### 8. Final confirmation and report generation

Present: what was implemented, test/lint results with actual output, files changed, follow-ups, and open questions. Ask for explicit confirmation via `ask_user_question` (accept / adjust). Fill the template `templates/development-report.md` after confirmation:

- Output in Russian.
- Invent nothing: only what was actually done, actual command output, explicitly marked assumptions.
- Trace every change to the task/requirement IDs from the inputs (FR-…, N.M, D-…).
- Filename: `development-report.md` in the current working directory (or `<project>-development-report.md` if the project is named).
- Save (write) and show the file to the user via `present`.

## Quality

- Every run ends with verifiable evidence: commands run, exit codes, test output — not «работает».
- Scope fidelity: the delivered code matches the confirmed outline; extras go to follow-ups.
- Traceability both ways: task/requirement IDs appear in the report; every changed file serves the task.
- The report is self-sufficient: a teammate receiving the file knows what changed, how it was checked, and what remains.
