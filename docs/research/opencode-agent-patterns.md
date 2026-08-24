# Research: Opencode Agent Architecture Patterns

**Source Codebase**: `/workspaces/opencode/`
**Key References**: `CONTEXT.md`, `AGENTS.md`, and existing research in `agent-tool-calling-patterns.md`.

Based on a comprehensive analysis of the `opencode` runtime, here are the core architectural patterns extracted and how they can be transferred to a pedagogical tutoring agent system.

## 1. Agent Tool Loop
* **Pattern**: Deterministic multi-turn execution with explicit provider turns.
* **How opencode implements it**: Opencode explicitly manages the tool loop via a "Session Drain" which runs "Provider Turns" until no immediate continuation remains. It avoids black-box in-memory tool loops (`legacy SessionPrompt.loop(...)`), instead enforcing "one explicit `llm.stream(request)` call per provider turn" and reloading projected history before durable continuation (`packages/core/src/session/runner/llm.ts`).
* **Application to Tutoring Agent**: Rather than giving the LLM a generic "agent executor" black box, the tutoring system should use an explicit multi-step loop (e.g., Vercel AI SDK's `stopWhen: isStepCount(N)`). The server explicitly controls the turn boundary, allowing it to validate tool results (like evaluating a student's answer) before re-prompting the LLM.

## 2. Context Management
* **Pattern**: Immutable Base Context + Chronological Mid-Conversation Updates.
* **How opencode implements it**: It separates the "Baseline System Context" (immutable for a "Context Epoch") from dynamic facts. When a context source changes (e.g., a file is edited, date changes), opencode does not rewrite the base prompt. Instead, it emits a "Mid-Conversation System Message" containing the new state. It uses a "System Context Registry" with stable keys to compose these sources (`CONTEXT.md`).
* **Application to Tutoring Agent**: Instead of regenerating a massive system prompt every time the student navigates to a new module or file, the tutoring agent can inject a durable chronological instruction (e.g., `System: The user has opened the file 'math_quiz.ts'`). This provides the LLM with a stable chronological history of the student's actions.

## 3. Session and State Management
* **Pattern**: Durable prompt admission decoupled from model execution.
* **How opencode implements it**: `SessionV2.prompt(...)` commits a durable `session_input` row to the database immediately, separate from model execution. It then schedules an advisory "wake" for the "Session Runner" to process the queue ("Session Drain"). History and UI updates are streamed using server-sent events (`sessions.events` and `events.subscribe`) (`AGENTS.md`, `CONTEXT.md`).
* **Application to Tutoring Agent**: User messages (e.g., student questions) should be instantly committed to a database (like PostgreSQL/Drizzle) for durability. The agent loop processes these messages asynchronously, streaming transient states (e.g., "Evaluating answer...", "Searching materials...") to the UI without polluting the core database transcript.

## 4. Multi-Agent Coordination
* **Pattern**: Scoped permissions and explicit agent switching.
* **How opencode implements it**: `sessions.switchAgent({ sessionID, agent })` explicitly changes the active agent. The "System Context Registry" dynamically projects a "Selected-agent available-skill guidance" listing only the tools permitted for the active agent. Tool authorization retains the effective agent of the provider turn (`CONTEXT.md`).
* **Application to Tutoring Agent**: A tutoring platform could have a `GeneralTutor` agent that can invoke a `MathSpecialist` agent or a `CodeReviewer` agent. By switching agents, the tool registry automatically restricts the available tools (e.g., preventing the math tutor from executing arbitrary code tests, while allowing the code reviewer to do so).

## 5. Structured Output and Tool Design
* **Pattern**: Actionable validation loops and defensive self-correction.
* **How opencode implements it**: Uses `Schema.decodeUnknownEffect` before invoking the tool body. If Zod validation fails, it catches the error and returns a formatted `ToolFailure` payload back to the LLM. The LLM receives this error in the next turn and adjusts its JSON parameters (`agent-tool-calling-patterns.md`).
* **Application to Tutoring Agent**: Tools (like `searchProjectMaterials` or `auditFeynmanExplanation`) must define strict input schemas with `.describe()` annotations. If the LLM hallucinates arguments, the tool throws a structured error that the LLM can read and correct, maintaining the stability of the pedagogical session.

## 6. Performance Patterns
* **Pattern**: Bounded Tool Outputs and Guardrails (`ToolOutputStore`).
* **How opencode implements it**: Enforces strict text guardrails on tool outputs (e.g., Max Lines: 2,000, Max Size: 50 KB). If output exceeds this, the LLM receives a truncated preview, and the full content is written to a temporary "Managed Tool Output File" (`packages/core/src/tool-output-store.ts`). Timeouts are enforced via `AbortSignal`.
* **Application to Tutoring Agent**: When the agent uses `searchProjectMaterials`, fetching massive document chunks could crash the context window or inflate token costs. The tool should enforce a `MAX_OUTPUT_CHARS` limit, truncating large study material excerpts and saving the full content to a state store, allowing the LLM to reason over a summary without blowing up the context window.
