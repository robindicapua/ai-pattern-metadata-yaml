# AI Pattern Metadata (YAML) — Claude Code Skill

A [Claude Code](https://claude.ai/code) skill that generates governance-shaped
metadata for multi-step patterns (flows, wizards) and class-tier laws shared
by a whole family of patterns. Metadata is written as `.pattern.yaml` and
`.class.yaml` files, validated against JSON Schema.

**Split out from** [ai-component-metadata-yaml](https://github.com/robindicapua/ai-component-metadata-yaml),
which generates metadata for individual components. Component metadata is
mostly descriptive (props, variants, accessibility); pattern metadata is
mostly prescriptive (composition laws that only make sense across multiple
steps/components) — different enough content models to warrant their own
skill rather than one schema trying to cover both.

---

## What it does

When you ask Claude to generate or update pattern metadata, this skill
instructs it to produce or edit a `.pattern.yaml` file (one per pattern) or a
`.class.yaml` file (one per shared family). Those files tell AI agents and the
governance pipeline:

- **What composition is required, forbidden, or capped** at each step of a
  flow (e.g. "the confirmation step must show exactly one `success`-variant
  CTA and must not show `danger`")
- **Which rules are shared** by every pattern in a class (e.g. every flow
  requires a back affordance after the first step), inherited via
  `pattern.extends`
- **Which pattern-specific rule supersedes a shared one** (`refines`, lex
  specialis)
- **How severe** each rule is (`error` / `warning` / `info`), authored per law

It does **not** cover single-component descriptive metadata (use cases, props,
accessibility, variants) — that's `ai-component-metadata-yaml`'s job.

---

## Why a separate skill from component metadata?

| | Component metadata | Pattern metadata |
|---|---|---|
| Primary content | Descriptive hints (`usage`, `behavior`, `accessibility`, `variants`) | Prescriptive laws (`laws[]`, `provisions[]`) |
| Scope | One component | Multiple steps / components |
| `aiHints` | A parallel section alongside several others | A thin tail (keywords only) |
| Consumed by | AI generation guidance | AI generation guidance **and** the governance sync pipeline (`.ai/governance/index.toon`) |

Trying to force both into one schema either bloats the component schema with
fields that don't apply to a single artifact, or leaves the pattern side
under-specified (which is what happened before this split — the shared schema
folder had a `pattern-metadata.schema.json` that nobody's workflow actually
documented how to use).

---

## Installation

### 1. Add the skill as a submodule (or copy it into your project)

```
.agent/skills/ai-pattern-metadata-yaml/
```

### 2. Tell Claude Code about it

In your project's `CLAUDE.md` or `AGENTS.md`, list it alongside your other
skills so agents know to check it before pattern/governance work.

### 3. (Optional) Enable IDE validation

```json
{
  "yaml.schemas": {
    ".agent/skills/ai-pattern-metadata-yaml/schemas/pattern-metadata.schema.json": [
      "**/*.pattern.yaml"
    ],
    ".agent/skills/ai-pattern-metadata-yaml/schemas/class-metadata.schema.json": [
      "**/*.class.yaml"
    ]
  }
}
```

---

## Usage

```
Add a law to the checkout-flow pattern: the payment step must show a security badge.
```

```
Create a new pattern for the onboarding wizard.
```

Claude will locate the right `.pattern.yaml`/`.class.yaml` file (or scaffold a
new one), assign the next law id for that scope, and validate against the
schema. See `SKILL.md` for the full workflow, including how it decides
between editing an existing pattern, editing a class, or creating a new one.

---

## Schemas

Two schemas ship with this skill — see `SKILL.md` → "Schema reference" for the
full field tables.

- **`pattern-metadata.schema.json`** — one pattern's identity, steps, and laws.
- **`class-metadata.schema.json`** — one class family's shared laws, inherited
  by every pattern that lists it in `pattern.extends`.

---

## License

MIT — see [SKILL.md](./SKILL.md) for full attribution.
