---
name: governance-encode
description: >
  The write path for the design system's governance rules — counterpart to
  governance-check (the read path). Takes a plain-language rule, gate-checks
  it (testable? already covered?), classifies its tier (global / journey /
  named journey / component / pattern), assigns a stable citation id, authors
  it in the correct YAML source file, and runs `npm run sync:governance` to
  regenerate .ai/governance/index.toon. Also amends and repeals existing rules.
  Trigger on "add a governance rule", "encode this rule", "amend/change a
  rule", "repeal/retire a rule", "should this be a rule?". Supersedes the
  generic `governance-encoder` skill in the design-system-ops submodule for
  this repo. The governance model is documented in
  MODEL.md.
---

# Governance Encode

Encode a proposed rule into the design system's body of governance —
in the right tier, in the right authored YAML, with a stable citation — then
recompile the agent index.

**Read first:** `MODEL.md` §1 (tiers) and §2
(citations, `extends`/`refines`). MODEL.md is the source of truth for the
model; this skill is the procedure.

Be honest at every step: if the rule is vague, say so and sharpen it; if it
duplicates an existing rule, stop and cite it; if it is a preference rather
than a testable rule, recommend against encoding it.

## Flow: add a rule

### 1. Intake & gate-check

Restate the idea as a candidate **statement + rationale**. A governance rule
must be testable — pass/fail decidable against a concrete design ("no danger
buttons on confirmation screens" passes; "buttons should feel consistent"
fails). If it fails the test, push back and sharpen before continuing. If it
is a taste preference, already enforced by types/lint, or otherwise not
rule-shaped, say "this shouldn't be a governance rule" — with the reason —
and stop.

### 2. Dedupe & conflict scan

Read `.ai/governance/index.toon` (one thin row per rule — cheap). Match the
candidate against existing titles and triggers. Outcomes:

| Outcome | Action |
|---|---|
| **Duplicate** — an existing rule already covers it | Stop; cite the rule |
| **Refinement** — it tightens an existing generic rule for a narrower scope | Author it with `refines: <ID>` (MODEL §2.1), not as a standalone rule |
| **Conflict** — it contradicts an existing rule | Stop; surface the conflict to the user |
| **Novel** | Proceed |

### 3. Classify the tier

Ask in order — first yes wins:

1. Applies always, to everything? → **global** (`GLB`)
2. Spans multiple pages/steps in sequence? → **journey**:
   - holds for *any* multi-step flow → generic (`JRN`)
   - specific to one named journey (e.g. checkout) → named journey (`CHK`, …)
3. Governs a single-page composition (e.g. Card's zones)? → **pattern**
   (`CRD`, …)
4. Governs one component's own use? → **component** (`BTN`, …)
5. A recurring *situation* across many screens (e.g. destructive
   confirmation)? → **context tier — deferred.** Do NOT create
   `governance/contexts/*.yaml`. Append the candidate to the "Context-tier
   candidates" list in MODEL.md §1 (create the list under the context
   paragraph if it doesn't exist yet). At ~3 candidates, propose formalizing
   the tier. Stop here.

If genuinely ambiguous (component vs. pattern is the common case), ask the
user — don't guess.

### 4. Assign the citation id

- Next free number in the scope. Check BOTH the id column in
  `.ai/governance/index.toon` AND the scope's authored YAML for
  `status: repealed` entries — retired numbers are never reused (the sync
  script fails the build on reuse).
- Provisions (`CHK-1.2`) apply one rule to specific situations — prefer them
  over separate rules when the principle is one and the applications are many.
- **New scope code?** Claim it once in `scopes.yaml` (the single scope
  registry — no longer duplicated in MODEL.md or the sync script). For a
  component, add `tier: component` + `component: <PascalName>` so the sync
  derives its name↔code map.

### 5. Author the rule

Route by tier. For component / named-journey / pattern files the file format
is owned by the governance-authoring skill — read and follow it; never
improvise or restate its schemas.

| Tier | File | Format source of truth |
|---|---|---|
| global (`GLB`) | `packages/ui/src/governance/global.governance.yaml` | edit directly — mirror existing entries (`id`, `title`, `statement`, `rationale`, `severity`, `appliesWhen`) |
| generic journey (`JRN`) | `packages/ui/src/governance/journey.governance.yaml` | edit directly — same rule shape, plus file-level `triggers` |
| component (`BTN`, …) | `packages/ui/src/components/<c>/<c>.governance.yaml` → `rules` (kind: `anti-pattern` or `parent-constraint`) | `../authoring/FORMAT.md` §1 + its component-governance schema |
| named journey (`CHK`, …) | `packages/ui/src/journeys/<j>/<j>.governance.yaml` → `rules` | `../authoring/FORMAT.md` §3 + its schemas |
| pattern (`CRD`, …) | `packages/ui/src/patterns/<p>/<p>.governance.yaml` → `rules` | `../authoring/FORMAT.md` §2 + its schemas |

A component with no governance file yet gets one created next to its
`<c>.spec.yaml` — never author rules inside the spec; a spec describes,
governance prescribes.

### 6. Close out

See "Close-out" below.

## Flow: amend a rule

Locate the rule by citation in its authored YAML (grep the id; the index row's
`source` column points at the file). Change the statement, severity, or
provisions — keep the id. If the change alters the rule's *meaning* rather
than its wording or strength, recommend repeal + a new rule instead: a
citation must keep a stable meaning, because code comments and decision
records reference it. Then close out.

## Flow: repeal a rule

Mark the entry `status: repealed` in its authored YAML and leave it in place.
The generator drops it from the index and fails the build if any active rule
reuses the id. Never delete the entry — it is the record that the number is
retired.

Before repealing, check the index for rules that `refines` the target — a
dangling `refines` fails the build; amend or repeal the refining rule first.

Then close out.

## Close-out (every operation)

1. `npm run sync:governance` — must exit 0.
2. `git diff .ai/governance/index.toon` — confirm the rule appeared / changed
   / vanished as expected.
3. New scope code claimed? Confirm the MODEL.md registry row (and, for a
   component, the `COMPONENT_SCOPES` entry) exists.
4. **Suggest** (never auto-run) a governance-check pass when the new or
   tightened rule could put existing components, journeys, or patterns out of
   compliance — a new error-severity rule can make previously-fine designs
   non-compliant.

## Out of scope

- Creating `governance/contexts/*.yaml` — the context tier is deferred
  (MODEL §1).
- Hand-editing anything in `.ai/governance/` — generated only.
- Judging designs against the rules — that's `governance-check`.
