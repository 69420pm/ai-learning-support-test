# Research Synthesis: Cognitive Science of the Outer Loop

**Related Issue:** #107
**Context:** AI Learning Support - Stage 1 Theoretical Model

---

## Executive Summary

In Intelligent Tutoring Systems (ITS), the **Outer Loop** is the macro-adaptation engine responsible for **task selection** (deciding *what* problem, concept, or module the student should study next), whereas the inner loop handles step-by-step scaffolding and feedback within a task (VanLehn, 2006). 

Based on cognitive science, ITS literature, and memory models (BKT, FSRS, HLR), the ideal Outer Loop operates as an **algorithmic curriculum sequencer** that maximizes long-term retention and transfer while actively countermanding the flawed metacognitive intuitions of the learner. It integrates prerequisite topologies, probabilistic mastery tracking, spaced repetition decay schedules, and the principles of "desirable difficulties" (Bjork, 2011).

---

## 1. Factors Influencing Task Selection Priority

The optimal task selection algorithm evaluates candidate tasks using a multi-objective utility function (VanLehn, 2006). In our architecture, the prioritization of a task $T$ relies on a synthesis of five critical dimensions:

1. **Prerequisite Readiness (Topological Ordering):**
   - **Mechanism:** Strict gating. A task cannot be scheduled if its prerequisite Knowledge Components (KCs) in the GraphRAG dependency graph are unmastered.
   - **Criterion:** For all prerequisite KCs $p$, Bayesian Knowledge Tracing (BKT) mastery probability must be $P(L_p) \ge \theta_{prereq}$ (typically 0.95) (Corbett & Anderson, 1994).
2. **Spaced Forgetting Urgency (FSRS / HLR):**
   - **Mechanism:** Priority spikes when a previously mastered KC is on the verge of falling below a target retrievability threshold ($R_{target} \approx 0.85 \text{ to } 0.90$).
   - **Theoretical Basis:** Both the Free Spaced Repetition Scheduler (FSRS) and Half-Life Regression (Settles & Meeder, 2016) demonstrate that reviewing a concept when retrievability $R$ is low (but not forgotten) maximizes the gain in Storage Strength ($\Delta S$). Reviewing too early ($R > 0.95$) wastes time; reviewing too late ($R < 0.60$) risks catastrophic lapse requiring a BKT remediation cycle.
3. **Mastery Deficits (BKT Intra-Session Acquisition):**
   - **Mechanism:** For new or currently-learning KCs, the outer loop schedules tasks targeting skills where $P(L_n) < 0.95$. Once $P(L_n) \ge 0.95$, the skill graduates to the FSRS spaced schedule, preventing "wheel-spinning" and redundant over-practice (Corbett & Anderson, 1994).
4. **Desirable Difficulties (Interleaving):**
   - **Mechanism:** The outer loop must intentionally mix (interleave) structurally different but related problem types (e.g., mixing permutation and combination math problems) rather than serving them in blocked batches (Bjork, 2011; Dunlosky et al., 2013).
5. **Exam Deadline Urgency:**
   - **Mechanism:** Semantic centrality via GraphRAG. KCs highly connected to the learner's specific upcoming exam targets receive increased utility weighting, ensuring critical path alignment (VanLehn, 2006).

---

## 2. Optimal Session Length and Composition

**Composition: Multi-Topic Breadth (Interleaving) > Single-Topic Depth (Blocking)**
Learners overwhelmingly prefer "Blocked Practice" (studying Topic A until perfect, then moving to Topic B). However, cognitive science proves blocked practice creates a **fluency illusion**—high immediate performance but catastrophic long-term decay (Bjork, 2011; Dunlosky et al., 2013).
- **The Discriminative Contrast Hypothesis:** Interleaving forces the learner to actively diagnose *which* concept or formula applies, preventing mindless application of rules.
- **Outer Loop Rule:** The outer loop scheduler must **never** serve more than 3 consecutive tasks of the identical structural category. It must interleave candidate tasks to enforce strategy-selection effort.

**Session Length: Distributed Practice over Massed Practice**
- "Cramming" (Massed Practice) yields near-zero Storage Strength gains. 
- The outer loop should encourage spreading practice over multiple days. The optimal Inter-Study Interval (ISI) is roughly 10% to 20% of the target Retention Interval (RI) (Dunlosky et al., 2013).

---

## 3. Balancing Spaced Repetition vs. New Material Acquisition

An ideal outer loop maintains a strict equilibrium between encoding (learning new KCs) and retention (reviewing old KCs).

- **Retention First (The FSRS Priority):** If an established memory trace drops below $R \le 0.85$, the outer loop must prioritize a spaced repetition review task *before* introducing new KCs. Allowing established KCs to lapse into forgetting requires costly BKT relearning cycles.
- **Acquisition Second (The BKT Pipeline):** When the spaced repetition queue is clear, the outer loop ingests new tasks based on the topological sorting of the curriculum graph. These tasks remain in the active BKT inner-loop until $P(L) \ge 0.95$, at which point they are handed off to the FSRS schedule (Corbett & Anderson, 1994).
- **Post-Lapse Micro-Remediation:** If a spaced review is failed (Grade 1 "Again"), it should not just be re-tested in 10 minutes. The outer loop must drop the KC back into the BKT acquisition pipeline for a short, scaffolded Socratic re-encoding session.

---

## 4. The Role of Learner Agency and the Cost of Suboptimal Sequencing

**The Metacognitive Illusion:**
Human learners possess deeply flawed metacognitive monitoring systems (Dunlosky et al., 2013). They consistently equate *perceptual fluency* (ease of reading) with *memory durability*. As a result, when given full agency (Learner Control), students will default to low-utility strategies: passive rereading, uncontrolled highlighting, and blocked practice (VanLehn, 2006; Bjork, 2011).

**System Implications:**
- **Metacognitive Override:** While the UI can offer learner agency as a fallback, the system's default behavior must explicitly **override** user intuitions. If a user asks to "cram 50 questions on React Hooks", the outer loop must intercept this, serve an interleaved mix of Hooks alongside previous topics, and explicitly explain the cognitive rationale to the user.
- **Cost of Suboptimal Sequencing:** Allowing the user to freely browse and skip prerequisites results in cognitive overload, prerequisite failure cascades, and what ITS literature terms "labor-in-vain" (Metcalfe, 2002). The outer loop must serve as an authoritative, algorithmic guardrail.

---

## References
1. VanLehn, K. (2006). *The Behavior of Tutoring Systems*.
2. Corbett, A. T., & Anderson, J. R. (1994). *Knowledge Tracing: Modeling the Acquisition of Procedural Knowledge*.
3. Settles, B., & Meeder, B. (2016). *A Trainable Spaced Repetition Model for Language Learning* (Half-Life Regression).
4. Ye, J., et al. (2022). *FSRS: Optimizing Spaced Repetition Schedule by Capturing the Dynamics of Memory*.
5. Bjork, E. L., & Bjork, R. A. (2011). *Making things hard on yourself, but in a good way: Creating desirable difficulties to enhance learning*.
6. Dunlosky, J., et al. (2013). *Improving Students' Learning With Effective Learning Techniques*.
