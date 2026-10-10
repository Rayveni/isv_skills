---
name: code-review
description: "Code review of a diff, PR, commits, files or a whole repository: correctness, security, performance, style, tests and docs — plus an explicit rule-by-rule compliance check against the project's own rules when they exist (AGENTS.md, CLAUDE.md, CONTRIBUTING.md, .cursorrules, RULES.md, linter configs). Findings ranked by severity with file:line evidence; saves a structured Russian review report. Triggers (ru): «код-ревью», «ревью кода», «проверь код», «проведи ревью», «что не так с этим кодом», «проверь на соответствие правилам проекта», «ревью ПР». Triggers (en): \"code review\", \"review the code\", \"review this PR\", \"PR review\", \"check the code\"."
---

# Code Review

This skill reviews code — a diff/PR, commits, specific files, or a whole repo — and produces findings ranked by severity, each with file:line evidence and a suggested fix. When the project declares its own rules (AGENTS.md, CLAUDE.md, CONTRIBUTING.md, .cursorrules, RULES.md, linter/formatter configs), the review additionally checks every extracted rule for compliance and reports a rule-by-rule verdict matrix.

**Language rule:** this skill file itself is in English. The user-facing questions, the in-chat findings, and the generated report are in Russian (the user's language) — the template `templates/code-review-report.md` stays in Russian.

## When to use

- The user asks for a review: «ревью кода», «проверь код», "code review", "review this PR".
- A PR/commit needs a gate before merge: correctness, security, conventions.
- The project has its own rules file and the user wants conformance checked explicitly («проверь на соответствие правилам проекта»).

**Relation to other skills:** `development-executor` self-reviews its own work before finishing; this skill is an independent, deeper review — often of someone else's change. `requirements-analyzer` / `development-brief` may supply the FR-/NFR-… and D-… IDs the review traces against. This skill does not implement fixes; it reports them (fixes may be handed back to `development-executor`).

## Process

### 1. Scope the review
Confirm (via `ask_user_question` only when not stated):

1. **What** is under review: PR / diff against a base ref, last N commits, specific files, or the whole repo?
2. **Focus**: full review, or correctness-only / security / performance?
3. **Rules**: auto-discover project rules, or a specific rules file named by the user?

Then read the code with (read/glob/grep): for a diff — the full diff plus the surrounding files (context matters — never review a hunk in isolation); for a repo — survey structure first, then review module by module. Do not guess the content of files not read.

### 2. Discover project rules (mandatory step)

Auto-discover in this order, reading each found file fully:

- Rule documents: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, `RULES.md`, `CONVENTIONS.md`, `CONTRIBUTING.md`, `docs/CONTRIBUTING*`.
- Linter/formatter configs — their enforced rules ARE project rules: `.eslintrc*`, `.prettierrc*`, `.editorconfig`, `biome.json`, `rubocop.yml`, `.pylintrc`, `golangci.yml`, `rustfmt.toml`, `deno.json`.
- Tooling scripts: `package.json` scripts, `Makefile`, CI configs — the commands (`lint`, `test`, `build`) define the checks a change must pass.
- If the user named a rules file — read it verbatim; it wins over auto-discovery.

If nothing is found: state «правила проекта не найдены» and review by general standards only — and say so in the report.

Extract the rules into a numbered checklist **PRJ-1, PRJ-2, …** (quote short rules verbatim). Keep the IDs for the compliance matrix (§4).

### 3. General review checklist

Go through with file:line evidence for every finding:

1. **Correctness**: logic errors, off-by-one, wrong conditions, null/undefined, wrong API usage, incorrect error swallowing.
2. **Edge cases & errors**: empty input, boundaries, retries/timeouts, error paths, fail-open vs fail-closed.
3. **Security**: injection, authz checks on every entry point, secrets in code, XSS, unsafe deserialization, supply-chain deps, sensitive data in logs.
4. **Performance**: N+1, unnecessary loops/allocation, blocking calls, O(n²) growth, missing caching opportunities implied by access patterns.
5. **Concurrency**: races, shared mutable state, deadlocks, idempotency of retries/webhooks.
6. **API & contracts**: breaking changes, naming, backward compatibility, validation at boundaries.
7. **Tests**: new logic covered, assertions meaningful, edge cases, tests runnable as documented.
8. **Docs**: README/API docs updated where behavior changed; comments where non-obvious (not where obvious).
9. **Style**: naming, formatting, dead code, debug leftovers, TODOs without context.
10. **Scope**: the change does what it claims; no drive-by refactors.

### 4. Project-rules compliance (when rules exist)

Check **every** extracted rule PRJ-i against the code under review. Verdicts:

- ✅ соответствует
- ⚠️ частично (rule applied inconsistently)
- ❌ нарушается (with the violating snippet and file:line)
- ➖ не применимо (rule about an area the change doesn't touch)

Each verdict needs evidence. A violated rule is at least a **Major** finding; a violation that breaks the documented build/release process is a **Blocker**.

### 5. Severity and prioritization

- **Blocker** — must fix before merge: breaks build/tests, security hole, data loss/corruption, violates a hard project rule.
- **Critical** — severe bug or requirement violation; fix before release.
- **Major** — should fix before merge: missing error handling, test gap on the happy path, rule violation.
- **Minor** — improvement; fix soon.
- **Nit** — style/preference; optional.

Order findings Blocker → Nit. No praise filler and no «тут плохо» without location, reason, and suggested fix.

### 6. In-chat findings

Present in chat: scope reviewed, rules source (or «не найдены»), findings table (ID, severity, file:line, issue, suggested fix), the compliance matrix for project rules (or a line saying there are none), and the overall verdict: **можно мержить / можно после правок / нельзя мержить**.

### 7. Confirmation and report generation

Ask via `ask_user_question` (save report file / chat only). On save — fill `templates/code-review-report.md`:

- Output in Russian.
- Facts only: only what was actually read and found; every finding cites file:line.
- Trace to requirement IDs (FR-…, NFR-…) from the inputs when the review is against a task.
- Filename: `code-review.md` in the current working directory (or `<project>-code-review.md` if the project is named).
- Save (write) and show the file to the user via `present`.

## Quality

- Every finding has: severity, location (file:line), why it's wrong, suggested fix — no vague complaints.
- Project rules are checked rule-by-rule, not by vibes: the compliance matrix covers all extracted rules with per-rule verdicts.
- Evidence-based: only code actually read is commented on; no speculation.
- Blocking issues are separated from nits — a reviewer's job is decisions, not noise.
- Stay inside the review scope: improvements to untouched code go to follow-ups, not to the findings list.
