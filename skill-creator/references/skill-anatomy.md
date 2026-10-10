# Skill anatomy reference

The complete structure of a DSH directory-bundle skill, with the loader's exact acceptance rules (verified against `@deepseek-ai/dsh-skill-filesystem` and `@deepseek-ai/dsh-skill`).

## Frontmatter contract

```yaml
---
name: my-skill-name            # REQUIRED, ^[a-z0-9]+(?:-[a-z0-9]+)*$
description: >-                # REQUIRED, non-empty string; carry trigger phrases here
  What the skill does, and the exact words that trigger it.
  Triggers (en): "do the thing". Triggers (ru): «сделать дело».
whenToUse: Optional extra hint for the model's auto-selection.
metadata:                      # Optional, arbitrary object, passed through verbatim
  tags: [docs]
disable-model-invocation: false   # Optional boolean: true = human-triggerable only
user-invocable: true              # Optional boolean: false = hidden from user commands
---
```

Hard rules (violating any makes the file silently ignored, with a host-log warning):

- Line 1 is exactly `---` (a trailing `\r` is tolerated).
- Between the delimiters, YAML must parse to a **mapping** (not a list, not a scalar).
- `name` and `description` must be non-empty strings; `name` must pass the kebab-case regex.
- Invocation keys are `disable-model-invocation` and `user-invocable` only. Legacy keys (`disableModelInvocation`, `modelInvocable`, `userInvocable`) are rejected with an error.
- Boolean fields accept `true/false/yes/no/on/off/1/0` (case-insensitive strings).

## Body contract

Everything after the closing `---` is the skill's instructions, loaded verbatim into the model's context when the skill is invoked.

- Keep it under ~500 lines. Move depth into `references/` and link it — the model can read those files on demand through the `skill`-reported directory.
- Sections that earn their place: summary, language rule, when to use, process (numbered, tool-named), verification, quality.
- Link siblings relatively: `[anatomy](references/anatomy.md)`. Paths resolve against the skill directory.

## Directory layout

| Path | Purpose | Notes |
|---|---|---|
| `SKILL.md` | The skill itself | required |
| `references/*.md` | Deep reference the body links to | read on demand |
| `templates/*` | Documents copied into the user's workspace | copy, don't regenerate |
| `scripts/*` | Executables the skill runs | zero-dep preferred; invoke by absolute path |

## Discovery and precedence

Roots scanned per session (lower rank wins on name conflicts):

1. `<project>/.dsh/skills/` (rank 100), `<project>/.agents/skills/` (rank 200) — project root = nearest ancestor containing `.git`.
2. Runtime provider (rank 250).
3. `customSkillDirs` from the profile patch (rank 300).
4. `$DSH_HOME/skills` — `/root/.dsh/skills` here (rank 400, user root).
5. `$DSH_AGENTS_HOME` or `~/.agents/skills` (rank 500).
6. Bundled preset skills (rank 600, read-only).

A root may contain directory bundles (`<name>/SKILL.md`) and flat skills (`<name>.md` with its own frontmatter). Entries are sorted by name; a `.system` directory is skipped in the user root.

## Lifecycle

- The catalog (name + description list) is built at session start; the file watcher invalidates it on change, but a *running session's* advertised list is fixed — new skills appear next session.
- Invoking a skill loads the full body via the provider; `references/` etc. are read afterwards with the file-read tool.
- Writes made by the model into a skill directory are observed and refresh discovery (host-mutation observation).

## Common failure modes

| Symptom | Cause |
|---|---|
| Not listed | no/invalid frontmatter, bad `name` grammar, missing `description`, legacy invocation key |
| Listed but empty body | body trimmed to empty string |
| Triggers never fire | trigger phrases absent from `description` (the catalog only sees frontmatter) |
| Links 404 | relative link points outside the skill directory |
| Script fails | invoked with a relative path from another cwd; use the skill directory absolute path |

## Style conventions (this deployment)

- English SKILL.md bodies; description carries bilingual trigger phrases.
- Interview + generated outputs in the user's language (Russian here).
- Deliverable files: confirm path with `ask_user_question`, then `write` + `present`.
- One skill = one capability; split when the body needs "and also" twice.
