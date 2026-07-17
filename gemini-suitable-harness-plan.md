# Gemini Suitable Harness Plan

## Abstract Plan of what we want to achieve
1. Hyper-Optimized Human Interventions: Never present the human with a blank page or a raw, unexplained code diff. Every human touchpoint must be heavily pre-processed by the AI. The AI brings context, structured options, tradeoffs, and explicitly highlights non-obvious decisions. The human simply provides the verdict.
2. Leveraged Human Judgment (Owning the Outer Loop): The human's cognitive bandwidth is the most precious resource. The human should never do work that a model (even a fast/cheap one like Flash) can do. Reserve human energy strictly for high-agency tasks: defining intent (PRDs), exercising taste (Architecture/ADRs), and final accountability (Code Approval).
3. Cognitive Sustainability (Combating Review Fatigue): Because the AI can generate code faster than a human can traditionally read it, the harness must translate code output into human-digestible formats. Code reviews must include architectural summaries and risk reports so the human can maintain a mental model of the system without burning out.
4. Automated, Deterministic Back-Pressure: Subjective AI-on-AI review is secondary. The primary defense against AI hallucinations and shortcuts must be deterministic. We will heavily utilize executable scripts, linters, type-checkers, and automated tests to create objective boundaries the AI must pass before it even reaches the human.
5. Fail Fast and Escalate Elegantly: The AI should not spin in infinite loops burning tokens. If it hits deterministic blockers it cannot solve within a tight, predefined limit, it must neatly package the context of its failure and escalate to the human for guidance.
6. The agent alone will probably fail a lot of tasks and his creativity is fairly limited, so always give the agent guidance and knowledge for special topics that it acts as the human wants it to act
7. 100% of the code is written by the agent.
8. Use the agent not just for software development, we can also use it for researching stuff, improving the harness, thinking about new features, etc. The agent is a general purpose tool that can be used for many things, also unconventional usecases.

## The Harness (technical details)

### Agent Topology and State Isolation
- **The Orchestrator Pattern:** The harness utilizes a single Main Orchestrator Agent. This agent is an expert in the harness rules and maintains a high-level project context. It performs no direct execution; instead, it exclusively deploys and manages specialized subagents.
- **Subagent Routing & Communication:** Specialized subagents handle the actual labor and can communicate directly with each other to solve complex dependencies. 
- **Sandboxed Execution:** Subagents operate in isolated environments (e.g., utilizing git worktrees) to experiment safely without affecting the main project state.
- **Single Point of Contact:** To prevent alert fatigue, only the Orchestrator Agent is permitted to escalate or ping the human.

### Human Interaction
- **The "Briefing" Principle:** Whenever the Orchestrator communicates with the human, it must do so as a concise "briefing." Messages must be dense, highly structured, and entirely free of conversational fluff.
- **Maintaining the Mental Model:** The agent's primary communication goal is to ensure the human never gets "lost." It must explicitly cite its reasoning, decisions, and memory sources so the human maintains a perfect mental model of the system's current state.

### Deterministic boundaries
- Rely heavily on objective checks: executable scripts, linters, type-checkers, and test suites act as the ultimate source of truth.
- The AI must pass these deterministic blockers before it is allowed to escalate to a human for a verdict.

### Skills
- **Architecture: Few Wide-Ranging Skills.** Instead of 100 narrow, highly-specific skills (which confuse the LLM's tool routing and create a maintenance nightmare), we will maintain a small set of robust, wide-ranging core workflows:
  1. `orchestrator`: The project manager and sole communicator with the human. Routes work to subagents.
  2. `researcher`: Scours the web/docs and distills findings into `.agents/memory/resources/`.
  3. `architect`: Writes PRDs, ADRs, and implementation plans.
  4. `tdd-implementer`: The coder. Operates in isolated worktrees and follows strict deterministic boundaries.
  5. `reviewer`: Checks for code quality, DRY violations, and security flaws.
  6. `challenger`: The strict DoD enforcer. Adversarially checks for shortcuts and ensures the exact Definition of Done is met.
  7. `retrospective`: Analyzes runs and writes new lessons into memory based on human feedback.
- **Separation of Engine and Fuel:** The skills contain the workflow logic (the Engine) and orchestrate the steps, but they are agnostic to project-specific preferences. Preferences, rules, and domain expertise (the Fuel) are dynamically injected into them.

### Lean File Structure & Memory
- **Dynamic Semantic Exploration:** Instead of static routing tables (which bloat the prompt), the agent relies heavily on Semantic Search (`mgrep`). The `AGENTS.md` root file simply instructs the agent to dynamically search for relevant rules and resources before beginning a task.
- **The Flat, Un-Bureaucratic Structure:** The project strictly separates human-facing specifications from agent-only memory:
  1. `rules/` (Root): Strict, fluff-free constraints. Merges coding style, architecture, tool usage (e.g., `gh-cli-usage.md`), and LLM gotchas into one place.
  2. `specs/` (Root): The living truth of the software. Contains `templates/`, `prds/`, `adrs/`, and `plans/`. (Kept out of agent-only memory so humans can easily read and write them).
  3. `.agents/memory/resources/`: Deep context only pulled when explicitly needed via search. Contains PDFs, domain research, and `reference-repos.md` (which links to public GitHub repos for the agent to traverse using the `gh` CLI).
  4. `.agents/memory/rsi/`: The recursive self-improvement engine room. Stores run logs, human satisfaction scores, and synthesized lessons waiting to be verified and promoted to `rules/`.
- **Self-Healing Loop:** When the human provides feedback on an error, the agent uses a tool to record that lesson into the RSI folders or directly into `rules/`, ensuring the mistake is never repeated.

### Recursive Self Improvement
- **Post-Run Analysis:** Upon completion of a task or feature (e.g., triggered by a commit hook), the LLM automatically reviews the execution transcripts and generates a summarized retrospective report.
- **Human-in-the-Loop Judgement:** The human reviews this report to inject taste and intuition, identifying subtle bad patterns or architecture drift that the LLM is blind to.
- **Satisfaction Integration:** The human provides a "general satisfaction" assessment and high-level feedback. The harness then takes this human judgment, synthesizes it, and permanently writes the new lessons into the `Learned Experience` memory files.

## How to use the harness

### Improve the harness

### Complete a feature

#### Write PRD
- use write prd skill to write prd with llm, it should be a collaborative process and result in a prd that is clear, concise and complete.
- define a concrete *definition of done* in the prd
- include a **Required Reading** section in the PRD containing URLs or references to specific memory files that the implementation agent MUST read before starting.

#### Architect document (optional only for larger features)
- use architect skill, for larger features write one document explaining the entire feature
- acts as a base for adrs and implementation plans

#### Write ADR
- use write adr skill to write adrs with the llm regarding a specific prd, it should be a collaborative process and result in a permanent adr

#### Write implementation plan
- use write plan skill to write an implementation plan with the llm regarding a prd, optional architect document, and adrs, it should be a collaborative process and result in a clear, concise and complete implementation plan
- the plan should have a clear definition of done that is as specific as possible, and when its possible just a script that can be run by the implementation agent (or its subagent to check for done)
- in here also define the basic data classes and so and already implement them, also write out new files and skeleton code with human oversight, that later not so much can go wrong

#### Write Tests (optional only for critical or overly complex features)
- write tests based on the plan

#### Implement/Review Code
- get the plan and implement it while filling out the skeleton code and all predefined structures, if tests are already existent, make them pass
- spin up a subagent that is only there to check whether you met the definition of done, both agents communicate with each other. If the definition of done got met, the subagent got killed and a code review subagents gets spawned that uses a skill to check the code and send messages to the main agent to let it fix it


### Research for new prds
- **Intense Deep Research Sessions:** Before defining a new PRD for an unfamiliar domain or technology, spawn a dedicated research subagent. 
- The research subagent's goal is to scour the web, read API docs/GitHub issues, and distill the findings into a dense, high-signal markdown document stored in `.agents/memory/`. 
- This document then becomes part of the "Learned Experience" memory, ensuring the main architect or coding agents operate on verified, up-to-date facts rather than hallucinated or outdated training data.
