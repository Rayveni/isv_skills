/**
 * Source extractors.
 *
 * Each extractor turns a raw response body into "raw model" records:
 * { source, id, name?, url?, contextLength?, pricing?, modality?,
 *   reasoning?, description? }.
 *
 * Only the OpenRouter API carries facts (pricing/context/params). The
 * HTML sources (Orca, Kilo) expose a JSON-LD ItemList of ids/names;
 * their records are matched against OpenRouter ids during merge.
 */

/**
 * Collect every ItemList in an already-parsed JSON structure,
 * including @graph-wrapped ones (Kilo uses @graph).
 */
function collectItemLists(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectItemLists(item, out);
    return out;
  }
  if (node && typeof node === 'object') {
    if (node['@type'] === 'ItemList' && Array.isArray(node.itemListElement)) {
      out.push(node);
    }
    if (Array.isArray(node['@graph'])) collectItemLists(node['@graph'], out);
  }
  return out;
}

function itemsToList(list) {
  const items = [];
  for (const item of list) {
    if (typeof item?.name !== 'string') continue;
    items.push({ id: item.name, name: item.name, url: item.url ?? null });
  }
  return items;
}

/**
 * Extract ItemLists from <script type="application/ld+json"> blocks.
 * Works for Orca (plain HTML) and for Kilo once its flight payload
 * chunks have been decoded.
 */
export function extractJsonLdItemList(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const items = [];
  for (const block of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    for (const list of collectItemLists(parsed)) {
      items.push(...itemsToList(list.itemListElement));
    }
  }
  return items;
}

/**
 * Decode Next.js flight-payload chunks (self.__next_f.push([1,"..."]))
 * and extract ItemLists from the decoded text. Kilo embeds its JSON-LD
 * inside the flight payload with JSON-escaped quotes, so a plain
 * ld+json scan finds nothing.
 */
export function extractKiloFlight(html) {
  // 1) Plain HTML JSON-LD (if any).
  const plain = extractJsonLdItemList(html);

  // 2) Flight payload chunks.
  let decoded = '';
  for (const chunk of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)\s*(?:<\/script>|$)/g)) {
    let tuple;
    try {
      tuple = JSON.parse(chunk[1]);
    } catch {
      continue;
    }
    const strings = Array.isArray(tuple)
      ? tuple.filter((part) => typeof part === 'string')
      : [];
    decoded += strings.join('');
  }
  if (!decoded) return plain;

  const items = [];
  for (const list of extractItemListsFromText(decoded)) {
    items.push(...itemsToList(list.itemListElement));
  }
  return [...plain, ...items];
}

/**
 * Find balanced-brace JSON objects containing a marker substring
 * (e.g. '"@type":"ItemList"') inside decoded flight text.
 */
function extractItemListsFromText(text) {
  const lists = [];
  let idx = 0;
  const marker = '"@type":"ItemList"';
  while ((idx = text.indexOf(marker, idx)) !== -1) {
    const start = text.lastIndexOf('{', idx);
    if (start === -1) { idx += marker.length; continue; }
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;
    for (let i = start; i < text.length; i += 1) {
      const c = text[i];
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) { idx += marker.length; continue; }
    try {
      lists.push(...collectItemLists(JSON.parse(text.slice(start, end + 1))));
    } catch {
      // not valid JSON — skip
    }
    idx = end + 1;
  }
  return lists;
}

export function extractOpenRouterApi(body) {
  const payload = JSON.parse(body);
  const models = Array.isArray(payload?.data) ? payload.data : [];
  return models.map((m) => ({
    source: 'openrouter',
    id: m.id,
    name: m.name,
    url: m.links?.canaries?.[0] ?? m.links?.repository ?? null,
    contextLength: Number.isFinite(m.context_length) ? m.context_length : null,
    pricing: m.pricing ?? null,
    inputModalities: m.architecture?.input_modalities ?? [],
    outputModalities: m.architecture?.output_modalities ?? [],
    tokenizer: m.architecture?.tokenizer ?? null,
    reasoning: m.reasoning ?? null,
    supportedParameters: m.supported_parameters ?? [],
    description: m.description ?? '',
    knowledgeCutoff: m.knowledge_cutoff ?? null,
  }));
}

export function extractUnsupported(/* body */) {
  return [];
}

const EXTRACTORS = {
  openrouter_api: extractOpenRouterApi,
  jsonld_itemlist: extractJsonLdItemList,
  kilo_flight: extractKiloFlight,
  unsupported: extractUnsupported,
};

export function getExtractor(kind) {
  const extractor = EXTRACTORS[kind];
  if (!extractor) throw new Error(`unknown source kind: ${kind}`);
  return extractor;
}
