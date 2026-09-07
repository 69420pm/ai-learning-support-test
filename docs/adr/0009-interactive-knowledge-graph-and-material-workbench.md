# Interactive Knowledge Graph Visualizer & Unified Material Ingestion Workbench

**Status:** Accepted | **Date:** 2026-08-25

## The Decision

Establish a unified three-surface project workspace layout and interactive visual knowledge graph architecture:
1. **Workspace Navigation Shell:** Provide a persistent project-level navigation bar across all `/projects/[projectId]/*` routes with seamless segmented switching between **Chat** (`/projects/[projectId]/chat`), **Knowledge Graph** (`/projects/[projectId]/graph`), and **Materials** (`/projects/[projectId]/materials`).
2. **Streamlined Chat Sidebar:** Refactor the chat sidebar into an uncluttered reference widget with compact status dots, single upload triggers, and navigation links to the full workbenches, eliminating crammed action buttons and multi-line badge clipping.
3. **Dedicated Materials Management Workbench:** Provide a full-page material management view at `/projects/[projectId]/materials` rendering multi-stage ingestion lifecycle progress, chunk inspection, batch concept extraction, and cascade deletion.
4. **Interactive Knowledge Graph Canvas:** Implement a native 2D SVG/Canvas visual knowledge graph at `/projects/[projectId]/graph` driven by mathematical physics simulation (`d3-force`) with dual switchable layouts:
   - Dynamic Force-Directed Simulation (repulsion, link attraction, collision).
   - Hierarchical Prerequisite DAG (topological layering from root prerequisites to dependent concepts).
5. **Graph Topological & Inspection APIs:** Expose authenticated endpoints `GET /api/projects/[id]/graph` (topology + diagnostic health metrics) and `GET /api/projects/[id]/graph/components/[kcId]` (deep concept inspection with grounded exercises and page-anchored excerpts).

## Rationale & Alternatives

* **Why Native D3-Force SVG/Canvas:** Third-party canvas or WebGL wrappers frequently introduce React 19 / Turbopack peer dependency incompatibilities and conflict with Tailwind CSS OKLCH theme tokens. Direct D3 mathematical simulation offers zero dependency friction, minimal bundle weight, and deterministic layout switching.
* **Why Segmented Three-Surface Workspace:** Trying to compress chat, material management, and graph visualization into a single 256px sidebar caused severe UI truncation and cramped interactions. Dedicated full-page workbenches provide ample space for rich tables and large graph canvases.
* **Why Dual Layout Projection:** Learners alternate between free-form exploratory discovery (force simulation clustering) and structured sequential curriculum study (hierarchical top-down DAG).
* **Rejected 3D WebGL Visualization:** Adds significant complexity, mobile rendering overhead, and battery drain without tangible pedagogical benefit over clean 2D topological mapping.
* **Trade-off:** Requires maintaining synchronized state between project tabs and running graph topological queries on demand.
