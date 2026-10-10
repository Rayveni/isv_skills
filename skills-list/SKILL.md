---
name: skills-list
description: >-
  Print the catalog of skills available in this session into chat —
  each skill's name, what it does, its trigger phrases, and how to
  invoke it — with a total count, or a filtered view when the user
  asks which skill fits a task. Use when the user asks what skills
  exist, wants the full skill list in chat, or asks which skill to
  use for something.
  Triggers (en): "list skills", "show skills", "available skills",
  "skills catalog", "what skills are there", "which skill to use".
  Triggers (ru): «список скиллов», «вывести скиллы в чат»,
  «какие скиллы есть», «каталог скиллов», «какой скилл использовать».
---

# Session skill catalog → chat

Turns «выведи список скиллов» / "list your skills" into a complete, readable list of the session's available skills, printed in chat. The chat message is the only deliverable — no files are created, nothing is saved.

The model auto-loads this skill when the user asks what skills exist, wants the full list, or asks which skill fits a task; the user can also trigger it directly with `/skills-list`.

**Language rule:** this body is English; the chat output is in the user's language.

**When to use:** the user asks for the skill list, the catalog, or which skill fits a task. It only reads the session catalog — it does not create, fix, or edit skills (that is the `skill-creator` skill's job).

**Process:**

1. **Read** the session's available-skills catalog from the session context (the `<available_skills>` list the harness injects at session start). If it is not in context, recover it with `glob` over the skill roots — `/root/.dsh/skills/*/SKILL.md`, `<workspace>/.dsh/skills/*/SKILL.md`, `<workspace>/.agents/skills/*/SKILL.md` — and `read` each file's frontmatter for `name` and `description`.
2. **Build** one entry per skill: `**name**` — a faithful one-or-two-line essence of the frontmatter `description` (keep its trigger phrases), then the invocation form `/name`.
3. **Sort** the entries alphabetically by name, count them, and lead the message with the count ("N skills available" / «N скиллов доступно»).
4. **Post** the list in chat as a Markdown bullet list. Write nothing to disk — no `write`, no `edit`, no `present`.
5. **Filter on request:** if the user asks about a capability («что у тебя для диаграмм?»), list only the matching skills with one line each on why they matched, and keep the total count for context.

**Verification (before sending):**

- Every catalog skill appears exactly once; names are verbatim from the catalog (kebab-case, lowercase).
- Descriptions are faithful to each frontmatter — no invented capabilities.
- The count line equals the number of entries.
- Nothing was written to disk; the deliverable is the chat message itself.

**Quality bar:** complete (nothing silently dropped), verbatim names, honest descriptions, chat-only output.
