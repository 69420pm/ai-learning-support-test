# PRD 06: Pedagogical Science Engine

---

## 1. Document Control

### 1.1 Metadata
| Attribute | Value |
| :--- | :--- |
| **Product / Domain** | Cognitive Science & Pedagogical Engine |
| **Version** | 1.0.0 |
| **Status** | Approved |
| **Target Persona** | Active Learners requiring verified retention |
| **Target Packages** | `packages/core/src/features/pedagogy`, `packages/core/src/features/scheduler` |
| **Last Updated** | 2026-07-03 |

---

## 2. Executive Summary & Value Proposition

### 2.1 Problem Statement
Standard learning applications fail to enforce evidence-based cognitive strategies. Learners naturally prefer passive rereading and highlighting because these activities feel low-friction, despite producing rapid forgetting. Programmatically enforcing cognitive science principles requires a dedicated pedagogical rules engine that structures study sessions into Active Recall, Spaced Repetition, Interleaving, and Feynman Audits.

### 2.2 Product Vision & Justification
The Pedagogical Science Engine acts as the algorithmic brain of the learning system. It transforms source document knowledge structures into active learning tasks, continuously evaluates user responses against ground-truth concepts, and schedules optimal review timings to interrupt the forgetting curve.

---

## 3. Product Goals & Scope

### 3.1 Strategic Goals
- **Active Recall Enforcement:** Block passive text consumption until active retrieval questions are attempted.
- **Algorithmic Spaced Repetition:** Implement the Free Spaced Repetition Scheduler (FSRS) to calculate precise review intervals based on historical recall performance.
- **Contextual Interleaving:** Programmatically mix review prompts across distinct topics within a single session to strengthen concept discrimination.
- **Feynman Concept Audits:** Evaluate user-submitted plain-language explanations against source document ground truth to detect misconceptions.

### 3.2 Non-Goals (Scope Boundaries)
- **Manual Flashcard Crafting UI:** The engine auto-generates cards; manual card design interfaces are out of scope for the core engine.
- **Subjective Grading Override:** User self-grading without algorithmic verification is out of scope for Feynman Audits.

---

## 4. User Workflows & Persona

### 4.1 Target Persona
Learners executing daily study sessions who require objective verification of their conceptual understanding rather than subjective self-assessment.

### 4.2 Step-by-Step User Journey
1. **Trigger:** Daily study session commences based on scheduled milestone items.
2. **Action:** System presents an active recall prompt or Feynman explanation challenge for a specific concept node.
3. **System Response:** User submits written response. The engine grades response against concept ground truth, assigns performance rating (Again, Hard, Good, Easy), and schedules next review timestamp using FSRS.
4. **Completion:** Session concludes when all due cards and interleaving review items are processed.

### 4.3 Edge Cases & Failure Modes
- **Ambiguous Explanation Input:** If user explanation is under 5 words, system prompts user to elaborate before submitting for AI audit.
- **API Timeout During Audit:** Fallback to card self-rating interface with retry queue for background AI audit evaluation.

---

## 5. Detailed Functional Requirements

| ID | Feature / Component | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **FR-1** | Active Retrieval Gate | System must lock full-text chapter views until pre-reading priming questions or active retrieval prompts are answered by the user. | Must Have |
| **FR-2** | FSRS Interval Calculation | System must compute next review interval `t_next` using FSRS algorithm parameters based on user response rating (1=Again, 2=Hard, 3=Good, 4=Easy). | Must Have |
| **FR-3** | Interleaved Session Queue | System must construct review queues containing a minimum of 2 distinct concept categories per session when total due items exceed 5. | Must Have |
| **FR-4** | Feynman Evaluation Engine | System must compare user explanation against document ground-truth JSON schema, returning a binary pass/fail grade, a missing concepts array, and a misconception summary. | Must Have |

---

## 6. Security, Data Privacy & AI Safety Guardrails

### 6.1 Data Privacy & Protection
- User explanation logs and audit scores are stored in local/database session tables and stripped of PII prior to model evaluation.

### 6.2 AI Safety & Defense
- **Prompt Injection Defense:** Feynman evaluation prompts must isolate user input string within strict XML tags `<user_explanation>` to prevent prompt override attacks.

---

## 7. UX & Interface Specifications

### 7.1 UI Components & Placement
- Active Review Interface containing question prompt card, response text area, and feedback breakdown drawer (Pass/Fail, missing points, ground-truth reference).

### 7.2 Required Interaction States
- **Loading State:** Spinner display while Feynman AI audit evaluates response.
- **Success State:** Green indicator banner showing card scheduled interval (e.g., "Next review in 4 days").

---

## 8. Technical & Operational Constraints

- **Execution Speed:** FSRS mathematical scheduling calculations must complete in < 10ms per item locally.
- **Audit Response Time:** LLM Feynman audit evaluation must return result in < 3.0s.

---

## 9. Success Metrics & Telemetry

- **Retention Rate:** 85%+ retention score on FSRS review items.
- **Feynman Accuracy:** High correlation between AI audit pass grades and subsequent retention review success.

---

## 10. Risks, Assumptions & Open Issues

| Risk / Open Issue | Impact (H/M/L) | Description | Proposed Mitigation / Status |
| :--- | :--- | :--- | :--- |
| **LLM Evaluation Strictness** | Medium | Overly strict AI grading during Feynman audits may demotivate learners. | Tune evaluation prompt rubric with few-shot examples of valid alternative phrasings. |
