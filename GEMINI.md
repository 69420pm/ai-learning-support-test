# GEMINI.md

This file is a living record of project-specific **gotchas, non-discoverable tooling constraints, and operational landmines** for AI agents.

## Rules for GEMINI.md
1. **Can the agent find this by reading the code?** If yes, **do not write it here**. Directory structures, tech stack overviews, lint rules, and standard configurations are discoverable. Adding them bloats the agent context, dilutes attention, and increases token cost.
2. **Treat this file as a list of codebase smells we haven't fixed yet.** If agents repeatedly make a mistake, first try to fix the underlying codebase design (e.g., refactoring, strict types, biome rules, or build pipelines). Reach for GEMINI.md only if the friction cannot be solved in code.
3. **Remove instructions once the friction is resolved.**

## Active Gotchas & Landmines
*(None currently. Keep this file minimal to save token budget and prevent anchoring effects.)*
