/**
 * Tag/attribute-based section assignment.
 *
 * A model matches a section when it satisfies the section's rule
 * (see config/sections.json). Unlike the old hardcoded name lists,
 * adding a model automatically places it in every section it
 * qualifies for — and an empty section is rendered explicitly
 * instead of silently disappearing.
 */

function matchesRule(model, rule) {
  if (rule.anyTag && !rule.anyTag.some((tag) => model.tags.includes(tag))) return false;
  if (rule.preferTag && !model.tags.includes(rule.preferTag)) return false;
  if (rule.minContextTokens && (model.contextLength ?? 0) < rule.minContextTokens) return false;
  if (rule.anyInputModality && !rule.anyInputModality.some((m) => model.inputModalities.includes(m))) return false;
  if (rule.anyOutputModality && !rule.anyOutputModality.some((m) => model.outputModalities.includes(m))) return false;
  if (rule.supportsWebSearch && !model.supportsWebSearch) return false;
  return true;
}

export function categorize(models, sectionsConfig) {
  const assignments = new Map(sectionsConfig.sections.map((s) => [s.id, []]));
  for (const model of models) {
    for (const section of sectionsConfig.sections) {
      if (matchesRule(model, section.rule)) {
        assignments.get(section.id).push(model);
      }
    }
  }
  return assignments;
}

export function sectionModels(assignments, section) {
  const models = assignments.get(section.id) ?? [];
  return models.slice(0, section.limit ?? models.length);
}
