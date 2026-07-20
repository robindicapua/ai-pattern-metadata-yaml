---
name: governance-check
description: >
  Checks a design — in Figma, in code, or in a Storybook story — against the
  design system's governance rules. Resolves only the rules that apply to what is
  being built (via the .ai/governance TOON index), evaluates the composition, and
  reports pass/fail per rule with citations. Use before finalizing a Figma design,
  before opening a PR, or whenever the user asks to "check governance", "validate
  against the rules", "does this follow the design system rules", or audits a flow,
  screen, or component composition. The model is documented in
  MODEL.md.
---

# Governance Check

Evaluate an artifact against the design system's **governance rules** and report
whether it complies. Rules are authored in YAML and compiled into a token-cheap
index at `.ai/governance/`. The whole point of the index is that you load **only
the rules that apply** — never the entire body of rules.

Read `MODEL.md` once if you are unfamiliar with the
tiers (global / component / journey / pattern), the citation scheme (`CHK-1.2`),
or the index layout.

## Inputs

One of:
- **Figma** — a selected frame / flow (read it via the Figma MCP tools).
- **Code** — a component, journey, or pattern file / diff.
- **Storybook** — one or more stories used as composition fixtures.

If the target is ambiguous, ask the user what to check before proceeding.

## Procedure

### 1. Classify — what is being built?
This is the only interpretive step; keep it tight.
- Identify the **components** present (Button, TextInput, …).
- Identify whether the artifact is an instance of a named **journey** — a
  composition across **multiple pages/steps** in sequence (e.g. a checkout
  flow) — look for multi-step structure, step names, or the user naming it.
- Identify whether the artifact is an instance of a named **pattern** — a
  composition on **one page/surface** (e.g. a card) — look for named zones
  (header/body/footer, etc.) or the user naming it.
- Identify any **context/situation** (e.g. an email-collection form).
- Note distinguishing facts a rule might hinge on: step or zone, which step is
  terminal, variants used, counts of each variant.

### 2. Resolve — which rules apply?
- Read `.ai/governance/index.toon` (the only generated file — thin router rows).
- Select rule rows where:
  - `tier: global` → **always** applies.
  - `tier: journey` (generic, e.g. `JRN-*`) and a `trigger` matches (e.g. a
    flow-shaped task matches these).
  - `tier: journey` (named, e.g. `CHK-*`) and the named journey matches the
    classification, OR a `trigger` keyword matches.
  - `tier: component` and the `scope`/`triggers` match a component present.
  - `tier: pattern` (e.g. `CRD-*`) and the named pattern matches the
    classification, OR a `trigger` keyword matches.
- **Apply lex specialis (the `refines` column).** If a selected rule has a
  `refines` value and that target rule is *also* in the selected set, the refining
  (more specific) rule wins — **drop the target** so the same issue isn't reported
  twice. Example: in checkout, `CHK-1` refines `JRN-1`, so evaluate `CHK-1` and
  suppress `JRN-1`. Outside checkout, a plain journey keeps `JRN-1`.
- For each surviving row, open its `source` (`<file>#<ruleId>`, authored YAML) to
  read the full statement, rationale, `appliesWhen`, constraint, and any
  `provisions`. The id is authored in the YAML across all tiers — grep it to land
  on the rule.
- Open `source` files **only** for rules that survived — never read them all.

### 3. Evaluate — does it comply?
For each resolved rule (and each `provision`, scoped to its `step` or `zone`):
- Check the constraint against the actual composition. Journey and pattern rules
  are **compositional** — judge them against *all* components in the relevant
  step or zone, not any single component in isolation.
- A journey provision with `type: required` + `quantity` (exactly-one /
  at-most-one) must hold for that step; `type: forbidden` must not appear.
- A pattern provision with `type: limit` + `min`/`max` must hold for that
  zone's instance count; `type: required`/`forbidden` behave the same as for
  journeys.
- Respect `appliesWhen` — a rule scoped to `step: order-confirmation` only binds
  the terminal step; a rule scoped to a specific `zone` (e.g. `footer`) only
  binds that zone.

### 4. Report
Produce a compact verdict table. For each evaluated rule:

| Citation | Severity | Verdict | Where | Note |
|---|---|---|---|---|
| `CHK-1.2` | error | ✅ pass / ❌ fail / ⚠️ n/a | payment step | one-line reason |

Then:
- **Summary line**: counts of pass / fail by severity (`error` fails block;
  `warning`/`info` advise).
- For each ❌, give the citation, the rule statement, and the smallest concrete
  fix (cite the `rationale`, don't invent new reasoning).
- If a rule was **skipped**, say why (didn't apply) — never silently drop one.
- If an `error`-severity rule fails, state plainly that the artifact does not
  comply and an explicit override (per MODEL.md) would be required to proceed.

## Notes
- Never hand-edit `.ai/governance/*.toon`; it is generated. If it looks stale,
  run `npm run sync:governance`.
- Mechanical rules (e.g. "use a token, not a hex") can also be checked by a
  linter; this skill covers the compositional/semantic rules a linter cannot.
- Report only what the rules say. This skill enforces the rules; it does not
  legislate new ones.
