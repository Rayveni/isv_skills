# Risk model reference

Categories, grading, and worked examples for the risk section of every `requirements-collector` document.

## Categories

| Code | Category | Typical examples |
|---|---|---|
| TECH | Technical | unknown tech, integration complexity, performance unknowns |
| REQ | Requirements | vague wording, changing scope, conflicting stakeholders |
| ORG | Organizational/people | missing decision-maker, team availability, turnover |
| EXT | External/dependencies | third-party API, vendor, legal approval |
| DATA | Data | quality, availability, migration, sensitivity |
| SEC | Security | auth, compliance, PII handling |

## Grading

Probability (Вероятн.) and Impact (Влияние): **В** — высокая (likely, severe), **С** — средняя, **Н** — низкая.

Level = Probability × Impact:

| Probability \ Impact | В | С | Н |
|---|---|---|---|
| **В** | Критич. | Высокий | Средний |
| **С** | Высокий | Средний | Низкий |
| **Н** | Средний | Низкий | Низкий |

Sort the risk table: Критич. → Высокий → Средний → Низкий.

## Worked examples

| # | Риск | Категория | Вероятн. | Влияние  | Уровень | Митигация |
|---|------|-----------|---|---|---------|-----------|
| RISK-01 | Поставщик API не предоставляет sandbox до старта | EXT | С | В | Высокий | Запросить доступ на этой неделе; иначе — mock-сервер |
| RISK-02 | Термин «активный пользователь» не определён | REQ | В | С | Высокий | Вопрос Q-01: дать определение до проектирования |
| RISK-03 (антипример) | Нагрузка не известна | TECH | — | — | не оценён | ❌ Ставить С/С без basis нельзя. Правильно: перенести риск в открытые вопросы (Q-01) — в таблице рисков этой строки быть не должно. |

_ID format: `RISK-NN` — consistent with BR-01, FR-01, NFR-01 etc. Do not use bare `R1` or hybrids like `RISK/R-01`._

## Rules

- Every risk in the risk table has a mitigation **or** a linked open question (Q-01) that removes the uncertainty — never just a description.
- A risk without a mitigation and without a question is a gap: move it to open questions instead.
- **Grading without data:** if the user gave no basis for probability/impact, do **not** invent grades — and do not default to С/С with a `[предположение]` tag: an ungraded С/С pollutes the Средний tier and destroys the matrix's discriminative power. Instead, move the risk to open questions (Q-01) naming who must answer and what it blocks. The only exception: impact is obvious from context and solely probability is unknown — then record `Impact: В, Probability: ?`, level = не оценён, tag `[предположение]`, and still prefer a question. The risk table and the open-questions list are mutually exclusive placements: a risk lives in exactly one of them.
