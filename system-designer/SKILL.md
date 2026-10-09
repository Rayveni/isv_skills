---
name: system-designer
description: "System design from an explicitly specified requirements file: choose approach/architecture, evaluate alternatives, ask clarifying questions when needed, and — only after final confirmation — save a structured Russian Markdown design document. Triggers (ru): «системный дизайн», «спроектируй систему», «выбери архитектуру», «оцени альтернативы», «спроектируй по файлу требований», «сделай дизайн по ТЗ». Triggers (en): \"system design\", \"design architecture\", \"choose architecture\", \"evaluate alternatives\", \"design from requirements file\"."
---

# System Designer

This skill turns an explicitly specified requirements file (e.g., the output of `requirements-analyzer`) into a system design: it selects an approach/architecture, evaluates alternatives, and — only after the user's final confirmation — saves a structured Markdown document in Russian.

**Language rule:** this skill file itself is in English. The user-facing interview and the generated design document are in Russian (the user's language) — the template `templates/system-design.md` stays in Russian.

## When to use

- The user explicitly names a requirements file (path) and asks for a system design.
- An architecture/approach must be chosen and alternatives compared.
- The design must be confirmed before anything is written to disk.

## Process

### 1. Reading the requirements
The requirements source is an explicitly specified file. If the user did not name a file, ask for its path before anything else. If a file is named, read it entirely (read) — never guess its content.

Extract from it: goals and success criteria, scope (in/out), functional and non-functional requirements (FR/NFR with IDs), constraints, integrations, volumes/load, risks. Keep the IDs — design decisions will cite them.

### 2. Clarification interview (only if needed)
If the requirements leave gaps that block architecture decisions, ask up to 8 key questions in one `ask_user_question` call. Priority:

1. Expected load and data volumes (RPS, storage growth, peak/regular ratio)?
2. Availability target (SLA) and acceptable downtime?
3. Consistency model: strong vs. eventual consistency?
4. Latency requirements (p95/p99, per operation)?
5. Deployment constraints: cloud/on-prem, regions, multi-zone?
6. Team skills and preferred/forbidden tech stack?
7. Budget limits (infrastructure, licenses, ops)?
8. Security/compliance constraints (auth model, GDPR, audit)?

If the user asks for "no questions" — skip the interview and state every gap as an assumption or open question in the document.

### 3. Candidate architectures
Propose 2–3 viable candidate approaches (e.g., monolith vs. microservices, SQL vs. NoSQL, sync request/response vs. event-driven, managed vs. self-hosted). Derive evaluation criteria from the requirements (scalability, latency, availability, complexity/operability, cost, time-to-market, team fit, constraints compliance) and score every candidate against the same criteria.

### 4. Selection and trade-offs
Pick one approach. Record why it wins, which alternatives were rejected and why, and which trade-offs are accepted ("we accept X to get Y"). Every decision must trace back to requirements (FR/NFR IDs and constraints) — no unjustified preferences.

### 5. Final confirmation
Before writing the file, present to the user: the chosen architecture, rejected alternatives (one line each), key trade-offs, and open questions. Ask for explicit confirmation via `ask_user_question` (confirm / adjust). Do not write the file without it.

### 6. Document generation
Fill the template `templates/system-design.md`. Rules:
- Output in Russian.
- Invent nothing: only confirmed facts from the requirements file, explicitly marked assumptions, and noted gaps.
- Cite the requirement/constraint each decision serves (e.g., "для NFR-02").
- Diagrams: pick the notation by destination.
  - Text diagram (```text block): when the document is plain Markdown / README / chat and the picture is simple (under ~40 elements, no formal notation) — draw an aligned `text` block per the `text-diagrams` skill, validate it with `text-diagrams/scripts/check.mjs`, and agree on it in chat before it lands in the document.
  - PlantUML (`.puml` + rendered image): when a formal notation (UML) or a polished, printable picture is needed — follow the `plantuml` skill conventions.
  Either kind is added only after the user confirms the design.
- Filename: `system-design.md` in the current working directory (or `<project>-system-design.md` if the project is named).
- Save (write) and show the file to the user via `present`.

## Quality

- Each architectural decision is justified by a requirement or constraint.
- The alternatives comparison is a table: same criteria, all candidates, no empty cells.
- Trade-offs are stated explicitly, not hidden.
- The document is self-sufficient: an engineer or model receiving the file can proceed without the chat history.
