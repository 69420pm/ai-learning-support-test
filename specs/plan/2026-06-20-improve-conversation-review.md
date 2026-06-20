# Technical Implementation Plan: Improve Conversation Review

## 1. Overview & Context
- **Feature Description**: Upgrade the conversation review extraction tool to detect and analyze subagents recursively, compress long thoughts/arguments/outputs in the event chronology, and eliminate redundant "run command succeeded" steps.
- **User Value / Problem Solved**: Currently, the conversation review only includes the main agent, missing the actual work and inefficiencies of spawned subagents. Furthermore, long tool outputs and thoughts bloat the chronology, making it difficult to read quickly.
- **Idea Path**: N/A (direct user request)

## 2. Scope Boundaries (Goals & Non-Goals)
- **Goals (In Scope)**:
  - **Recursive Subagent Detection**: Scan the parent transcript for subagent invocations, retrieve their conversation IDs, and process their transcripts recursively to compile metadata, programmatic heuristics, and chronologies.
  - **Chronology Compression**: Truncate thoughts, tool arguments, and stdout/stderr outputs to make the final markdown chronology compact.
  - **Redundant Step Elimination**: Omit `RUN_COMMAND` steps that succeeded with no output.
  - **Improved Tool Output Formatting**: Map generic tool output texts (e.g. from `WRITE_TO_FILE`, `REPLACE_FILE_CONTENT`, `INVOKE_SUBAGENT`) into single-line clean summaries.
- **Non-Goals (Out of Scope)**:
  - Proposing fixes or solutions to the identified bugs/loops (the skill is strictly analytical and descriptive).
  - Modifying the core Antigravity database or logger code.

## 3. Architecture & Components
- **Existing Files to Modify**:
  - `file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/scripts/extract_conversation.js`
  - `file:///Users/kevinsmith/Documents/development/typescript/specs/conversation-reviews/CONVERSATION_REVIEW_TEMPLATE.md`
- **New Files to Create**:
  - None

- **Component Breakdown / Data Flow**:
  1. **Subagent Scraping**:
     - The script will read the transcript of the target conversation.
     - As it parses steps, it will look for `INVOKE_SUBAGENT` steps and extract all spawned subagent `conversationId`s using regex: `/"conversationId":\s*"([^"]+)"/g`.
     - The script will maintain a list of all conversations to parse (main + subagents). For each subagent, it will fetch its title from the SQLite database (`appDataDir/conversations/<id>.db`) or `history.jsonl`, and locate its transcript file.
  2. **Step Formatting & Filtering**:
     - Omit any `RUN_COMMAND` step that has a `status === "DONE"` and contains no stdout/stderr output (e.g. contains only "Run command succeeded.").
     - Truncate thoughts in `PLANNER_RESPONSE` steps to a maximum of 150 characters.
     - Truncate all arguments in tool calls (e.g. `Prompt`, `CommandLine`, `CodeContent`) to a maximum of 100 characters.
     - Map verbose tool outputs to concise summaries (e.g. `WRITE_TO_FILE` / `REPLACE_FILE_CONTENT` -> "Modified file <relative_path>").
  3. **Section Compilation**:
     - Compile Section 1 (Metadata) to show a summary table for the Main Agent and a separate table for all Subagents used.
     - Compile Section 2 (Programmatic Analysis) by running heuristics for each conversation individually, outputting a nested structure: Main Agent analysis, then Subagent 1, 2, ... analysis.
     - Compile Section 3 (Chronology) with separate subsections: Main Agent chronology, followed by Subagent chronologies.

## 4. Acceptance Criteria
- [ ] Subagents are successfully detected and their metadata (ID, Role/Title, Steps count, Tool execution counts) is listed in the Metadata section.
- [ ] Programmatic analysis checks are executed for both the main agent and all subagents, displaying findings for each.
- [ ] The chronology shows the main agent's steps, followed by each subagent's steps, separated clearly.
- [ ] Tool call arguments, thoughts, and command outputs are truncated to ensure high scannability.
- [ ] Succeeded `RUN_COMMAND` steps with no output are omitted from the chronology.
- [ ] The generated review document is written successfully to `specs/conversation-reviews/review-<id>.md` and is fully readable.

## 4.5 Key Decisions & Rationale
| Decision | Why this approach | Alternatives rejected | Constraints |
|----------|------------------|----------------------|-------------|
| **Dynamic Markdown Generation** | Rather than hardcoding subagent placeholders in `CONVERSATION_REVIEW_TEMPLATE.md`, the template will contain simple placeholders (`{{METADATA_SECTION}}`, `{{ANALYSIS_SECTION}}`, `{{CHRONOLOGY_SECTION}}`) and the script will generate the Markdown dynamically. | Keeping the static subagent placeholders (fails if 0 or >1 subagents are used). | Must support variable number of subagents. |
| **Separate Chronologies** | Listing the Main Agent's chronology, then each subagent's chronology under separate headers is cleaner. | Merging all chronologies chronologically by timestamp (complex to read due to interleaved steps). | Keep files scannable. |
| **Aggressive Truncation** | Truncating thoughts to 150 chars, arguments to 100 chars, and outputs to 200 chars strikes the right balance for a quick-read file. | No truncation or light truncation (results in massive files that are hard to skim). | Readability. |

## 5. Testing Strategy
- Run the modified script on conversation `2eddc6de-41c2-4d70-9124-f5602e98626d`.
- Verify the output format conforms to the new dynamic design.
- Inspect the file `specs/conversation-reviews/review-2eddc6de-41c2-4d70-9124-f5602e98626d.md` for clarity and compactness.
