import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractOpenRouterApi, extractJsonLdItemList, extractKiloFlight } from '../src/extract.mjs';
import { normalize, selectFreeModels, isZeroPrice } from '../src/normalize.mjs';
import { parseParams } from '../src/params.mjs';
import { buildScorer, scoreAll } from '../src/rank.mjs';
import { categorize } from '../src/categorize.mjs';
import { formatContext, formatParams, renderReport } from '../src/render.mjs';

// ---------- extract.mjs ----------

test('extractOpenRouterApi parses API payload', () => {
  const body = JSON.stringify({
    data: [
      {
        id: 'vendor/model:free',
        name: 'Vendor: Model (free)',
        context_length: 1000000,
        architecture: {
          modality: 'text->text',
          input_modalities: ['text'],
          output_modalities: ['text'],
          tokenizer: 'Vendor',
        },
        pricing: { prompt: '0', completion: '0' },
        reasoning: { mandatory: false, default_enabled: true },
        supported_parameters: ['web_search'],
        description: 'A model with 100B total parameters and 10B active.',
      },
    ],
  });
  const [model] = extractOpenRouterApi(body);
  assert.equal(model.id, 'vendor/model:free');
  assert.equal(model.contextLength, 1000000);
  assert.deepEqual(model.inputModalities, ['text']);
  assert.equal(model.pricing.prompt, '0');
  assert.equal(model.supportedParameters.includes('web_search'), true);
  assert.equal(model.reasoning.default_enabled, true);
});

test('extractJsonLdItemList reads ItemList blocks', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"ItemList","itemListElement":[{"@type":"ListItem","name":"vendor/model","position":1,"url":"https://example.com/vendor/model"}]}</script>`;
  const items = extractJsonLdItemList(html);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'vendor/model');
  assert.equal(items[0].url, 'https://example.com/vendor/model');
});

test('extractJsonLdItemList handles @graph wrappers (Kilo)', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Kilo"},{"@type":"ItemList","itemListElement":[{"name":"NVIDIA: Nemotron 3 Ultra (free)","url":"https://kilo.ai/models/nemotron"}]}]}</script>`;
  const items = extractJsonLdItemList(html);
  assert.equal(items.length, 1);
  assert.match(items[0].name, /Nemotron 3 Ultra/);
});

test('extractKiloFlight decodes flight payload chunks', () => {
  // Flight chunk contains an escaped JSON-LD ItemList.
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [
      { name: 'inclusionAI: Ling 3.1 Flash (new)', url: 'https://kilo.ai/models/ling' },
    ],
  });
  const chunk = `self.__next_f.push([1,"${ld.replace(/"/g, '\\"')}"])</script>`;
  const items = extractKiloFlight(chunk);
  assert.equal(items.length, 1);
  assert.match(items[0].name, /Ling 3\.1 Flash/);
});

// ---------- params.mjs ----------

test('parseParams handles "X active out of Y total"', () => {
  const p = parseParams('NVIDIA Nemotron 3 Ultra ... with 55B active parameters out of 550B total (MoE).');
  assert.equal(p.totalParams, 550);
  assert.equal(p.activeParams, 55);
  assert.equal(p.isMoE, true);
});

test('parseParams handles "120B-parameter ... activating 12B"', () => {
  const p = parseParams('Nemotron 3 Super is a 120B-parameter open hybrid MoE model, activating just 12B parameters.');
  assert.equal(p.totalParams, 120);
  assert.equal(p.activeParams, 12);
});

test('parseParams handles "B-A B" MoE notation', () => {
  const p = parseParams('Laguna XS 2.1 is in the 33B-A3B category.');
  assert.equal(p.totalParams, 33);
  assert.equal(p.activeParams, 3);
});

test('parseParams handles dense models', () => {
  const p = parseParams('Gemma 4 31B Instruct is a 30.7B dense multimodal model.');
  assert.equal(p.totalParams, 30.7);
  assert.equal(p.activeParams, null);
});

test('parseParams returns nulls for empty descriptions', () => {
  const p = parseParams('');
  assert.equal(p.totalParams, null);
  assert.equal(p.activeParams, null);
});

// ---------- normalize.mjs ----------

test('isZeroPrice accepts only explicit zeros', () => {
  assert.equal(isZeroPrice({ prompt: '0', completion: '0' }), true);
  assert.equal(isZeroPrice({ prompt: '0.0000003', completion: '0' }), false);
  assert.equal(Boolean(isZeroPrice(null)), false);
});

test('selectFreeModels filters paid, routers, per-request', () => {
  const mk = (id, opts = {}) => normalize({
    id,
    pricing: opts.pricing ?? { prompt: '0', completion: '0' },
    tokenizer: opts.tokenizer ?? 'Other',
    description: opts.description ?? '',
    name: opts.name ?? id,
  }, { providers: {}, models: {} });
  const models = [
    mk('vendor/free-model:free'),
    mk('vendor/paid-model', { pricing: { prompt: '0.0000003', completion: '0' } }),
    mk('vendor/router', { tokenizer: 'Router' }),
    mk('vendor/music', { description: 'Full songs are priced at $0.08 per song.' }),
  ];
  const { free, excluded } = selectFreeModels(models);
  assert.deepEqual(free.map((m) => m.id), ['vendor/free-model:free']);
  assert.equal(excluded.length, 3);
  // Order: paid first, then router, then per-request — but
  // assert by content, not index.
  assert.ok(excluded.some((e) => /not free/.test(e.reason)), 'paid model excluded');
  assert.ok(excluded.some((e) => /aggregator router/.test(e.reason)), 'router excluded');
  assert.ok(excluded.some((e) => /per request/.test(e.reason)), 'per-request excluded');
});

// ---------- rank.mjs ----------

test('scorer produces 0-100 and ranks bigger models higher', () => {
  const config = {
    weights: {
      activeParams: 35, context: 15, reasoning: 15, coding: 15,
      agentic: 8, multimodal: 7, audio: 3, video: 2,
    },
    longContextThreshold: 512000,
    tieBreaker: 'name',
  };
  const models = [
    { id: 'small', name: 'small', activeParams: 3, contextLength: 65536, tags: [], inputModalities: [], outputModalities: [] },
    { id: 'big', name: 'big', activeParams: 55, contextLength: 1000000, tags: ['reasoning', 'coding', 'agentic'], inputModalities: [], outputModalities: [] },
  ];
  const scored = scoreAll(models, config);
  assert.equal(scored[0].id, 'big');
  assert.ok(scored[0].score > 0 && scored[0].score <= 100);
  assert.ok(scored[0].score > scored[1].score);
  // Every weight contributes; check parts exist
  assert.deepEqual(Object.keys(scored[0].scoreParts).sort(), [
    'activeParams', 'agentic', 'audio', 'coding', 'context', 'multimodal', 'reasoning', 'video',
  ]);
});

// ---------- categorize.mjs ----------

test('categorize assigns by rules, not name lists', () => {
  const sectionsConfig = {
    sections: [
      { id: 'long', title: 'Long', rule: { minContextTokens: 512000 }, limit: 10 },
      { id: 'vision', title: 'Vision', rule: { anyInputModality: ['image'] }, limit: 10 },
      { id: 'coding', title: 'Coding', rule: { anyTag: ['coding'] }, limit: 10 },
    ],
  };
  const models = [
    { id: 'a', name: 'a', contextLength: 1000000, inputModalities: [], tags: [] },
    { id: 'b', name: 'b', contextLength: 262144, inputModalities: ['image'], tags: ['coding'] },
  ];
  const assignments = categorize(models, sectionsConfig);
  assert.deepEqual(assignments.get('long').map((m) => m.id), ['a']);
  assert.deepEqual(assignments.get('vision').map((m) => m.id), ['b']);
  assert.deepEqual(assignments.get('coding').map((m) => m.id), ['b']);
});

// ---------- render.mjs ----------

test('formatContext renders K/M suffixes', () => {
  assert.equal(formatContext(262144), '262K');
  assert.equal(formatContext(1000000), '1M');
  assert.equal(formatContext(1048576), '1M');
  assert.equal(formatContext(null), '—');
});

test('formatParams renders MoE and unknown', () => {
  assert.equal(formatParams({ totalParams: 550, activeParams: 55, isMoE: true }), '550B / 55B active / MoE');
  assert.equal(formatParams({ totalParams: null, activeParams: null, isMoE: false }), '—');
});

test('renderReport includes empty sections explicitly', () => {
  const sectionsConfig = {
    sections: [
      { id: 'empty', title: 'Empty Section', rule: { anyTag: ['nonexistent'] }, limit: 10 },
    ],
  };
  const report = renderReport({
    models: [],
    assignments: categorize([], sectionsConfig),
    sectionsConfig,
    sourcesConfig: { sources: [{ id: 'openrouter', url: 'https://x' }] },
    excluded: [],
    generatedAt: '2026-01-01T00:00:00Z',
  });
  assert.match(report, /## Empty Section/);
  assert.match(report, /Нет бесплатных моделей/);
});
