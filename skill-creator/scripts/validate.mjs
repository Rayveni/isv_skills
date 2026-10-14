import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BOOLEAN_WORDS = new Set(["true", "false", "yes", "no", "on", "off", "1", "0"]);
const LEGACY_KEYS = ["disableModelInvocation", "modelInvocable", "userInvocable"];
const INVOCATION_KEYS = ["disable-model-invocation", "user-invocable"];
const BODY_LINE_LIMIT = 500;

const issues = [];
const warnings = [];

function stripComment(value) {
	let quote = null;
	for (let i = 0; i < value.length; i += 1) {
		const ch = value[i];
		if (quote) {
			if (ch === quote) quote = null;
		} else if (ch === '"' || ch === "'") {
			quote = ch;
		} else if (ch === "#" && (i === 0 || /\s/.test(value[i - 1]))) {
			return value.slice(0, i).trim();
		}
	}
	return value.trim();
}

/** Minimal YAML-subset parser for frontmatter: flat mappings, nested
 *  one-level mappings, block scalars (>- and |), quoted/plain scalars,
 *  inline arrays of scalars, trailing `#` comments. Enough for every
 *  shipped skill file; rejects duplicate keys and unparseable lines. */
function parseYamlSubset(text) {
	const lines = text.split(/\r?\n/);
	const root = {};
	const stack = [{ indent: -1, map: root }];
	let i = 0;
	while (i < lines.length) {
		const raw = lines[i];
		if (raw.trim() === "" || raw.trim().startsWith("#")) {
			i += 1;
			continue;
		}
		const indent = raw.length - raw.trimStart().length;
		const line = raw.trim();
		while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
		const target = stack[stack.length - 1].map;
		const match = /^([A-Za-z0-9_-]+):(.*)$/.exec(line);
		if (!match) throw new Error(`cannot parse line: ${line}`);
		const [, key, rest] = match;
		// Duplicate keys are rejected regardless of value shape
		// (scalar, block scalar, or nested mapping) — otherwise the
		// later one silently overwrites the earlier, which is a real
		// semantic loss for passthrough keys like `metadata`.
		if (Object.hasOwn(target, key)) throw new Error(`duplicate key "${key}" in frontmatter`);
		let value = stripComment(rest.trim());
		if (value === "" || value === ">" || value === ">-" || value === "|" || value === "|-") {
			// Block scalar (or empty value starting one).
			const isBlock = value !== "";
			const block = [];
			i += 1;
			const childIndent = isBlock
				? (() => {
						while (i < lines.length && lines[i].trim() === "") i += 1;
						return i < lines.length
							? lines[i].length - lines[i].trimStart().length
							: indent + 2;
					})()
				: indent + 2;
			if (isBlock) {
				while (i < lines.length) {
					const l = lines[i];
					if (l.trim() === "") {
						block.push("");
						i += 1;
						continue;
					}
					const li = l.length - l.trimStart().length;
					if (li < childIndent) break;
					block.push(l.slice(childIndent));
					i += 1;
				}
				const folded = value.startsWith(">");
				let joined = block.join(folded ? " " : "\n");
				if (folded) joined = block.filter((b) => b !== "").join(" ");
				if (value.endsWith("-")) joined = joined.replace(/\n$/, "");
				target[key] = joined.trim();
				continue;
			}
			// Empty value: nested mapping or null.
			const nested = {};
			target[key] = nested;
			stack.push({ indent, map: nested });
			i += 1;
			continue;
		}
		if (value.startsWith("[") && value.endsWith("]")) {
			target[key] = value
				.slice(1, -1)
				.split(",")
				.map((v) => v.trim().replace(/^['"]|['"]$/g, ""));
		} else if (/^['"].*['"]$/.test(value)) {
			target[key] = value.slice(1, -1);
		} else if (value === "true" || value === "false") {
			target[key] = value === "true";
		} else if (/^-?\d+$/.test(value)) {
			target[key] = Number(value);
		} else {
			target[key] = value;
		}
		i += 1;
	}
	return root;
}

function splitFrontmatter(raw) {
	if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
	const firstNewline = raw.indexOf("\n");
	if (firstNewline < 0) return { error: "file is a single line; missing frontmatter" };
	if (raw.slice(0, firstNewline).replace(/\r$/, "") !== "---")
		return { error: "first line must be exactly ---" };
	let lineStart = firstNewline + 1;
	while (lineStart <= raw.length) {
		const next = raw.indexOf("\n", lineStart);
		const lineEnd = next < 0 ? raw.length : next;
		if (raw.slice(lineStart, lineEnd).replace(/\r$/, "") === "---")
			return { fm: raw.slice(firstNewline + 1, lineStart), body: raw.slice(lineEnd + 1) };
		if (next < 0) return { error: "unterminated frontmatter: no closing ---" };
		lineStart = next + 1;
	}
	return { error: "unterminated frontmatter" };
}

function checkLinks(body, file, exempt) {
	// Relative links resolve against the directory of the file containing
	// them (standard Markdown semantics — how a reader interprets them).
	const baseDir = dirname(file);
	const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
	let m;
	while ((m = linkRe.exec(body)) !== null) {
		const rawTarget = m[1];
		// Absolute URLs, mailto links, and bare anchors are not file links.
		if (/^(https?:|mailto:|#)/.test(rawTarget)) continue;
		const target = stripFragment(rawTarget);
		// `<...>`-wrapped destinations are normal Markdown syntax, not
		// placeholders: unwrap them and resolve like any other link.
		const unwrapped = target.replace(/^<([^<>]*)>$/, "$1");
		if (/[<>]/.test(unwrapped)) continue; // genuinely a placeholder (e.g. <scratch>/v1.png)
		const resolved = isAbsolute(unwrapped) ? unwrapped : resolve(baseDir, unwrapped);
		if (existsSync(resolved)) continue;
		// Template/example files legitimately reference files the user will
		// create (with or without a #fragment); the skill's own markdown
		// (SKILL.md, references/) and flat skills are held to existing targets.
		if (exempt) continue;
		issues.push(`link target does not exist: ${rawTarget}`);
	}
}

/** Strip a `#fragment` suffix from a Markdown destination, leaving the path. */
function stripFragment(destination) {
	const hash = destination.indexOf("#");
	return hash < 0 ? destination : destination.slice(0, hash);
}

function checkFileLinks(file, exempt = false) {
	if (!/\.md$/i.test(file)) return;
	const body = readFileSync(file, "utf8");
	checkLinks(body, file, exempt);
}

/** Walk a subtree's markdown files; nested dirs need not contain SKILL.md. */
function walkMd(dir, exempt) {
	if (!existsSync(dir)) return;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walkMd(full, exempt);
		else checkFileLinks(full, exempt);
	}
}

function checkTreeLinks(skillDir) {
	const skillFile = join(skillDir, "SKILL.md");
	checkFileLinks(skillFile);
	walkMd(join(skillDir, "references"), false);
	walkMd(join(skillDir, "templates"), true);
	walkMd(join(skillDir, "examples"), true);
}

/** Advisory: the loader accepts any length, but the house style keeps
 *  the body under ~500 lines; deeper detail belongs in references/. */
function checkBodyLength(body) {
	const lines = body.split(/\r?\n/);
	const meaningful = lines.filter((l) => l.trim() !== "");
	if (meaningful.length > BODY_LINE_LIMIT) {
		warnings.push(`body is ${meaningful.length} non-empty lines (house limit ~${BODY_LINE_LIMIT}); move detail into references/`);
	}
}

function checkScripts(skillDir) {
	const dir = join(skillDir, "scripts");
	if (!existsSync(dir)) return;
	for (const entry of readdirSync(dir)) {
		if (!/\.(js|mjs|cjs)$/.test(entry)) continue;
		try {
			execFileSync(process.execPath, ["--check", join(dir, entry)], { stdio: "pipe" });
		} catch (error) {
			issues.push(`scripts/${entry} fails node --check: ${String(error.stderr || error.message).split("\n")[0]}`);
		}
	}
}

function main() {
	const arg = process.argv[2];
	if (!arg) {
		console.error("usage: node validate.mjs <path/to/SKILL.md | path/to/skill-dir>");
		process.exit(2);
	}
	const target = resolve(arg);
	if (!existsSync(target)) {
		console.error(`not found: ${target}`);
		process.exit(1);
	}
	let skillFile = target;
	let skillDir = dirname(target);
	let entryIsFlatFile = false;
	if (statSync(target).isDirectory()) {
		skillDir = target;
		skillFile = join(target, "SKILL.md");
		if (!existsSync(skillFile)) {
			// A directory without SKILL.md is not a skill bundle; it may be a
			// subdirectory (references/, etc.) or an empty scaffold.
			console.error(`not a skill bundle: no SKILL.md in ${target}`);
			process.exit(1);
		}
	} else if (basename(target) !== "SKILL.md") {
		// Flat skill: a bare *.md file with its own frontmatter.
		entryIsFlatFile = true;
	}

	const raw = readFileSync(skillFile, "utf8");
	const { fm, body, error } = splitFrontmatter(raw);
	if (error) {
		// A non-SKILL.md file without frontmatter is not a skill file
		// (e.g. a reference doc) — say so instead of a bare "first line
		// must be exactly ---", which reads like a formatting bug.
		if (entryIsFlatFile && error !== "unterminated frontmatter: no closing ---") {
			console.error(`not a skill file: ${target} has no frontmatter (first line must be exactly ---)`);
		} else {
			console.error(`FAIL frontmatter: ${error}`);
		}
		process.exit(1);
	}

	let data;
	try {
		data = parseYamlSubset(fm);
	} catch (error2) {
		console.error(`FAIL frontmatter YAML: ${error2.message}`);
		process.exit(1);
	}
	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		console.error("FAIL frontmatter must be a YAML mapping");
		process.exit(1);
	}

	const name = data.name;
	const description = data.description;
	if (typeof name !== "string" || name.length === 0) issues.push("frontmatter requires a non-empty string `name`");
	else if (!NAME_RE.test(name)) issues.push(`invalid skill name "${name}": must match ^[a-z0-9]+(?:-[a-z0-9]+)*$`);
	if (typeof description !== "string" || description.length === 0) issues.push("frontmatter requires a non-empty string `description`");

	for (const key of LEGACY_KEYS)
		if (Object.hasOwn(data, key)) issues.push(`legacy frontmatter key "${key}" is rejected; use its kebab-case form`);
	for (const key of INVOCATION_KEYS) {
		if (!Object.hasOwn(data, key)) continue;
		const value = data[key];
		const ok = typeof value === "boolean" || (typeof value === "string" && BOOLEAN_WORDS.has(value.toLowerCase())) || value === 0 || value === 1;
		if (!ok) issues.push(`frontmatter field "${key}" must be a boolean`);
	}

	const dirName = basename(skillDir);
	const isBundle = !entryIsFlatFile && dirName !== "" && dirName !== ".";
	if (isBundle && typeof name === "string" && NAME_RE.test(name) && dirName !== name)
		warnings.push(`directory name "${dirName}" differs from frontmatter name "${name}" (convention: they match)`);

	checkBodyLength(body);

	if (entryIsFlatFile) checkFileLinks(skillFile);
	else {
		checkTreeLinks(skillDir);
		checkScripts(skillDir);
	}

	for (const warning of warnings) console.log(`WARN ${warning}`);
	if (issues.length === 0) {
		console.log(`OK ${skillFile} — frontmatter valid, links and scripts clean${warnings.length ? ` (${warnings.length} warning(s))` : ""}`);
		process.exit(0);
	}
	for (const issue of issues) console.log(`FAIL ${issue}`);
	process.exit(1);
}

main();
