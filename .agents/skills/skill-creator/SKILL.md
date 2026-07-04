---
name: skill-creator
description: Create new skills or modify existing skills directly in .agents/skills/. Use when users want to build reusable agent skills, write SKILL.md files, define domain workflows, or validate skill structure.
metadata:
  license: Apache-2.0
  original_author: Anthropic, PBC
  attribution: Modified derivative work based on Anthropic's skill-creator. Streamlined for direct workspace editing without external web servers.
---

# Skill Creator

> **Attribution Notice**: This skill is a modified derivative work of the original `skill-creator` by Anthropic, PBC, licensed under the [Apache License 2.0](file:///workspaces/secure-ai-learning-support/.agents/skills/skill-creator/LICENSE.txt).

A streamlined skill for creating, structuring, and validating agent skills directly within `.agents/skills/`.

---

## High-Level Workflow

Creating or updating a skill involves 5 fast, clear steps:

1. **Capture Intent & Requirements**: Interview the user to understand what the skill should do, when it triggers, and expected outputs.
2. **Author the Skill**: Write `SKILL.md` and any bundled scripts/resources directly in `.agents/skills/<skill-name>/`.
3. **Validate Structure**: Run the quick validation script to ensure frontmatter, naming, and length limits are valid.
4. **Quick Sanity Check (1-Pass)**: Test the skill with 1–2 realistic prompts directly in chat (or via subagent) to confirm output quality.
5. **Finalize**: Present the completed skill to the user.

---

## 1. Capturing Intent & Requirements

Before writing code or instructions, clarify the skill's purpose:

- **Goal**: What specific capability or workflow does this skill grant the agent?
- **Triggers**: What user phrases, file types, or tasks should trigger this skill?
- **Output**: What format or artifacts should the skill produce?
- **Domain Resources**: Does the skill need bundled scripts (`scripts/`), documentation (`references/`), or starter templates (`assets/`)?

---

## 2. Writing the Skill

Create the skill folder at:
`.agents/skills/<skill-name>/`

### Skill File Anatomy

```
.agents/skills/<skill-name>/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown body (instructions, workflows, examples)
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic or repetitive tasks
    ├── references/ - Detailed docs loaded into context only when needed
    └── assets/     - Output templates, sample files, fonts, or starter code
```

### Frontmatter Specification

`SKILL.md` must start with YAML frontmatter:

```yaml
---
name: my-skill-name
description: A clear description of what the skill does AND specific trigger contexts. Make sure to use this skill whenever the user mentions X, Y, or Z.
---
```

- **name**: Must be kebab-case (lowercase, digits, single hyphens). Max 64 chars. Must match the directory name.
- **description**: Max 1024 chars. Primary triggering mechanism. 
  - *Tip (Prevent Undertriggering)*: LLMs tend to undertrigger skills. Make descriptions slightly **pushy** by explicitly listing trigger terms, user intents, and scenario keywords.

### Progressive Disclosure Strategy

Organize information across three context levels:
1. **Level 1: Metadata (Name + Description)**: Always present in the system prompt ($\approx$100 words).
2. **Level 2: SKILL.md Body**: Loaded when the skill triggers. Aim for $<500$ lines.
3. **Level 3: Bundled Resources**: Loaded into context only when referenced, or executed by scripts without occupying context.

### Writing Best Practices

- **Imperative Tone**: Use direct instructions ("Extract text", "Validate schema", "Run the script").
- **Explain the "Why" (Theory of Mind)**: LLMs follow instructions better when they understand the reasoning behind rules rather than rigid `MUST` / `NEVER` constraints.
- **Provide Output Templates**: Define expected output formats explicitly using Markdown code blocks or headers.
- **Include Examples**: Format input/output examples to demonstrate expected edge-case handling.
- **Bundle Repetitive Code**: If a workflow requires multi-step script generation, write the Python script once and save it in `scripts/`.

---

## 3. Structural Validation

Once files are written to `.agents/skills/<skill-name>/`, validate them instantly:

```bash
python3 .agents/skills/skill-creator/scripts/quick_validate.py .agents/skills/<skill-name>
```

This checks:
- `SKILL.md` existence and YAML frontmatter formatting.
- Kebab-case naming syntax and directory name matching.
- Length limits (name $\le$ 64 chars, description $\le$ 1024 chars).
- No disallowable characters (like `<` or `>` in description).

---

## 4. Fast Sanity Check (1-Pass Test Run)

Rather than running heavy web servers or multi-hour benchmark loops, perform a fast, useful sanity check:

1. **Craft 1–2 Test Prompts**: Representative tasks a user would actually ask.
2. **Execute (1-Pass)**: Execute the task following the newly created `SKILL.md`.
3. **Present Output In-Chat**: Show the output directly in chat to the user for feedback.
4. **Refine**: Apply any quick tweaks to `SKILL.md` based on user feedback.

---

## 5. Finalizing the Skill

Once validated and approved:
- Confirm all files exist in `.agents/skills/<skill-name>/`.
- The skill is immediately available for future tasks in the workspace.
