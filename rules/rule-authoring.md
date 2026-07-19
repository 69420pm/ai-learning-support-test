# Rule Authoring Guidelines

The `rules/` directory is the single source of truth for all operational constraints and guidelines for the AI harness. Writing high-quality, actionable rules is critical because vague rules lead to non-deterministic behavior, LLM hallucinations, and prompt confusion.

All rules added or modified MUST adhere strictly to the following Definition of Done:

## 1. Fluff-Free & High Information Density
Rules MUST NOT contain conversational language, pleasantries, or unnecessary philosophical justifications. Keep sentences short and declarative.

- **Bad:** "It's usually a good idea to write a quick summary of what the script does at the top because it helps future agents understand it better without reading the whole file."
- **Good:** "You MUST write a concise header comment summarizing the script's purpose at the top of every file."

## 2. Strict RFC 2119 Modality
Rules MUST use uppercase RFC 2119 modal verbs (`MUST`, `MUST NOT`, `REQUIRED`, `SHALL`, `SHALL NOT`, `SHOULD`, `SHOULD NOT`, `RECOMMENDED`, `MAY`, and `OPTIONAL`) or explicit words like `ALWAYS` and `NEVER`. Avoid wishy-washy language like "try to", "consider", "probably", or "maybe".

- **Bad:** "Try to avoid using the `any` type in TypeScript if you can."
- **Good:** "You MUST NOT use the `any` type in TypeScript. ALWAYS use explicit typing or `unknown`."

## 3. Testable & Deterministic Boundaries
A rule is only as good as our ability to verify it. Rules SHOULD define objective thresholds, exact commands, or specific states rather than subjective goals.

- **Bad:** "Make sure the code is well-tested before committing."
- **Good:** "You MUST NOT declare a task done until `pnpm test` passes locally."

## 4. Deduplication & Conflict Prevention (`mgrep`)
Before authoring a new rule or editing an existing one, you MUST proactively search the `rules/` directory using the `mgrep` MCP server.
- Verify the rule does not already exist.
- Verify the new rule does not conflict with an existing rule.
- If a conflict arises, you MUST raise it to the human for a resolution before committing the rule.

## 5. Human Alignment & Provenance
Rules MUST NOT be added by agents on a whim. 
- You MUST only update or create rules after discussing the findings with the human (e.g., during a Retrospective issue review).
- Every rule file SHOULD ideally trace back to a learned mistake or an explicit human directive.

## Structural Example

Here is an example of a well-formatted rule snippet:

```markdown
### 2. Git Workflow & Commits

- You MUST ALWAYS use Conventional Commits (e.g., `feat:`, `fix:`, `chore:`).
- You MUST NEVER push directly to the `main` branch.
- Before opening a PR, you MUST run `pnpm run lint` and fix any errors.
```
