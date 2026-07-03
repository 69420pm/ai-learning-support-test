# PRD 02: Document Ingestion & GraphRAG

---

## 1. Document Control

| Attribute | Value |
| :--- | :--- |
| **Product Name** | AI Learning Support |
| **Domain** | Document Preprocessing & GraphRAG |
| **Version** | 1.0.0 |
| **Status** | MVP Draft |
| **Last Updated** | 2026-07-03 |

---

## 2. Overview & Requirements

This document specifies the functional requirements for parsing source materials, building conceptual knowledge graphs, and creating optimized retrieval indexes.

### 2.1 PDF Extraction
- Parse raw text, structural headings, page markers, and embedded diagrams from uploaded PDF files.
- Normalize document structure into machine-readable sections for down-stream processing.

### 2.2 Concept Graph Generation (Cheap GraphRAG)
- Construct a simplified conceptual knowledge graph showing how topics relate to one another (e.g., prerequisite, parent topic, related concept).
- The graph serves as a contextual retrieval layer to boost prompt grounding, precision, and efficiency during study sessions.

### 2.3 Granular Summarization
- Generate hierarchical summaries ranging from high-level chapter overviews down to detailed topic deep-dives.
- Store summary representations at each level of the concept tree.

### 2.4 Smart Directory Mapping
- Generate a unified Table of Contents mapping PDF pages to concept graph nodes and summary slices.
- Enables precise contextual retrieval by loading only the relevant nodes/chunks into the LLM context window during study interactions, avoiding context window bloat.

### 2.5 Asynchronous Processing & Feedback
- PDF ingestion and GraphRAG processing are heavy, asynchronous tasks.
- The UI must present a live, step-by-step progress status (e.g., "Extracting text...", "Building concept graph...", "Generating summaries...") without blocking the user or timing out.
