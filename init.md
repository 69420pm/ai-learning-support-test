

1. Foundation & Quality Control (Professionalism)
   * [x] GitHub Actions CI/CD: Automate make check on every Pull Request. Professional projects never rely on manual local checks alone.
   * [x] Changesets for Releases: Implement Changesets (https://github.com/changesets/changesets) to manage versioning and changelogs across your monorepo packages.
   * [ ] Coverage Thresholds: Configure vitest to fail if code coverage drops below a specific percentage (e.g., 80%).
   * [ ] Git Hooks: Use lefthook or husky to run make format and make typecheck on pre-commit to prevent "lint-fixing" commits.
   * [ ] Security Auditing: Integrate npm audit into the CI and setup Dependabot/Renovate for automated dependency management.

  2. Architectural Scalability
   * [ ] Zod-Powered Config: Use zod for environment variable validation. Ensure that if a required API key or config is missing, the app fails early with a clear error.
   * [ ] Standardized Error Handling: Define a hierarchy of custom Error classes in @ai-learning-support/core to handle domain-specific failures (e.g., TutoringError, ModelTimeoutError).
   * [ ] Structured Logging: Replace console.log with a structured logger like pino. This is critical for scaling when you eventually need to aggregate logs in a tool like Datadog or ELK.
   * [ ] Dependency Injection (DI): Even a lightweight manual DI pattern will make packages/core significantly easier to test and swap implementations (e.g., swapping LLM providers).

  3. Gemini CLI Optimization (AI-Native Workflow)
   * [ ] Custom Scaffolding Skill: Create a Gemini Skill (e.g., skill-new-feature) that generates the boilerplates for a new module, its tests, and its documentation in one go.
   * [ ] Specialized Subagents:
       * architect-reviewer: A subagent designed to review code specifically for adherence to ARCHITECTURE.md.
       * doc-syncer: A subagent that updates CONTEXT_MAP.md and README.md whenever new files are added.
   * [ ] Explicit Memory Tiers: Utilize the memory/ folder to store long-term architectural decisions (DECISIONS.md) and project-specific idioms (IDIOMS.md) that the agent should always
     remember.
   * [ ] Type-Safe Agent Tools: If the CLI is used to execute agentic tasks, define Zod schemas for the inputs/outputs of those tasks to ensure the LLM doesn't "hallucinate" tool parameters.

  4. Documentation & Maintainability
   * [ ] CONTRIBUTING.md: A guide specifically for humans AND agents on how to contribute, covering branching strategy and commit conventions.
   * [ ] TypeDoc: Automate API documentation generation from JSDoc comments to ensure the library is usable by third parties.
   * [ ] RFC Process: Create an rfcs/ directory to document and discuss major architectural shifts before implementation.

  Which of these would you like to prioritize first? I can help you set up the GitHub Actions, initialize Changesets, or draft your first Custom Skill for the Gemini CLI.
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
