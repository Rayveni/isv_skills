# Анализ бесплатных AI-моделей

Сгенерировано: 2026-10-08T00:05:42.509Z. Источники: [openrouter](https://openrouter.ai/api/v1/models), [orca](https://www.orcarouter.ai/ru/models?modalityTab=text&price=free), [kilo](https://kilo.ai/landing/free-models).

Бесплатные модели (per-token цена input и output = $0): **17**. Исключено записей из источников: 3 (см. приложение).

## PlantUML Diagram Generation

| Model | Provider | Source | Context Window | Model Params | Strengths | Power |
|-------|----------|--------|----------------|--------------|-----------|-------|
| NVIDIA: Nemotron 3 Ultra (free) | NVIDIA | openrouter, kilo | 1M | 550B / 55B active / MoE | Флагманский frontier-reasoning и оркестрация, гибрид Transformer-Mamba, 550B/55B, контекст 1M | 87.9 |
| inclusionAI: Ling 3.1 Flash | InclusionAI | openrouter, kilo | 262K | 560B / 25B active / MoE | Гибридное рассуждение, крупный MoE (560B/25B), агенты и инструменты | 79.8 |
| NVIDIA: Nemotron 3 Super (free) | NVIDIA | openrouter, kilo | 262K | 120B / 12B active / MoE | Мультиагентные приложения, эффективный MoE 120B/12B | 73.8 |
| Apodex: Apodex 1.1 Mini (free) | Apodex | openrouter | 262K | — | Исследовательские и прогнозные задачи, работа с файлами, данными и кодом | 36.5 |

## Code Analysis / Technical Documentation

| Model | Provider | Source | Context Window | Model Params | Strengths | Power |
|-------|----------|--------|----------------|--------------|-----------|-------|
| NVIDIA: Nemotron 3 Ultra (free) | NVIDIA | openrouter, kilo | 1M | 550B / 55B active / MoE | Флагманский frontier-reasoning и оркестрация, гибрид Transformer-Mamba, 550B/55B, контекст 1M | 87.9 |
| inclusionAI: Ling 3.1 Flash | InclusionAI | openrouter, kilo | 262K | 560B / 25B active / MoE | Гибридное рассуждение, крупный MoE (560B/25B), агенты и инструменты | 79.8 |
| NVIDIA: Nemotron 3 Super (free) | NVIDIA | openrouter, kilo | 262K | 120B / 12B active / MoE | Мультиагентные приложения, эффективный MoE 120B/12B | 73.8 |
| Poolside: Laguna S 2.1 (free) | Poolside | openrouter, kilo | 262K | 118B / 8B active | Кодинг-агент, 118B/8B, 70.2% на Terminus | 70.6 |
| Poolside: Laguna XS 2.1 (free) | Poolside | openrouter | 262K | 33B / 3B active | Лёгкий кодинг-агент 33B/3B, быстрый итерации | 63.6 |
| Cohere: North Mini Code (free) | Cohere | openrouter | 256K | 30B / 3B active / MoE | Агентный кодинг от Cohere, разреженный MoE 30B/3B | 48.5 |
| Apodex: Apodex 1.1 Mini (free) | Apodex | openrouter | 262K | — | Исследовательские и прогнозные задачи, работа с файлами, данными и кодом | 36.5 |

## General Purpose / Reasoning

| Model | Provider | Source | Context Window | Model Params | Strengths | Power |
|-------|----------|--------|----------------|--------------|-----------|-------|
| NVIDIA: Nemotron 3 Ultra (free) | NVIDIA | openrouter, kilo | 1M | 550B / 55B active / MoE | Флагманский frontier-reasoning и оркестрация, гибрид Transformer-Mamba, 550B/55B, контекст 1M | 87.9 |
| inclusionAI: Ling 3.1 Flash | InclusionAI | openrouter, kilo | 262K | 560B / 25B active / MoE | Гибридное рассуждение, крупный MoE (560B/25B), агенты и инструменты | 79.8 |
| NVIDIA: Nemotron 3 Super (free) | NVIDIA | openrouter, kilo | 262K | 120B / 12B active / MoE | Мультиагентные приложения, эффективный MoE 120B/12B | 73.8 |
| Thinking Machines: Inkling (free) | Thinking Machines Lab | openrouter | 1M | 975B / 41B active / MoE | Открытая мультимодальная MoE 975B/41B, рассуждения с уровнями effort, контекст 1M | 72.5 |
| Thinking Machines: Inkling Small (free) | Thinking Machines Lab | openrouter | 1M | 276B / 12B active / MoE | Меньшая версия Inkling, MoE 276B/12B, мультимодальность, уровни effort | 62.3 |
| NVIDIA: Nemotron 3 Nano Omni (free) | NVIDIA | openrouter | 256K | 30B / 3B active | Omni-модель восприятия: текст, изображение, аудио, видео; 30B/3B | 52.5 |
| inclusionAI: Ling 3.0 Flash Sante (free) | InclusionAI | openrouter | 262K | 124B / 5.1B active / MoE | Доменная модель для медицины и здоровья, MoE 124B/5.1B | 44.2 |
| Apodex: Apodex 1.1 Mini (free) | Apodex | openrouter | 262K | — | Исследовательские и прогнозные задачи, работа с файлами, данными и кодом | 36.5 |
| LiquidAI: LFM2.5-2.6B (free) | Liquid AI | openrouter | 66K | 2.6B | Компактная 2.6B, обязательное рассуждение, RAG и агентные сценарии | 35.0 |
| Google: Gemma 4 31B (free) | Google DeepMind | openrouter, orca | 262K | 30.7B | Плотная мультимодальная модель 30.7B, configurable thinking, текст+изображение+видео | 22.5 |

## Long Context / Large Document Processing

| Model | Provider | Source | Context Window | Model Params | Strengths | Power |
|-------|----------|--------|----------------|--------------|-----------|-------|
| NVIDIA: Nemotron 3 Ultra (free) | NVIDIA | openrouter, kilo | 1M | 550B / 55B active / MoE | Флагманский frontier-reasoning и оркестрация, гибрид Transformer-Mamba, 550B/55B, контекст 1M | 87.9 |
| Thinking Machines: Inkling (free) | Thinking Machines Lab | openrouter | 1M | 975B / 41B active / MoE | Открытая мультимодальная MoE 975B/41B, рассуждения с уровнями effort, контекст 1M | 72.5 |
| Thinking Machines: Inkling Small (free) | Thinking Machines Lab | openrouter | 1M | 276B / 12B active / MoE | Меньшая версия Inkling, MoE 276B/12B, мультимодальность, уровни effort | 62.3 |
| Dots Studio: Dots3-Note Preview (free) | Dots Studio | openrouter, kilo | 512K | 280B / 16B active / MoE | Мультимодальная (текст+изображение), MoE 280B/16B, контекст 512K | 45.9 |
| NVIDIA: Nemotron 3.5 Lightning (free) | NVIDIA | openrouter | 1M | 30B / 3B active / MoE | Высокая пропускная способность, MoE 30B/3B, агентные нагрузки | 35.0 |

## Multimodal (Vision/Language)

| Model | Provider | Source | Context Window | Model Params | Strengths | Power |
|-------|----------|--------|----------------|--------------|-----------|-------|
| Thinking Machines: Inkling (free) | Thinking Machines Lab | openrouter | 1M | 975B / 41B active / MoE | Открытая мультимодальная MoE 975B/41B, рассуждения с уровнями effort, контекст 1M | 72.5 |
| Thinking Machines: Inkling Small (free) | Thinking Machines Lab | openrouter | 1M | 276B / 12B active / MoE | Меньшая версия Inkling, MoE 276B/12B, мультимодальность, уровни effort | 62.3 |
| NVIDIA: Nemotron 3 Nano Omni (free) | NVIDIA | openrouter | 256K | 30B / 3B active | Omni-модель восприятия: текст, изображение, аудио, видео; 30B/3B | 52.5 |
| Dots Studio: Dots3-Note Preview (free) | Dots Studio | openrouter, kilo | 512K | 280B / 16B active / MoE | Мультимодальная (текст+изображение), MoE 280B/16B, контекст 512K | 45.9 |
| Google: Gemma 4 26B A4B  (free) | Google DeepMind | openrouter, orca | 262K | 26B / 4B active / MoE | MoE 25.2B/3.8B, мультимодальность (текст+изображение+видео), эффективность | 36.5 |
| NVIDIA: Nemotron 3.5 Content Safety (free) | NVIDIA | openrouter | 128K | 4B | Guardrail-модель модерации входов и выходов, 4B на базе Gemma-3-4B | 34.7 |
| Google: Gemma 4 31B (free) | Google DeepMind | openrouter, orca | 262K | 30.7B | Плотная мультимодальная модель 30.7B, configurable thinking, текст+изображение+видео | 22.5 |

## Agentic / Tool Use

| Model | Provider | Source | Context Window | Model Params | Strengths | Power |
|-------|----------|--------|----------------|--------------|-----------|-------|
| NVIDIA: Nemotron 3 Ultra (free) | NVIDIA | openrouter, kilo | 1M | 550B / 55B active / MoE | Флагманский frontier-reasoning и оркестрация, гибрид Transformer-Mamba, 550B/55B, контекст 1M | 87.9 |
| inclusionAI: Ling 3.1 Flash | InclusionAI | openrouter, kilo | 262K | 560B / 25B active / MoE | Гибридное рассуждение, крупный MoE (560B/25B), агенты и инструменты | 79.8 |
| NVIDIA: Nemotron 3 Super (free) | NVIDIA | openrouter, kilo | 262K | 120B / 12B active / MoE | Мультиагентные приложения, эффективный MoE 120B/12B | 73.8 |
| Poolside: Laguna S 2.1 (free) | Poolside | openrouter, kilo | 262K | 118B / 8B active | Кодинг-агент, 118B/8B, 70.2% на Terminus | 70.6 |
| Poolside: Laguna XS 2.1 (free) | Poolside | openrouter | 262K | 33B / 3B active | Лёгкий кодинг-агент 33B/3B, быстрый итерации | 63.6 |
| Cohere: North Mini Code (free) | Cohere | openrouter | 256K | 30B / 3B active / MoE | Агентный кодинг от Cohere, разреженный MoE 30B/3B | 48.5 |
| Apodex: Apodex 1.1 Mini (free) | Apodex | openrouter | 262K | — | Исследовательские и прогнозные задачи, работа с файлами, данными и кодом | 36.5 |
| LiquidAI: LFM2.5-2.6B (free) | Liquid AI | openrouter | 66K | 2.6B | Компактная 2.6B, обязательное рассуждение, RAG и агентные сценарии | 35.0 |
| NVIDIA: Nemotron 3.5 Lightning (free) | NVIDIA | openrouter | 1M | 30B / 3B active / MoE | Высокая пропускная способность, MoE 30B/3B, агентные нагрузки | 35.0 |

## Web Search

_Нет бесплатных моделей, соответствующих критериям секции._

## Image Generation

_Нет бесплатных моделей, соответствующих критериям секции._

## Specialized / Safety & Domain Models

| Model | Provider | Source | Context Window | Model Params | Strengths | Power |
|-------|----------|--------|----------------|--------------|-----------|-------|
| inclusionAI: Ling 3.0 Flash Sante (free) | InclusionAI | openrouter | 262K | 124B / 5.1B active / MoE | Доменная модель для медицины и здоровья, MoE 124B/5.1B | 44.2 |
| NVIDIA: Nemotron 3.5 Content Safety (free) | NVIDIA | openrouter | 128K | 4B | Guardrail-модель модерации входов и выходов, 4B на базе Gemma-3-4B | 34.7 |

---

## Приложение: что исключено и почему

- **447** записей — not free (paid per-token pricing):
  `anthropic/claude-haiku-5.5`, `anthropic/claude-haiku-5.5:batch`, `google/gemini-nano-banana-2.1`, `mistralai/mistral-large-4-0`, `unbiased/pareto-26.10-preview`, `openai/gpt-6.1-sol-pro`, `openai/gpt-6.1-sol`, `anthropic/claude-sonnet-5.5` … и ещё 439
- **2** записей — billed per request (song/clip), not per token:
  `google/lyria-3-pro-preview`, `google/lyria-3-clip-preview`
- `openrouter/free` — aggregator router, not a model

## Методика скоринга

Power score (0–100) = взвешенная сумма: доля активных параметров (log-шкала), длина контекста (log-шкала), рассуждения, код, агентность, мультимодальность, аудио, видео — веса в `config/ranking.json`. Числовые факты (цены, контекст, модальности, параметры из описаний) берутся из источников; только сильные стороны и теги — из `config/curated.json`. Скоринг относительный: 100 = лучшее из сегодняшнего бесплатного набора.
