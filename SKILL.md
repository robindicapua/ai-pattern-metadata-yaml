---
name: ai-pattern-metadata-yaml
version: 3.0.0
author: Robin Di Capua
based_on: "ai-component-metadata-yaml by Robin Di Capua — split out so journey/pattern governance rules have their own workflow instead of stretching the single-component schema"
license: MIT
description: Generate governance rules for named journeys (multi-step flows, wizards), the generic journey-tier rules they share, and single-page patterns (e.g. a card) as YAML files, validated against JSON Schema. Unlike component specs (descriptive), journey/pattern files are rules-first — citable, severity-ranked composition rules spanning multiple steps/zones and components.
---

**Version:** 3.0.0
**Last Updated:** 2026-07-15

# AI Pattern Governance Generator (YAML)

Generate structured governance rules as three kinds of file:

- **`journey.governance.yaml`** — the single generic file of rules shared by
  every multi-step journey (e.g. "one forward action per step"). There is
  exactly one of these in a project, in the `governance/` folder.
- **`<journey-id>.governance.yaml`** — one per named, multi-step journey
  (e.g. a checkout flow), in `journeys/<journey-id>/`, inheriting the generic
  journey rules via `journey.extends` and optionally tightening one via
  `refines`.
- **`<pattern-id>.governance.yaml`** — one per named, single-page pattern
  (e.g. a card), in `patterns/<pattern-id>/`, governing composition within
  named **zones** on that one surface. Patterns don't inherit from a shared
  family.

All three are validated via JSON Schema through the `yaml-language-server`
comment, same mechanism as the sibling
[ai-component-metadata-yaml](https://github.com/robindicapua/ai-component-metadata-yaml)
skill.

## How this differs from component specs

The sibling skill (`ai-component-metadata-yaml`) splits a component's context
into a **descriptive spec** (`<component>.spec.yaml` — API, variants, a11y,
examples) and a **normative governance file** (`<component>.governance.yaml` —
anti-patterns and parent constraints for that one component). A spec
describes, governance prescribes.

Journey and pattern files are **rules-first and governance-only**: the bulk of
the file is `rules[]`, each a citable, severity-ranked rule about how
components compose *across* the steps of a journey, or *within a zone* of a
pattern. No single component's governance file can express "the confirmation
step must show a `success`-variant CTA, not `primary`" or "the card footer
holds at most two buttons" — those constraints only exist at the level of the
whole journey step or pattern zone. `aiHints` here is a thin tail (keywords
only), not a parallel section to `usage`/`behavior`/`variants`.

If what you're generating is scoped to one component, use
`ai-component-metadata-yaml` instead. If it spans multiple steps/components in
sequence, or you're authoring a rule shared by every journey, or it governs a
single-page composition, use this skill.

## Where files live

```
packages/ui/src/governance/journey.governance.yaml                     # generic journey rules (JRN-*)
packages/ui/src/journeys/<journey-id>/<journey-id>.governance.yaml    # one named journey (e.g. CHK-*)
packages/ui/src/patterns/<pattern-id>/<pattern-id>.governance.yaml    # one named pattern (e.g. CRD-*)
```

All three are **authored source of truth** — compiled by
`npm run sync:governance` into the generated agent index at
`.ai/governance/index.toon`. Never edit the generated index by hand; edit the
YAML and re-run the sync.

See `packages/ui/src/governance/MODEL.md` for the full governance model
(tiers, citation format, `refines`/`extends` semantics).

## Quick start — new named journey

```yaml
# yaml-language-server: $schema=../../../../../.agent/skills/ai-pattern-metadata-yaml/schemas/journey-instance-governance.schema.json
journey:
  name: Human Readable Name
  id: kebab-case-id
  scope: ABC              # 2-6 uppercase letters, prefixes every rule id (ABC-1, ABC-2...)
  category: domain-name
  extends: [journey]      # always [journey] today — inherits the generic JRN-* rules
  description: >
    What this journey represents and why it needs journey-level governance.

steps:
  - id: step-one
    name: Step One
    description: What the user is trying to accomplish here.
  - id: step-two
    name: Step Two
    description: ...
    isFinalStep: true

rules:
  - id: ABC-1
    title: Short human sentence naming the rule
    statement: >
      The binding rule text.
    rationale: >
      Why this rule exists.
    severity: error         # error | warning | info
    appliesWhen:
      journey: kebab-case-id
    provisions:
      - id: ABC-1.1
        step: step-one
        constraint: { type: required, component: Button, variant: primary, quantity: exactly-one }
        labelHint: Suggested label text (informational only)

aiHints:
  keywords: [domain, terms, that, trigger, this, journey]
  notes: >
    Guidance for AI agents on how to apply these rules holistically.
```

## Quick start — new pattern (single-page composition)

```yaml
# yaml-language-server: $schema=../../../../../.agent/skills/ai-pattern-metadata-yaml/schemas/pattern-governance.schema.json
pattern:
  name: Human Readable Name
  id: kebab-case-id
  scope: ABC              # 2-6 uppercase letters
  category: domain-name
  description: >
    What this pattern represents and why it needs pattern-level (not
    component-level) governance.

zones:
  - id: zone-one
    name: Zone One
    description: What this zone holds.

rules:
  - id: ABC-1
    title: Short human sentence naming the rule
    statement: >
      The binding rule text.
    rationale: >
      Why this rule exists.
    severity: warning       # error | warning | info
    appliesWhen:
      pattern: kebab-case-id
    provisions:
      - id: ABC-1.1
        zone: zone-one
        constraint: { type: limit, component: Button, max: 2 }

aiHints:
  keywords: [domain, terms, that, trigger, this, pattern]
  notes: >
    Guidance for AI agents on how to apply these rules holistically.
```

## Quick start — editing the generic journey rules

There is exactly one of these files per project —
`governance/journey.governance.yaml`. Only add to it when a rule genuinely
applies to *every* journey, not just one:

```yaml
# yaml-language-server: $schema=../../../../../.agent/skills/ai-pattern-metadata-yaml/schemas/journey-governance.schema.json
scope: JRN
tier: journey

description: >
  Governance rules shared by every multi-step journey.

triggers:
  - keyword-one
  - keyword-two

rules:
  - id: JRN-4
    title: Short human sentence naming the rule
    statement: >
      The binding rule text.
    rationale: >
      Why this rule exists.
    severity: warning
    appliesWhen:
      scope: step
```

## Core workflow

### 1. Decide what you're authoring

- **A brand-new named journey** (a multi-step flow that doesn't have a
  governance file yet) → go to [New journey](#2-new-journey).
- **A brand-new pattern** (a single-page composition that doesn't have a
  governance file yet) → go to [New pattern](#3-new-pattern).
- **A rule that should apply to every journey** → edit
  `governance/journey.governance.yaml` directly (see the quick start above) —
  there's only one such file; don't create a second.
- **Adding a rule to an existing journey or pattern** → go to
  [Adding a rule](#4-adding-a-rule-to-an-existing-journey-or-pattern).

### 2. New journey

1. Enumerate the steps — from sequential Figma frames, or from the app's
   routes/state machine if it's already coded. Each step gets a kebab-case
   `id` in `steps[]`. Mark the terminal step `isFinalStep: true`.
2. Pick a `scope` code (2-6 uppercase letters) that doesn't collide with an
   existing journey's or pattern's scope — check
   `packages/ui/src/journeys/*/*.governance.yaml` and
   `packages/ui/src/patterns/*/*.governance.yaml` for scopes already in use.
3. Set `extends: [journey]` — every named journey inherits the generic
   journey rules in `governance/journey.governance.yaml`. There's only one
   generic file; this is always the same value.
4. Walk each step and ask: what component/variant must be present, forbidden,
   or capped, across the *whole* step's composition (not one component's
   props)? Draft a rule per distinct constraint, with `provisions[]` pointing
   at the steps it applies to.
5. If a rule you're drafting would hold for *any* journey, not just this one,
   it belongs in `governance/journey.governance.yaml` instead, and this
   journey should rely on inheritance rather than repeating it. If you're not
   sure yet (e.g. this is the only journey that needs it so far), draft it
   here and add a `note:` flagging it as a promotion candidate once a second
   journey needs the same rule — this mirrors the existing `CHK-3` note in
   `checkout-flow.governance.yaml`.
6. Add the thin `aiHints` tail (keywords only — do not try to add
   `behavior`/`accessibility`/`variants` sections; those don't map to a whole
   journey and the schema doesn't have them).
7. Run `npm run sync:governance` and confirm it completes without error.

### 3. New pattern

1. Enumerate the zones — the named regions of the single page/surface (e.g.
   Header, Body, Footer for a card). Each zone gets a kebab-case `id` in
   `zones[]`.
2. Pick a `scope` code (2-6 uppercase letters) that doesn't collide with an
   existing journey's or pattern's scope — check
   `packages/ui/src/journeys/*/*.governance.yaml` and
   `packages/ui/src/patterns/*/*.governance.yaml` for scopes already in use.
3. Patterns don't inherit from a shared family — there's no `extends` for
   patterns today. Each pattern owns its rules outright.
4. Walk each zone and ask: what component/variant must be present, forbidden,
   or capped, across the *whole* zone's composition (not one component's
   props)? Draft a rule per distinct constraint, with `provisions[]` pointing
   at the zones it applies to. Use `constraint.min`/`.max` for bounded counts
   (e.g. `max: 2`) — patterns don't use the journey tier's fixed `quantity`
   enum, since that enum can't express arbitrary counts like "two".
5. Add the thin `aiHints` tail (keywords only — do not try to add
   `behavior`/`accessibility`/`variants` sections; those don't map to a whole
   pattern and the schema doesn't have them).
6. Run `npm run sync:governance` and confirm it completes without error.

### 4. Adding a rule to an existing journey or pattern

This is the common case once journeys/patterns already exist — e.g. "add a
rule that the payment step must show a security badge."

1. **Locate the file.** Named journeys live at
   `packages/ui/src/journeys/<journey-id>/<journey-id>.governance.yaml` (find
   by `journey.id` or `journey.name`, not folder guessing — `grep -r "id:
   <name>" packages/ui/src/journeys/`). Patterns live at
   `packages/ui/src/patterns/<pattern-id>/<pattern-id>.governance.yaml`. The
   generic journey rules live at the single file
   `packages/ui/src/governance/journey.governance.yaml`.
2. **Determine the next rule id.** Read the file's `journey.scope` /
   `pattern.scope` (or `scope` for the generic journey file), scan every
   existing `rules[].id` for that prefix, and use the next unused integer.
   Never reuse a retired id.
3. **Check for an existing generic journey rule with the same intent** (named
   journeys only — patterns have no generic layer to check). If one exists
   and this journey needs a stricter/more specific version, set
   `refines: <id>` on the new rule instead of duplicating its statement — the
   named-journey rule then supersedes the generic one wherever both would
   apply (lex specialis; see `CHK-1` refining `JRN-1` in
   `checkout-flow.governance.yaml`).
4. **Author the rule body**: `title`, `statement`, `rationale`, `severity`
   (`error`/`warning`/`info`), `appliesWhen`. Add `note:` only if there's a
   genuine authoring caveat (e.g. a future-promotion reminder) — omit
   otherwise.
5. **Add provisions.** Named journeys: each provision gets id
   `<rule-id>.<n>` (e.g. `CHK-4.1`), a `step` id from the journey's `steps[]`,
   and a `constraint` (`type: required|forbidden`, `component`, optional
   `variant`, optional `quantity`). Patterns: each provision gets id
   `<rule-id>.<n>` (e.g. `CRD-2.1`), a `zone` id from the pattern's `zones[]`,
   and a `constraint` (`type: required|forbidden|limit`, `component`,
   optional `variant`, optional `min`/`max`). The generic journey file has no
   per-step provisions in this schema — a generic rule's `appliesWhen.scope`
   covers all steps of every inheriting journey generically.
6. **Re-run `npm run sync:governance`** and check the diff to
   `.ai/governance/index.toon` looks like what you intended — one new row per
   rule/provision, `source` pointing back at the file you just edited.

### 5. Validate

- IDE validates automatically via the `yaml-language-server` comment (requires
  the Red Hat YAML extension).
- CLI validation (requires `js-yaml` + `ajv`):
  ```bash
  npx js-yaml path/to/checkout-flow.governance.yaml | npx ajv validate \
    -s .agent/skills/ai-pattern-metadata-yaml/schemas/journey-instance-governance.schema.json \
    -d /dev/stdin
  ```
  Swap the schema for `pattern-governance.schema.json` when validating a
  pattern file, or `journey-governance.schema.json` when validating the
  generic journey file.

## Schema reference

### `journey-governance.schema.json` — required: `scope`, `rules`

| Field | Required | Purpose |
|---|---|---|
| `scope` | Yes | Rule-id prefix for the generic journey rules (`JRN`) |
| `tier` | No | Always `"journey"` if present — documentation only |
| `description`, `triggers[]` | No | What a journey is + base intent-matching keywords |
| `rules[]` | Yes | Same shape as named-journey rules, minus `provisions` (generic journey rules apply generically via `appliesWhen.scope`, not per-step) |

### `journey-instance-governance.schema.json` — required: `journey`, `rules`

| Field | Required | Purpose |
|---|---|---|
| `journey.name`, `.id`, `.scope`, `.description` | Yes | Identity + the rule-id prefix |
| `journey.category`, `.extends` | No | Domain grouping; always `[journey]` when present |
| `steps[]` | No* | Ordered step ids/names, referenced by provisions for human-readable labels (*omit only if the journey has no per-step provisions*) |
| `rules[]` | Yes | `id`, `title`, `statement`, `severity` required; `rationale`, `refines`, `appliesWhen`, `note`, `provisions[]` optional |
| `rules[].provisions[]` | No | `id`, `step`, `constraint` required; `labelHint` optional |
| `aiHints.keywords`, `.notes` | No | Intent-matching terms + holistic-validation guidance |

### `pattern-governance.schema.json` — required: `pattern`, `rules`

| Field | Required | Purpose |
|---|---|---|
| `pattern.name`, `.id`, `.scope`, `.description` | Yes | Identity + the rule-id prefix |
| `pattern.category` | No | Domain grouping |
| `zones[]` | No* | Named region ids/names, referenced by provisions for human-readable labels (*omit only if the pattern has no per-zone provisions*) |
| `rules[]` | Yes | `id`, `title`, `statement`, `severity` required; `rationale`, `refines`, `appliesWhen`, `note`, `provisions[]` optional |
| `rules[].provisions[]` | No | `id`, `zone`, `constraint` required; `labelHint` optional |
| `aiHints.keywords`, `.notes` | No | Intent-matching terms + holistic-validation guidance |

## Severity

Per-rule, not file-wide — there is no journey- or pattern-level enforcement
knob. `error` = hard block, `warning` = flagged for review, `info` = advisory.
A named-journey rule that `refines` a generic journey rule may tighten (but
not loosen) its severity.

## Rule id conventions

- Scope codes are 2-6 uppercase letters, unique across every journey and
  pattern file in the repo (and the single generic journey file).
- Rule ids are `<SCOPE>-<n>` (e.g. `CHK-1`), never reused once retired.
- Provision ids are `<rule-id>.<n>` (e.g. `CHK-1.3`, `CRD-1.1`), one per
  step/zone the rule reaches.

## YAML quoting rules

Quote strings that contain: colons (`:`), `#`, `>`, `|`, `{`, `}`, `[`, `]`,
`&`, `*`, `!`, or that start with `@`, `` ` ``. Simple strings (ids, step/zone
names) don't need quotes.

## Best practices

1. **Rules are the content, not a bolt-on.** Don't pad a journey or pattern
   file with `usage`/`behavior`-style sections copied from component specs —
   they don't exist in these schemas and don't apply at journey/pattern
   scope.
2. **Push shared rules up, not down.** If a rule you're drafting for a named
   journey would hold for any journey, that's a signal to move it to
   `governance/journey.governance.yaml` and have every journey inherit it,
   rather than keeping copies in sync by hand. Patterns have no such shared
   layer today.
3. **Cite, don't restate.** When a named-journey rule refines a generic
   journey rule, reference it via `refines` — don't copy the generic rule's
   statement into the journey file.
4. **Always re-run the sync.** `npm run sync:governance` is what actually
   makes a new rule enforceable; an unsyncd governance-file edit is invisible
   to the governance index and to CI.
