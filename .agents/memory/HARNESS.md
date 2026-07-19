# Harness Index

This file is the routing index for all meta-engineering tasks (building or improving the AI Harness itself). The primary purpose of this file is to tell you exactly **when** you should pull specific rules or memory files into your context window. Do not pull files blindly.

## Core Rules (`rules/`)
You MUST pull these files only when your task triggers the specific conditions below:

- **[rules/harness-architecture.md](file:///workspaces/secure-ai-learning-support/rules/harness-architecture.md)**
  - **When to read this:** Before you design a new subagent, change how agents communicate, modify the workflow orchestration, or alter the boundaries/sandboxing of the harness. It tells you what architectural patterns are banned and which are required.

- **[rules/rule-authoring.md](file:///workspaces/secure-ai-learning-support/rules/rule-authoring.md)**
  - **When to read this:** ALWAYS read this before creating a new markdown file inside the `rules/` directory or editing an existing one. It is the strict "Definition of Done" for formatting rules.

- **[rules/gh-cli-usage.md](file:///workspaces/secure-ai-learning-support/rules/gh-cli-usage.md)**
  - **When to read this:** Before you use the `gh` CLI to interact with GitHub issues, PRs, or traverse external repositories. It prevents you from taking unsafe or destructive actions on GitHub.

## Memory & Resources (`.agents/memory/`)
Deep context files. Pull these only for specific research tasks.

- **[.agents/memory/resources/harness-engineering/reference-repos.md](file:///workspaces/secure-ai-learning-support/.agents/memory/resources/harness-engineering/reference-repos.md)**
  - **When to read this:** When you are stuck implementing a harness feature, need inspiration for agent architecture, or the user explicitly asks you to "research how other projects do this." It gives you specific public repos to clone and analyze.

## Plans (`specs/`)
- **[gemini-suitable-harness-plan.md](file:///workspaces/secure-ai-learning-support/gemini-suitable-harness-plan.md)**
  - **When to read this:** Read this if you lose track of the overall "big picture" of the project, or if you need to understand the underlying philosophy (e.g., "The 3-Window Workflow", "Deterministic boundaries") driving the implementation.
