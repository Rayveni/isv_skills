#!/usr/bin/env node
// PlantUML helper: encode diagram source for a PlantUML server, syntax-check it,
// and render it to SVG/PNG. No local Java or plantuml.jar is required.
//
// Usage:
//   node plantuml.mjs encode <file.puml>            # print encoded text + shareable URL
//   node plantuml.mjs check <file.puml>             # server syntax check (exit 1 on error)
//   node plantuml.mjs render <file.puml> -o out.svg # render svg/png/txt
//   node plantuml.mjs render <file.puml> -o out.png --format png --server https://www.plantuml.com/plantuml
//
// Options: --server URL | --format svg|png|txt | --no-check | --timeout MS

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { deflateRawSync } from "node:zlib";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
const DEFAULT_SERVER = "https://www.plantuml.com/plantuml";

function encode6bit(value) {
  if (value < 10) return String.fromCharCode(48 + value);
  if (value < 36) return String.fromCharCode(65 + value - 10);
  if (value < 62) return String.fromCharCode(97 + value - 36);
  return value === 62 ? "-" : "_";
}

function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return (
    ALPHABET[c1 & 0x3f] + ALPHABET[c2 & 0x3f] + ALPHABET[c3 & 0x3f] + ALPHABET[c4 & 0x3f]
  );
}

/** PlantUML text encoding: raw DEFLATE, then 6-bit packing with the PlantUML alphabet. */
export function encodePlantUml(text) {
  const data = deflateRawSync(Buffer.from(text, "utf8"), { level: 9 });
  let out = "";
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 === data.length) out += append3bytes(data[i], data[i + 1], 0);
    else if (i + 1 === data.length) out += append3bytes(data[i], 0, 0);
    else out += append3bytes(data[i], data[i + 1], data[i + 2]);
  }
  return out;
}

/** Read diagram source and require the @startuml/@enduml guard pair. */
export function readDiagram(file) {
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const problems = [];
  if (!/^\s*@start\w+/m.test(text)) problems.push("missing @startuml (or @startgantt/@startmindmap/...)");
  if (!/@end\w+\s*$/m.test(text)) problems.push("missing @enduml");
  return { text, problems };
}

/** One fetch with up to two retries on transient network/server errors. */
async function fetchWithRetry(url, init, timeoutMs, attemptsLeft) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (attemptsLeft > 0 && /fetch failed|timed? ?out|network|aborted/i.test(error?.message ?? "")) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return fetchWithRetry(url, init, timeoutMs, attemptsLeft - 1);
    }
    throw error;
  }
}

async function serverRequest(server, format, text, encoded, timeoutMs) {
  const url = `${server.replace(/\/+$/, "")}/${format}/${encoded}`;
  if (url.length <= 7000) {
    return { response: await fetchWithRetry(url, {}, timeoutMs, 2), kind: "GET url" };
  }
  // The encoded URL would be too long for a GET; the server also accepts the raw source.
  const response = await fetchWithRetry(`${server.replace(/\/+$/, "")}/${format}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: text,
  }, timeoutMs, 2);
  return { response, kind: "POST body" };
}

async function check(server, text, encoded, timeoutMs) {
  const { response, kind } = await serverRequest(server, "txt", text, encoded, timeoutMs);
  if (response.status >= 500) {
    return {
      ok: false,
      message: `PlantUML server internal error (HTTP ${response.status}) — not a diagram problem; retry later or use a local renderer`,
      body: "",
      kind,
      serverError: true,
    };
  }
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 300);
    return {
      ok: false,
      message: `server rejected the diagram (HTTP ${response.status})${detail ? `: ${detail}` : ""}`,
      kind,
    };
  }
  const body = await response.text();
  // Only trust lines that the renderer emits as diagnostics, not diagram labels
  // that merely contain the words "error" or "syntax error".
  const firstLine = body.split(/\r?\n/).find((line) =>
    /^\s*(syntax error|error line|cannot be parsed|cannot create group|assumed diagram type|the diagram does not fit|has been already defined)/i.test(line),
  );
  if (firstLine) return { ok: false, message: firstLine.trim(), body, kind };
  return { ok: true, body, kind };
}

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "-o" || token === "--output") options.output = argv[++i];
    else if (token === "--server") options.server = argv[++i];
    else if (token === "--format") options.format = argv[++i];
    else if (token === "--timeout") options.timeout = Number(argv[++i]);
    else if (token === "--no-check") options.check = false;
    else positional.push(token);
  }
  return { positional, options };
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [command, file] = positional;
  const server = options.server ?? DEFAULT_SERVER;
  const timeoutMs = Number.isFinite(options.timeout) ? options.timeout : 60000;

  if (!["encode", "check", "render"].includes(command ?? "") || file === undefined) {
    process.stderr.write(
      "usage: node plantuml.mjs <encode|check|render> <file.puml> [-o out.svg] [--format svg|png|txt] [--server URL] [--no-check]\n",
    );
    process.exit(2);
  }

  const { text, problems } = readDiagram(file);
  if (problems.length > 0) {
    process.stderr.write(`INVALID ${file}: ${problems.join("; ")}\n`);
    process.exit(1);
  }
  const encoded = encodePlantUml(text);
  const url = `${server.replace(/\/+$/, "")}/svg/${encoded}`;

  if (command === "encode") {
    process.stdout.write(`${encoded}\n\n${url}\n`);
    return;
  }

  if (command === "check") {
    const result = await check(server, text, encoded, timeoutMs);
    if (!result.ok) {
      process.stderr.write(`SYNTAX ERROR (${server}): ${result.message}\n`);
      process.exit(1);
    }
    const body = result.body.split(/\r?\n/).filter((line) => line.trim() !== "");
    process.stdout.write(`OK ${file}\n${body.slice(0, 12).join("\n")}\n`);
    return;
  }

  const format = (options.format ?? (extname(options.output ?? "") || ".svg").slice(1)).toLowerCase();
  if (!["svg", "png", "txt", "pdf"].includes(format)) {
    process.stderr.write(`unsupported format "${format}" (use svg, png, txt, or pdf)\n`);
    process.exit(2);
  }
  if (options.check !== false) {
    const result = await check(server, text, encoded, timeoutMs);
    if (!result.ok) {
      process.stderr.write(`SYNTAX ERROR (${server}): ${result.message}\n`);
      process.exit(1);
    }
  }
  const { response, kind } = await serverRequest(server, format, text, encoded, timeoutMs);
  if (!response.ok) {
    process.stderr.write(`render failed: HTTP ${response.status} from ${server}\n`);
    process.exit(1);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (format === "svg" && !buffer.toString("utf8", 0, 200).includes("<svg")) {
    process.stderr.write(`render failed: response is not SVG (server error page?)\n`);
    process.exit(1);
  }
  if (format === "png" && buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    process.stderr.write(`render failed: response is not PNG\n`);
    process.exit(1);
  }
  const output = resolve(options.output ?? `diagram.${format}`);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, buffer);
  process.stdout.write(`${output} (${buffer.length} bytes, ${format}, ${kind})\n`);
}

main().catch((error) => {
  process.stderr.write(`FAILED: ${error?.message ?? error}\n`);
  process.exit(1);
});
