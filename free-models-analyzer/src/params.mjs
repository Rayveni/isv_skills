/**
 * Parameter extraction from model descriptions.
 *
 * Handles the phrasings actually used by OpenRouter descriptions:
 *   "55B active parameters out of 550B total"
 *   "120B-parameter ... activating just 12B parameters"
 *   "33B-A3B category"
 *   "30.7B dense multimodal model"
 *   "25.2B total parameters, only 3.8B activate per token"
 *
 * Ordering matters: the most specific patterns run first so a
 * generic "N B" never shadows an explicit total/active pair.
 * Returns nulls when nothing matches — the report shows "—"
 * rather than a guessed number.
 */

const MOE_RE = /\bMoE\b|mixture[- ]of[- ]experts/i;
// "120B-A12B" / "33B-A3B" MoE notation
const MOE_A_RE = /(\d+(?:[.,]\d+)?)\s*B\s*[-–]?\s*A\s*(\d+(?:[.,]\d+)?)\s*B/i;
// "X active parameters out of Y total" / "Y total, X active"
const ACTIVE_OUT_OF_RE = /(\d+(?:[.,]\d+)?)\s*B\s*(?:active|activating|activates)/i;
// "Y total parameters" / "Y-parameter" (explicit total markers)
const TOTAL_RE = /(\d+(?:[.,]\d+)?)\s*B\s*[-–]?\s*(?:parameter|param|total)/i;
// "activating just 12B" / "only 3.8B activate" (active after verb)
const ACTIVE_VERB_RE = /(?:activating|activates|only)\s+(?:just\s+)?(\d+(?:[.,]\d+)?)\s*B/i;
// last-resort: first standalone "N.B" / "NB" mention
const ANY_B_RE = /(\d+(?:[.,]\d+)?)\s*B\b/i;

export function parseParams(description) {
  if (!description) return { totalParams: null, activeParams: null, isMoE: false };
  const isMoE = MOE_RE.test(description);
  let total = null;
  let active = null;

  // 1) "33B-A3B" notation — most specific.
  const moE = description.match(MOE_A_RE);
  if (moE) {
    total = Number(moE[1]);
    active = Number(moE[2]);
  }

  // 2) Explicit total markers ("120B-parameter", "550B total").
  if (total == null) {
    const totalMatch = description.match(TOTAL_RE);
    if (totalMatch) total = Number(totalMatch[1]);
  }

  // 3) Active markers. Prefer the "X active ... out of Y total"
  //    phrasing, then verb forms.
  if (active == null) {
    const activeMatch = description.match(ACTIVE_OUT_OF_RE);
    if (activeMatch) active = Number(activeMatch[1]);
    else {
      const verbMatch = description.match(ACTIVE_VERB_RE);
      if (verbMatch) active = Number(verbMatch[1]);
    }
  }

  // 4) If we only have an active value, the total may appear
  //    after "out of".
  if (total == null && active != null) {
    const outOf = description.match(/out of\s+(\d+(?:[.,]\d+)?)\s*B/i);
    if (outOf) total = Number(outOf[1]);
  }

  // 5) Last resort for dense models: "30.7B dense", "31B dense
  //    multimodal". Prefer a size followed by a kind word over a
  //    bare integer in the model name.
  if (total == null && active == null) {
    const dense = description.match(/(\d+(?:[.,]\d+)?)\s*B\s+(?:dense|multimodal|LLM|model)\b/i);
    const any = description.match(ANY_B_RE);
    if (dense) total = Number(dense[1]);
    else if (any) total = Number(any[1]);
  }

  return { totalParams: total, activeParams: active, isMoE };
}
