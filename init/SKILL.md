---
name: governance-init
description: >
  First-run setup for governance-kit — scaffolds the customizable parts of the
  kit (schemas, sync + validate scripts) into a consumer repo so it owns and can
  tweak them, then wires them up. Run once per project after installing the kit.
  Trigger on "set up governance-kit", "install governance", "init the governance
  system", "scaffold governance".
---

# governance-kit — init (first run)

The kit is **hybrid**: the *method* (the `check` / `encode` / `explain` skills,
the format reference, the reference scripts) stays in the pack and updates by
pulling; the *data* (schemas, and the copies of the scripts you run) is
**scaffolded into your repo, and yours to edit thereafter**. This skill does the
scaffolding. Any agent (or a human) can follow it — it is plain instructions
plus one node script.

## Prerequisites

- Node ≥ 18 with `js-yaml` and `ajv` available (the validator needs them).
- The kit installed somewhere in the repo (conventionally a submodule at
  `.agent/skills/governance-kit/`).

## Steps

### 1. Choose where governance infra lives

Reuse an existing governance folder if you have one (this is where schemas,
orphan `global`/`journey` rules, and `.kit-version` live). Defaults assume
`packages/ui/src/governance/`. To change it, edit the CONFIG block at the top of
`init/init-governance.mjs` (`GOVERNANCE_DIR`, `SCRIPTS_DIR`, `GOVERNANCE_ROOTS`).

### 2. Run the scaffold

From the **repo root**:

```bash
node .agent/skills/governance-kit/init/init-governance.mjs
```

It will, printing each action:
1. copy the schemas → `<GOVERNANCE_DIR>/schemas/` and the scope-registry
   starter → `<GOVERNANCE_DIR>/scopes.yaml` (both yours to tweak; an existing
   `scopes.yaml` is kept),
2. copy `sync-governance.mjs` + `validate-governance.mjs` → `<SCRIPTS_DIR>/`
   (keeps an existing sync script unless `--force`),
3. re-stamp every `*.governance.yaml`'s `# yaml-language-server: $schema=…`
   comment to point at the scaffolded schemas (relative, per file),
4. write `<GOVERNANCE_DIR>/.kit-version`.

### 3. Wire the npm scripts

Add to `package.json` (adjust the path if your scripts dir differs):

```json
{
  "scripts": {
    "sync:governance": "node scripts/sync-governance.mjs",
    "validate:governance": "node scripts/validate-governance.mjs"
  }
}
```

### 4. Verify

```bash
npm run validate:governance   # every *.governance.yaml conforms to its schema
npm run sync:governance       # compiles the rulebook → .ai/governance/index.toon
```

Both should exit 0. Commit the scaffolded `governance/schemas/`, the scripts,
the re-stamped `$schema` comments, and `.kit-version`.

## After init

- Author and check rules with the **`governance-encode`**, **`governance-check`**,
  and **`governance-explain`** skills under `skills/`.
- The schemas are **yours** — edit them (add a constraint type, change the
  category enum) and re-run `validate:governance`.
- To pull kit improvements to the *method*, bump the pack (submodule/pull). Your
  scaffolded data is untouched; diff against `.kit-version` if you want to refresh
  schemas.
