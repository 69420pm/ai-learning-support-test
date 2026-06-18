# AI Learning Support — Product Requirements Document (PRD)

---

## 1. Document Control

### 1.1 Metadata
| Attribute | Value |
| :--- | :--- |
| **Product Name** | AI Learning Support |
| **Version** | 1.0.0 |
| **Status** | MVP Draft |
| **Last Updated** | 2024-06-01 |
| **Target Audience** | Academic & Professional Learners |

### 1.2 Revision History
| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2024-06-01 | Product Team | Initial draft for MVP scope and architecture alignment. |

---

## Table of Contents
- [1. Document Control](#1-document-control)
- [2. Executive Summary & Context](#2-executive-summary--context)
  - [2.1 Product Vision](#21-product-vision)
  - [2.2 Problem Statement](#22-problem-statement)
  - [2.3 Core Pedagogical Framework](#23-core-pedagogical-framework)
- [3. Product Goals & Scope](#3-product-goals--scope)
  - [3.1 Strategic Goals](#31-strategic-goals)
  - [3.2 Scope Boundaries (Non-Goals)](#32-scope-boundaries-non-goals)
- [4. Functional Requirements & User Workflows](#4-functional-requirements--user-workflows)
  - [4.1 Document Preprocessing & Concept Ingestion (GraphRAG)](#41-document-preprocessing--concept-ingestion-graphrag)
  - [4.2 Dynamic Learning Plan Generation](#42-dynamic-learning-plan-generation)
  - [4.3 Guided Encoding (Active Study Phase)](#43-guided-encoding-active-study-phase)
  - [4.4 Active Recall & Spaced Repetition (Review Phase)](#44-active-recall--spaced-repetition-review-phase)
- [5. Financial Viability & Competitive Differentiation](#6-financial-viability--competitive-differentiation)
- [6. Risks & Open Issues](#7-risks--open-issues)

---

## 2. Executive Summary & Context

### 2.1 Product Vision
The AI Learning Support system is an intelligent companion designed to guide users through the process of mastering textual content (e.g., academic textbooks, research papers, lecture slides, and business documents). By automating the high-friction, administrative tasks of learning—such as note-taking, summarization, flashcard creation, and spaced repetition scheduling—the system enables learners to focus exclusively on comprehension, retention, and application. The system is flexible, personalized, and deeply grounded in cognitive science.

### 2.2 Problem Statement
Many modern AI learning aids (including general chat interfaces like ChatGPT or Gemini) are frequently misused to bypass the "desirable difficulties" of cognitive effort. While using LLMs to write summaries or answer direct questions provides a short-term illusion of productivity, it fails to produce durable long-term retention because the cognitive effort is offloaded from the learner's brain to the machine. 

Additionally, standard cognitive science techniques that optimize retention—such as active recall, spaced repetition, and interleaving—are rarely adopted. They are unintuitive to implement manually, require substantial bureaucratic overhead, and feel subjectively more difficult to the student. AI presents an opportunity to bridge this gap by minimizing implementation friction and guiding the learner along a scientifically optimal path.

### 2.3 Core Pedagogical Framework
To maximize retention, the application will programmatically implement and guide the user through established learning science principles:

> [!NOTE]
> **Active Recall:** Forcing the brain to retrieve information from memory rather than passively rereading it.
>
> **Spaced Repetition:** Testing knowledge at expanding intervals to interrupt the forgetting curve.
>
> **Interleaving:** Mixing different topics or subjects within a single study session to build robust cognitive associations.
>
> **Feynman Technique:** Requiring the user to explain complex concepts in simple, plain language to identify gaps in understanding.

---

## 3. Product Goals & Scope

### 3.1 Strategic Goals
- **Platform:** The application should be a web application accessible via standard browsers, either hosted locally or on a cloud platform.
- **Structured Content Ingestion:** Allow users to upload textual source materials (specifically PDF format) that will ground all subsequent learning sessions.
- **Goal-Oriented Personalization:** Adapt the system to explicit user goals (e.g., scoring an A+ on an exam, deep conceptual understanding for practical application, or passing a minimum threshold).
- **Automated Learning Plans:** Dynamically generate a structured learning schedule optimized for efficiency and grounded in the ingested content.
- **Adaptive Guided Study:** Lead the user step-by-step through the study plan, adjusting the speed and depth of content delivery based on real-time performance.
- **Dynamic Adaptability:** Allow users to update their learning goals, schedules, or source materials at any point during their learning lifecycle.
- **Self-Hostable & Private:** Provide a path for tech-savvy users to run the application locally on their own hardware with their own API keys, keeping their study data private and local.
- **Asynchronous Task Processing:** Ensure heavy computational processes (e.g., PDF parsing and GraphRAG concept generation) execute asynchronously to avoid blocking the user interface or triggering network timeouts.

### 3.2 Scope Boundaries (Non-Goals)
- **No Non-Textual Assets:** Support is strictly limited to textual materials with diagrams, everything a multimodal model currently can understand, for the initial phase. Visual assets (art, complex mechanical/architectural material), video ingestion, and audio files are out of scope.
- **No Native Annotations:** The app will integrate a clean, passive PDF viewer, but will not provide built-in annotation, highlighting, or editing capabilities.
- **Single-User Focus:** No collaborative, classroom management, or social features will be built for the MVP.
- **Web-Only Deployment:** Desktop wrapper builds (Electron, Tauri) or native mobile applications are out of scope; the application will be optimized for standard web browsers.

---

## 4. Functional Requirements & User Workflows

### 4.1 Document Preprocessing & Concept Ingestion (GraphRAG)
- **PDF Extraction:** Parse text and structure from uploaded PDF materials.
- **Concept Graph Generation (Cheap GraphRAG):** Construct a simplified conceptual knowledge graph showing how topics relate to one another. This graph acts as a retrieval context to boost prompt grounding and answering precision.
- **Granular Summarization:** Generate hierarchical summaries (high-level overviews down to detailed deep-dives) for all concepts in the document.
- **Smart Directory Mapping:** Generate a Table of Contents with mapped deep links to the original PDF pages, the conceptual graph nodes, and the summaries. This avoids bloating the LLM's context window by retrieving only relevant nodes as needed.
- **Asynchronous Processing Feedback:** Since preprocessing is slow, the interface must present a live, step-by-step progress status to the user while ingestion runs in the background.

### 4.2 Dynamic Learning Plan Generation
- **Visual Milestones:** Map out the generated learning plan in an interactive timeline interface.
- **Progress Tracking:** Color-code and update progress (e.g., completed topics, in-progress items, and scheduled reviews).
- **Struggle Analytics:** Identify and flag specific concepts where the user struggled during recall sessions, prompting the system to schedule extra reviews.

### 4.3 Guided Encoding (Active Study Phase)
- **Scientific Priming:** Prompt users to make pre-reading predictions or answer baseline questions about a concept before diving into the detail, activating pre-existing knowledge.
- **Scaffolded Detail Levels:** Dynamically expand or simplify the detail of explanations based on user comprehension feedback to build solid mental models without cognitive overload.
- **Strict Grounding:** Constrain explanations strictly to the uploaded document context to prevent LLM hallucinations.
- **Interactive Engagement:** Interject quick checks and short questions throughout the reading flow to prevent passive reading loops.
- Uses all helper data from the preprocessing phase (concept graph, summaries, directory mapping) to optimize retrieval and therefore the llm output quality and minimize token usage.

### 4.4 Active Recall & Spaced Repetition (Review Phase)
- **Flashcard Ingestion:** Automatically generate high-quality, targeted flashcards based on extracted core concepts.
- **Feynman Audits:** Prompt the user to explain complex concepts in their own words, analyzing their response for gaps or misconceptions.
- **FSRS Scheduling:** Schedule card reviews using the **Free Spaced Repetition Scheduler (FSRS)** algorithm to calculate optimal review intervals.
- **Interleaving Reviews:** Mix questions from different sections/topics during a review session to prevent rote memorization and encourage contextual understanding.
- Uses all helper data from the preprocessing phase (concept graph, summaries, directory mapping) to optimize retrieval and therefore the llm output quality and minimize token usage.

---

## 5. Business Model & Licensing

### 5.1 Competitive Differentiation
Unlike generic QA wrappers that passively respond to queries, the AI Learning Support system acts as an active educator. It prevents the user from relying on passive habits and guides them through cognitive science-backed study routines. By caching contexts, minimizing GraphRAG overhead, and utilizing cost-effective models (such as Gemini 3.5 Flash), the system maintains high prompt quality while keeping operating costs as low as possible.

### 5.2 Licensing & Distribution Model
- **Source Available:** The complete source code is public and open on GitHub from day one, allowing tech-savvy users to inspect, modify, and self-host for personal use.
- **Elastic License 2.0 (ELv2):** The codebase is distributed under the ELv2 (or similar source-available license). Under this license:
  - Users may run and modify the application for personal and non-commercial purposes.
  - Users **cannot** sell the software or host it as a commercial service for others.
- **Hosted Subscription SaaS:** A fully managed, hosted version of the app is available via subscription for non-technical users. This version provides zero-setup, high-performance execution, and cross-device cloud synchronization.

---

## 6. Risks & Open Issues

| Risk / Open Issue | Impact | Description | Proposed Mitigation / Status |
| :--- | :--- | :--- | :--- |
| **Vercel Timeout Limits** | High | Processing large PDFs (text extraction, GraphRAG indexing, summarization) will exceed Vercel's standard serverless timeout limit (10s on Hobby tier). | **Mitigated** - Decouple the frontend from the ingestion execution. The API will immediately accept the job and return a receipt, while an asynchronous background queue (e.g., using Inngest or a containerized Node.js worker) handles the processing, updating the DB. |
| **GraphRAG Schema Design** | Medium | Overcomplicating the entity and relationship schema will bloat the token count and degrade retrieval latency. | **Open** - Establish a lightweight node-edge schema specifically optimized for academic relationships (e.g., "prerequisite of", "example of"). |
| **Environment Parity** | Medium | Supporting both zero-dependency local self-hosting and a hosted multi-tenant SaaS could lead to divergent codebases or complex configurations. | **Open** - Define a pluggable adapter architecture in the Technical Design Document for databases (SQLite vs. PostgreSQL) and storage (local filesystem vs. S3). |
