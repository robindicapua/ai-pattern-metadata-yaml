#!/usr/bin/env node
/**
 * validate-governance.mjs — reference validator (governance-kit)
 *
 * Validates every authored *.governance.yaml against its tier's JSON Schema.
 * This is the tool-agnostic, move-proof, CI-able source of truth for schema
 * conformance — it does not depend on any editor's yaml-language-server.
 *
 * `init` copies this into a consumer's scripts/ verbatim. The DEFAULTS below
 * match the agentic-design-system layout; a different consumer overrides the
 * schema dir via GOV_SCHEMA_DIR or edits the CONFIG block.
 *
 * Exit 0 = all valid; exit 1 = one or more schema violations (or a bad schema).
 *
 * Usage: node scripts/validate-governance.mjs   (or: npm run validate:governance)
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import AjvImport from 'ajv';

const Ajv = AjvImport.default || AjvImport;
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // scripts/ (or reference/) is one level under the repo root

// ── Configure for your repo ──────────────────────────────────────────────
// Where the project-owned schemas live (scaffolded by `init`).
const SCHEMA_DIR = process.env.GOV_SCHEMA_DIR
  ? join(ROOT, process.env.GOV_SCHEMA_DIR)
  : join(ROOT, 'packages', 'ui', 'src', 'governance', 'schemas');

// Each tier: where its files are, and which schema validates them. A tier is
// either a directory of *.governance.yaml (recurse) or a single file.
const TIERS = [
  { tier: 'component',       dir:  join(ROOT, 'packages/ui/src/components'), schema: 'component-governance.schema.json' },
  { tier: 'pattern',         dir:  join(ROOT, 'packages/ui/src/patterns'),   schema: 'pattern-governance.schema.json' },
  { tier: 'named-journey',   dir:  join(ROOT, 'packages/ui/src/journeys'),   schema: 'journey-instance-governance.schema.json' },
  { tier: 'generic-journey', file: join(ROOT, 'packages/ui/src/governance/journey.governance.yaml'), schema: 'journey-governance.schema.json' },
];
// Files with no schema (validated only for parse-ability). Global rules have no
// schema today — they're edited directly per MODEL.md.
const UNSCHEMED = [join(ROOT, 'packages/ui/src/governance/global.governance.yaml')];
// ─────────────────────────────────────────────────────────────────────────

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

const load = (f) => yaml.load(readFileSync(f, 'utf8'));
const rel = (f) => relative(ROOT, f);

function main() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validators = new Map();
  const getValidator = (schemaFile) => {
    if (!validators.has(schemaFile)) {
      const path = join(SCHEMA_DIR, schemaFile);
      if (!existsSync(path)) {
        console.error(`   ❌ schema not found: ${rel(path)} (set GOV_SCHEMA_DIR or run init)`);
        process.exit(1);
      }
      validators.set(schemaFile, ajv.compile(JSON.parse(readFileSync(path, 'utf8'))));
    }
    return validators.get(schemaFile);
  };

  let checked = 0;
  const failures = [];

  const validateFile = (file, schemaFile) => {
    let data;
    try {
      data = load(file);
    } catch (e) {
      failures.push({ file, errors: [`YAML parse error: ${e.message}`] });
      return;
    }
    checked++;
    if (!schemaFile) return; // parse-only (unschemed)
    const validate = getValidator(schemaFile);
    if (!validate(data)) {
      failures.push({
        file,
        errors: (validate.errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`),
      });
    }
  };

  for (const t of TIERS) {
    const files = t.file ? (existsSync(t.file) ? [t.file] : []) : findGovernanceFiles(t.dir);
    for (const f of files) validateFile(f, t.schema);
  }
  for (const f of UNSCHEMED) if (existsSync(f)) validateFile(f, null);

  if (failures.length) {
    console.error(`\n❌ Governance schema validation failed — ${failures.length} file(s):\n`);
    for (const { file, errors } of failures) {
      console.error(`   ${rel(file)}`);
      for (const e of errors) console.error(`      • ${e}`);
    }
    process.exit(1);
  }
  console.log(`✅ Governance schema validation passed — ${checked} file(s) conform.`);
}

main();
