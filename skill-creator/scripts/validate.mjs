#!/usr/bin/env node
/**
 * Skill validator for DSH directory-bundle skills.
 *
 * Checks a SKILL.md (or a directory containing one) against the loader's
 * acceptance rules (see @deepseek-ai/dsh-skill-filesystem):
 *   - frontmatter delimiters and YAML mapping shape
 *   - required non-empty `name` (kebab-case grammar) and `description`
 *   - invocation keys: only `disable-model-invocation` / `user-invocable`
 *   - boolean fields are well-formed
 *   - relative Markdown links in the body resolve to real files
 *   - scripts/ files pass `node --check`
 *
 * Zero dependencies (Node built-ins only). Exit 0 when clean, 1 otherwise;
 * prints one line per issue with its rule.
 *
 * Usage: node validate.mjs <path/to/SKILL.md | path/to/skill-dir>
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BOOLEAN_WORDS = new Set(["true", "false", "yes", "no", "on", "off", "1", "0"]);
const LEGACY_KEYS = ["disableModelInvocation", "modelInvocable", "userInvocable"];
const INVOCATION_KEYS = ["disable-model-invocation", "user-invocable"];

const issues = [];
const warnings = [];

/** Minimal YAML-subset parser for frontmatter: flat mappings, nested
 *  one-level mappings, block scalars (>- and |), quoted/plain scalars,
 *  inline arrays of scalars. Enough for every shipped skill file. */
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
		let value = rest.trim();
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

function checkLinks(body, skillDir, sourceFile) {
	const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
	let m;
	while ((m = linkRe.exec(body)) !== null) {
		const target = m[1];
		// Placeholders (e.g. "<scratch>/v1.png") and anchors are not file links.
		if (/^(https?:|mailto:|#)/.test(target)) continue;
		if (/[<>]/.test(target)) continue;
		const resolved = isAbsolute(target) ? target : resolve(skillDir, target);
		if (existsSync(resolved)) continue;
		// Template/example files legitimately reference files the user will
		// create; only the skill's own SKILL.md is held to existing targets.
		if (resolve(sourceFile) !== resolve(skillDir, "SKILL.md")) continue;
		issues.push(`link target does not exist: ${target}`);
	}
}

function checkFileLinks(file, skillDir) {
	if (!/\.md$/i.test(file)) return;
	const body = readFileSync(file, "utf8");
	checkLinks(body, skillDir, file);
}

function checkTreeLinks(skillDir) {
	checkFileLinks(join(skillDir, "SKILL.md"), skillDir);
	for (const sub of ["references", "templates", "examples"]) {
		const dir = join(skillDir, sub);
		if (!existsSync(dir)) continue;
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			if (statSync(full).isDirectory()) checkTreeLinks(full);
			else checkFileLinks(full, skillDir);
		}
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
	let skillFile = target;
	let skillDir = dirname(target);
	if (statSync(target).isDirectory()) {
		skillDir = target;
		skillFile = join(target, "SKILL.md");
	}
	if (!existsSync(skillFile)) {
		console.error(`not found: ${skillFile}`);
		process.exit(1);
	}

	const raw = readFileSync(skillFile, "utf8");
	const { fm, body, error } = splitFrontmatter(raw);
	if (error) {
		console.error(`FAIL frontmatter: ${error}`);
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
	if (typeof name === "string" && NAME_RE.test(name) && dirName !== name && dirName !== ".")
		warnings.push(`directory name "${dirName}" differs from frontmatter name "${name}" (convention: they match)`);

	checkTreeLinks(skillDir);
	checkScripts(skillDir);

	for (const warning of warnings) console.log(`WARN ${warning}`);
	if (issues.length === 0) {
		console.log(`OK ${skillFile} — frontmatter valid, links and scripts clean${warnings.length ? ` (${warnings.length} warning(s))` : ""}`);
		process.exit(0);
	}
	for (const issue of issues) console.log(`FAIL ${issue}`);
	process.exit(1);
}

function basename(p) {
	const parts = p.split(/[\\/]/).filter(Boolean);
	return parts[parts.length - 1] ?? "";
}

main();
