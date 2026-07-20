# Governance Model

> **governance-kit starter.** You own this file after `init` — tune the tiers and
> the scope-code registry (§2) to your project. The model *concepts* (tiers,
> citations, `refines`/`extends`) are meant to carry over as-is.

The design system's context splits into two kinds, told apart by one test:
**a spec describes, governance prescribes.** A spec cannot be violated — it
states what a component *is* (API, variants, accessibility). A governance rule
can — it states what you *must or must not do*. Files are named accordingly:

- `*.spec.yaml` — descriptive component specs (props, variants, a11y, usage
  examples, AI hints).
- `*.governance.yaml` — normative rules, at every tier.

Each rule has a stable **citation**, a **tier** that says how widely it
applies, and a plain-language **statement** and **rationale**. Authors write
rules in YAML next to the thing they govern; a generator compiles them into a
single token-cheap index the AI agent reads to decide *which rules apply to
the task in front of it* — without loading every rule every time.

This file is the source of truth for **how the system itself works**. The
global rules that belong to no single component or pattern live next to it in
`global.governance.yaml`.

---

## 1. Tiers (jurisdiction)

A rule's **tier** is its standing — how widely it applies. The tier is the
segment that drives retrieval: the agent resolves the applicable tiers for a
task, then loads only those rules.

| Tier | Scope code | Applies when… | Authored in | Status |
|---|---|---|---|---|
| **Global** | `GLB` | always — foundational principles | `governance/global.governance.yaml` | active |
| **Component** | per component (`BTN`, `INP`, …) | that component is used | `components/<c>/<c>.governance.yaml` | active |
| **Journey** | `JRN` (generic) + per named journey (`CHK`, …) | the task is journey-shaped (any multi-step flow), or a named journey (checkout) is built | `governance/journey.governance.yaml` (generic) + `journeys/<id>/<id>.governance.yaml` (named) | active |
| **Pattern** | per pattern (`CRD`, …) | that named single-page pattern (e.g. Card) is built | `patterns/<id>/<id>.governance.yaml` | active |
| **Context** | per situation (`CONF`, …) | a recurring *situation* is detected (not a named component or pattern) | `governance/contexts/*.governance.yaml` | **deferred** — formalize at ~3 rules |

**Context vs. Pattern vs. Journey vs. Component** — a *component* is a named
thing (`Button`); a *pattern* is a composition that lives on **one page**
(`Card`); a *journey* is a composition across **multiple pages** in sequence
(`checkout-flow`); a *context* is a recurring *circumstance* that can appear
inside many screens (e.g. "destructive confirmation"). The context tier is
recognized but **deferred**: no context rules exist yet, and it will be
formalized once enough recurring situations accumulate (~3 rules) to justify
its own `governance/contexts/`.

**Journey** is the shared-family tier for multi-step flows: when checkout,
onboarding, and a wizard all share a rule ("one forward action per step"), that
rule is written once at `JRN-*` (in the single generic
`governance/journey.governance.yaml` file — there's no per-family variation,
since "journey" already covers every multi-step flow), and each named journey
does `extends: [journey]`. See §2.1 for how `extends` and `refines` work.
**Pattern** has no such shared-family layer today — each pattern (e.g. Card)
owns its rules outright, since patterns don't compose across multiple named
patterns the way journeys share a step shape.

---

## 2. Citation (rule IDs)

```
<SCOPE>-<n>[.<m>]
```

- `<SCOPE>` — the scope code from the tier table; it also tells you the tier.
- `<n>` — the **rule** number within that scope. The meaning lives in `title` /
  `statement`, not the key.
- `.<m>` — an optional **provision**: the same rule applied to a specific situation.

**Ids are authored, not derived — across every tier.** You write the id in the
YAML (`id: BTN-2`), the generator only *validates* it (unique, prefixed with the
component's scope). This is what makes a citation stable: an authored id survives
both reordering the list and rewording the rule, whereas anything derived from
position or text would not. Follow the legal convention — when a rule is repealed,
its number is **retired, never reused**, so gaps are expected and fine. To repeal,
mark the entry `status: repealed` in its authored YAML and leave it in place: the
generator drops it from the index and fails the build if any active rule reuses
its id.

Decimals group a principle with its applications, the way a statute groups a section
with its subsections. Example — one checkout rule applied at three steps:

```
CHK-1        One primary CTA per checkout step          ← the rule
  CHK-1.1      cart-review    → exactly-one
  CHK-1.2      payment        → exactly-one
  CHK-1.3      confirmation   → at-most-one
```

The short, stable citation is what you reference from code comments, decision
records, and exception overrides (e.g. `// overrides CHK-1.2`).

No `GOV-` prefix — everything here is governance, so it would be noise.

### Scope-code registry

| Code | Tier | Subject |
|---|---|---|
| `GLB` | global | design-system-wide principles |
| `JRN` | journey (generic) | multi-step journeys (checkout, onboarding, wizards) |
| `BTN` | component | Button |
| `CAR` | component | Card |
| `CBX` | component | Checkbox |
| `FCH` | component | FilterChip |
| `ICO` | component | Icon |
| `RAD` | component | Radio |
| `TIN` | component | TextInput |
| `TTL` | component | Title |
| `CHK` | journey (named) | Checkout Flow |
| `CRD` | pattern | Card |
| `CONF` | context | destructive-confirmation situation *(deferred)* |

New components/journeys/patterns claim a new code here when first governed.

A subject may be governed at more than one tier, with a **distinct code per
tier**. Card is the first: it is governed both as a component (`CAR` — rules
about the component itself, e.g. no clickable-container Card) and as a pattern
(`CRD` — rules about composition inside its zones, e.g. footer holds ≤ 2
buttons). The scope code, not the subject name, is what maps 1:1 to a tier.

### 2.1 Inheritance: `extends` and `refines`

The generic journey rules let every named journey share a rule without copying
it. Two authored links wire it together:

- **`extends`** (on a named journey) — `journey.extends: [journey]` opts the
  journey into the shared rules. The generator unions the journey's `keywords`
  onto the generic journey rules' triggers, so they resolve for that journey's
  tasks too (e.g. a "checkout" task now also matches `JRN-1`).
- **`refines`** (on a rule) — `refines: JRN-1` declares this rule the more specific
  realization of a generic journey rule. At resolve time, if both a rule and the
  rule it refines are in scope, the **refining (specific) rule wins and the
  general one is suppressed** — *lex specialis*. This prevents double-reporting
  the same issue and lets a named journey tighten severity (e.g. `JRN-1` is a
  `warning` for any journey; `CHK-1` refines it to an `error` in checkout).

Patterns have no equivalent shared-family layer today — each pattern (e.g.
Card) owns its rules outright.

Worked example — "one forward action per step" at three strengths:

```
GLB-2   info     Prefer a single dominant primary action     (universal nudge; landing pages may have several CTAs)
JRN-1   warning  One forward action per journey step         (any journey — checkout, onboarding, wizard)
CHK-1   error    One forward CTA per checkout step  refines JRN-1  (checkout tightens it, and suppresses JRN-1 there)
```

---

## 3. Anatomy of a rule

```yaml
- id: CHK-1
  title: One primary CTA per checkout step      # short human sentence
  statement: >                                   # the binding text
    Each checkout step exposes a single primary call-to-action.
  rationale: >                                   # why — the valuable, prose part
    Competing primary actions create ambiguity at a high-intent decision point.
  severity: error                                # error | warning | info
  appliesWhen:                                   # the trigger / jurisdiction
    journey: checkout-flow
  provisions:                                    # optional — the .m applications
    - id: CHK-1.1
      step: cart-review
      constraint: { component: Button, variant: primary, quantity: exactly-one }
      labelHint: Proceed to checkout
```

Component rules use the same `rules:` list but carry a `kind` instead of
`provisions` — the two kinds mirror how component rules are expressed:

```yaml
rules:
  - id: BTN-2
    kind: anti-pattern            # a usage to avoid
    scenario: Placing two primary buttons next to each other.
    reason: Creates competing visual hierarchy.
    alternative: Use one primary button alongside an outline button variant.
  - id: XXX-1
    kind: parent-constraint       # variants forbidden in a named context
    context: checkout-flow
    forbidden: [{ variant: danger }]
```

**Severity is authored per rule** (`error` | `warning` | `info`) — it is the
single mechanism for how hard a rule pushes back. There is no separate
journey/pattern-wide "enforcement level" knob; each rule states its own
severity. Global, journey, and pattern rules always author it. Component rules
may author it too, but default when omitted: `parent-constraint` → `warning`,
`anti-pattern` → `info` (override by adding `severity:` to the entry).

---

## 4. Formats (chosen by who reads it)

Per the repo's Context-Formats convention:

| Layer | Reader | Format |
|---|---|---|
| Authored rule (component / pattern / global) | a human, editing | **YAML** — comments + prose `rationale` |
| Generated router index | the AI agent, every task | **TOON** — token-cheap table of thin rows |
| Generated rule export | CI / linter | **JSON — only once a machine consumer exists** (none today) |

There is exactly **one generated artifact**: the **router index**
(`.ai/governance/index.toon`), a thin table of
`id, tier, scope, severity, title, triggers, source`. The agent reads it once,
matches the task against `triggers` (and a rule's `appliesWhen`), then opens only
the `source` files it needs.

**Rule bodies are not duplicated into the generated tree.** The authored YAML is
already agent-readable and is the single source of truth, so each index row's
`source` points back to it as **`<file>#<ruleId>`**. The id is authored in the YAML
across every tier, so grepping the citation lands you on the rule.

This keeps the generated surface minimal: one file, no body copies to drift.

---

## 5. Authoring vs. reading (the core split)

- **Co-location is an authoring decision.** A rule lives next to its subject:
  component rules in the component's `<component>.governance.yaml` (beside its
  `<component>.spec.yaml`), named-journey rules in
  `journeys/<id>/<id>.governance.yaml`, pattern rules in
  `patterns/<id>/<id>.governance.yaml`, orphan (global/context/generic-journey)
  rules in `governance/`.
- **Centralization is a reading decision.** The generator compiles every authored
  rule into the single `.ai/governance/` index the agent reads.
- **The generator (`scripts/sync-governance.mjs`) is what lets you have both.**
  Never hand-edit `.ai/governance/` — it is generated, and CI fails on drift.

---

## 6. Enforcement (defense in depth)

Rules split into two enforcement classes:

- **Mechanical** — decidable from one artifact (e.g. "bind a token, not a hex").
  Checkable by a linter/test.
- **Compositional / semantic** — require reasoning over a whole composition
  ("exactly one primary CTA in this step"). Checked by an AI agent.

Checks happen at each gate a violation can enter:

| Gate | Mechanism |
|---|---|
| **Figma (design time)** — not in CI | on-demand `governance-check` (agent reads the frame) |
| **Code generation** | by construction — the agent consults resolved rules while generating |
| **Pre-PR / CI** | mechanical subset + drift check on `.ai/governance` |
| **Storybook** | agent evaluates composition using stories as fixtures |

The `governance-check` **skill** defines the procedure (classify → resolve via index
→ evaluate → report); a `governance` **sub-agent** runs it in its own context so the
heavy reading doesn't bloat the main window. Invoke on demand before finalizing a
Figma design and before opening a PR; CI is the backstop.
