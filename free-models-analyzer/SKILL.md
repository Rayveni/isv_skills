---
name: free-models-analyzer
description: >-
  Analyze free AI models from multiple sources (OpenRouter API, OrcaRouter,
  Kilo), filter truly free per-token models, categorize by capability via
  tag rules, rank by a documented power score, and generate a structured
  Russian Markdown report with tables. Node.js, zero dependencies.
---

## What the skill does

1. Fetches (or loads from cache) data from the sources.
2. Normalizes and filters: free = `input == $0` **and** `output == $0`
   per token. Per-request models (music at $0.04/clip) and aggregator
   routers (`openrouter/free`) are excluded.
3. Scores models with a documented formula and assigns them to sections
   by rules (tags/modalities/context), not by hardcoded name lists.
4. Renders a Russian report: tables
   `Model | Provider | Context | Params | Strengths | Power`,
   an appendix of excluded entries, and the scoring methodology.

## Sources (`config/sources.json`)

| id | kind | What it provides |
|----|------|------------------|
| openrouter | `openrouter_api` | JSON: pricing, context, modalities, reasoning — the primary factual source |
| orca | `jsonld_itemlist` | JSON-LD ItemList from HTML (model ids) — corroborates the provider list |
| kilo | `kilo_flight` | JSON-LD embedded in the Next.js flight payload (names + URLs) |
| tokenreply | `unsupported` | JS-rendered catalog without an API or embedded JSON; declared unsupported until a parser is added |

The HTML sources carry no pricing or context — they only corroborate
that a model exists at a provider; the facts come from OpenRouter.

## Structure

```
src/fetch.mjs      — HTTP with retry/timeout and a cache (ETag-like, 24h TTL)
src/extract.mjs    — extractors: openrouter_api, jsonld_itemlist, kilo_flight
src/params.mjs     — parameter extraction from descriptions (MoE "B-A", dense, "active out of total")
src/normalize.mjs  — canonical schema, free-model filter
src/rank.mjs       — power score using weights from config/ranking.json
src/categorize.mjs — tag-based section rules from config/sections.json
src/render.mjs     — Markdown report (RU)
src/cli.mjs        — orchestrator, atomic writes, --json
config/            — sources / sections / ranking / curated (strengths and tags)
data/cache/        — raw response cache
test/              — node --test
```

## Usage

```bash
cd <skill-dir>
node src/cli.mjs                        # online, writes report_free_models_ru.md
node src/cli.mjs --offline              # cache only
node src/cli.mjs --json --out models.json
node src/cli.mjs --sources openrouter,kilo
node --test "test/**/*.test.mjs"        # tests
```

Requires Node ≥ 18. No dependencies (built-in `fetch` only).

## Report contract

- Sections are defined in `config/sections.json`; each has a rule and a limit.
  If no free model matches a rule, the section renders with an explicit
  note (e.g. Web Search and Image Generation are currently empty — no
  free OpenRouter model supports web search or image output).
- Power score: relative 0–100 scale (best of the current free set);
  formula and weights live in `config/ranking.json`.
- The report always carries a generation timestamp and the source list.

## Data notes

- Free models on OpenRouter change over time; always check the report's
  generation date. `--offline` uses the cache and flags its freshness.
- Curated data lives only in `config/curated.json` (strengths, tags).
  Facts (pricing, context, parameters) are never hardcoded — they come
  from the sources, so the report cannot drift from reality.
