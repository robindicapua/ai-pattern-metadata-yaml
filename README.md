# AI Pattern Governance (YAML) — Claude Code Skill

A [Claude Code](https://claude.ai/code) skill that generates governance rules
for named journeys (multi-step flows, wizards), the generic journey-tier rules
they share, and single-page patterns (e.g. a card). Rules are written as
`journey.governance.yaml` (generic), `<journey-id>.governance.yaml` (named),
and `<pattern-id>.governance.yaml` (single-page) files, validated against
JSON Schema.

**Split out from** [ai-component-metadata-yaml](https://github.com/robindicapua/ai-component-metadata-yaml),
which generates specs and governance for individual components. A component
spec is descriptive (props, variants, accessibility); journey/pattern files
are prescriptive (composition rules that only make sense across multiple
steps/components, or within one composition's zones) — different enough
content models to warrant their own skill rather than one schema trying to
cover both.

---

## What it does

When you ask Claude to generate or update journey/pattern governance, this
skill instructs it to produce or edit a named journey's governance file (one
per journey), the single generic `journey.governance.yaml` (shared rules), or
a pattern's governance file (one per single-page pattern). Those files tell AI
agents and the governance pipeline:

- **What composition is required, forbidden, or capped** at each step of a
  journey (e.g. "the confirmation step must show exactly one `success`-variant
  CTA and must not show `danger`") or each zone of a pattern (e.g. "the card
  footer holds at most two buttons")
- **Which rules are shared** by every journey (e.g. every journey requires a
  back affordance after the first step), inherited via `journey.extends`
- **Which named-journey rule supersedes a shared one** (`refines`, lex
  specialis)
- **How severe** each rule is (`error` / `warning` / `info`), authored per rule

It does **not** cover single-component context (specs or component-tier
rules) — that's `ai-component-metadata-yaml`'s job.

---

## Why a separate skill from component specs?

| | Component spec + governance | Journey/pattern governance |
|---|---|---|
| Primary content | Descriptive spec (`usage`, `behavior`, `accessibility`, `variants`) + per-component rules | Prescriptive composition rules (`rules[]`, `provisions[]`) |
| Scope | One component | Multiple steps/components (journey), or one zoned surface (pattern) |
| `aiHints` | A parallel section alongside several others | A thin tail (keywords only) |
| Consumed by | AI generation guidance + the governance sync pipeline | AI generation guidance **and** the governance sync pipeline (`.ai/governance/index.toon`) |

Trying to force both into one schema either bloats the component schema with
fields that don't apply to a single artifact, or leaves the journey/pattern
side under-specified.

---

## Installation

### 1. Add the skill as a submodule (or copy it into your project)

```
.agent/skills/ai-pattern-metadata-yaml/
```

### 2. Tell Claude Code about it

In your project's `CLAUDE.md` or `AGENTS.md`, list it alongside your other
skills so agents know to check it before journey/pattern/governance work.

### 3. (Optional) Enable IDE validation

```json
{
  "yaml.schemas": {
    ".agent/skills/ai-pattern-metadata-yaml/schemas/journey-governance.schema.json": [
      "packages/ui/src/governance/journey.governance.yaml"
    ],
    ".agent/skills/ai-pattern-metadata-yaml/schemas/journey-instance-governance.schema.json": [
      "packages/ui/src/journeys/**/*.governance.yaml"
    ],
    ".agent/skills/ai-pattern-metadata-yaml/schemas/pattern-governance.schema.json": [
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

Claude will locate the right governance file (or scaffold a new one), assign
the next rule id for that scope, and validate against the schema. See
`SKILL.md` for the full workflow, including how it decides between editing an
existing journey, editing a pattern, or editing the generic journey rules.

---

## Schemas

Three schemas ship with this skill — see `SKILL.md` → "Schema reference" for
the full field tables.

- **`journey-governance.schema.json`** — the single file of generic journey
  rules, inherited by every named journey via `journey.extends: [journey]`.
- **`journey-instance-governance.schema.json`** — one named journey's
  identity, steps, and rules.
- **`pattern-governance.schema.json`** — one pattern's identity, zones, and
  rules. No inheritance — each pattern owns its rules outright.

---

## License

MIT — see [SKILL.md](./SKILL.md) for full attribution.
