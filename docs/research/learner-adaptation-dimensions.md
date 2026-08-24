# Research: Learner Adaptation Dimensions

This document synthesizes findings on which individual learner differences actually affect learning outcomes and which are worth adapting to in the AI Learning Support system.

## 1. Learning Styles & Modality Preferences
*   **Status:** Debunked (Pashler et al., 2008)
*   **Evidence:** The "meshing hypothesis" (that visual learners learn best visually, auditory via audio, etc.) has no empirical support. While learners have subjective preferences, these do not produce aptitude-treatment interactions (ATI) that improve learning outcomes.
*   **Adaptation Feasibility:** N/A (Do not build core pedagogical logic around this).
*   **Recommendation:** Use multi-modal representations (Modality Effect from Sweller) to expand effective working memory for *all* learners, rather than matching instruction to a declared learning style.

## 2. Prior Knowledge Level (Expertise Reversal Effect)
*   **Status:** Highly Validated (Sweller, 2011; Cognitive Load Theory)
*   **Evidence:** Strong aptitude-treatment interaction. Instructional techniques that benefit novices (e.g., highly scaffolded step-by-step worked examples) actively harm experts by creating redundant cognitive load. Experts benefit most from autonomous problem-solving and minimal guidance.
*   **Adaptation Feasibility:** High.
*   **Recommendation:** Implement dynamic scaffolding and backward fading. The system must track domain mastery (e.g., via Bayesian Knowledge Tracing or FSRS stability) and automatically transition from Mode 1 (Full Worked Examples) to Mode 4 (Autonomous Retrieval) as expertise increases.

## 3. Memory Stability & Forgetting Rate
*   **Status:** Highly Validated (Bjork, 2011; Dunlosky, 2013)
*   **Evidence:** Individuals forget at different rates, but the mechanism of decay follows consistent mathematical models (New Theory of Disuse). Optimal learning requires retrieving information when Retrieval Strength (R) is low but Storage Strength (S) is high (Desirable Difficulties).
*   **Adaptation Feasibility:** High.
*   **Recommendation:** Use algorithms like FSRS to track individual item stability and schedule spaced retrieval practice when retrievability drops to the ~80-85% optimal desirable difficulty window.

## 4. Metacognitive Calibration
*   **Status:** Validated Deficit (Bjork, 2011)
*   **Evidence:** Learners routinely suffer from the "fluency illusion," confusing perceptual ease (like reading a highlighted text) with long-term mastery. Left to their own devices, they will choose low-utility strategies (cramming, blocked practice) over high-utility ones (spacing, interleaving, active recall).
*   **Adaptation Feasibility:** Medium.
*   **Recommendation:** The AI must act as a metacognitive override. It should enforce interleaved practice and generation-first Socratic dialogue, actively resisting user requests for direct answers or massed cramming sessions.

## 5. Working Memory Capacity
*   **Status:** Validated Constraint (Sweller, 2011)
*   **Evidence:** Working memory is strictly limited ($4 \pm 1$ chunks). Exceeding this via high element interactivity causes cognitive overload.
*   **Adaptation Feasibility:** Medium.
*   **Recommendation:** Instead of explicitly testing working memory capacity, dynamically adjust the "chunk size" of information presented (element interactivity budgeting). If the learner's error rate spikes or instructional efficiency drops (Paas Quadrant 4), the AI should fall back to isolating elements before combining them.

## Ranked Adaptation Priority for AI Implementation

1.  **Prior Knowledge / Expertise Tracking:** Essential for avoiding the Expertise Reversal Effect. Drive dynamic scaffolding.
2.  **Spaced Repetition (Forgetting Curve):** Essential for long-term retention. Implement via FSRS.
3.  **Metacognitive Override:** Essential for system guardrails. Force active retrieval and interleaving over passive study.
4.  **Element Interactivity Pacing:** Essential for cognitive load management. Adapt chunking based on real-time performance.
5.  **Learning Styles:** Ignore. Do not adapt.
