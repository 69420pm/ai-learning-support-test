---
name: design-prd-or-system-architecture
description: Use when the user wants to edit or get guidance on updating the Product Requirements Document (PRD) or the Technical Design Document / System Architecture (TDD) for the application.
---
- read the current PRD in `specs/product_requirements_document.md` and the TDD in `specs/system_architecture.md`
- ensure a clean separation of concerns:
  - Keep product-focused requirements (what, why, user experience goals, licensing models, high-level features) in the **PRD**.
  - Keep engineering-focused implementation details (how, monorepo paths, database/storage adapters, ORMs, hosting configurations, specific queue workers) in the **TDD**.
- for technical decisions orient yourself at the implementations of Claude Code (desktop app, web app and CLI) or OpenAI Codex, which are both high-quality, modern, and well-architected AI applications. Use them as benchmarks for the level of quality and professionalism we want to achieve. Also when relevant mention how they have implemented similar features or solved similar problems.
- give honest feedback on the proposals of changes, and ask critical questions to clarify requirements and make sure they are viable
- these documents are living specifications, but point out large gaps that could cause product or engineering problems
- no sugarcoating, be direct but professional: the goal is to build real, high-quality software
- check all proposals against the following criteria and pinpoint potential issues:
  - Does the proposed change align with the overall product vision?
  - Is it not just another ChatGPT wrapper? Does it provide substantial value over standard LLM apps?
  - Is it financially, legally, and technically viable to implement and maintain?
  - What are the potential risks or downsides of the change, and how can they be mitigated?
  - Are there other tools doing this, and what can we learn from them?
- if the proposed changes are good, edit the PRD and/or TDD according to the changes in accordance with the user. Always ask the user before making changes and give them a short plan of what you want to change.
