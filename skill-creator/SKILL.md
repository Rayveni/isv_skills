---
name: skill-creator
description: >-
  Create, validate, lint, and ship directory-bundle skills for this
  Harness (DSH): scaffold a skill directory with a valid SKILL.md,
  draft frontmatter (name, description, optional whenToUse and
  invocation policy), write references/templates/scripts, verify the
  frontmatter parses and the name grammar passes, and install the
  finished skill into /root/.dsh/skills so it is discoverable in the
  next session. Use when the user asks to make a new skill, write a
  SKILL.md, scaffold a skill, or fix an existing skill that is not
  discovered. Triggers (en): "create a skill", "new skill", "write a
  SKILL.md", "skill scaffolding", "make a skill for X". Triggers (ru):
  «создай скилл», «напиши скилл», «сделай новый скилл», «навык для
  модели», «создай SKILL.md», «поставь скилл».
---

# Skill Creator

Turns "make a skill that does X" into a validated, installed directory-bundle skill: `skills/<skill-name>/SKILL.md` plus optional `references/`, `templates/`, `scripts/`.

**Language rule:** this skill file is English. The interview and chat summary are in the user's language. Generated `SKILL.md` files default to English (the loader-facing language) unless the user asks otherwise — existing skills in this deployment mix both; English bodies with translated trigger phrases in the description are the house style.

## When to use

- The user asks to create a skill / write a SKILL.md / «создай скилл».
- A skill exists but is not discovered or loads with warnings.
- A skill needs restructuring (flat markdown → directory bundle, or better organization of a growing SKILL.md).

**Relation to other skills:** skills produced here are peers of `requirements-analyzer`, `code-review`, etc. — they are instructions for the model, not code. For a runnable tool (Node CLI, Python script) the skill may *wrap* it: put the code under `scripts/` and reference it from the body.

## Skill anatomy (what the loader accepts)

A skill is a directory under a skill root (see §Installation):

```
<skill-name>/
  SKILL.md          required — YAML frontmatter + Markdown body
  references/       optional — long supporting docs, linked from the body
  templates/        optional — fill-in documents the skill copies into the workspace
  scripts/          optional — executables the skill runs (checkers, generators)
```

Discovery rules (from `@deepseek-ai/dsh-skill-filesystem`):

- A root's subdirectory with a `SKILL.md` is a **directory bundle** (recommended); a bare `*.md` file in a root is a **flat skill** whose frontmatter still needs `name` + `description`.
- Frontmatter must be the literal first line `---`, a YAML object, then a closing `---` line. Invalid YAML or a missing `name`/`description` makes the file silently ignored (a warning goes to the host log).
- `name` must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` (kebab-case, lowercase). No underscores, no uppercase.
- Optional frontmatter:
  - `whenToUse` — extra trigger hints for the model.
  - `metadata` — arbitrary object, passed through.
  - `disable-model-invocation: true` — the skill stays human-triggerable but is never auto-loaded by the model.
  - `user-invocable: false` — model-only skill, hidden from the user's slash commands.
- Legacy keys (`disableModelInvocation`, `modelInvocable`, `userInvocable`) are rejected — the file is ignored.
- The body is everything after the closing `---`. Keep it under ~500 lines; move detail into `references/` and link it (the `skill` tool reports the skill's directory, so relative links resolve).

## Process

### 1. Elicit the skill's purpose

Ask (up to 6 questions in one `ask_user_question` call; skip if the request is already specific):

1. What should the skill do — one sentence? What user phrase should trigger it?
2. What does it produce (a document, code, a report, an action)?
3. Does it need templates, reference docs, or executable scripts?
4. Which language: the SKILL.md body, the interview, the outputs?
5. Auto-loadable by the model, or human-invoked only (`user-invocable`/`disable-model-invocation`)?
6. Skill name (kebab-case) — or pick one from the purpose.

If the user says "no questions", proceed with stated assumptions marked `[ASSUMPTION]`.

### 2. Draft the SKILL.md

Structure that survives review (see `references/skill-anatomy.md` for the full anatomy and `templates/SKILL.md` for the blank skeleton):

1. **Frontmatter** — `name`, `description` (with trigger phrases in both languages when the user is Russian-speaking: «триггеры» and "triggers").
2. **One-line summary** — what the skill turns into what.
3. **Language rule** — which parts are in which language.
4. **When to use** — triggers, plus relation to sibling skills when relevant.
5. **Process** — numbered steps the model follows; each step names the tools it uses (`read`, `write`, `edit`, `glob`, `grep`, `ask_user_question`, `present`, `bash`).
6. **Verification** — a checklist run before finishing.
7. **Quality** — the bar the output must clear.

Rules for the body:

- Imperative, executable instructions — not prose about the skill.
- Every step names its tool or command. Never assume context the model does not have.
- Gate writes on user confirmation when the output is a deliverable file (ask via `ask_user_question` first, save after) — unless the user pre-authorized the exact path in the request.
- Reference sibling files with relative links (`references/x.md`, `templates/y.md`, `scripts/check.mjs`).
- Scripts must be dependency-light (Node built-ins, `node:test`) and runnable with an absolute path from the skill directory — the body tells the model how to invoke them.

### 3. Draft supporting files

- `templates/` — full documents with `{{placeholders}}` or empty sections; they are copied, not generated from scratch.
- `references/` — long tables, grammars, examples that would bloat SKILL.md.
- `scripts/` — checkers/validators/generators. Each script: zero or npm-free deps, `#!/usr/bin/env node`, exit 0/1 with one line per issue.

### 4. Validate (mandatory)

Run the validator before declaring the skill done:

```sh
node <skill-directory>/scripts/validate.mjs <path/to/skill-dir-or-SKILL.md>
```

It checks: frontmatter delimiters, YAML parses to an object, `name` passes the kebab-case grammar, `description` is a non-empty string, no legacy invocation keys, boolean invocation fields are well-formed, relative links in the body resolve to real files, and script files are syntactically valid (`node --check`). Fix everything it reports, then re-run until clean.

Also self-check against the house patterns (read 1–2 existing skills in `/root/.dsh/skills/` for style) and the checklist in `references/skill-anatomy.md`.

### 5. Install

The deployment's skill roots (from the filesystem provider, in precedence order — lower rank wins):

1. `<project>/.dsh/skills/` and `<project>/.agents/skills/` — per-project.
2. Custom dirs from the profile's `cordis.patch.yml` (`customSkillDirs` of `@deepseek-ai/dsh-skill-filesystem`).
3. `/root/.dsh/skills/` (user root, `$DSH_HOME/skills`) — **this machine's default install target**; `~/.agents/skills/` also works.
4. Bundled preset skills (read-only).

Install into `/root/.dsh/skills/<skill-name>/` by copying the validated directory there. If that path is not writable from the sandbox, fall back to the project root `.dsh/skills/` and tell the user which root was used.

**Discovery:** the filesystem provider watches the skill roots and refreshes the catalog on change — a newly installed skill typically appears in the session's available-skills list without a restart (observed in this deployment). If it does not appear, start a new session; the catalog is rebuilt at session start.

### 6. Report

In chat: the skill name, its trigger phrases, the file tree written, the validator result, and the install location + when it becomes available. Present the SKILL.md with `present` when the user should open it.

## Fixing an existing skill

Symptoms → causes (all observed in this loader):

- **Skill not listed at all** → file lacks frontmatter; first line is not exactly `---`; `name` violates the kebab-case grammar; `description` missing/empty; YAML is invalid; a legacy invocation key is present. Run the validator — it names the failing check.
- **Description not shown / triggers weak** → description is where trigger phrases live; add the user's wording («триггеры» / "triggers") to it.
- **Edits not picked up** → the watcher re-scans on file change and refreshes the catalog; if a stale catalog persists, start a new session.
- **Body too long** → move sections into `references/` and link them.

Never edit a skill in place without reading it fully first; keep its established structure and language rules.

## Quality

- Valid by construction: validator exits 0 before install, always.
- Discoverable: the description carries the exact words a user would say.
- Self-sufficient: a model that loads only this SKILL.md can execute; deep detail lives in linked references it can read on demand.
- Minimal: no unused templates, no dead scripts, no sections that repeat each other.
- Confirmed writes: deliverable files are written only after the user confirms the path (unless pre-authorized).
