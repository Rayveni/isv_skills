# Stage {{N}}: {{STAGE NAME}}

> Project: {{PROJECT NAME}} · Stage {{N}} of {{TOTAL}}
> Recipient: AI model (executor) · Language: English (implementation-only)
> Self-sufficient: every fact needed for implementation is in this document — no external sources.

## 1. Goal

{{One or two sentences: what this stage produces. From the plan's stage goal.}}

**Input gate (start when):** {{previous stage's gate, or "none — first stage"}}
**Output gate (done when):** {{this stage's gate, verbatim from the plan}}

## 2. Scope for this stage

**In scope (implement):**
- {{item}}

**Out of scope (do not implement in this stage):**
- {{item — from plan scope or explicit stage exclusions}}

## 3. Work items

_Every task and subtask of the stage from the plan. Each has an ID, an acceptance criterion, and traced requirements._

### Task {{N.M}}: {{name}} — estimate {{X}}

- **Depends on:** {{task IDs or "none"}}
- **Requirements:** {{FR-…, NFR-…, CON-…}}
- **Acceptance criterion:** {{verifiable result}}

_If the task has subtasks, list them as `{{N.M.a}}` with their own acceptance criteria._

### Conditional tracks (only if the plan uses them)

_Execute only the tracks whose enable condition holds; skip the others. State the condition result before starting._

| Track | Enable condition | Work items | Acceptance |
|-------|------------------|------------|------------|
| {{e.g., DB track}} | {{e.g., profiling shows DB bottleneck}} | {{…}} | {{…}} |

## 4. Implementation context

_Only facts that change what or how the model builds. Inline everything needed — the document must stand alone._

**Environment / stack:** {{runtime, language, framework versions, where code lives}}

**Relevant requirements (full text):**

| ID | Requirement |
|----|-------------|
| {{FR-01}} | {{full requirement text}} |

**Contracts to satisfy (APIs, schemas, data models):**

{{Inlined contract content needed for this stage — endpoint shapes, DB schema, config keys, integration details}}

**Constraints:**

- {{deadline, tech constraint, regulation — only what binds this stage}}

**Confirmed facts `[CONFIRMED]`:**
- {{fact that constrains implementation}}

**Assumptions `[ASSUMPTION]`:**
- {{assumption adopted during preparation}}

## 5. Verification for this stage

- [ ] {{acceptance criterion 1 — how to check it}}
- [ ] {{acceptance criterion 2}}
- [ ] **Stage gate:** {{gate text}}

_Commands/tests to run, with expected results, if the plan or sources name them._

## 6. Open questions

| # | Question | Who answers | Blocks |
|---|----------|-------------|--------|
| Q{{n}} | {{question from the plan}} | {{role}} | {{task/section}} |

_If a question blocks the stage, stop and ask the user before implementing._
