#!/usr/bin/env node
// check.mjs — alignment checker for text diagrams (ASCII art).
//
// Usage:
//   node check.mjs <file>...
//   node check.mjs <file> --json
//
// Exit 0 when every text-diagram block in every file passes, 1 otherwise.
// With --json, prints a JSON report instead of human text.
//
// The checker has no notion of any diagram grammar. It validates what makes
// text diagrams *readable as text* — balanced fences, no tabs, sane width,
// box borders that close on every interior row, and at least one connector —
// and leaves all meaning to the author.

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const jsonOut = args.includes('--json');
const files = args.filter((a) => a !== '--json');

if (files.length === 0) {
  process.stderr.write('usage: node check.mjs <file>... [--json]\n');
  process.exit(2);
}

// --- glyph classes -----------------------------------------------------------

const H_CHARS = new Set('─━╌╍═-'.split(''));
const V_CHARS = new Set('│┃┆┇╎╏║╒╓╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬|'.split(''));
const TOP_LEFT = new Set('┌┍┎┏╔+'.split(''));
const BOT_LEFT = new Set('└┕┖┗╚+'.split(''));
// any corner or tee may appear inside a border run
const CORNER = new Set('┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋╌╍╎╏╔╗╚╝╠╣+'.split(''));

const ARROW_GLYPH = /[←→↑↓⇄⇅⇆⇇⇈⇉⇊⇋⇌⇍⇎⇏⇐⇑⇒⇓⇔⇕⇖⇗⇘⇙⇚⇛⇜⇝⇞⇟⇠⇡⇢⇣⇤⇥⇦⇧⇨⇩⇪⇫⇬⇭⇮⇯⇰]/;
const ASCII_ARROW = /-{1,2}>|=>|<=>|<={1,2}|\|-/;

// --- fence extraction --------------------------------------------------------

function extractBlocks(src) {
  const blocks = [];
  const lines = src.split('\n');
  let i = 0;
  while (i < lines.length) {
    const m = /^```([\w-]*)\s*$/.exec(lines[i]);
    if (!m) { i++; continue; }
    const lang = m[1];
    const body = [];
    let j = i + 1;
    let closed = false;
    while (j < lines.length) {
      if (/^\s*```\s*$/.test(lines[j])) { closed = true; break; }
      body.push(lines[j]);
      j++;
    }
    const isDiagram = lang === '' || /^(text|ascii|diagram|txt|art)$/i.test(lang);
    if (isDiagram) blocks.push({ lang, body, startLine: i + 1, closed });
    i = closed ? j + 1 : j;
  }
  return blocks;
}

// --- box detection -----------------------------------------------------------

/**
 * Width of a box border starting at column `start` of `line`.
 * A border is a left corner, then a run of horizontal/corner glyphs,
 * ending in a corner (or the line end, which also must be a corner).
 * Returns 0 when there is no well-formed closed border here.
 */
function borderWidthAt(line, start, leftSet) {
  if (!leftSet.has(line[start])) return 0;
  let w = 1;
  while (start + w < line.length && (H_CHARS.has(line[start + w]) || CORNER.has(line[start + w]))) w++;
  if (w === 1) return 0; // no horizontal segment
  const last = line[start + w - 1];
  if (!CORNER.has(last)) return 0; // border never closes
  return w;
}

/**
 * Find rectangles anywhere in the block (not just at column 0),
 * so side-by-side and nested layouts are covered.
 * Returns [{top, bottom, left, right}].
 */
function findBoxes(lines) {
  const boxes = [];
  for (let r = 0; r < lines.length; r++) {
    const top = lines[r];
    for (let c = 0; c < top.length; c++) {
      if (!TOP_LEFT.has(top[c])) continue;
      const w = borderWidthAt(top, c, TOP_LEFT);
      if (!w) continue;
      for (let r2 = r + 1; r2 < lines.length; r2++) {
        const bot = lines[r2] ?? '';
        if (!BOT_LEFT.has(bot[c] ?? '')) continue;
        if (borderWidthAt(bot, c, BOT_LEFT) !== w) continue;
        if (sidesAreVertical(lines, r, r2, c, w)) {
          boxes.push({ top: r, bottom: r2, left: c, right: c + w - 1 });
          break; // first valid bottom closes this box
        }
      }
    }
  }
  return boxes;
}

function sidesAreVertical(lines, rTop, rBot, left, w) {
  const right = left + w - 1;
  for (let rr = rTop + 1; rr < rBot; rr++) {
    const row = lines[rr] ?? '';
    const lc = row[left] ?? ' ';
    const rc = row[right] ?? ' ';
    const ok = (ch) => V_CHARS.has(ch) || ch === ' ' || ch === '\t';
    if (!ok(lc) || !ok(rc)) return false;
  }
  return true;
}

// --- per-block checks --------------------------------------------------------

function checkBlock(block) {
  const issues = [];
  const raw = block.body;
  const lines = raw.map((l) => l.replace(/\s+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();

  if (!block.closed) {
    issues.push({ severity: 'error', rule: 'unclosed-fence', message: 'opening ``` has no closing ```' });
  }
  if (lines.length === 0) {
    issues.push({ severity: 'error', rule: 'empty', message: 'diagram block is empty' });
    return { issues, meta: {} };
  }

  // tabs break alignment in every renderer
  raw.forEach((l, i) => {
    if (/\t/.test(l)) {
      issues.push({ severity: 'error', rule: 'tab', message: `line ${i + 1} contains a tab — use spaces` });
    }
  });

  const maxWidth = Math.max(...lines.map((l) => l.length));
  if (maxWidth > 120) {
    issues.push({ severity: 'warn', rule: 'too-wide', message: `widest line is ${maxWidth} chars; text diagrams wrap badly past ~100` });
  }

  const trailing = raw.findIndex((l) => /[ \t]+$/.test(l));
  if (trailing !== -1) {
    issues.push({ severity: 'warn', rule: 'trailing-space', message: `line ${trailing + 1} ends with whitespace` });
  }

  // every non-blank interior row of a detected box must close the border
  const boxes = findBoxes(lines);
  for (const b of boxes) {
    for (let rr = b.top + 1; rr < b.bottom; rr++) {
      const row = lines[rr] ?? '';
      if (!/\S/.test(row)) continue; // blank interior line
      const atBorder = row[b.right];
      if (atBorder === undefined || !V_CHARS.has(atBorder)) {
        issues.push({ severity: 'warn', rule: 'box-border', message: `line ${rr + 1} does not close the right border of the box at columns ${b.left + 1}-${b.right + 1}` });
      }
    }
  }

  const text = lines.join('\n');
  if (!ARROW_GLYPH.test(text) && !ASCII_ARROW.test(text) && !/[═║┃│|]/.test(text)) {
    issues.push({ severity: 'warn', rule: 'no-connector', message: 'no arrows or verticals found — is this a diagram or prose?' });
  }

  return { issues, meta: { lines: lines.length, width: maxWidth, boxes: boxes.length } };
}

function checkFile(path) {
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch (err) {
    return { path, error: String(err) };
  }
  const blocks = extractBlocks(src);
  return {
    path,
    blocks: blocks.map((b) => ({ startLine: b.startLine, lang: b.lang || '(bare)', ...checkBlock(b) })),
  };
}

const report = files.map(checkFile);

if (jsonOut) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  let errors = 0;
  for (const f of report) {
    if (f.error) {
      process.stdout.write(f.path + ': cannot read — ' + f.error + '\n');
      errors++;
      continue;
    }
    if (f.blocks.length === 0) {
      process.stdout.write(f.path + ': no text-diagram blocks (```text fences)\n');
      continue;
    }
    for (const b of f.blocks) {
      const where = f.path + ': block at line ' + b.startLine + ' (' + b.lang + ')';
      if (b.issues.length === 0) {
        process.stdout.write(where + ': OK — ' + b.meta.lines + ' lines, ' + b.meta.width + ' chars wide, ' + b.meta.boxes + ' box(es)\n');
      } else {
        for (const iss of b.issues) {
          if (iss.severity === 'error') errors++;
          process.stdout.write(where + ': [' + iss.severity + '] ' + iss.rule + ': ' + iss.message + '\n');
        }
      }
    }
  }
  process.exit(errors > 0 ? 1 : 0);
}
