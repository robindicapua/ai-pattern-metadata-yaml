---
name: ai-pattern-metadata-yaml
version: 1.0.0
author: Robin Di Capua
based_on: "ai-component-metadata-yaml by Robin Di Capua — split out so pattern/class governance laws have their own workflow instead of stretching the single-component schema"
license: MIT
description: Generate governance-shaped metadata for multi-step patterns (flows, wizards) and shared class-tier laws as YAML files, validated against JSON Schema. Unlike component metadata (mostly descriptive hints), pattern metadata is laws-first — citable, severity-ranked composition rules spanning multiple steps and components.
---

**Version:** 1.0.0
**Last Updated:** 2026-07-01

# AI Pattern Metadata Generator (YAML)

Generate structured governance laws as `.pattern.yaml` files (one per multi-step
pattern, e.g. a checkout flow) and `.class.yaml` files (laws shared by a whole
family of patterns, e.g. every flow). Validated via JSON Schema through the
`yaml-language-server` comment, same mechanism as the sibling
[ai-component-metadata-yaml](https://github.com/robindicapua/ai-component-metadata-yaml)
skill.

## How this differs from component metadata

Component metadata (`ai-component-metadata-yaml`) is **hints-first**: mostly
descriptive fields (`usage`, `behavior`, `accessibility`, `variants`) for a
single artifact, with a couple of governance fields (`antiPatterns`,
`parentConstraints`) bolted on.

Pattern metadata is the inverse — **laws-first**: the bulk of the file is
`laws[]`, each a citable, severity-ranked rule about how components compose
*across* the steps of a flow. No single component's metadata can express "the
confirmation step must show a `success`-variant CTA, not `primary`" — that
constraint only exists at the level of the whole flow. `aiHints` here is a thin
tail (keywords only), not a parallel section to `usage`/`behavior`/`variants`.

If what you're generating is scoped to one component, use
`ai-component-metadata-yaml` instead. If it spans multiple steps/components, or
you're authoring a rule shared by a whole class of flows, use this skill.

## Where files live

```
packages/ui/src/patterns/<pattern-id>/<pattern-id>.pattern.yaml
packages/ui/src/governance/classes/<family>.class.yaml
```

Both are **authored source of truth** — compiled by `npm run sync:governance`
into the generated agent index at `.ai/governance/index.toon`. Never edit the
generated index by hand; edit the YAML and re-run the sync.

See `packages/ui/src/governance/SPEC.md` for the full governance model (tiers,
citation format, `refines`/`extends` semantics).

## Quick start — new pattern

```yaml
# yaml-language-server: $schema=../../../../../.agent/skills/ai-pattern-metadata-yaml/schemas/pattern-metadata.schema.json
pattern:
  name: Human Readable Name
  id: kebab-case-id
  scope: ABC              # 2-6 uppercase letters, prefixes every law id (ABC-1, ABC-2...)
  category: domain-name
  extends: [flow]         # class families this pattern inherits laws from, if any
  description: >
    What this pattern represents and why it needs flow-level governance.

steps:
  - id: step-one
    name: Step One
    description: What the user is trying to accomplish here.
  - id: step-two
    name: Step Two
    description: ...
    isFinalStep: true

laws:
  - id: ABC-1
    title: Short human sentence naming the law
    statement: >
      The binding rule text.
    rationale: >
      Why this rule exists.
    severity: error         # error | warning | info
    appliesWhen:
      pattern: kebab-case-id
    provisions:
      - id: ABC-1.1
        step: step-one
        constraint: { type: required, component: Button, variant: primary, quantity: exactly-one }
        labelHint: Suggested label text (informational only)

aiHints:
  keywords: [domain, terms, that, trigger, this, pattern]
  notes: >
    Guidance for AI agents on how to apply these laws holistically.
```

## Quick start — new class (shared by a family of patterns)

```yaml
# yaml-language-server: $schema=../../../../../.agent/skills/ai-pattern-metadata-yaml/schemas/class-metadata.schema.json
class: family-name
scope: FAM              # 2-6 uppercase letters
tier: class

description: >
  Laws shared by every pattern in this family.

triggers:
  - keyword-one
  - keyword-two

laws:
  - id: FAM-1
    title: Short human sentence naming the law
    statement: >
      The binding rule text.
    rationale: >
      Why this rule exists.
    severity: warning
    appliesWhen:
      patternClass: family-name
      scope: step
```

## Core workflow

### 1. Decide what you're authoring

- **A brand-new pattern** (a flow/template that doesn't have a `.pattern.yaml`
  yet) → go to [New pattern](#2-new-pattern).
- **A brand-new class** (a family of patterns sharing rules, e.g. all wizards)
  → go to [New class](#3-new-class).
- **Adding a law to an existing pattern or class** → go to
  [Adding a law](#4-adding-a-law-to-an-existing-pattern-or-class).

### 2. New pattern

1. Enumerate the steps — from sequential Figma frames, or from the app's
   routes/state machine if it's already coded. Each step gets a kebab-case
   `id` in `steps[]`. Mark the terminal step `isFinalStep: true`.
2. Pick a `scope` code (2-6 uppercase letters) that doesn't collide with an
   existing pattern's scope — check `packages/ui/src/patterns/*/*.pattern.yaml`
   for scopes already in use.
3. Decide `extends` — if this pattern belongs to a family with shared rules
   (e.g. any multi-step flow → `flow`), list it. Check
   `packages/ui/src/governance/classes/` for existing families first; don't
   invent a new class for a single pattern (see [New class](#3-new-class)).
4. Walk each step and ask: what component/variant must be present, forbidden,
   or capped, across the *whole* step's composition (not one component's
   props)? Draft a law per distinct rule, with `provisions[]` pointing at the
   steps it applies to.
5. If a law you're drafting would hold for *any* pattern in the class, not
   just this one, it belongs in the class file instead — see
   [New class](#3-new-class) — and this pattern should rely on inheritance
   rather than repeating it. If you're not sure yet (e.g. this is the only
   pattern in the class so far), draft it here and add a `note:` flagging it
   as a promotion candidate once a second pattern needs the same rule — this
   mirrors the existing `CHK-3` note in `checkout-flow.pattern.yaml`.
6. Add the thin `aiHints` tail (keywords only — do not try to add
   `behavior`/`accessibility`/`variants` sections; those don't map to a whole
   flow and the schema doesn't have them).
7. Run `npm run sync:governance` and confirm it completes without error.

### 3. New class

1. Only create a class when ≥2 patterns need to share the same rule, or you
   can already see a second pattern coming. A class for one pattern is
   premature — keep the law in the pattern file until it's actually shared.
2. Pick a `class` name (kebab-case) and `scope` code, distinct from every
   pattern scope and every other class scope.
3. `triggers[]` are the base keywords that resolve these laws for any
   flow-shaped task; the generator also unions in the keywords of every
   pattern that `extends` this class, so you don't need to duplicate them.
4. Draft laws with `appliesWhen.patternClass` set to this class name. Keep
   severity at the loosest sensible default (e.g. `warning`) — a specific
   pattern can tighten it with a law that `refines` the class law (see below).

### 4. Adding a law to an existing pattern or class

This is the common case once patterns/classes already exist — e.g. "add a rule
that the payment step must show a security badge."

1. **Locate the file.** Patterns live at
   `packages/ui/src/patterns/<pattern-id>/<pattern-id>.pattern.yaml` (find by
   `pattern.id` or `pattern.name`, not folder guessing — `grep -r "id: <name>"
   packages/ui/src/patterns/`). Classes live at
   `packages/ui/src/governance/classes/<family>.class.yaml`.
2. **Determine the next law id.** Read the file's `pattern.scope` (or `scope`
   for a class), scan every existing `laws[].id` for that prefix, and use the
   next unused integer. Never reuse a retired id.
3. **Check for an existing class law with the same intent.** If one exists and
   this pattern needs a stricter/more specific version, set `refines: <id>` on
   the new law instead of duplicating its statement — the pattern law then
   supersedes the class law wherever both would apply (lex specialis; see
   `CHK-1` refining `FLOW-1` in `checkout-flow.pattern.yaml` for the pattern).
4. **Author the law body**: `title`, `statement`, `rationale`, `severity`
   (`error`/`warning`/`info`), `appliesWhen`. Add `note:` only if there's a
   genuine authoring caveat (e.g. a future-promotion reminder) — omit
   otherwise.
5. **Add provisions** (patterns only — classes don't have per-step
   provisions in this schema; a class law's `appliesWhen.scope` covers all
   steps of every extending pattern generically). Each provision gets id
   `<law-id>.<n>` (e.g. `CHK-4.1`), a `step` id from the pattern's `steps[]`,
   and a `constraint` (`type: required|forbidden`, `component`, optional
   `variant`, optional `quantity`).
6. **Re-run `npm run sync:governance`** and check the diff to
   `.ai/governance/index.toon` looks like what you intended — one new row per
   law/provision, `source` pointing back at the file you just edited.

### 5. Validate

- IDE validates automatically via the `yaml-language-server` comment (requires
  the Red Hat YAML extension).
- CLI validation (requires `js-yaml` + `ajv`):
  ```bash
  npx js-yaml path/to/file.pattern.yaml | npx ajv validate \
    -s .agent/skills/ai-pattern-metadata-yaml/schemas/pattern-metadata.schema.json \
    -d /dev/stdin
  ```
  Swap `pattern-metadata.schema.json`/`.pattern.yaml` for
  `class-metadata.schema.json`/`.class.yaml` when validating a class file.

## Schema reference

### `pattern-metadata.schema.json` — required: `pattern`, `laws`

| Field | Required | Purpose |
|---|---|---|
| `pattern.name`, `.id`, `.scope`, `.description` | Yes | Identity + the law-id prefix |
| `pattern.category`, `.extends` | No | Domain grouping; class families inherited from |
| `steps[]` | No* | Ordered step ids/names, referenced by provisions for human-readable labels (*omit only if the pattern has no per-step provisions*) |
| `laws[]` | Yes | `id`, `title`, `statement`, `severity` required; `rationale`, `refines`, `appliesWhen`, `note`, `provisions[]` optional |
| `laws[].provisions[]` | No | `id`, `step`, `constraint` required; `labelHint` optional |
| `aiHints.keywords`, `.notes` | No | Intent-matching terms + holistic-validation guidance |

### `class-metadata.schema.json` — required: `class`, `scope`, `laws`

| Field | Required | Purpose |
|---|---|---|
| `class`, `scope` | Yes | Family name + law-id prefix |
| `tier` | No | Always `"class"` if present — documentation only |
| `description`, `triggers[]` | No | What the family governs + base intent-matching keywords |
| `laws[]` | Yes | Same shape as pattern laws, minus `provisions` (class laws apply generically via `appliesWhen.scope`, not per-step) |

## Severity

Per-law, not file-wide — there is no pattern- or class-level enforcement knob.
`error` = hard block, `warning` = flagged for review, `info` = advisory. A
pattern law that `refines` a class law may tighten (but not loosen) its
severity.

## Law id conventions

- Scope codes are 2-6 uppercase letters, unique across every pattern and class
  file in the repo.
- Law ids are `<SCOPE>-<n>` (e.g. `CHK-1`), never reused once retired.
- Provision ids are `<law-id>.<n>` (e.g. `CHK-1.3`), one per step the law
  reaches.

## YAML quoting rules

Quote strings that contain: colons (`:`), `#`, `>`, `|`, `{`, `}`, `[`, `]`,
`&`, `*`, `!`, or that start with `@`, `` ` ``. Simple strings (ids, step
names) don't need quotes.

## Best practices

1. **Laws are the content, not a bolt-on.** Don't pad a pattern file with
   `usage`/`behavior`-style sections copied from component metadata — they
   don't exist in this schema and don't apply at flow scope.
2. **Push shared rules up, not down.** If two patterns end up with
   near-identical laws, that's a signal to move the rule to a class file and
   have both patterns inherit it, rather than keeping two copies in sync by
   hand.
3. **Cite, don't restate.** When a pattern law refines a class law, reference
   it via `refines` — don't copy the class law's statement into the pattern
   file.
4. **Always re-run the sync.** `npm run sync:governance` is what actually
   makes a new law enforceable; an unsyncd `.pattern.yaml` edit is invisible
   to the governance index and to CI.
