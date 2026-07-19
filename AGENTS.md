# AGENTS.md

The root entrypoint for all AI agents operating in this repository.

## The Flat, Un-Bureaucratic Structure
This project strictly separates human-facing specifications from agent-only memory:

- `rules/`: Strict, fluff-free constraints. Merges coding style, architecture, tool usage, and LLM gotchas into one place.
- `specs/`: The living truth of the software. Contains PRDs, ADRs, and implementation plans. Kept out of agent-only memory so humans can easily read and write them.
- `.agents/memory/resources/`: Deep context only pulled when explicitly needed via search. Contains PDFs, domain research, and reference repos.
- `.agents/memory/rsi/`: The recursive self-improvement engine room. Stores run logs, human satisfaction scores, and synthesized lessons waiting to be verified and promoted to `rules/`.

## Harness Development
If you are working on the AI Harness itself (e.g., adding skills, tweaking rules, or building agent architecture), you MUST start by reading the harness index file:
- [.agents/memory/HARNESS.md](file:///workspaces/secure-ai-learning-support/.agents/memory/HARNESS.md)
