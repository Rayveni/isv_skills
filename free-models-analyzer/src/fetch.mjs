/**
 * Fetcher with retry, timeout, and on-disk cache.
 *
 * Cache layout (under --cache-dir, default <skill>/data/cache):
 *   <source-id>.json   { fetchedAt, url, status, contentType, body }
 *
 * A cached entry is fresh when age < cacheTtlHours. `--offline` forces
 * cache-only mode; a missing or stale cache is reported per-source and
 * never aborts the whole run.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_UA = 'free-models-analyzer/2.0 (+skill: free-models-analyzer)';

export class FetchError extends Error {
  constructor(sourceId, url, cause) {
    super(`[${sourceId}] fetch failed: ${url} — ${cause.message}`);
    this.sourceId = sourceId;
    this.url = url;
    this.cause = cause;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson(source, defaults, cacheDir) {
  const {
    timeoutMs = defaults.timeoutMs,
    retries = defaults.retries,
    retryBaseMs = defaults.retryBaseMs,
  } = source;
  const url = source.url;
  const cacheFile = path.join(cacheDir, `${source.id}.json`);

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': DEFAULT_UA,
            Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
          },
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();
      await mkdir(cacheDir, { recursive: true });
      await writeFile(
        cacheFile,
        JSON.stringify({
          fetchedAt: new Date().toISOString(),
          url,
          status: response.status,
          contentType,
          body,
        }),
        'utf8',
      );
      return { body, contentType, cached: false, fetchedAt: new Date().toISOString() };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryBaseMs * 2 ** attempt);
      }
    }
  }
  // All retries failed: fall back to a stale cache if one exists.
  try {
    const cached = JSON.parse(await readFile(cacheFile, 'utf8'));
    return {
      body: cached.body,
      contentType: cached.contentType,
      cached: true,
      fetchedAt: cached.fetchedAt,
      staleBecause: lastError.message,
    };
  } catch {
    throw new FetchError(source.id, url, lastError);
  }
}

/** Read a cached entry without any network access. */
export async function readCached(sourceId, cacheDir) {
  try {
    const cached = JSON.parse(await readFile(path.join(cacheDir, `${sourceId}.json`), 'utf8'));
    return {
      body: cached.body,
      contentType: cached.contentType,
      cached: true,
      fetchedAt: cached.fetchedAt,
    };
  } catch {
    return null;
  }
}

/** Age of the freshest cache entry, in hours; Infinity when no cache exists. */
export async function cacheAgeHours(sourceId, cacheDir) {
  const entry = await readCached(sourceId, cacheDir);
  if (!entry) return Infinity;
  return (Date.now() - new Date(entry.fetchedAt).getTime()) / 3_600_000;
}
