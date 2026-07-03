# PRD 01: Product Vision & Learning Strategy

---

## 1. Document Control

### 1.1 Metadata
| Attribute | Value |
| :--- | :--- |
| **Product / Domain** | Core Vision & Learning Strategy |
| **Version** | 1.0.0 |
| **Status** | Approved |
| **Target Persona** | Academic & Professional Self-Directed Learners |
| **Target Packages** | `apps/web`, `packages/core` |
| **Last Updated** | 2026-07-03 |

---

## 2. Executive Summary & Value Proposition

### 2.1 Problem Statement
Modern generative AI tools (such as ChatGPT, Gemini, or summary wrappers) are frequently misused by students and self-directed learners to bypass the critical cognitive effort required for deep learning. While using LLMs to auto-generate summary notes or answer direct queries provides a short-term illusion of productivity, it leads to poor long-term memory retention because the cognitive work is offloaded to the AI.

Furthermore, proven learning techniques—such as active recall, spaced repetition, interleaving, and the Feynman technique—are rarely adopted manually due to high friction, administrative overhead, and subjective difficulty.

### 2.2 Product Vision & Justification
The AI Learning Support system is an intelligent study companion designed to guide learners through mastering textual source material (textbooks, research papers, lecture notes). Instead of acting as a passive answer engine, the platform programmatically enforces desirable cognitive difficulties while automating administrative study workflows (schedule synthesis, card generation, progress tracking).

---

## 3. Product Goals & Scope

### 3.1 Strategic Goals
- **Active Guidance Paradigm:** Transition LLM interaction from passive answer generation to active pedagogical coaching.
- **Document-Grounded Learning:** Ensure 100% of study workflows are grounded in user-provided PDF source material.
- **Goal-Oriented Adaptation:** Tailor learning depth and pacing to explicit user objectives (e.g., exam preparation vs. long-term mastery).
- **Self-Hostable Privacy:** Provide a clean path for privacy-conscious users to execute the application locally using personal hardware and API keys.

### 3.2 Non-Goals (Scope Boundaries)
- **Non-Textual Asset Analysis:** Processing raw video files, audio lectures, or 3D visual assets is out of scope for the MVP.
- **Native PDF Annotations:** Built-in PDF highlighting, draw tools, or native PDF modification capabilities are out of scope; a passive text-viewing interface is utilized.
- **Social & Collaborative Features:** Shared study groups, classroom management dashboards, and public leaderboard features are out of scope.
- **Native Mobile Application:** Desktop native wrappers (Electron/Tauri) and mobile apps are out of scope; browser web application support is primary.

---

## 4. User Workflows & Persona

### 4.1 Target Persona
Academic students and professional learners who need to master dense textual material under time constraints, requiring high memory retention without spending hours creating flashcards or study schedules manually.

### 4.2 Step-by-Step User Journey
1. **Trigger:** User uploads PDF study material and specifies target learning goals (e.g., target completion date, target mastery level).
2. **Action:** User engages in structured study sessions guided by the application's daily schedule.
3. **System Response:** The system presents active study prompts, evaluates explanations, schedules reviews, and updates progress metrics.
4. **Completion:** User achieves verifiably high retention scores across all concept nodes in the source document.

### 4.3 Edge Cases & Failure Modes
- **Low-Quality PDF Source:** Scanned images or unreadable text layers trigger an explicit error message prompting OCR preprocessing before ingestion.
- **Overambitious Target Dates:** System alerts user when target completion date requires unrealistic daily study duration based on document volume.

---

## 5. Detailed Functional Requirements

| ID | Feature / Component | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **FR-1** | Active Study Enforcement | The platform must restrict passive query/answer modes during study sessions, requiring user response to active recall prompts prior to displaying detailed explanations. | Must Have |
| **FR-2** | Document Grounding Constraint | All generated study prompts, questions, and evaluation criteria must be strictly derived from ingested source document chunks. | Must Have |
| **FR-3** | Adaptive Goal Configuration | The system must allow users to update learning target dates or depth preferences at any point, recalculating daily study workloads deterministically. | Must Have |

---

## 6. Security, Data Privacy & AI Safety Guardrails

### 6.1 Data Privacy & Protection
- **Local Data Option:** All study data, ingested document chunks, and review histories must be storable locally in SQLite for self-hosted instances.
- **Zero Third-Party Training:** API payloads sent to LLM providers must explicitly use zero-data-retention headers where supported.

### 6.2 AI Safety & Grounding
- **Hallucination Containment:** System prompts must instruct models to output `"Insufficient context in source document"` if a user query cannot be answered directly from the uploaded material.

---

## 7. UX & Interface Specifications

### 7.1 UI Components & Placement
- Header navigation providing access to: Study Dashboard, Ingestion Library, Review Deck, and Settings.
- Main layout featuring a dual-pane view (Document Context Reader on left, Active Study Assistant on right).

### 7.2 Required Interaction States
- **Loading State:** Non-blocking skeleton loaders during background AI processing.
- **Empty State:** Guided dropzone interface for PDF upload when no documents exist.
- **Error State:** Dismissible banner notifications with actionable error codes.

---

## 8. Technical & Operational Constraints

- **Platform Target:** Web Application (Next.js frontend, Node.js core library).
- **Browser Compatibility:** Support latest evergreen browsers (Chrome, Firefox, Safari, Edge).

---

## 9. Success Metrics & Telemetry

- **Primary Metric:** 85%+ retention score accuracy on active recall tests after a 14-day interval.
- **Engagement Metric:** Daily active study session completion rate vs. plan target.

---

## 10. Risks, Assumptions & Open Issues

| Risk / Open Issue | Impact (H/M/L) | Description | Proposed Mitigation / Status |
| :--- | :--- | :--- | :--- |
| **User Friction Over Resistance** | Medium | Users accustomed to instant AI answer generation may resist active recall constraints. | Onboarding tutorial explaining the cognitive benefits of active recall. |
