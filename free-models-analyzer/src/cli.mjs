#!/usr/bin/env node
/**
 * free-models-analyzer CLI.
 *
 * Pipeline: fetch (with cache/retries) → extract → merge →
 * normalize + free-filter → score → categorize → render → write.
 *
 * Usage:
 *   node src/cli.mjs [--out report.md] [--cache-dir DIR] [--offline]
 *                    [--sources source1,source2] [--json]
 *
 * Exit codes: 0 success (even if some sources failed),
 *             2 all sources failed and no cache available.
 */

import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchJson, readCached } from './fetch.mjs';
import { getExtractor } from './extract.mjs';
import { normalize, selectFreeModels } from './normalize.mjs';
import { scoreAll } from './rank.mjs';
import { categorize } from './categorize.mjs';
import { renderReport } from './render.mjs';

const SKILL_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const args = { out: 'report_free_models_ru.md' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];
    switch (arg) {
      case '--out': args.out = value; i += 1; break;
      case '--cache-dir': args.cacheDir = value; i += 1; break;
      case '--skill-root': args.skillRoot = value; i += 1; break;
      case '--sources': args.sources = value.split(','); i += 1; break;
      case '--json': args.json = true; break;
      case '--offline': args.offline = true; break;
      case '--help': args.help = true; break;
      default:
        if (arg.startsWith('--')) {
          console.error(`unknown option: ${arg}`);
          process.exitCode = 64;
        }
    }
  }
  return args;
}

async function loadJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function slugify(text) {
  // Hyphen/space-insensitive comparison slug, but hyphens are kept
  // as segment separators: "Dots3-Note Preview" → "dots3-note-preview",
  // "deepseek-v4.1-flash" → "deepseek-v4-1-flash".
  // Provider prefixes ("nvidia/", "NVIDIA: ") and variant
  // suffixes (:free, :batch, -free, -new) are stripped so
  // that a listing and a model id compare equal.
  return text
    .replace(/\s*\(.*?\)\s*/g, ' ')
    // Provider prefix: letters and spaces before the first
    // "/" or ":" — must not cross hyphens, or it would
    // eat "nemotron-3-ultra" from "nemotron-...:free".
    .replace(/^[a-z ]+[:/]/gi, '')
    .toLowerCase()
    .replace(/:[a-z]+$/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-free$|-new$|-batch$/, '');
}

/**
 * Corroborate the OpenRouter fact base with HTML listings.
 *
 * Orca and Kilo are provider catalogs, not free-model sources:
 * they carry no pricing. A listing corroborates an OpenRouter
 * model only on a strong slug match (equal, or one is a version
 * prefix of the other). Weak matches and unmatched listings are
 * dropped — they say nothing about free status.
 *
 * Returns { merged, verifiable }.
 */
function merge(factBase, listings) {
  const merged = factBase.map((m) => ({ ...m, sources: ['openrouter'] }));
  const verifiable = [];
  const seen = new Set();

  for (const listing of listings) {
    const slug = slugify(listing.name ?? listing.id);
    if (slug.length < 8) continue;
    const key = `${listing.source}:${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // All models whose slug strongly matches the listing.
    const candidates = merged.filter((m) =>
      strongMatch(slug, slugify(m.id.split('/')[1] ?? m.id)),
    );
    // Listings come from free-model pages: prefer the
    // ":free" variant when a model has both paid and free
    // editions (e.g. nemotron-3-ultra-550b-a55b:free).
    const hit = candidates.find((m) => m.id.endsWith(':free')) ?? candidates[0];
    if (hit) {
      if (!hit.sources.includes(listing.source)) hit.sources.push(listing.source);
      hit.url ??= listing.url ?? null;
      verifiable.push({ source: listing.source, name: listing.name, matched: hit.id });
    }
  }
  return { merged, verifiable };
}

/** Strong slug equality modulo version/size suffixes. */
function strongMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [long, short] = a.length >= b.length ? [a, b] : [b, a];
  // 1) A listing that names a model but omits its size/version
  //    ("nemotron-3-ultra" vs "nemotron-3-ultra-550b-a55b")
  //    is still the same model — but only when the leftover
  //    is a pure size/version fragment (digits, dots, hyphens,
  //    and the "a" of active params). No words, or it is a
  //    different model.
  if (long.startsWith(short)) {
    const extra = long.slice(short.length).replace(/^[-.]/, '');
    if (extra === '') return true;
    if (extra.length > 16) return false;
    // Size/version fragment: digits, dots, hyphens, and the
    // "b"/"a" of MoE notation ("550b-a55b"). No other words.
    return /^[\d.a-b-]+$/i.test(extra) && /\d/.test(extra);
  }
  // 2) Digit-placement variants: "dots3-note-preview" vs
  //    "dots-3-note-preview" collapse to the same slug once
  //    digits and redundant hyphens are removed. This is
  //    equality, not fuzzy matching — a different model name
  //    will not collapse to the same string.
  const stripDigits = (s) => s.replace(/\d/g, '');
  const collapse = (s) => stripDigits(s).replace(/-+/g, '-').replace(/^-|-$/g, '');
  return collapse(a) === collapse(b);
}

function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i];
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev.length = 0;
    prev.push(...curr);
  }
  return prev[b.length];
}

/** Group exclusion reasons: "650 models: not free (paid per-token pricing)". */
function groupExclusions(excluded) {
  const groups = new Map();
  for (const item of excluded) {
    const key = item.reason;
    const group = groups.get(key) ?? { ids: [], reason: item.reason };
    group.ids.push(item.id);
    groups.set(key, group);
  }
  return [...groups.values()].map((g) => ({
    ids: g.ids,
    count: g.ids.length,
    reason: g.reason,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('usage: node src/cli.mjs [--out FILE] [--cache-dir DIR] [--offline] [--sources a,b] [--json]');
    return;
  }
  const skillRoot = args.skillRoot ?? SKILL_ROOT;
  const cacheDir = args.cacheDir ?? path.join(skillRoot, 'data', 'cache');

  const sourcesConfig = await loadJson(path.join(skillRoot, 'config', 'sources.json'));
  const sectionsConfig = await loadJson(path.join(skillRoot, 'config', 'sections.json'));
  const rankingConfig = await loadJson(path.join(skillRoot, 'config', 'ranking.json'));
  const curated = await loadJson(path.join(skillRoot, 'config', 'curated.json'));

  const wanted = new Set(args.sources ?? sourcesConfig.sources.map((s) => s.id));
  const sourceResults = [];
  const factRecords = [];
  const listings = [];

  for (const source of [...sourcesConfig.sources].sort((a, b) => a.priority - b.priority)) {
    if (!wanted.has(source.id)) continue;
    if (source.kind === 'unsupported') {
      sourceResults.push({ source: source.id, status: 'unsupported', note: source.note });
      continue;
    }
    let body;
    let fetchedAt;
    let cached = args.offline;
    let staleNote = null;
    if (args.offline) {
      const entry = await readCached(source.id, cacheDir);
      if (!entry) {
        sourceResults.push({ source: source.id, status: 'miss', note: 'no cache entry and --offline requested' });
        continue;
      }
      body = entry.body;
      fetchedAt = entry.fetchedAt;
    } else {
      try {
        const result = await fetchJson(source, sourcesConfig.defaults, cacheDir);
        body = result.body;
        fetchedAt = result.fetchedAt;
        cached = result.cached;
        if (result.staleBecause) {
          staleNote = result.staleBecause;
        }
      } catch (error) {
        sourceResults.push({ source: source.id, status: 'error', note: error.message });
        continue;
      }
    }
    try {
      const records = getExtractor(source.kind)(body);
      for (const record of records) record.source = source.id;
      if (source.kind === 'openrouter_api') factRecords.push(...records);
      else listings.push(...records.map((r) => ({ ...r, source: source.id })));
      sourceResults.push({
        source: source.id,
        status: staleNote ? 'stale-cache' : (cached ? 'cached' : 'ok'),
        records: records.length,
        fetchedAt,
        ...(staleNote ? { note: staleNote } : {}),
      });
    } catch (error) {
      sourceResults.push({ source: source.id, status: 'parse-error', note: error.message });
    }
  }

  if (factRecords.length === 0) {
    console.error('fatal: no structured model data (OpenRouter API) available');
    process.exitCode = 2;
    return;
  }

  const { merged, verifiable } = merge(factRecords, listings);
  const normalized = merged.map((raw) => normalize(raw, curated));
  const { free, excluded } = selectFreeModels(normalized);
  // Group paid exclusions by reason so the appendix stays readable
  // (the OpenRouter catalog is mostly paid models).
  const excludedGroups = groupExclusions(excluded);
  const scored = scoreAll(free, rankingConfig);
  const assignments = categorize(scored, sectionsConfig);

  const generatedAt = new Date().toISOString();
  const report = renderReport({
    models: scored,
    assignments,
    sectionsConfig,
    sourcesConfig,
    excluded: excludedGroups,
    generatedAt,
  });

  if (args.json) {
    const output = {
      generatedAt,
      sources: sourceResults,
      models: scored.map((m) => ({
        id: m.id, name: m.name, provider: m.provider, score: m.score,
        contextLength: m.contextLength, activeParams: m.activeParams,
        totalParams: m.totalParams, isMoE: m.isMoE,
        inputModalities: m.inputModalities, outputModalities: m.outputModalities,
        reasoning: m.reasoning, tags: m.tags, sources: m.sources,
      })),
      excluded: excludedGroups,
      verifiable,
    };
    await writeJson(args.out, JSON.stringify(output, null, 2));
    console.log(`JSON written to ${args.out} (${scored.length} free models)`);
    return;
  }

  await writeJson(args.out, report);
  const excludedCount = excludedGroups.reduce((sum, g) => sum + g.count, 0);
  console.log(`Report written to ${args.out}`);
  console.log(`Free models: ${scored.length}; excluded: ${excludedCount}`);
  for (const result of sourceResults) {
    console.log(`  source ${result.source}: ${result.status}${result.records != null ? ` (${result.records} records)` : ''}${result.note ? ` — ${result.note}` : ''}`);
  }
}

async function writeJson(target, content) {
  await mkdir(path.dirname(path.resolve(target)), { recursive: true });
  const tmp = `${target}.tmp-${process.pid}`;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
