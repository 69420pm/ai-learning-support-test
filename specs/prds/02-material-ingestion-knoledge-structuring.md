# PRD 02: Material Ingestion & Knowledge Structuring

## 1. Document Control

### 1.1 Metadata

| Attribute | Value |
| :--- | :--- |
| **Product / Domain** | Material Ingestion & Knowledge Structuring (the "map builder") |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Target Persona** | Downstream LLM tutor/assessment agents (primary consumer); learner uploading materials (indirect) |
| **Target Packages** | Backend / ingestion services + agent tool interface (exact packages TBD in architecture phase) |
| **Last Updated** | 2025-XX-XX |

---

## 2. Executive Summary & Value Proposition

### 2.1 Problem Statement

A learner preparing for an exam has a pile of raw materials — lecture scripts, slide decks, past exams, exercise sheets — of wildly varying quality, from clean structured documents to slide decks containing screenshots of text and hand-drawn diagrams. In this raw form the material is not something an expert tutor can work with: there is no shared structure across files, no way to know which pieces cover the same topic, no notion of how topics depend on each other, and no link between exam questions and the material they test. The knowledge exists but is not **navigable, connected, or addressable**.

### 2.2 Product Vision & Justification

This layer transforms an arbitrary collection of a subject's PDFs into a **navigable map of the subject that points back to the original, unaltered material**. It is the foundation on which every later capability (tutoring, explanation, quizzing, progress tracking) is built.

The defining principle — and the reason this is not just another document search index — is that the map captures **the relationships between topics**, not merely their existence. An expert human tutor does not just know where a concept is written down; they know that to understand topic X the student first needs topic Y, that the script and slide 12 both cover the same idea, and where a student can start with no prerequisites. Encoding those relationships is what elevates this from keyword retrieval to something that enables genuine comprehension.

A second, equally important principle: **the ingestion layer never becomes a source of truth of its own.** It does not rewrite, summarize, or "improve" the material into the store, and it never invents content or answers. The original document remains the truth; the system builds structure *around* it and always points back to the real source. This keeps hallucination out of the foundation and makes everything downstream citable by construction.

We build this now because it is the hard, shared prerequisite for every other feature. Skipping it forces every downstream agent to re-solve navigation and grounding from scratch.

---

## 3. Product Goals & Scope

### 3.1 Strategic Goals

- **Universal comprehension of text-bearing material:** For any subject and domain (STEM, legal, medical, technical, etc.), if a human can read and understand the material, the system produces a usable map of it. Materials whose meaning is primarily non-textual/visual-artistic (e.g. art-appreciation image sets) are outside the guaranteed range; text, tables, formulas, and explanatory diagrams are in range.
- **Original content as source of truth:** Every element the map exposes resolves to unaltered original content (verbatim text or the original figure image) with an addressable citation (file + location). The store adds structure and derived metadata only — never rewritten or invented substance.
- **Relationship-aware topic map:** The map organizes all of a subject's material into a topic-centric structure that spans every file, and captures relationships between topics (overlap/co-coverage across files, and prerequisite/dependency-style connections), plus derived **entry points** where the map can be entered without prerequisites.
- **Connected test base:** Questions and exercises across all materials are detected, parsed into their components, linked to their solutions when solutions exist, and linked to the topics they assess — including flagging questions the knowledge material does not cover.
- **Versatile ingestion of imperfect PDFs:** Extraction succeeds whether content is a real text layer or a screenshot of text, using text where reliable and escalating to multimodal understanding where spatial layout, diagrams, or image-borne text matter.
- **Incremental growth:** New material can be added to an existing subject and merged into the map without reprocessing the whole subject from scratch.

### 3.2 Non-Goals (Scope Boundaries)

- **No full teaching sequence / curriculum ordering.** This PRD derives relationships and entry points only. Producing an ordered lesson plan is a downstream PRD.
- **No content generation of any kind.** No generated explanations, summaries baked into the store, or generated exam questions/answers. Diagram *descriptions* are the only derived text, and only as clearly-marked metadata paired with the original image.
- **No answering, tutoring, or grounding logic.** Runtime Q&A, explanation depth adaptation, and controlled use of external LLM knowledge live in the Tutoring PRD.
- **No question generation, grading, or quizzing.** Assessment PRD.
- **No learning-science features** (spaced repetition, mastery tracking, adaptive difficulty).
- **No frontend/UI.** Backend and agent-facing tools only.
- **No retrieval/ranking algorithm mandate.** This PRD specifies what must be addressable and navigable, not how retrieval is scored (Retrieval PRD may refine).

---

## 4. User Workflows & Persona

### 4.1 Target Persona

**Primary consumer: a downstream LLM agent** (tutor or assessment engine) that calls this layer as a set of tools to locate, read, and relate the exact material it needs — behaving like an expert who has fully studied the course.

**Indirect actor: the learner**, who owns a subject and supplies its materials. Any skill level, any domain. Their experience of this layer is limited to providing materials and, in rare cases, being warned that a file is unusable.

### 4.2 Step-by-Step User Journey (ingestion of a subject)

1. **Trigger:** A learner's subject receives one or more PDFs (knowledge and/or test materials), initially or added later.
2. **Action (system):** Each file passes a low-bar sanity check, then is processed to extract original content (text and figures), using multimodal understanding where text alone is unreliable.
3. **System Response:** Extracted content is organized into the subject's topic-centric map; topics are connected by relationship links; figures get paired descriptions; questions/exercises are parsed, linked to solutions where present, and linked to assessed topics; entry points are derived; coverage gaps are flagged. Everything remains addressable to its original source.
4. **Completion:** The subject's map is queryable by a downstream agent — browse topics, pull original content, follow relationships, list/locate questions, retrieve solutions, and identify entry points and gaps. Adding more material later merges into this same map.

### 4.3 Edge Cases & Failure Modes

- **Unusable content (garbage in):** A cheap pre-check (whole or sampled) detects content with essentially no meaningful signal (blank pages, pure noise/random symbols, no recoverable text or figures). Bar is deliberately low. Consequence: skip the affected page(s) and flag them; reject a whole file only when essentially all of it fails. The learner is warned in these rare cases.
- **Screenshot-of-text / image-borne text:** Text embedded in images is recovered via multimodal understanding rather than lost.
- **Diagram with relational elements (arrows, callouts):** Relationships within a figure are captured in its description and the original image is retained; the connections are not discarded.
- **Solution present but separated** (answer key in another file or at document end): the question is linked to its solution across files.
- **Question with no available solution:** recorded as "no solution available." The system does not invent one.
- **Question testing uncovered material:** flagged as a coverage gap against the knowledge map.
- **Overlapping/duplicate coverage across files:** represented as co-coverage relationships on a topic rather than silently dropped or blindly duplicated.
- **Ambiguous topic boundaries:** the system is permitted to make an organizational judgment (see FR-3) provided it never alters or fabricates content.
- **Re-added / updated file:** merges into the existing map without requiring full reprocessing.

---

## 5. Detailed Functional Requirements

*Requirements state the capability and its guarantees, leaving implementation open. "Original content" = unaltered source text or original figure image with a resolvable citation.*

| ID | Feature / Component | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **FR-1** | Sanity pre-check | Before substantive processing, each file/page is checked cheaply for meaningful content. Pages with no recoverable meaningful content are skipped and flagged; a file is rejected only when essentially all pages fail. The threshold is low (only near-total noise triggers it). Every skip/rejection is reported with its reason. | Must Have |
| **FR-3** | Topic-centric map across all materials | All extracted content for a subject is organized into a topic-centric structure spanning every file. The primary navigation unit is the **topic**; each topic points to one or more original source spans (which may live in different files). The system may make organizational/grouping judgments, constrained by: it may organize and point to content but must never alter, summarize-into, or fabricate content. Given a topic, an agent can retrieve the exact original content covering it. | Must Have |
| **FR-6** | Topic relationship map | The map captures relationships between topics: (a) **co-coverage** — the same topic addressed in multiple places/files; (b) **dependency** — prerequisite/"needed to understand" connections between topics. An agent can, from a topic, discover related and prerequisite topics. Relationships are derived structure over real content and introduce no new substantive content. | Must Have |
| **FR-7** | Entry points | From the relationship graph, the system derives entry points — topics that can be approached without unmet prerequisites — and exposes them for query. (No full ordering/sequencing beyond this.) | Should Have |
| **FR-8** | Question & exercise detection and parsing | Questions/exercises across all materials — including standalone exams/sheets and items interleaved in knowledge content (e.g. a question on a slide) — are detected and parsed into components (stem; options if any; solution if present; point value if present). Parsed fields resolve to their original source. | Must Have |
| **FR-9** | Question ↔ solution linking | When a solution exists — in the same document, at document end, or in a separate answer key — the question is linked to it. When no solution exists, the item is marked "no solution available." The system never fabricates a solution. | Must Have |
| **FR-10** | Question ↔ topic linking & coverage-gap flagging | Each question/exercise is linked to the knowledge topic(s) it assesses. Questions whose content is not covered by the subject's knowledge material are flagged as coverage gaps. (Requires the knowledge map to exist first — establishes an ordering dependency: knowledge structuring precedes test linking.) | Must Have |
| **FR-11** | Exercises linked into the topic map | Exercises/questions are slotted into the topic map so an agent can request the exercises associated with a given topic. | Should Have |
| **FR-12** | Universal addressability & citation | Every item the map exposes — topic span, figure, question, solution — carries a citation resolving to file + location, enabling verbatim quoting/showing downstream. | Must Have |
| **FR-13** | Per-user, per-subject isolation | Each learner has an independent knowledge base and test base per subject. Materials and maps of one subject/user are isolated from others. | Must Have |
| **FR-14** | Incremental merge | New material added to an existing subject is merged into the existing map — new topics/spans/questions/relationships are integrated and overlaps recognized — without reprocessing the entire subject. | Must Have |
| **FR-15** | Processing status & flags reporting | The system reports, per subject/file, what was processed, skipped, rejected, flagged (coverage gaps, missing solutions, low-confidence extractions), so downstream consumers and the learner can see the map's state. | Should Have |

---

## 6. Security, Data Privacy & AI Safety Guardrails

### 6.1 Data Privacy & Protection

- **Learner data handling:** Uploaded materials are private to the owning learner and subject; strict per-user/per-subject isolation (FR-13). No cross-tenant access.
- **PII in materials:** Past exams/sheets may contain names, student IDs, or grader annotations. This PRD **preserves original content faithfully** and does not scrub by default; a PII-handling decision (retain vs. redact-on-surface) should be flagged as an open issue and should be resolved before handling regulated (legal/medical) data at scale.
- **Retention & scrubbing:** Original files and derived maps persist for the life of the subject; deletion of a subject removes its materials, derived map, and stored figure images.

### 6.2 AI Safety, Grounding & Defense

- **Grounding by construction:** The store contains no generated substantive content. Everything resolves to original source (FR-4, FR-12), so downstream grounding and citation are guaranteed at the data layer. The only derived text is figure descriptions, explicitly marked and image-bound (FR-5).
- **No fabrication:** The system never invents content, topics, relationships without basis, or answers (FR-9). Organizational judgment (FR-3) is confined to structuring/pointing, never to altering content.
- **Prompt/content injection:** Instruction-like text inside uploaded documents is treated strictly as *content to be structured*, never as instructions to the ingestion process.
- **Cost controls:** Multimodal escalation is applied selectively (FR-2) rather than to all pages, to bound cost. A concrete cost/latency budget is an open item for the architecture phase (§10).

---

## 7. UX & Interface Specifications

No end-user UI in this PRD. The "interface" is the **agent-facing tool surface** exposed over the map. Conceptually it must offer capabilities to: browse topics; retrieve original content for a topic/element; retrieve a figure (image + description); traverse relationships (related, prerequisite); list entry points; list/locate questions and exercises; retrieve a question's solution or its absence; identify coverage gaps; and read processing status/flags. Exact tool signatures are defined in the architecture/retrieval phase.

Interaction states apply to the ingestion process reporting (FR-15): in-progress, completed, skipped/rejected-with-reason, and flagged. Exact surfacing is downstream.

---

## 8. Technical & Operational Constraints

- **Performance & cost:** No hard targets yet, but as fast and cheap as possible while still meeting quality standards. Needs to be architected for scale (many subjects, many pages per subject, many users) and for incremental growth (FR-14). Concrete pricing will be defined later.
- **Data & storage:** Requires isolated per-user/per-subject persistence for original files, figure images, and the derived map/relationships/question links; must support incremental merge (FR-14) rather than full recompute.
- **Dependencies:** Depends on multimodal document understanding capability; does not mandate a specific model/provider.
- **Ordering dependency:** Knowledge structuring must precede test-base topic linking (FR-10).

---

## 9. Success Metrics & Telemetry

- **Coverage fidelity:** Share of human-readable source content represented and resolvable in the map (no silent loss). Verified against sampled documents.
- **Citation resolvability:** Every exposed element resolves to valid original source (target: 100% by construction).
- **Extraction robustness across quality tiers:** Successful mapping across clean, mixed, and screenshot-heavy documents; near-zero false "unusable" rejections (FR-1 bar stays low).
- **Relationship usefulness:** Presence and correctness (spot-checked) of co-coverage and prerequisite links — the differentiator vs. flat search.
- **Question linkage:** Share of detected questions correctly parsed, solution-linked where solutions exist, and topic-linked; coverage gaps correctly flagged.
- **Incremental efficiency:** Added material merges without full reprocessing.

---

## 10. Risks, Assumptions & Open Issues

| Risk / Open Issue | Impact | Description | Proposed Mitigation / Status |
| :--- | :--- | :--- | :--- |
| **Extraction non-determinism / silent loss** | High | LLM-based extraction can drop or misread content; catastrophic for legal/medical. | Prefer pointing to originals over reconstruction (already core design); define a verification/confidence approach in architecture phase. Open. |
| **Topic-organization judgment errors** | Medium | The system's grouping across files is interpretive and may mis-group. | Bound to structuring-only (never alters content); acceptable per product decision that LLMs are strong here. Spot-check via metrics. Accepted with monitoring. |
| **Prerequisite/relationship accuracy** | High | Dependency links are the core value but are inferred and may be wrong. | Treat as derived, reviewable structure; validate via sampling; refine heuristics. Open. |
| **Cost of multimodal at scale** | Medium | Vision on many pages is the main cost driver. | Hybrid selective escalation (FR-2); set concrete budget in architecture phase. Open. |
| **PII in uploaded exams** | Medium | Faithful preservation may retain personal data, relevant under legal/medical regimes. | Decide retain-vs-redact policy before regulated-scale use. Open. |
| **"Unusable" threshold calibration** | Low | Too aggressive a bar wrongly rejects understandable material. | Keep bar deliberately low; per-page skip over file rejection (FR-1). Accepted. |
| **Cross-file solution linking ambiguity** | Medium | Matching questions to separate answer keys can be uncertain. | Link when determinable; otherwise mark "no solution available"; never guess. Accepted. |
| **Scope drift toward tutoring/sequencing** | Medium | Pressure to add explanations or full ordering here. | Explicit Non-Goals (§3.2); relationships + entry points only. Accepted. |
