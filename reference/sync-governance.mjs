#!/usr/bin/env node
/**
 * sync-governance.mjs — governance-kit reference (copied into your scripts/ by init)
 *
 * Project-specific bits to adjust for your repo: the *_DIR path constants and
 * the COMPONENT_SCOPES registry below.
 *
 * Compiles the design system's authored governance rules into a single
 * agent-facing router index. See packages/ui/src/governance/MODEL.md.
 *
 * The authored YAML is the source of truth and is already agent-readable, so we
 * do NOT duplicate rule bodies into the generated tree. We generate ONE thing:
 * a thin router that lists every rule (id, tier, scope, severity, title,
 * triggers) and points each at its authored YAML via `source`. The agent reads
 * the index once, matches the task against tier + scope + triggers, then opens
 * only the `source` files it needs.
 *
 *   Tier        Authored source                                                    Scope codes
 *   ─────────   ────────────────────────────────────────────────────────────────   ───────────
 *   global      packages/ui/src/governance/global.governance.yaml                   GLB
 *   component   packages/ui/src/components/ (*.governance.yaml)                     BTN, CBX, …
 *   journey     packages/ui/src/governance/journey.governance.yaml (generic)        JRN
 *               packages/ui/src/journeys/ (*.governance.yaml, named)                CHK, …
 *   pattern     packages/ui/src/patterns/ (*.governance.yaml)                       CRD, …
 *
 * Output (generated — never hand-edit):
 *   .ai/governance/index.toon
 *
 * Usage: npm run sync:governance
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';

// ─── Paths ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT           = join(__dirname, '..');
const COMPONENTS_DIR  = join(ROOT, 'packages', 'ui', 'src', 'components');
const JOURNEYS_DIR     = join(ROOT, 'packages', 'ui', 'src', 'journeys');
const PATTERNS_DIR     = join(ROOT, 'packages', 'ui', 'src', 'patterns');
const GLOBAL_RULES     = join(ROOT, 'packages', 'ui', 'src', 'governance', 'global.governance.yaml');
const JOURNEY_GENERIC  = join(ROOT, 'packages', 'ui', 'src', 'governance', 'journey.governance.yaml');
const OUT_DIR          = join(ROOT, '.ai', 'governance');
const INDEX_PATH       = join(OUT_DIR, 'index.toon');

/**
 * Component name → scope code. Mirrors the registry in MODEL.md §2.
 * Codes are disambiguated by hand (Checkbox→CBX so it doesn't collide with
 * Checkout→CHK). Add a new code here when a component is first governed.
 */
const COMPONENT_SCOPES = {
  Button:    'BTN',
  Card:      'CAR',
  Checkbox:  'CBX',
  FilterChip: 'FCH',
  Icon:      'ICO',
  Radio:     'RAD',
  Text:      'TXT',
  TextInput: 'TIN',
  Title:     'TTL',
};

// ─── TOON serializer ──────────────────────────────────────────────────────────
// Matches the indented dialect used elsewhere in .ai/*.toon: nested maps,
// `key[N]: a,b,c` for scalar arrays, and `key[N]{cols}:` + rows for arrays of
// uniform objects (the token-efficient tabular form).

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function scalar(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v).replace(/\s+/g, ' ').trim();
  return (s === '' || /[",:\n]/.test(s)) ? JSON.stringify(s) : s;
}

/** Quote a tabular cell if it contains the row delimiter or quotes. */
function cell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v).replace(/\s+/g, ' ').trim();
  return (s === '' || /[",\n]/.test(s)) ? JSON.stringify(s) : s;
}

function emitArray(name, arr, indent) {
  const pad = '  '.repeat(indent);
  if (arr.length === 0) return `${pad}${name}[0]:\n`;
  if (arr.every(isObj)) {
    const cols = [];
    for (const o of arr) for (const k of Object.keys(o)) if (!cols.includes(k)) cols.push(k);
    let out = `${pad}${name}[${arr.length}]{${cols.join(',')}}:\n`;
    for (const o of arr) out += `${pad}  ${cols.map((k) => cell(o[k])).join(',')}\n`;
    return out;
  }
  return `${pad}${name}[${arr.length}]: ${arr.map(cell).join(',')}\n`;
}

function emitObject(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) out += emitArray(k, v, indent);
    else if (isObj(v)) out += `${pad}${k}:\n${emitObject(v, indent + 1)}`;
    else out += `${pad}${k}: ${scalar(v)}\n`;
  }
  return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findFiles(dir, suffix) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findFiles(full, suffix));
    else if (entry.endsWith(suffix)) out.push(full);
  }
  return out;
}

const load = (f) => yaml.load(readFileSync(f, 'utf8'));

/** Citations of repealed rules — retired, never reused (MODEL.md §2). */
const REPEALED = new Set();

/** A repealed rule stays in its authored YAML (the citation is retired) but is
 *  dropped from the router index. Records the id; returns true if the entry
 *  should be skipped. */
function skipIfRepealed(entry) {
  if (entry?.status !== 'repealed') return false;
  if (entry.id) REPEALED.add(String(entry.id));
  else console.warn('   ⚠️  A repealed entry has no `id` — its citation cannot be protected against reuse.');
  return true;
}

// ─── Rule collectors ───────────────────────────────────────────────────────────
// Each rule is reduced to a thin router row. `source` points at the authored
// YAML as `<file>#<ruleId>` — the id is authored in the YAML at every tier.

function collectGlobal(rows) {
  if (!existsSync(GLOBAL_RULES)) return;
  const data = load(GLOBAL_RULES);
  const file = relative(ROOT, GLOBAL_RULES);
  for (const rule of data.rules || []) {
    if (skipIfRepealed(rule)) continue;
    rows.push({
      id: rule.id, tier: 'global', scope: data.scope || 'GLB',
      severity: rule.severity || 'info',
      title: rule.title,
      triggers: ['always'],
      source: `${file}#${rule.id}`,
    });
  }
}

/** Generic journey rules (JRN-*) are shared by every named journey. Returns the
 *  rule rows so collectNamedJourneys can union each journey's keywords onto them. */
function collectJourneyGeneric(rows) {
  if (!existsSync(JOURNEY_GENERIC)) return [];
  const data = load(JOURNEY_GENERIC);
  const scope = data.scope;
  if (!scope) {
    console.warn(`   ⚠️  ${relative(ROOT, JOURNEY_GENERIC)} missing \`scope\` — skipping.`);
    return [];
  }
  const file = relative(ROOT, JOURNEY_GENERIC);
  const base = data.triggers || [];
  const ruleRows = [];
  for (const rule of data.rules || []) {
    if (skipIfRepealed(rule)) continue;
    const row = {
      id: rule.id, tier: 'journey', scope, severity: rule.severity || 'warning',
      title: rule.title,
      triggers: [...base],          // named journeys union their keywords in
      source: `${file}#${rule.id}`,
    };
    rows.push(row);
    ruleRows.push(row);
  }
  return ruleRows;
}

/** Component rule IDs are authored (stable across reorder/reword), not counted.
 *  Validate that each is present and prefixed with the component's scope. */
function requireId(entry, scope, file, kind) {
  if (!entry.id) {
    console.error(`   ❌ ${file}: a ${kind} is missing an \`id\`. Author one (e.g. ${scope}-1) — see MODEL.md §2.`);
    process.exit(1);
  }
  if (!String(entry.id).startsWith(`${scope}-`)) {
    console.error(`   ❌ ${file}: id "${entry.id}" must start with this component's scope "${scope}-".`);
    process.exit(1);
  }
  return entry.id;
}

function collectComponents(rows) {
  for (const filePath of findFiles(COMPONENTS_DIR, '.governance.yaml')) {
    const data = load(filePath);
    const name = data?.component?.name;
    if (!name) continue;
    const scope = COMPONENT_SCOPES[name];
    if (!scope) {
      console.warn(`   ⚠️  ${name} has no scope code in COMPONENT_SCOPES — skipping. Add one in sync-governance.mjs / MODEL.md.`);
      continue;
    }
    const file = relative(ROOT, filePath);
    if (data.component.scope && data.component.scope !== scope) {
      console.error(`   ❌ ${file}: authored scope "${data.component.scope}" does not match the registry ("${scope}").`);
      process.exit(1);
    }

    for (const rule of data.rules || []) {
      if (skipIfRepealed(rule)) continue;
      const kind = rule.kind || 'anti-pattern';
      const id = requireId(rule, scope, file, kind);

      if (kind === 'parent-constraint') {
        if (!rule.context) continue;
        const forbidden = (rule.forbidden || []).map((f) => f.variant).join('/');
        rows.push({
          id, tier: 'component', scope, severity: rule.severity || 'warning',
          title: `Avoid ${name} variant ${forbidden} in ${rule.context}`,
          triggers: [name.toLowerCase(), rule.context],
          source: `${file}#${id}`,
        });
      } else {
        if (!rule.scenario) continue;
        rows.push({
          id, tier: 'component', scope, severity: rule.severity || 'info',
          title: rule.scenario,
          triggers: [name.toLowerCase()],
          source: `${file}#${id}`,
        });
      }
    }
  }
}

/** Named journeys (e.g. checkout-flow, scope CHK) inherit the generic journey
 *  rules via `extends: [journey]` and may `refines` one of them (lex specialis). */
function collectNamedJourneys(rows, genericRuleRows) {
  for (const filePath of findFiles(JOURNEYS_DIR, '.governance.yaml')) {
    const data = load(filePath);
    const scope = data?.journey?.scope;
    if (!scope) {
      console.warn(`   ⚠️  ${relative(ROOT, filePath)} has no journey.scope — skipping.`);
      continue;
    }
    const file = relative(ROOT, filePath);
    const keywords = data?.aiHints?.keywords || [data.journey.id];

    // `extends: [journey]` → this named journey inherits the generic JRN-*
    // rules. Propagate its keywords onto those rules' triggers so they resolve
    // for this journey's tasks too.
    if (data?.journey?.extends?.includes('journey')) {
      for (const ruleRow of genericRuleRows) {
        for (const kw of keywords) if (!ruleRow.triggers.includes(kw)) ruleRow.triggers.push(kw);
      }
    }

    for (const rule of data.rules || []) {
      if (skipIfRepealed(rule)) continue;
      rows.push({
        id: rule.id, tier: 'journey', scope, severity: rule.severity || 'warning',
        title: rule.title,
        triggers: [...keywords],
        refines: rule.refines,        // a generic journey rule this one supersedes (lex specialis)
        source: `${file}#${rule.id}`,
      });
    }
  }
}

/** Pattern rules (e.g. CRD-*) govern a single-page composition (e.g. Card's
 *  footer zone). Unlike journeys, patterns don't inherit from a shared family —
 *  each pattern owns its rules outright. */
function collectPatterns(rows) {
  for (const filePath of findFiles(PATTERNS_DIR, '.governance.yaml')) {
    const data = load(filePath);
    const scope = data?.pattern?.scope;
    if (!scope) {
      console.warn(`   ⚠️  ${relative(ROOT, filePath)} has no pattern.scope — skipping.`);
      continue;
    }
    const file = relative(ROOT, filePath);
    const keywords = data?.aiHints?.keywords || [data.pattern.id];

    for (const rule of data.rules || []) {
      if (skipIfRepealed(rule)) continue;
      rows.push({
        id: rule.id, tier: 'pattern', scope, severity: rule.severity || 'warning',
        title: rule.title,
        triggers: [...keywords],
        refines: rule.refines,
        source: `${file}#${rule.id}`,
      });
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const rows = [];
  collectGlobal(rows);
  const genericJourneyRules = collectJourneyGeneric(rows);   // before named journeys: they propagate `extends` onto these
  collectComponents(rows);
  collectNamedJourneys(rows, genericJourneyRules);
  collectPatterns(rows);

  if (rows.length === 0) {
    console.error('⚠️  No governance rules found. Check authored YAML sources.');
    process.exit(1);
  }

  // Validate `refines` targets exist (the more-specific rule must point at a
  // real rule it supersedes).
  const ids = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    if (r.refines && !ids.has(r.refines)) {
      if (REPEALED.has(String(r.refines))) {
        console.error(`   ❌ ${r.id} refines "${r.refines}", which has been repealed. Amend or repeal the refining rule first (MODEL.md §2).`);
      } else {
        console.error(`   ❌ ${r.id} refines "${r.refines}", which is not a known rule id.`);
      }
      process.exit(1);
    }
  }

  // Citations must be globally unique. A repealed rule's id is never reused.
  const seen = new Map();
  for (const r of rows) {
    if (seen.has(r.id)) {
      console.error(`   ❌ Duplicate rule id "${r.id}" (${seen.get(r.id)} and ${r.source}). Ids must be unique.`);
      process.exit(1);
    }
    seen.set(r.id, r.source);
  }

  // A repealed citation is retired — an active rule must never reuse it.
  for (const r of rows) {
    if (REPEALED.has(String(r.id))) {
      console.error(`   ❌ ${r.id} reuses a repealed citation (${r.source}). Retired ids are never reused — take the next free number (MODEL.md §2).`);
      process.exit(1);
    }
  }

  const byTier = {}, bySeverity = {};
  for (const r of rows) {
    byTier[r.tier] = (byTier[r.tier] || 0) + 1;
    bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
  }

  const index = {
    version: '3.0.0',
    system: 'agentic-design-system',
    generatedBy: 'sync-governance.mjs',
    format: 'toon',
    summary: { totalRules: rows.length, byTier, bySeverity },
    usage: {
      loadOnce: 'Read index.toon at task start. This is the ONLY generated governance file — thin rows, every rule.',
      resolve: 'Match the task against tier + scope + triggers. For each match, open its `source` (authored YAML) to read the full statement, rationale, constraint, and any provisions.',
      sourceFormat: 'every rule → file#ruleId. The id is authored in the YAML across all tiers; grep it to land on the rule.',
      refines: 'If a resolved rule has a `refines` value and that target rule is also resolved, the refining (more specific) rule wins — suppress the target to avoid double-reporting (lex specialis).',
      authoredIn: 'packages/ui/src/governance/MODEL.md — never hand-edit .ai/governance.',
    },
    rules: rows.map((r) => ({
      id: r.id, tier: r.tier, scope: r.scope, severity: r.severity,
      title: r.title,
      triggers: (r.triggers || []).join('|'),
      refines: r.refines || '',
      source: r.source,
    })),
  };

  // Single generated artifact; wipe the tree to clear any legacy files.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(INDEX_PATH, emitObject(index), 'utf8');

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`✅ Governance index synced — ${rows.length} rules → .ai/governance/index.toon\n`);
  for (const r of rows) console.log(`   [${r.id}] (${r.tier}) ${r.title}`);
}

main();
