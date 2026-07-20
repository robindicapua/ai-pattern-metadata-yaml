---
name: governance-authoring
version: 4.0.0
author: Robin Di Capua
based_on: "ai-pattern-metadata-yaml by Robin Di Capua — which split composition governance out of ai-component-metadata-yaml. v4 folds component-tier governance back in, so this skill now owns every governance file FORMAT across tiers, and the sibling component-spec skill is purely descriptive."
license: MIT
description: Author the design system's normative governance files at every tier — component (anti-patterns, parent constraints), single-page pattern (zones), named journey (multi-step flows), and the shared generic journey rules — as YAML validated against JSON Schema. This skill owns the file FORMAT for governance; the governance-encode skill owns the write-path PROCESS (tier classification, citation ids, dedupe, sync) and delegates format authoring here. A spec describes, governance prescribes — descriptive component data lives in the component-spec skill; everything normative lives here.
---

**Version:** 4.0.0
**Last Updated:** 2026-07-20

# Governance Authoring (YAML)

This skill owns the **file format** for the design system's normative
governance — the citable, severity-ranked rules about what you *must or must
not do*, authored in YAML next to the thing they govern and compiled by
`npm run sync:governance` into the agent index at `.ai/governance/index.toon`.

It covers every tier where rules are co-located:

| Tier | File | Rule shape |
|---|---|---|
| **Component** (`BTN`, …) | `components/<c>/<c>.governance.yaml` | `kind: anti-pattern \| parent-constraint` |
| **Pattern** (`CRD`, …) | `patterns/<p>/<p>.governance.yaml` | `rules[]` with `provisions` anchored to **zones** |
| **Named journey** (`CHK`, …) | `journeys/<j>/<j>.governance.yaml` | `rules[]` with `provisions` anchored to **steps**, `extends: [journey]` |
| **Generic journey** (`JRN`) | `governance/journey.governance.yaml` | the single shared file of rules every journey inherits |

(Global `GLB` rules and the routing decisions are handled by
`governance-encode` directly — see below.)

## This skill (format) vs. governance-encode (process)

Keep the two straight:

- **`governance-encode`** is the **write-path process**: it gate-checks a
  proposed rule (is it testable? already covered?), classifies its **tier**,
  assigns a **stable citation id**, runs `sync:governance`, and handles
  amend/repeal. It does **not** define file formats — it *delegates* to this
  skill.
- **This skill** is the **format reference**: given a known tier, it tells you
  the exact YAML shape to author. It does **not** classify tiers or invent
  citation ids — that's governance-encode's job.

So: deciding *whether* and *where* a rule goes → start at governance-encode.
Authoring the YAML for a *known* tier → follow the matching section here. In
practice governance-encode reads this skill mid-flow; you rarely open this one
cold.

**A spec describes, governance prescribes.** Descriptive component data (API,
variants, a11y, examples) lives in the [component-spec](https://github.com/robindicapua/component-spec)
skill. Everything normative lives here. Nothing normative belongs in a
`.spec.yaml`; nothing descriptive belongs in a `.governance.yaml`.

---

# 1. Component governance

Rules about a **single component's own use** — what to avoid with it, and which
of its variants are forbidden inside a named parent context. A component with
no rules simply has no governance file; only create one when a real rule
exists.

**File:** `components/<component>/<component>.governance.yaml`, beside the
component's `<component>.spec.yaml`. Never author rules inside the spec.

```yaml
# yaml-language-server: $schema=../../../../../.agent/skills/governance-authoring/schemas/component-governance.schema.json
component:
  name: ComponentName
  scope: XXX                    # scope code from the governance registry; prefixes every rule id
rules:
  - id: XXX-1
    kind: anti-pattern          # a usage to avoid
    scenario: What NOT to do.
    reason: Why it's wrong.
    alternative: What to do instead.
    # severity: warning         # optional — defaults: anti-pattern → info, parent-constraint → warning
  - id: XXX-2
    kind: parent-constraint     # variants forbidden in a named context
    context: named-parent-context
    forbidden:
      - variant: danger
        reason: Why this variant is wrong here.
    # recommended:              # optional — variants to prefer instead
    #   - variant: primary
```

**Rule kinds:**

| `kind` | Required fields | Purpose |
|---|---|---|
| `anti-pattern` | `scenario`, `reason`, `alternative` | A usage to avoid, with a stable citation |
| `parent-constraint` | `context` (+ `forbidden` / `recommended`) | Variants restricted within a named parent context |

Rule ids are authored and stable — never renumber, never reuse a retired id.
To repeal, add `status: repealed` and leave the entry in place.

Component-tier rules apply whenever *that component* is used, so they don't
carry `provisions`/`appliesWhen` the way composition rules do — the component's
presence is the trigger.

---

# 2. Pattern governance (single-page composition)

Rules governing composition **within named zones of one surface** (e.g. a
card's Header / Body / Footer). Patterns don't inherit from a shared family —
each owns its rules outright.

**File:** `patterns/<pattern-id>/<pattern-id>.governance.yaml`

```yaml
# yaml-language-server: $schema=../../../../../.agent/skills/governance-authoring/schemas/pattern-governance.schema.json
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

---

# 3. Named journey governance (multi-step flow)

Rules spanning the **steps of one named journey** (e.g. checkout). Inherits the
generic journey rules via `extends: [journey]`, and may tighten one via
`refines`.

**File:** `journeys/<journey-id>/<journey-id>.governance.yaml`

```yaml
# yaml-language-server: $schema=../../../../../.agent/skills/governance-authoring/schemas/journey-instance-governance.schema.json
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

---

# 4. Generic journey governance (the one shared file)

There is exactly **one** of these per project —
`governance/journey.governance.yaml`. Only add to it when a rule genuinely
applies to *every* journey, not just one:

```yaml
# yaml-language-server: $schema=../../../../../.agent/skills/governance-authoring/schemas/journey-governance.schema.json
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

---

## Core workflow

### 1. Decide what you're authoring

- **A component rule** (about one component's own use) → §1. File lives beside
  the component's spec.
- **A brand-new pattern** (single-page composition without a governance file) →
  §2, then [New pattern](#new-pattern).
- **A brand-new named journey** (multi-step flow without a governance file) →
  §3, then [New journey](#new-journey).
- **A rule that should apply to every journey** → edit
  `governance/journey.governance.yaml` directly (§4) — there's only one such
  file; don't create a second.
- **Adding a rule to an existing pattern or journey** → go to
  [Adding a rule](#adding-a-rule-to-an-existing-journey-or-pattern).

If you're unsure which tier a rule belongs to (component vs. pattern is the
common ambiguity), that's a **governance-encode** decision — don't guess here.

### New pattern

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

### New journey

1. Enumerate the steps — from sequential Figma frames, or from the app's
   routes/state machine if it's already coded. Each step gets a kebab-case
   `id` in `steps[]`. Mark the terminal step `isFinalStep: true`.
2. Pick a `scope` code (2-6 uppercase letters) that doesn't collide with an
   existing journey's or pattern's scope.
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
6. Add the thin `aiHints` tail (keywords only).
7. Run `npm run sync:governance` and confirm it completes without error.

### Adding a rule to an existing journey or pattern

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

### Adding a rule to an existing component

1. **Locate or create the file** at
   `packages/ui/src/components/<component>/<component>.governance.yaml`. If the
   component has no governance file yet, create one next to its `.spec.yaml`
   with the `component: { name, scope }` header from §1.
2. **Determine the next rule id** for the component's `scope`, scanning
   existing `rules[].id`. Never reuse a retired id.
3. **Author the rule** as an `anti-pattern` or `parent-constraint` (§1).
4. **Re-run `npm run sync:governance`** and check the index diff.

### Validate

- IDE validates automatically via the `yaml-language-server` comment (requires
  the Red Hat YAML extension).
- CLI validation (requires `js-yaml` + `ajv`):
  ```bash
  npx js-yaml path/to/checkout-flow.governance.yaml | npx ajv validate \
    -s .agent/skills/governance-authoring/schemas/journey-instance-governance.schema.json \
    -d /dev/stdin
  ```
  Swap the schema for `pattern-governance.schema.json` (pattern),
  `journey-governance.schema.json` (generic journey), or
  `component-governance.schema.json` (component) as appropriate.

## Schema reference

Four schemas ship with this skill, one per tier:

### `component-governance.schema.json` — required: `component`, `rules`

| Field | Required | Purpose |
|---|---|---|
| `component.name`, `.scope` | Yes | Component identity + the rule-id prefix |
| `rules[]` | Yes | `id`, `kind` required; `anti-pattern` also needs `scenario`/`reason`/`alternative`; `parent-constraint` needs `context` (+ `forbidden`/`recommended`) |
| `rules[].severity`, `.status` | No | Override the kind default; `status: repealed` retires the citation |

### `pattern-governance.schema.json` — required: `pattern`, `rules`

| Field | Required | Purpose |
|---|---|---|
| `pattern.name`, `.id`, `.scope`, `.description` | Yes | Identity + the rule-id prefix |
| `pattern.category` | No | Domain grouping |
| `zones[]` | No* | Named region ids/names, referenced by provisions for human-readable labels (*omit only if the pattern has no per-zone provisions*) |
| `rules[]` | Yes | `id`, `title`, `statement`, `severity` required; `rationale`, `refines`, `appliesWhen`, `note`, `provisions[]` optional |
| `rules[].provisions[]` | No | `id`, `zone`, `constraint` required; `labelHint` optional |
| `aiHints.keywords`, `.notes` | No | Intent-matching terms + holistic-validation guidance |

### `journey-instance-governance.schema.json` — required: `journey`, `rules`

| Field | Required | Purpose |
|---|---|---|
| `journey.name`, `.id`, `.scope`, `.description` | Yes | Identity + the rule-id prefix |
| `journey.category`, `.extends` | No | Domain grouping; always `[journey]` when present |
| `steps[]` | No* | Ordered step ids/names, referenced by provisions for human-readable labels (*omit only if the journey has no per-step provisions*) |
| `rules[]` | Yes | `id`, `title`, `statement`, `severity` required; `rationale`, `refines`, `appliesWhen`, `note`, `provisions[]` optional |
| `rules[].provisions[]` | No | `id`, `step`, `constraint` required; `labelHint` optional |
| `aiHints.keywords`, `.notes` | No | Intent-matching terms + holistic-validation guidance |

### `journey-governance.schema.json` — required: `scope`, `rules`

| Field | Required | Purpose |
|---|---|---|
| `scope` | Yes | Rule-id prefix for the generic journey rules (`JRN`) |
| `tier` | No | Always `"journey"` if present — documentation only |
| `description`, `triggers[]` | No | What a journey is + base intent-matching keywords |
| `rules[]` | Yes | Same shape as named-journey rules, minus `provisions` (generic journey rules apply generically via `appliesWhen.scope`, not per-step) |

## Severity

Per-rule, not file-wide — there is no journey- or pattern-level enforcement
knob. `error` = hard block, `warning` = flagged for review, `info` = advisory.
Component-kind defaults: `parent-constraint` → warning, `anti-pattern` → info.
A named-journey rule that `refines` a generic journey rule may tighten (but
not loosen) its severity.

## Rule id conventions

- Scope codes are 2-6 uppercase letters, unique across every component,
  journey, and pattern file in the repo (and the single generic journey file).
- Rule ids are `<SCOPE>-<n>` (e.g. `CHK-1`, `BTN-2`), never reused once retired.
- Provision ids are `<rule-id>.<n>` (e.g. `CHK-1.3`, `CRD-1.1`), one per
  step/zone the rule reaches. Component rules don't use provisions.

## YAML quoting rules

Quote strings that contain: colons (`:`), `#`, `>`, `|`, `{`, `}`, `[`, `]`,
`&`, `*`, `!`, or that start with `@`, `` ` ``. Simple strings (ids, step/zone
names) don't need quotes.

## Best practices

1. **Rules are the content, not a bolt-on.** Don't pad a governance file with
   `usage`/`behavior`-style sections copied from component specs — they don't
   exist in these schemas and don't apply at governance scope.
2. **Push shared journey rules up, not down.** If a rule you're drafting for a
   named journey would hold for any journey, move it to
   `governance/journey.governance.yaml` and have every journey inherit it,
   rather than keeping copies in sync by hand. Patterns and components have no
   such shared layer today.
3. **Cite, don't restate.** When a named-journey rule refines a generic
   journey rule, reference it via `refines` — don't copy the generic rule's
   statement into the journey file.
4. **Let governance-encode drive tier + citation.** This skill is the format;
   don't classify tiers or invent ids here — that's governance-encode's job.
5. **Always re-run the sync.** `npm run sync:governance` is what actually
   makes a new rule enforceable; an unsyncd governance-file edit is invisible
   to the governance index and to CI.
