# Verification & Quality checklist (requirements-collector)

Run before user confirmation and before writing files. The full requirement-quality checklist and antipattern table live in references/requirements-taxonomy.md — this file is the process checklist.

## Verification (process)

- [ ] Startup questions asked: templates (multi-select) + save folder, default `./requirements`.
- [ ] All named input files read in full; nothing guessed (if input is files; when input is chat text — N/A).
- [ ] All 12 stages walked through or explicitly skipped (gaps recorded).
- [ ] Interview respected the 5-questions-per-batch limit (≤3 batches = ≤15 questions per round, or user asked to continue; the rest went to open questions).
- [ ] Edge cases handled per SKILL.md §4a (unreadable file, mass contradictions, partial passes, partial answers).
- [ ] Scope split into in/out with verifiable statements.
- [ ] Every requirement carries a classification code, unique ID, source and priority; IDs match across all generated documents.
- [ ] Every NFR has a category and a measurable metric; vague NFRs were made measurable or moved to open questions.
- [ ] Acceptance criteria are written in Given-When-Then format; user stories follow «Как <роль>, я хочу <действие>, чтобы <ценность>».
- [ ] No antipatterns (vague wording, no metric, no roles/boundaries, BR+FR mixed) — see references/requirements-taxonomy.md.
- [ ] Trace matrix present (built after AC/TC): G-01 → BR-01 → FR-01/NFR-01 → AC-01 → TC-01; every FR/NFR linked to a goal, including NFRs.
- [ ] MoSCoW grades present on every requirement (attribute, always).
- [ ] Rationale recorded for each M and each W, Must ≤ 40% of deliverables (if moscow template selected).
- [ ] Service tags use exactly `[подтверждено]` and `[предположение]` — no other spellings (no `[ASSUMPTION]`, `[подтверждение]`, etc.).
- [ ] Conflicts stated explicitly with resolution options (or as open questions).
- [ ] Document done: no open question blocks the next stage; user confirmed; checklist from references/requirements-taxonomy.md passed.
- [ ] User confirmed before writing; files saved into the chosen folder; each shown via `present`.

## Quality (result)

- Each requirement is a single verifiable statement — "done" is checkable without the chat.
- Scope has an explicit out-of-scope: unsaid ≠ included.
- The AI-context file is self-sufficient: a model receiving it must not guess context.
- Documents contain no solution research, no estimates, no task breakdown (later stages' jobs) unless the user asks.
- Open questions are concrete: each names who answers and what it blocks.
- No invented probabilities, metrics, or facts: unknowns are tagged `[предположение]` or asked about.
- Acceptance criteria use Given-When-Then; user stories use «Как <роль>, я хочу <действие>, чтобы <ценность>»; NFR uses «Система должна <свойство> при <условие> не хуже/не более <метрика>».
- Vague words («быстро», «удобно», «качественно», «гибко») without a metric are rejected and rewritten or moved to open questions.
