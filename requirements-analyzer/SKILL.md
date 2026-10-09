---
name: requirements-analyzer
description: "Requirements analysis for a project or task: clarifying scope boundaries (in/out of scope), identifying risks and assumptions, open questions. Produces a structured Markdown file to pass into a model. Triggers (ru): «проанализируй требования», «уточни границы задачи», «выяви риски», «собери требования», «подготовь ТЗ/спецификацию для модели». Triggers (en): \"analyze requirements\", \"clarify task scope\", \"identify risks\", \"gather requirements\", \"prepare a spec/requirements for the model\"."
---

# Requirements Analyzer

This skill turns a raw task description into a structured Markdown document, ready to be passed into a model (design, estimation, code generation).

**Language rule:** this skill file itself is in English. The user-facing interview and the generated requirements document are in Russian (the user's language) — the template `templates/requirements-analysis.md` stays in Russian.

## When to use

- The user describes a task/project and wants to capture requirements.
- Boundaries need clarifying: what is in the work and what is not.
- Risks, assumptions, and open questions must be surfaced before work starts.
- An MD file "to pass into a model" is needed as context.

## Process

### 1. Collecting input
Accept requirements in any form: chat text, file, task description. If the source is a file, read it entirely (read) — do not guess its content.

### 2. Clarification interview
If information is incomplete — ask up to 8 key questions via `ask_user_question` (group them into one call). Question priority:

1. Goal and success criteria (what does "done" mean)?
2. Who are the users / consumers of the result?
3. What exactly is **in scope**?
4. What exactly is **out of scope (boundaries, exclusions)**?
5. Constraints: technologies, deadlines, budget, regulations, security.
6. Integrations and external dependencies (APIs, systems, data).
7. Volumes and expected load (if applicable).
8. What already exists / is ready — where do we start?

If the user asks for "no questions" — skip the interview and mark the gaps as open questions in the document.

### 3. Scope analysis
Split into In-scope / Out-of-scope. Each item is a concrete, verifiable statement — no "etc.".

### 4. Risk identification
Categories: technical, requirements (uncertainty), organizational/people, external/dependencies, data, security.
Each risk: description, probability (H/M/L), impact (H/M/L), level (H×H = Critical, etc.), plus a mitigation or a question that removes the uncertainty. In the Russian output these grades are written as В/С/Н.

### 5. Assumptions and open questions
- Assumptions — what is taken without confirmation; mark them `[предположение]`.
- Confirmed facts — mark them `[подтверждено]`.
- Open questions — note who can answer and what each one blocks.

### 6. Document generation
Fill in the template `templates/requirements-analysis.md`. Rules:
- Invent nothing: only confirmed facts, marked assumptions, and explicitly noted gaps.
- Structured, no filler — the file will be context for a model.
- Filename: `requirements-analysis.md` in the current working directory (or `<project>-requirements.md` if the project is named).
- Before writing, confirm the critical conclusions (goals and boundaries) with the user — a short confirmation.
- Save the file (write) and show it to the user via `present`.

## Quality

- Each requirement is one verifiable statement.
- Risks are prioritized: critical and high first.
- The document is self-sufficient: a model that receives the file must not have to guess the context.
