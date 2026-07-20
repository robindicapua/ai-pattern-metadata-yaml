---
name: governance-explain
description: >
  Explains the design system's governance rules in plain language — the third
  door alongside check (read/judge) and encode (write). Answers "what rules
  apply to a checkout button?", "why does the confirmation step forbid danger?",
  "walk me through the pattern rules", or "how does governance work here?".
  Index-driven and citation-backed; needs no design as input. Trigger on
  "explain the governance rules", "what rules apply to X", "what does <citation>
  mean", "how does governance work". The model is documented in MODEL.md.
---

# Governance Explain

Teach the rulebook. Unlike `governance-check` (which judges a concrete design)
and `governance-encode` (which writes rules), this skill just **explains** — it
takes no design and changes nothing. It resolves the relevant rules from the
generated index and puts them in plain language, always with citations, so a
person or agent can understand *what the rules say and why* before building.

Read `MODEL.md` if the question is about how the system works (tiers, citations,
`refines`/`extends`) rather than about specific rules.

## Inputs

A natural-language question or a subject. Common shapes:
- **A subject** — "what applies to a Button / to the checkout flow / to a card?"
- **A citation** — "what does `CHK-1.2` mean?" / "why does `GLB-2` exist?"
- **A tier or the whole book** — "walk me through the pattern rules" / "what are
  all the journey rules?"
- **The model itself** — "how does governance work here?" → summarize from MODEL.md.

If the question is really "does *this design* comply?", that's `governance-check`
— hand off, don't guess a verdict here.

## Procedure

### 1. Resolve — which rules are in scope?
- Read `.ai/governance/index.toon` (thin router rows — cheap).
- Select rows by what was asked: a subject → matching `scope`/`triggers`; a
  citation → that `id` (and its provisions `id.*`); a tier → all rows of that
  `tier`; the whole book → all rows.
- Note `refines` links: when explaining a subject where both a general and a
  refining rule apply, say the specific one wins there (*lex specialis*) rather
  than listing both as if independent.

### 2. Read — the full text for the resolved rules
- Open each resolved row's `source` (`<file>#<ruleId>`, authored YAML) and read
  the `statement`, `rationale`, `severity`, `appliesWhen`, and any `provisions`.
- Open `source` files **only** for the rules in scope — never the whole corpus.

### 3. Explain — plain language, always cited
For each rule (or provision): give the **citation**, the **statement** in plain
words, the **why** (paraphrase the `rationale` — it's the valuable part), the
**severity** (error = blocks, warning = flagged, info = advisory), and **where
it applies** (tier, step/zone, or context). Group by tier, most-binding first.

Lead with the direct answer, then the supporting rules. Keep it to what the
rules actually say — if something isn't governed, say "no rule covers that"
rather than inventing guidance.

## Output shape

- **One-line answer** to the question.
- **The applicable rules**, each as: `CITATION` (severity) — statement, in plain
  words. *Why:* the rationale. *Where:* tier / step / zone.
- If asked about the **model**, a short prose walk-through with a pointer to
  MODEL.md for depth.

## Notes
- Never hand-edit `.ai/governance/*.toon` — it's generated (`npm run
  sync:governance`).
- Explain; don't judge a specific design (→ `governance-check`) and don't
  legislate new rules (→ `governance-encode`).
- Cite every claim. If you can't find a rule for something asked, say so.
