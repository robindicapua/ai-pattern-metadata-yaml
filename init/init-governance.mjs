#!/usr/bin/env node
/**
 * init-governance.mjs — scaffold a consumer repo from governance-kit
 *
 * The kit ships the METHOD (skills, reference scripts, schemas). This copies
 * the customizable DATA into the consumer, who owns it thereafter:
 *   1. schemas  → <GOVERNANCE_DIR>/schemas/        (yours to tweak)
 *   2. scripts  → <SCRIPTS_DIR>/                    (sync + validate; skips existing)
 *   3. re-stamps every *.governance.yaml's `# yaml-language-server: $schema=…`
 *      comment to point at the scaffolded schemas (relative, per file)
 *   4. writes <GOVERNANCE_DIR>/.kit-version          (what you scaffolded from)
 *
 * Run from the consumer repo root:
 *   node .agent/skills/governance-kit/init/init-governance.mjs
 *
 * Idempotent: safe to re-run (schemas overwrite, existing scripts are kept,
 * re-stamping is stable). Pass --force to overwrite existing scripts too.
 */

import {
  readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync,
} from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const KIT_VERSION = '1.0.0';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(__dirname, '..');          // init/ is one level under the pack root
const REPO_ROOT = process.env.GOV_REPO_ROOT || process.cwd();
const FORCE = process.argv.includes('--force');

// ── Configure for your repo ──────────────────────────────────────────────
const GOVERNANCE_DIR = 'packages/ui/src/governance'; // where schemas + .kit-version land
const SCRIPTS_DIR = 'scripts';                       // where sync/validate go
const GOVERNANCE_ROOTS = ['packages/ui/src'];        // trees to scan for *.governance.yaml to re-stamp
// ─────────────────────────────────────────────────────────────────────────

const abs = (p) => join(REPO_ROOT, p);
const log = (m) => console.log(`   ${m}`);

function ensureDir(d) { mkdirSync(d, { recursive: true }); }

function findGovernanceFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findGovernanceFiles(full));
    else if (entry.endsWith('.governance.yaml')) out.push(full);
  }
  return out;
}

function step1_schemas() {
  const src = join(PACK_DIR, 'authoring', 'schemas');
  const dest = abs(join(GOVERNANCE_DIR, 'schemas'));
  ensureDir(dest);
  let n = 0;
  for (const f of readdirSync(src)) {
    if (!f.endsWith('.schema.json')) continue;
    copyFileSync(join(src, f), join(dest, f));
    n++;
  }
  log(`schemas → ${GOVERNANCE_DIR}/schemas/ (${n} copied, yours to tweak)`);
  return dest;
}

function step2_scripts() {
  const src = join(PACK_DIR, 'reference');
  const dest = abs(SCRIPTS_DIR);
  ensureDir(dest);
  for (const f of ['sync-governance.mjs', 'validate-governance.mjs']) {
    const target = join(dest, f);
    if (existsSync(target) && !FORCE) { log(`scripts: kept existing ${SCRIPTS_DIR}/${f} (use --force to overwrite)`); continue; }
    copyFileSync(join(src, f), target);
    log(`scripts → ${SCRIPTS_DIR}/${f}`);
  }
}

function step3_restamp(schemaDir) {
  const SCHEMA_RE = /^(#\s*yaml-language-server:\s*\$schema=).*\/schemas\/([A-Za-z0-9._-]+\.schema\.json)\s*$/m;
  let stamped = 0;
  for (const root of GOVERNANCE_ROOTS) {
    for (const file of findGovernanceFiles(abs(root))) {
      const text = readFileSync(file, 'utf8');
      const m = text.match(SCHEMA_RE);
      if (!m) continue;
      const relToSchemas = relative(dirname(file), schemaDir) || '.';
      const newLine = `${m[1]}${relToSchemas}/${m[2]}`;
      const updated = text.replace(SCHEMA_RE, newLine);
      if (updated !== text) { writeFileSync(file, updated, 'utf8'); stamped++; }
    }
  }
  log(`re-stamped $schema in ${stamped} governance file(s) → ${GOVERNANCE_DIR}/schemas/`);
}

function step4_version() {
  const dest = abs(join(GOVERNANCE_DIR, '.kit-version'));
  const iso = new Date().toISOString().slice(0, 10);
  writeFileSync(dest, `governance-kit ${KIT_VERSION}\nscaffolded ${iso}\nschemas + scripts are yours to edit; re-run init to refresh.\n`, 'utf8');
  log(`wrote ${GOVERNANCE_DIR}/.kit-version (governance-kit ${KIT_VERSION})`);
}

console.log(`\n▶ governance-kit init → ${REPO_ROOT}\n`);
const schemaDir = step1_schemas();
step2_scripts();
step3_restamp(schemaDir);
step4_version();
console.log(`\n✅ Scaffolded. Next: wire "sync:governance" + "validate:governance" scripts in package.json, then run them.\n`);
