# Skill Validation & Evals Schema

This document defines the lightweight schema formats used by the `skill-creator`.

---

## Skill Directory Structure

Skills must be created directly under `.agents/skills/<skill-name>/`:

```
.agents/skills/<skill-name>/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Templates, starter files, fonts, or images
```

---

## Test Prompts Schema (`evals/evals.json`)

Optional lightweight test case definition for quick in-chat verification:

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's realistic task prompt",
      "expected_output": "Description of expected result"
    }
  ]
}
```
