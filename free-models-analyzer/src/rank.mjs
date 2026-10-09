/**
 * Power score.
 *
 * score = Σ weight_i · normalized_factor_i, weights from config/ranking.json.
 *
 * Numeric factors (activeParams, context) are log-scaled against the max value
 * in the current free set, so 100 means "best available today", not an absolute
 * quality claim. Boolean factors contribute their full weight when true.
 * Models without a curated/derived signal simply score lower on that factor.
 */

export function buildScorer(config) {
  const { weights, longContextThreshold = 512_000, tieBreaker = 'name' } = config;

  const logScale = (value, max) => {
    if (!Number.isFinite(value) || value == null || value <= 0 || max <= 0) return 0;
    return Math.log10(value + 1) / Math.log10(max + 1);
  };

  return function scoreModel(model, maxima) {
    const parts = {};
    parts.activeParams = weights.activeParams * logScale(model.activeParams, maxima.activeParams);
    parts.context = weights.context * logScale(model.contextLength, maxima.contextLength);
    parts.reasoning = weights.reasoning * (model.reasoning?.mandatory || model.reasoning?.defaultEnabled ? 1 : 0);
    parts.coding = weights.coding * (model.tags.includes('coding') ? 1 : 0);
    parts.agentic = weights.agentic * (model.tags.includes('agentic') ? 1 : 0);
    parts.multimodal = weights.multimodal * (model.inputModalities.includes('image') ? 1 : 0);
    parts.audio = weights.audio * (model.inputModalities.includes('audio') || model.outputModalities.includes('audio') ? 1 : 0);
    parts.video = weights.video * (model.inputModalities.includes('video') ? 1 : 0);
    const total = Object.values(parts).reduce((sum, v) => sum + v, 0);
    return { score: Math.round(total * 10) / 10, parts };
  };
}

export function scoreAll(models, config) {
  const scorer = buildScorer(config);
  const maxima = {
    activeParams: Math.max(0, ...models.map((m) => m.activeParams ?? 0)),
    contextLength: Math.max(0, ...models.map((m) => m.contextLength ?? 0)),
  };
  const scored = models.map((model) => {
    const { score, parts } = scorer(model, maxima);
    return { ...model, score, scoreParts: parts };
  });
  scored.sort((a, b) =>
    b.score - a.score
    || String(a[config.tieBreaker ?? 'name']).localeCompare(String(b[config.tieBreaker ?? 'name'])),
  );
  return scored;
}
