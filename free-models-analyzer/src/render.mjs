/**
 * Report renderer: canonical models → Russian Markdown report.
 *
 * Layout:
 *   # Анализ бесплатных AI-моделей
 *   metadata block (generated at, sources, freshness, counts)
 *   per-section tables sorted by power score
 *   excluded-models appendix (why a source entry was dropped)
 *   scoring methodology note
 */

export function formatContext(tokens) {
  if (tokens == null) return '—';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

export function formatParams(model) {
  const bits = [];
  if (model.totalParams != null) bits.push(`${model.totalParams}B`);
  if (model.activeParams != null) bits.push(`${model.activeParams}B active`);
  if (model.isMoE) bits.push('MoE');
  return bits.length ? bits.join(' / ') : '—';
}

export function strengthsRu(model) {
  if (model.strengthsRu) return model.strengthsRu;
  // Auto-derived fallback so uncurated models still get a useful cell.
  const bits = [];
  if (model.reasoning?.mandatory || model.reasoning?.defaultEnabled) bits.push('рассуждения');
  if (model.tags.includes('coding')) bits.push('код');
  if (model.inputModalities.includes('image')) bits.push('видение');
  if (model.inputModalities.includes('audio')) bits.push('аудио-вход');
  if (model.inputModalities.includes('video')) bits.push('видео-вход');
  if (model.supportsWebSearch) bits.push('веб-поиск');
  return bits.length ? bits.join(', ') : 'универсальная';
}

function table(models) {
  const lines = [
    '| Model | Provider | Source | Context Window | Model Params | Strengths | Power |',
    '|-------|----------|--------|----------------|--------------|-----------|-------|',
  ];
  for (const m of models) {
    const sources = (m.sources ?? ['openrouter']).join(', ');
    lines.push(
      `| ${m.name} | ${m.provider} | ${sources} | ${formatContext(m.contextLength)} | `
      + `${formatParams(m)} | ${strengthsRu(m)} | ${m.score.toFixed(1)} |`,
    );
  }
  return lines.join('\n');
}

export function renderReport({ models, assignments, sectionsConfig, sourcesConfig, excluded, generatedAt }) {
  const lines = [];
  lines.push('# Анализ бесплатных AI-моделей', '');
  lines.push(
    `Сгенерировано: ${generatedAt}. Источники: ${sourcesConfig.sources
      .filter((s) => s.kind !== 'unsupported')
      .map((s) => `[${s.id}](${s.url})`).join(', ')}.`,
  );
  lines.push('');
  lines.push(
    `Бесплатные модели (per-token цена input и output = $0): **${models.length}**. `
    + `Исключено записей из источников: ${excluded.length} (см. приложение).`,
  );
  lines.push('');

  for (const section of sectionsConfig.sections) {
    const members = (assignments.get(section.id) ?? [])
      .slice(0, section.limit ?? Infinity)
      .sort((a, b) => b.score - a.score);
    lines.push(`## ${section.title}`, '');
    if (members.length === 0) {
      lines.push('_Нет бесплатных моделей, соответствующих критериям секции._', '');
    } else {
      lines.push(table(members), '');
    }
  }

  lines.push('---', '');
  lines.push('## Приложение: что исключено и почему', '');
  if (excluded.length === 0) {
    lines.push('_Ничего не исключено._', '');
  } else {
    for (const group of excluded) {
      if (group.count === 1) {
        lines.push(`- \`${group.ids[0]}\` — ${group.reason}`);
      } else {
        lines.push(`- **${group.count}** записей — ${group.reason}:`);
        const sample = group.ids.slice(0, 8);
        lines.push(`  ${sample.map((id) => `\`${id}\``).join(', ')}${group.ids.length > 8 ? ` … и ещё ${group.ids.length - 8}` : ''}`);
      }
    }
    lines.push('');
  }

  lines.push('## Методика скоринга', '');
  lines.push(
    'Power score (0–100) = взвешенная сумма: доля активных параметров (log-шкала), '
    + 'длина контекста (log-шкала), рассуждения, код, агентность, мультимодальность, '
    + 'аудио, видео — веса в `config/ranking.json`. Числовые факты (цены, контекст, '
    + 'модальности, параметры из описаний) берутся из источников; только сильные стороны '
    + 'и теги — из `config/curated.json`. Скоринг относительный: 100 = лучшее из '
    + 'сегодняшнего бесплатного набора.',
  );
  lines.push('');
  return lines.join('\n');
}
