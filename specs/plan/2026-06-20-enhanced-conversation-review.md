# Technical Implementation Plan: Enhanced Conversation Review (Hybrid Analysis & CLI-style Chronology)

## 1. Overview & Context
- **Feature Description**: Upgrade the conversation review extraction tool to support advanced programmatic metrics (token efficiency, context management, planning-to-execution ratio), split the analysis into automated programmatic lints and qualitative agent critiques, and compress the chronology of events into a tight, CLI-style symbol representation mimicking the `agy` interface.
- **User Value / Problem Solved**: Chronologies are currently too long and consume excessive tokens when feeding them to downstream LLMs. Static categories lead to empty/redundant boilerplate. Smarter automated heuristics are needed to detect common anti-patterns (such as duplicate sandbox attempts or lack of test execution) while allowing the reviewing LLM to focus on qualitative critiques (cognitive surrender, assumptions).
- **Idea Path**: N/A (direct user request)

## 2. Scope Boundaries (Goals & Non-Goals)
- **Goals (In Scope)**:
  - **Smarter Heuristics & Lint Warnings**: Implement programmatic checks for:
    - *Sandbox Reruns*: Same command run sandboxed (failed) and then immediately with bypass.
    - *Non-Sequential Loops*: Identical command run multiple times across non-consecutive steps.
    - *Lazy File Retrieval*: Reading full files (>300 lines) without specifying line ranges.
    - *Low Modification Efficiency*: Rewriting an entire large file instead of editing a chunk.
    - *Analysis Paralysis*: High count of consecutive read-only steps without structural edits or command runs.
    - *Thoughts Verbosity*: Agent thoughts exceeding 800 characters.
    - *Uncleaned Files*: Track files written via `WRITE_TO_FILE` that are never deleted or committed.
    - *Premature Completion, Shortcuts & Laziness*:
      - *Automated*: Flag if the run finishes without executing any tests/checks, or if final responses contain laziness markers (e.g. telling the user to "install dependencies" or "implement the rest").
      - *Qualitative Guidance*: Prompt the reviewer agent to explicitly check if the agent took shortcuts, bypassed edge cases, or oversimplified the prompt instructions.
    - *Overcomplexity & Over-engineering*:
      - *Automated*: Flag if the agent runs an excessive number of steps compared to the complexity of the task, or repeatedly edits and reverts the same file (code churning).
      - *Qualitative Guidance*: Prompt the reviewer agent to audit whether the agent chose unnecessarily complex patterns or built convoluted code when a simpler native solution was readily available.
  - **CLI-style Chronology formatting**: Map steps to concise lines matching the `agy` console UI:
    - `run_command` ➔ `● Bash(<command>)`
    - `view_file` / `list_dir` ➔ `● Read(<path>)`
    - `write_to_file` ➔ `● Create(<path>)`
    - `replace_file_content` / `multi_replace_file_content` ➔ `● Edit(<path>)`
    - `invoke_subagent` ➔ `● Invoke(<role>)`
    - `define_subagent` ➔ `● Define(<name>)`
    - `ask_question` / `ask_permission` ➔ `❓ Ask(<question>)`
    - Step errors ➔ `❌ Error: <message>`
    - Indent thoughts/explanations directly under the headers.
  - **Dynamic Template Layout**: Split Section 2 into automated programmatic warnings and qualitative placeholders, only outputting categories with findings.
- **Non-Goals (Out of Scope)**:
  - Performing the qualitative LLM review inside the Node script itself (this remains the role of the agent running the review skill).

## 3. Architecture & Components
- **Existing Files to Modify**:
  - `file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/scripts/extract_conversation.js`
  - `file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/conversation-reviews/CONVERSATION_REVIEW_TEMPLATE.md`
- **New Files to Create**:
  - None

- **Component Breakdown / Data Flow**:
  1. **Telemetry Parsing & Scoring**:
     - Parse the transcript JSONL steps.
     - Accumulate metrics: command outcomes, file sizes read, thought lengths, file modification scopes, consecutive steps without state changes.
     - Identify specific warning flags and format them dynamically as list items under grouped headers.
  2. **Step-by-Step Chronology Reducer**:
     - Map steps to compact header strings.
     - Retrieve matching thoughts/explanations from the step context and truncate them.
     - Filter out empty successful runs.
  3. **Report Compilation**:
     - Replace placeholders in `CONVERSATION_REVIEW_TEMPLATE.md`.
     - Output the resulting Markdown file.

## 4. Acceptance Criteria
- [ ] Section 2 contains distinct sub-sections: `Programmatic Lint Warnings (Automated Flags)` and `Qualitative Review (Agent Critiques)`.
- [ ] Programmatic lints successfully identify sandbox redundancy runs, lazy large-file views, thoughts verbosity, premature completions, laziness indicators, and overcomplexity behaviors.
- [ ] Qualitative review guidelines for `Shortcuts & Laziness` and `Overcomplexity` are dynamically added as markdown placeholders.
- [ ] Empty programmatic check categories are omitted from the report.
- [ ] Chronology steps are formatted precisely in CLI symbol style (e.g. `● Bash(make test)`) with indented thoughts.
- [ ] Biome linter, tests, and formatting checks pass cleanly on `make commit`.

## 4.5 Key Decisions & Rationale
| Decision | Why this approach | Alternatives rejected | Constraints |
|----------|------------------|----------------------|-------------|
| **Dynamic Flags Filtering** | Only render headers/bullets for categories that contain findings. | Printing empty templates or placeholder texts like "None". | Saves token space for LLM input. |
| **CLI-Style Mapping** | Compress steps to `● ToolName(param)` headers and indent thoughts. | Keeping markdown lists with bold details. | Must match agy CLI UI styling. |

## 5. Testing Strategy
- Run `node .agents/scripts/extract_conversation.js "2eddc6de-41c2-4d70-9124-f5602e98626d"` with BypassSandbox.
- Inspect `specs/conversation-reviews/review-2eddc6de-41c2-4d70-9124-f5602e98626d.md` to verify the table, lists, and compact chronology conform to the design specs.
