# governance-kit

A **tool-agnostic pack of skills for design-system governance** — writing,
checking, and explaining the normative rules that keep a design system
coherent. The skills are plain Markdown, so any agent (Claude, Gemini, GPT, or a
human) can read and follow them; nothing here is tied to one assistant.

Governance rules are authored as YAML next to the thing they govern, validated
against JSON Schema, and compiled into one token-cheap index ("the codex") that
an agent reads to resolve *only the rules that apply* to the task in front of it.

## The three doors (+ internal machinery)

| Skill | Role | Verb |
|---|---|---|
| [`skills/check`](skills/check/SKILL.md) | Does this design comply? | evaluate a design, cite pass/fail |
| [`skills/encode`](skills/encode/SKILL.md) | Add / amend / repeal a rule | decide tier + citation, then author |
| [`skills/explain`](skills/explain/SKILL.md) | What do the rules say about X? | teach the rulebook, cited |
| [`authoring/FORMAT.md`](authoring/FORMAT.md) | *internal* — the per-tier YAML format | used **by** `encode`, not a door |

`check` and `encode` are the read/write pair; `explain` teaches. `authoring` is
machinery `encode` reads — you never invoke it directly.

## Layout

```
governance-kit/
├── MODEL.md                    ← governance model (tiers, citations, refine/extends) — starter
├── skills/                     ← the method (pack-tracked; updates flow)
│   ├── check/  encode/  explain/
├── authoring/
│   ├── FORMAT.md               ← per-tier YAML templates (internal)
│   └── schemas/*.json          ← JSON Schemas (the starters init copies out)
├── reference/
│   ├── sync-governance.mjs     ← compiler: authored YAML → the index
│   └── validate-governance.mjs ← validator: every *.governance.yaml ↔ its schema
└── init/                       ← first-run scaffold (SKILL.md + init-governance.mjs)
```

## Install & use

This is **hybrid** by design: the *method* (skills, format, reference scripts)
stays in the pack and updates by pulling; the *data* (schemas, and the copies of
the scripts you run) is **scaffolded into your repo and yours to edit**.

1. **Install** — add the kit to your repo (conventionally a submodule at
   `.agent/skills/governance-kit/`), or just copy the folder.
2. **Init** — follow [`init/SKILL.md`](init/SKILL.md):
   ```bash
   node .agent/skills/governance-kit/init/init-governance.mjs
   ```
   It copies the schemas into your governance folder, drops in the sync +
   validate scripts, re-stamps every `*.governance.yaml`'s `$schema` comment, and
   writes `.kit-version`.
3. **Wire** `sync:governance` + `validate:governance` npm scripts and run them.
4. **Author & check** rules with the three skills.

Point any agent at the relevant `SKILL.md` — they are self-contained
instructions, not Claude-specific plugins.

## Why the tiers share one pack

Governance rules differ in *shape* per tier (component rules use
`kind: anti-pattern | parent-constraint`; pattern/journey rules use `provisions`
anchored to zones/steps), but they share the *frame*: citable, id-stable,
severity-ranked normative rules compiled into one index. The dividing line that
matters is **describe vs. prescribe** — everything prescriptive lives here;
descriptive component specs live in the separate `component-spec` skill.

## Versioning

The *method* updates when you bump the pack (submodule/pull). Your scaffolded
*data* is untouched — `.kit-version` records what you scaffolded from, so you can
diff and pull schema changes forward when you choose to.

## License

MIT.
