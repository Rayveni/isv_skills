/**
 * Normalize raw records into the canonical model schema and apply the
 * "actually free" filter.
 *
 * Canonical model:
 * {
 *   id, provider, name, source, url,
 *   contextLength, inputModalities, outputModalities,
 *   totalParams, activeParams, isMoE,
 *   reasoning: { mandatory, defaultEnabled, efforts },
 *   supportsWebSearch, isRouter,
 *   description,
 *   free: { perToken: boolean, notes }
 * }
 *
 * Free rule: prompt == "0" AND completion == "0" (per-token). Models billed
 * per request (e.g. music generation at $0.08/song) and aggregator routers
 * (openrouter/free) are excluded — they are not free-text-inference models.
 */

import { parseParams } from './params.mjs';

export function isZeroPrice(pricing) {
  return (
    pricing
    && String(pricing.prompt ?? '').trim() === '0'
    && String(pricing.completion ?? '').trim() === '0'
  );
}

export function isPerRequestBilled(model) {
  // Music/video models price per song/clip even when per-token price is 0.
  const text = `${model.description ?? ''} ${model.name ?? ''}`.toLowerCase();
  return /priced at \$|per song|per clip|per request/i.test(text);
}

export function normalize(raw, curated) {
  const provider = raw.id.split('/')[0];
  const curatedEntry = curated?.models?.[raw.id] ?? {};
  const description = raw.description ?? '';
  const reasoning = raw.reasoning ?? null;

  return {
    id: raw.id,
    provider: curated.providers?.[provider] ?? provider,
    name: raw.name ?? raw.id,
    source: raw.source,
    sources: raw.sources ?? [raw.source ?? 'openrouter'],
    url: raw.url ?? null,
    contextLength: raw.contextLength ?? null,
    inputModalities: raw.inputModalities ?? [],
    outputModalities: raw.outputModalities ?? [],
    ...parseParams(description),
    reasoning: reasoning
      ? {
        mandatory: Boolean(reasoning.mandatory),
        defaultEnabled: Boolean(reasoning.default_enabled),
        efforts: reasoning.supported_efforts ?? null,
      }
      : null,
    supportsWebSearch: (raw.supportedParameters ?? []).includes('web_search'),
    isRouter: /router/i.test(raw.tokenizer ?? ''),
    description,
    tags: [...new Set([...(curatedEntry.tags ?? [])])],
    strengthsRu: curatedEntry.strengths_ru ?? null,
    free: {
      perToken: isZeroPrice(raw.pricing),
      perRequestBilled: isPerRequestBilled(raw),
      notes: [],
    },
  };
}

/**
 * Free-model predicate with explicit exclusion notes.
 * Router models (e.g. openrouter/free) are excluded: they select among
 * other free models rather than being a model themselves.
 */
export function selectFreeModels(models) {
  const free = [];
  const excluded = [];
  for (const model of models) {
    if (!model.free.perToken) {
      excluded.push({ id: model.id, reason: 'not free (paid per-token pricing)' });
    } else if (model.isRouter) {
      excluded.push({ id: model.id, reason: 'aggregator router, not a model' });
    } else if (model.free.perRequestBilled) {
      excluded.push({ id: model.id, reason: 'billed per request (song/clip), not per token' });
    } else {
      free.push(model);
    }
  }
  return { free, excluded };
}
