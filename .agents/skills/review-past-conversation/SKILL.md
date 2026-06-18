---
name: review-past-conversation
description: Loads a past conversation by UUID or keyword/name search, extracts it into a markdown chronology/review file under `specs/conversation-reviews/review-<id>.md`, and analyzes it for problems (loops, excessive tool calls, scope deviations, stuck states) without suggesting solutions.
---

### Objective
Loads a past conversation from the Antigravity application history, parses and structures the chronological flow of events, and performs a detailed analysis of problems and inefficiencies encountered (e.g. agent getting stuck, excessive tool usage, loop behavior, or scope deviations) without providing tips or solutions.

### Boundaries
- **Strict Problem Identification Only**: Do NOT suggest solutions, code fixes, tips, or guidelines on how to solve the problems found. Only list the problems themselves.
- **Strict Sandbox Boundary**: Running the script requires `BypassSandbox: true` to access the global `.gemini/antigravity-cli` folder where past conversation databases and transcripts reside.

### Step-by-Step Instructions

#### Phase 1: Determine the Target Conversation
Identify the target conversation UUID or query string from the user's request.
- If the user provided a full conversation UUID, use it directly.
- If the user provided a name/title (e.g., "Refining Harness Audit Strategy"), use the title or keywords for the lookup.

#### Phase 2: Run the Extraction Script
Run the extraction script with sandbox bypass to read files from the global `.gemini` directory:

```bash
node .agents/scripts/extract_conversation.js "<conversation-id-or-query>"
```

*Note: The script will print the matching conversations, select the most recent match, and output the parsed chronology and programmatic analysis to `specs/conversation-reviews/review-<conversationId>.md`.*

#### Phase 3: Qualitative Analysis & Report Enrichment
Read the generated file (`specs/conversation-reviews/review-<conversationId>.md`) to inspect the chronology of events. Perform a human-in-the-loop qualitative assessment of the conversation to enrich the analysis.

Look for the following qualitative problems:
1. **Misunderstandings/Assumptions**: Did the agent make incorrect assumptions about the codebase, requirements, or tools without checking them first?
2. **Non-Sequential Loops**: Did the agent keep returning to the same failed approach or command across separate steps (even if not consecutive)?
3. **Task Overhead & Procrastination**: Did the agent spend steps writing scratch scripts or performing research that wasn't necessary for the core task?
4. **Cognitive Surrender**: Did the agent accept incorrect error states or fail to question obvious anomalies?

Open the review file and edit/add these findings to Section 2 (**Programmatic Analysis & Heuristics (Stated Problems)**) under the appropriate headings. Keep your observations strictly descriptive of the problems (no recommendations or solutions).

#### Phase 4: Final Output Presentation
1. Provide the user with a clickable link to the generated review file: [review-<id>.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/conversation-reviews/review-<id>.md).
2. Present a brief summary of the key findings (problems only) directly in your response.
