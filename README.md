# Governance Authoring (YAML) — Claude Code Skill

A [Claude Code](https://claude.ai/code) skill that owns the **file format** for
the design system's normative governance — the citable, severity-ranked rules
about what you *must or must not do* — at **every tier**, authored as YAML and
validated against JSON Schema:

- **Component** (`<component>.governance.yaml`) — anti-patterns and parent
  constraints about a single component's own use
- **Pattern** (`<pattern-id>.governance.yaml`) — composition rules within the
  named zones of one single-page surface (e.g. a card)
- **Named journey** (`<journey-id>.governance.yaml`) — composition rules across
  the steps of one multi-step flow (e.g. checkout), inheriting shared rules via
  `journey.extends`
- **Generic journey** (`journey.governance.yaml`) — the single shared file of
  rules every journey inherits

**v4** folds component-tier governance back in (it previously lived in the
component metadata skill), so this skill now covers every governance file
format. Descriptive component data — API, variants, accessibility, examples —
is the job of the sibling
[component-spec](https://github.com/robindicapua/component-spec) skill. **A spec
describes, governance prescribes.**

---

## This skill (format) vs. governance-encode (process)

This skill is the **format reference**: given a known tier, it tells you the
exact YAML shape to author. It does **not** decide *whether* a rule should
exist, *which tier* it belongs to, or *what citation id* it gets — that is the
job of the project's **governance-encode** skill (the write-path process:
gate-check → dedupe → classify tier → assign id → `sync:governance`).
governance-encode reads this skill mid-flow to author the file; you rarely open
this one cold.

---

## What it does

When you (or governance-encode) author governance, this skill instructs Claude
to produce or edit the right file for the tier:

- **A component rule** — an anti-pattern ("don't use Button for navigation") or
  a parent-constraint ("no `danger` variant inside a confirmation context")
- **What composition is required, forbidden, or capped** at each step of a
  journey ("the confirmation step must show exactly one `success`-variant CTA
  and must not show `danger`") or each zone of a pattern ("the card footer
  holds at most two buttons")
- **Which rules are shared** by every journey, inherited via `journey.extends`
- **Which named-journey rule supersedes a shared one** (`refines`, lex
  specialis)
- **How severe** each rule is (`error` / `warning` / `info`), authored per rule

It does **not** cover descriptive component context (specs) — that's the
[component-spec](https://github.com/robindicapua/component-spec) skill's job.

---

## Why the tiers share one skill

The governance tiers differ in *shape* (component rules use
`kind: anti-pattern | parent-constraint`; pattern/journey rules use
`provisions` anchored to zones/steps), but they share the *frame*: citable,
id-stable, severity-ranked normative rules compiled by `sync:governance` into
one agent index. The meaningful seam isn't component-vs-composition — it's
**describe vs. prescribe**. Everything prescriptive lives here; everything
descriptive lives in `component-spec`.

---

## Installation

### 1. Add the skill as a submodule (or copy it into your project)

```
.agent/skills/governance-authoring/
```

### 2. Tell Claude Code about it

In your project's `CLAUDE.md` or `AGENTS.md`, list it alongside your other
skills so agents know to check it before authoring governance.

### 3. (Optional) Enable IDE validation

```json
{
  "yaml.schemas": {
    ".agent/skills/governance-authoring/schemas/component-governance.schema.json": [
      "packages/ui/src/components/**/*.governance.yaml"
    ],
    ".agent/skills/governance-authoring/schemas/journey-governance.schema.json": [
      "packages/ui/src/governance/journey.governance.yaml"
    ],
    ".agent/skills/governance-authoring/schemas/journey-instance-governance.schema.json": [
      "packages/ui/src/journeys/**/*.governance.yaml"
    ],
    ".agent/skills/governance-authoring/schemas/pattern-governance.schema.json": [
      "packages/ui/src/patterns/**/*.governance.yaml"
    ]
  }
}
```

---

## Usage

```
Add a rule to the checkout-flow journey: the payment step must show a security badge.
```

```
Create a new pattern for a filter bar.
```

```
Encode a Button anti-pattern: never use Button for navigation.
```

Claude will locate the right governance file (or scaffold a new one), assign
the next rule id for that scope, and validate against the schema. See
`SKILL.md` for the full workflow, including how it decides between component,
pattern, named-journey, and generic-journey files.

---

## Schemas

Four schemas ship with this skill — see `SKILL.md` → "Schema reference" for the
full field tables.

- **`component-governance.schema.json`** — one component's anti-patterns and
  parent constraints (`kind: anti-pattern | parent-constraint`).
- **`journey-governance.schema.json`** — the single file of generic journey
  rules, inherited by every named journey via `journey.extends: [journey]`.
- **`journey-instance-governance.schema.json`** — one named journey's identity,
  steps, and rules.
- **`pattern-governance.schema.json`** — one pattern's identity, zones, and
  rules. No inheritance — each pattern owns its rules outright.

---

## License

MIT — see [SKILL.md](./SKILL.md) for full attribution.
