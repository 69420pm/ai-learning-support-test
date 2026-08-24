# Cognitive Science of the Inner Loop: Stage 1 Recommendations

This document outlines the cognitive science principles that should govern the "Inner Loop" (within-session step-level tutoring) of the AI Learning Support system. These findings synthesize primary research in cognitive science, multimedia learning, and intelligent tutoring systems to provide actionable recommendations for Stage 1.

## 1. Encoding Phase

The encoding phase is where learners first encounter or review material. The goal is to optimize schema acquisition while managing cognitive load.

**Recommendations for Stage 1:**
- **Manage Chunk Sizes (Cognitive Load Theory):** Working memory is severely limited to ~3-4 elements (Sweller, 2011). Information must be presented in highly focused chunks. Break down long explanations into micro-steps.
- **Apply Multimedia Principles (Mayer):**
  - *Coherence Principle:* ruthlessly eliminate extraneous words, pictures, and sounds (reduces extraneous load).
  - *Contiguity Principles:* Keep corresponding text and related material close together spatially and temporally.
  - *Segmenting Principle:* Allow the learner to control the pace of the material rather than presenting a continuous stream.
- **Foster Generative Learning:**
  - *Self-Explanation:* Prompt the learner to explain *why* a step is taken or how a concept works in their own words (Chi's ICAP framework; Mayer).
  - *Elaborative Interrogation:* Ask "Why is this true?" to connect new facts to prior knowledge (Dunlosky et al., 2013).

## 2. Retrieval Phase

Retrieval practice is essential for strengthening memory traces and slowing forgetting (Testing Effect).

**Recommendations for Stage 1:**
- **Utilize Active Recall:** Practice testing is one of the most effective learning techniques (Dunlosky et al., 2013). Prefer generative question formats (short answer, free recall, coding snippets) over simple recognition (multiple choice) where feasible.
- **Implement Interleaving:** Mix different topics or problem types within a single session to improve discrimination and transfer (Bjork & Bjork, 2011). Do not block practice by topic exclusively.
- **Calibrate Desirable Difficulties:** Aim for conditions that make learning feel harder but improve long-term retention and transfer (Bjork & Bjork, 2011). Avoid cognitive overload (frustration); the difficulty should induce effortful retrieval without exceeding working memory limits.

## 3. Feedback Phase

Feedback bridges the gap between current understanding and the learning goal.

**Recommendations for Stage 1:**
- **Apply Hattie's 4-Level Model:**
  - *Task (FT):* Focus on whether the answer is correct/incorrect (e.g., "The calculation is wrong"). Useful for novices.
  - *Process (FP):* Focus on the strategy or process (e.g., "Check the formula for the area"). Highly effective.
  - *Self-Regulation (FR):* Focus on self-monitoring (e.g., "You already know how to check this, what's your next step?"). Encourages autonomy.
  - *Self (FS):* **Avoid entirely.** Praise directed at the person ("You are smart") contains no task information and detracts from learning (Hattie & Timperley, 2007).
- **Time Feedback Appropriately:** Immediate feedback is crucial for correcting specific task errors (slips) and initial skill acquisition. Delayed feedback may be more effective for complex concept transfer (Hattie & Timperley, 2007).
- **Differentiate Slips vs. Misconceptions:** Treat careless errors (slips) with brief corrective feedback. Treat fundamental misunderstandings (misconceptions) with deeper scaffolding and re-teaching (Process-level feedback).

## 4. Encoding ↔ Retrieval Cycling

The rhythm of the tutoring session must balance instruction with assessment.

**Recommendations for Stage 1:**
- **Frequent Cycling:** Do not present large blocks of information before testing. Intersperse brief encoding phases (short explanations) with immediate retrieval checks. This prevents cognitive overload and maintains active engagement.
- **Worked Examples to Problem Solving:** Transition from providing fully worked examples (high support, low cognitive load) to completion problems (partial scaffolding), to independent practice problems (faded scaffolding) (Sweller, 2011).

## 5. Socratic Method and Scaffolding

The AI must act as a tutor, not an answer engine.

**Recommendations for Stage 1:**
- **Avoid the "Oracle Fallacy":** Do not provide direct answers. This bypasses the learner's cognitive processing and prevents learning.
- **Implement a 3-Tier Progressive Hint Ladder:** (Based on Khanmigo patterns)
  1. *Orienting Nudge:* Prompt the student to notice something or reflect (e.g., "What part of the formula seems relevant here?").
  2. *Conceptual Scaffold:* Provide a more direct hint about the concept (e.g., "Remember that velocity involves both speed and direction.").
  3. *Worked Micro-Step:* Break the problem down into the smallest possible next step, asking the student to complete only that step.
- **Deploy Defensive Guardrails:** Actively detect and reject "answer fishing" (e.g., "Just tell me the answer") and prompt injection attempts designed to bypass pedagogical alignment. Maintain strict token budgets for AI responses to prevent accidental over-explanation (answer leakage).

---
*Sources: Sweller (2011), Mayer's Multimedia Principles, Dunlosky et al. (2013), Bjork & Bjork (2011), Hattie & Timperley (2007), Khanmigo Socratic Prompting Patterns, Pedagogical Alignment for LLM Tutors.*
