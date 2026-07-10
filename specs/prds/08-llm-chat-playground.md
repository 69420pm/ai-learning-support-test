# PRD 08: Developer LLM Chat Playground & Sidebar Document Integration

---

## 1. Document Control

### 1.1 Metadata
| Attribute | Value |
| :--- | :--- |
| **Product / Domain** | AI Chat Playground |
| **Version** | 1.0.0 |
| **Status** | Approved |
| **Target Persona** | Local Developers & Self-Directed Learners |
| **Target Packages** | `apps/web`, `packages/core`, `packages/shared`, `packages/infrastructure` |
| **Last Updated** | 2026-07-10 |

---

## 2. Executive Summary & Value Proposition

### 2.1 Problem Statement
To build advanced active-recall study guides and document analysis tools, we must first verify that our backend and frontend infrastructure can successfully connect to LLM API providers, stream text responses in real-time, handle connection failures, and respect security credentials without leaking them to the client.

Furthermore, our current UI is a flat list that displays document uploads in a full-screen layout, which does not map to the split-screen workspace needed for study assistants.

### 2.2 Product Vision & Justification
This feature establishes the end-to-end "plumbing" of the AI Learning Support system. By creating a simple Q&A chat playground in the main area and moving the document upload and document list to a left sidebar, we create a layout aligned with modern AI applications (like ChatGPT). This playground will act as the physical testing harness for our `LlmService` abstraction and environment configuration, laying the foundations for future grounded RAG study tools.

---

## 3. Product Goals & Scope

### 3.1 Strategic Goals
- **End-to-End Streaming Verification:** Implement a real-time text streaming connection between Next.js frontend UI components and the LLM API provider via our custom core orchestrator services.
- **Unified Workspace Layout:** Reorganize the dashboard layout into a dual-pane interface: a left sidebar for documents control, and a main screen for chat interaction.
- **Secure Key Integration:** Route LLM completions through server-side environment variables (using OpenAI-compatible endpoints or Gemini API keys), ensuring zero browser leaks of credentials.

### 3.2 Non-Goals (Scope Boundaries)
- **Active Recall Enforcement (MVP Phase):** Restricting passive Q&A modes is out of scope for this playground; it serves as a raw test/development chat box for now.
- **Document-Grounded Chat (RAG):** Grounding the chat in the sidebar document chunks is out of scope; the model behaves as a general assistant.
- **Chat Thread Database Persistence:** Storing chat history across user browser sessions is out of scope; threads are maintained in-memory (React state) and cleared upon page reload.

---

## 4. User Workflows & Persona

### 4.1 Target Persona
A developer testing model integrations or a learner setting up their local instance. The user has access to terminal environment files and expects a clean desktop dashboard.

### 4.2 Step-by-Step User Journey
1. **Trigger:** User launches the web dashboard locally.
2. **Layout Load:** The screen splits into a Left Sidebar (displaying the drag-and-drop file upload container and list of previously uploaded documents) and a Main Panel (displaying the Chat Playground).
3. **Action:** User types a question into the text input at the bottom of the main chat panel and clicks "Send" or presses `Enter`.
4. **System Response:** A message bubble appears for the User. Immediately below, an Assistant message bubble appears, streaming the response character-by-character.
5. **Completion:** The model finishes typing. Token usage and connection metadata are recorded in the developer console/DevTools.

### 4.3 Edge Cases & Failure Modes
- **Missing API Key / Server Misconfiguration:**
  - *Condition:* The developer has not populated the required `.env` variables (`GEMINI_API_KEY` or `OPENAI_API_KEY`/`CUSTOM_LLM_API_KEY`).
  - *Behavior:* The chat input is disabled, and a prominent alert banner is displayed in the main panel instructing the user to configure their environment variables.
- **Network / API Request Failure:**
  - *Condition:* API provider times out or returns a rate-limit error.
  - *Behavior:* The chat thread displays a system warning message bubble, the user input is restored, and a "Retry" button is provided.

---

## 5. Detailed Functional Requirements

*Note: All requirements must be specific, testable, and deterministic. Avoid vague adjectives.*

| ID | Feature / Component | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **FR-1** | Sidebar Layout Migration | Move the document upload dropzone and document list from [apps/web/app/dashboard/page.tsx](../apps/web/app/dashboard/page.tsx) into a collapsible left sidebar (width: `320px` to `360px`). | Must Have |
| **FR-2** | Streaming Chat Playground | Create a chat area in the main panel. It must display a message history list, a text textarea for inputs, and a Send button. Typing `Enter` sends the message, while `Shift+Enter` inserts a newline. | Must Have |
| **FR-3** | Real-time Streaming API | Implement Next.js POST endpoint `/api/chat` that receives `LlmMessage[]`, validates credentials, invokes the core `@core` Orchestrator, and returns a Server-Sent Events (SSE) character stream. | Must Have |
| **FR-4** | Swappable Env Provider | The backend must dynamically initialize either the native Gemini client or the OpenAI-compatible client based on the set `.env` configuration (e.g. `LLM_PROVIDER='google'` or `LLM_PROVIDER='openai'`). | Must Have |
| **FR-5** | Clear Thread action | Provide a "Clear Chat" button at the top header of the chat area to flush the React conversation state. | Should Have |

---

## 6. Security, Data Privacy & AI Safety Guardrails

### 6.1 Data Privacy & Protection
- **No Client Keys:** The frontend never handles API keys. All keys remain server-side under `.env` configurations.
- **Memory Boundaries:** Chat messages are stored strictly in client memory. No telemetry or log files are saved to SQLite unless explicitly configured.

### 6.2 AI Safety, Grounding & Defense
- **System Instructions:** System instructions must pre-condition the model to be a helpful programming and study assistant.
- **Input Filtering:** Empty inputs or inputs exceeding 8,000 characters are rejected at the UI boundary.
- **API Call Rate Limiting:** Apply an in-memory server-side rate limit of 10 requests per minute per IP for local development testing to prevent unintended loop execution.

---

## 7. UX & Interface Specifications

### 7.1 UI Components & Placement
- **Layout Split:** Dual-panel desktop view.
- **Left Sidebar:** Document Management.
- **Main Body:** Chat UI.
- **Input Box:** Kept anchored at the bottom of the viewport with automatic height expansion up to 5 lines.

### 7.2 Required Interaction States
- **Loading State:** The send button displays a loading spinner, and a blinking cursor indicator is shown on the assistant's message bubble while waiting for the first chunk.
- **Empty State:** When no chat history exists, display three quick-start prompt cards (e.g., "Summarize how to configure local modes", "Explain active recall").
- **Error State:** Display alert banner if API errors occur.

---

## 8. Technical & Operational Constraints

- **Streaming Latency:** The server must begin writing the SSE headers and yield the first stream byte within `300ms` of receiving the user request.
- **Compatibilities:** Must run on standard Node.js runtime and support standard evergreen browsers.
- **Provider Support:** Fully compatible with OpenAI API specifications, allowing routing to DeepSeek, OpenRouter, Groq, or Ollama via `CUSTOM_LLM_BASE_URL` and `CUSTOM_LLM_API_KEY`.

---

## 9. Success Metrics & Telemetry

- **Primary Success Metric:** 100% success rate in streaming text completions from an OpenAI-compatible / Gemini model endpoint to the React UI.
- **Engagement Telemetry:** Log message count, generation token lengths, and round-trip streaming duration to DevTools for performance tracking.

---

## 10. Risks, Assumptions & Open Issues

| Risk / Open Issue | Impact (H/M/L) | Description | Proposed Mitigation / Status |
| :--- | :--- | :--- | :--- |
| **Browser Stream Support** | Low | Next.js API route streams might get buffered by proxy servers. | Use standard HTTP `Content-Type: text/event-stream` and check dev server response headers. |
| **OpenAI Spec Deviations** | Medium | Different providers have subtle deviations in token usage reporting at the end of streams. | Rely on standardized Vercel AI SDK provider mapping to normalize response objects. |
