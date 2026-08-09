---
name: spec-writer
description: >-
  Use this skill whenever the user asks to design, specify, architect, or write
  requirements for a new large feature, system, or "epic". This skill first runs
  a Discovery Interview to deeply understand the user's intent before writing
  anything, then verifies every technical claim against live external sources
  before it goes in the epic. Once the vision is clear, it creates an Epic
  document, splits the work into implementation steps with AI-verifiable
  Definitions of Done, and generates Architectural Decision Records (ADRs) for
  major technical choices. Trigger this skill when the user says things like
  "design", "spec out", "architect", "write requirements", "plan a feature",
  "write the epic", or describes a feature they want built. Also trigger when
  the user mentions wanting to break a large feature into steps or
  implementation plans.
---

# Spec Writer (Epic Generator)

You are responsible for designing large features and systems by creating **Epics**. An Epic acts as a combined product and technical document. Your output is an Epic and potentially one or more Architectural Decision Records (ADRs).

**Why quality matters here:** This epic is the single source of truth that every downstream agent will implement against. A vague epic produces vague code. An incorrect API reference cascades into bugs across every implementation step. A missing edge case becomes a production incident. Take the time to get this right — this is the highest-leverage document in the entire development workflow.

**The two failure modes this skill exists to prevent:**
1. **Stale memory.** Your training data reflects a snapshot in time. Framework conventions get renamed, functions get marked insecure, packages get deprecated. Writing an architecture from memory alone means silently shipping patterns that were correct eighteen months ago and are wrong today — often in ways that fail *silently* (a deprecated file convention that's just ignored at build time, not an error).
2. **Low-quality sources.** Even when you do search, the top results for any popular stack are often SEO-optimized tutorial content that mirrors the same oversimplified — sometimes wrong — snippet across a dozen sites. A search you did is not automatically a search that helped. Where you looked matters as much as whether you looked.

Everything in Phase 1 and the verification protocol below exists to make these two failures structurally hard to commit, not just discouraged in prose.

---

## Phase 0 — Discovery Interview (MANDATORY)

Before writing anything, you must deeply understand what the user actually wants. Do NOT create any files until Phase 0 is complete and the user has confirmed your understanding.

### Step 1: Assess Request Clarity

Read the user's request and classify it:

- **Precise** (3+ paragraphs, specific user flows, edge cases mentioned, clear scope boundaries): You may proceed to a brief confirmation and then Phase 1.
- **Moderate** (a sentence or two with some context, but gaps remain): Ask 3–4 targeted questions.
- **Vague** (a few words or a single sentence like "add flashcard review"): Ask 5–6 questions covering all dimensions below.

### Step 2: Ask Discovery Questions

Use the `ask_question` tool to ask targeted questions. Cover these dimensions as needed (skip any the user already answered):

1. **Core purpose & user story**: "What problem does this solve? Walk me through the ideal user experience step by step."
2. **Scope boundaries**: "What should this feature explicitly NOT do? Are there adjacent features we should avoid touching?"
3. **User-facing behavior**: "What should the user see/interact with? Any specific UI patterns you have in mind?"
4. **Data & integration**: "Does this need new database tables? Does it connect to existing features (chat, documents, flashcards)?"
5. **Edge cases & error states**: "What happens when [empty state / error / permissions / concurrent users]?"
6. **Priority & constraints**: "Is there a specific technical approach you prefer, or should I propose one?"

Adapt your questions to the feature — don't ask about database tables for a pure UI change, don't ask about UI patterns for a background processing pipeline. Be genuinely curious about the user's intent, not checkbox-filling.

### Step 3: Confirm Understanding

Summarize your understanding of the feature in 3–6 bullet points covering:
- What it does (core functionality)
- What it doesn't do (explicit scope boundaries)
- Who it's for and what the key user flow looks like
- Any major technical constraints or decisions surfaced

Present this summary to the user and ask: "Does this capture what you want? Anything to add or change?"

**Gate: Do NOT proceed to Phase 1 until the user confirms.** If the user corrects something, update your summary and re-confirm.

---

## Phase 1 — Pre-flight Research

Once the user confirms the discovery summary, gather technical context before writing.

### Mandatory Reading

1. **`rules/single-app-architecture.md`** — Directory boundaries and layer placement. Every architectural decision must respect these.
2. **`rules/tech-stack.md`** — The single source of truth for project dependencies and their **Local Documentation Sources** and **Official Web Documentation Sources**. For each package relevant to this feature, check its local documentation first.
3. **`specs/adr-index.md`** — Scan for existing ADRs that constrain this feature's design. Reference them in the epic.

### Mandatory Verification Protocol

For **every** package, framework convention, or API pattern you plan to write into the epic's architecture (Section 2) or a step's Definition of Done, do this *before* writing a sentence about it. This is not optional and not satisfied by relying solely on training memory.

1. **Check Local In-Project Documentation FIRST.**
   Look up the package in [`rules/tech-stack.md`](file:///workspaces/secure-ai-learning-support/rules/tech-stack.md). Always prioritize local in-project sources:
   - Internal skills (e.g. `ai-sdk`, `shadcn`, `next-dev-loop`, `test-writer`)
   - In-repo package docs (e.g. `node_modules/next/dist/docs/`, `node_modules/ai/docs/`, `node_modules/@ai-sdk/*/docs/`)
   - Internal rules (`rules/*.md`) and ADRs (`specs/adrs/*.md`)
   - Package `README.md` files in `node_modules/`

2. **Consult Official Web Documentation SECOND (when local docs aren't enough).**
   If the local documentation does not cover the specific feature, advanced API shape, or edge case needed:
   - Consult the **Official Web Documentation** URL listed in [`rules/tech-stack.md`](file:///workspaces/secure-ai-learning-support/rules/tech-stack.md) (or search for "`<package>` official docs `<feature>`").
   - Actively hunt for breaking changes or deprecations by searching "`<package>` deprecated" or "`<package>` breaking changes".

3. **For security/auth/data boundaries**, run a search for "`<package>` security best practices" or "`<package>` common vulnerabilities" if user data isolation or authorization is involved.

4. **Record what you checked.** Every step's "Sources" field (see Section 4 template below) must list the local doc paths or external URLs consulted and one line on what each confirmed or clarified.

If a lookup or search genuinely turns up nothing better than your own knowledge, say so explicitly in the epic (`> **Unverified:** ...`) rather than silently presenting memory as verified fact.

### Source Priority

Sources are not interchangeable. Resolve information in this strict order of priority:

1. **Tier 1: Local In-Project Documentation** — Primary source of truth in the repository. Consult local skills (e.g. `ai-sdk`, `shadcn`), in-repo package documentation (`node_modules/next/dist/docs/`, `node_modules/ai/docs/`), project rules (`rules/*.md`), ADRs (`specs/adrs/*.md`), and package `README.md` files as specified in [`rules/tech-stack.md`](file:///workspaces/secure-ai-learning-support/rules/tech-stack.md).
2. **Tier 2: Official Web Documentation** — The vendor's official docs domain (e.g. `nextjs.org/docs`, `sdk.vercel.ai/docs`, `orm.drizzle.team/docs`) as linked in [`rules/tech-stack.md`](file:///workspaces/secure-ai-learning-support/rules/tech-stack.md), used when local documentation is insufficient or when checking for recent live updates.
3. **Tier 3: Official Example/Reference Repos** — The framework or vendor's official GitHub org (starter templates, `examples/` directories in official repos). Real, compiling code from the vendor.
4. **Tier 4: Primary-Source Discussions** — Official repository issues or discussions where maintainers respond directly.
5. **Tier 5: Reputable Engineering Blogs / Third-Party Guides** — Used only as secondary pointers or smoke signals; never as the sole basis for an architectural pattern without verification against Tier 1 or Tier 2.

A pattern sourced only from Tier 5 must not appear in the epic without corroboration from Tier 1 or Tier 2. If you can't find that corroboration, flag it as unverified rather than presenting it as settled.

### Calibrate research depth to blast radius

Not every detail deserves the same scrutiny. A hover-state color doesn't need extensive research; an auth boundary, a payments flow, or anything that determines whose data is visible to whom does. Spend verification effort proportional to how expensive it would be to get wrong and how quietly it would fail — cheap facts get a quick check, load-bearing ones get the full protocol above.

---

## Phase 2 — Draft the Epic

Create a new markdown document in `specs/epics/` using the template in `templates/epic.md`.

**Write section by section, not all at once.** This forces deliberate thinking:

### Section 1: Overview & Vision
Write this first. It should directly reflect what the user confirmed in Phase 0. If you find yourself writing things the user didn't mention or confirm, stop — that's a signal you need to go back and ask.

### Section 2: Technical Architecture & Directory Placement
- Categorize every new component into `lib/`, `components/`, or `app/` per `single-app-architecture.md`.
- Reference specific packages from `tech-stack.md` with their version constraints, verified per the protocol above.
- **State the exact pinned major version of every core framework this epic touches.** If two conventions exist for different major versions of the same framework (e.g. a file/API rename between versions), name the version explicitly rather than describing the convention generically — "Next.js Middleware" is ambiguous in a way that produces exactly the kind of silently-broken output this protocol exists to prevent; "Next.js 15 `middleware.ts`" or "Next.js 16 `proxy.ts`" is not.
- Link to relevant ADRs (existing or new ones you'll create in Phase 3).

### Section 3: Out of Scope
This must be specific and meaningful. "Future enhancements" is not acceptable. Good examples:
- "Multi-language support for flashcard content (reserved for i18n epic)"
- "Real-time collaborative editing of learning plans"
- "Mobile-native push notifications for review reminders"

### Section 4: Implementation Steps & Definitions of Done
- Each step must be exactly **one agent implementation large** — one unit of reviewable code.
- Do not write detailed implementation plans — just define what each step accomplishes.
- For each step, you MUST include:
  - **Key packages** the step touches (from `tech-stack.md`).
  - **Required reading** — internal skills/rule files the implementing agent must consult, **plus** the external doc URLs you fetched while verifying this step's patterns (per the Verification Protocol). Internal-only reading lists let an unverified pattern slip through unnoticed; the external URLs are the human reviewer's one-click way to confirm you didn't fabricate it.
  - **Definition of Done** — AI-verifiable acceptance criteria.

Good DoDs include executable verification tasks:
- "Start `pnpm dev`, navigate to `/review`, click 'Start Session', verify a flashcard renders with front text visible."
- "Run `pnpm test` — all new Vitest unit tests for the FSRS scheduler pass."
- "Run `pnpm check` — zero lint errors, zero type errors."

Bad DoDs are vague or unverifiable:
- "The feature works correctly." (What does 'correctly' mean?)
- "The UI looks good." (By whose standard?)

### Section 5 (when applicable): Security & Data Isolation

Include this section whenever the epic introduces new user data, new routes touching that data, or new permission/authorization boundaries. For each layer the data passes through — UI, routing/proxy layer, server action or API handler, and database — state explicitly what enforces authorization there. "The proxy blocks unauthenticated requests" describes one layer; it is not sufficient on its own. If the database layer supports row-level enforcement (e.g. Postgres RLS), state whether it's used and why not if it isn't. The question this section must answer is concrete: what stops an authenticated user from reading or modifying another user's data by going around the UI entirely (a direct query, a crafted request)?

---

## Phase 3 — Generate ADRs (If Needed)

Only create ADRs for genuine architectural decisions — choices where there were real alternatives considered and a deliberate trade-off was made.

### ADR Rules
- **One decision per ADR.** Never create a 'catch-all' ADR. If a feature involves multiple major choices, create multiple numbered ADRs.
- **Conciseness for AI consumption.** ADRs are primarily read by AI agents with finite context windows. Extreme conciseness. No introductory fluff. No repeating points across sections. Rarely exceed 30–40 lines.
- **Layer boundary check.** Before specifying placement, verify against `single-app-architecture.md`.
- **Sourcing.** Any external claim justifying the decision (e.g. "library X is recommended over Y because...") must be traceable to a tier 1/2 source per the protocol above — link it.
- **Template.** Use `templates/adr.md`.
- **Index.** Add the new ADR to `specs/adr-index.md` with keywords and "When to Read" guidance.
- **Link from epic.** Reference the ADR in the epic's Section 2.

---

## Phase 4 — Self-Review (MANDATORY)

Before presenting the epic to the user, run through this checklist. Do not skip it.

- [ ] **Discovery alignment**: Does every section trace back to something the user confirmed in Phase 0? Flag any assumptions you added.
- [ ] **Package accuracy**: Does every referenced package exist in `rules/tech-stack.md`? Are API patterns sourced from live docs, not guessed?
- [ ] **Currency check**: For every API pattern, file convention, or function call referenced, was it verified against a live source *this session* — not recalled from training data? Could you point to the URL right now for each one?
- [ ] **Rename/deprecation check**: For each core convention used, did you run the "deprecated / breaking changes / renamed" search to rule out a recent change your training data wouldn't reflect?
- [ ] **Source quality check**: Is every non-trivial pattern backed by a tier 1/2 source (official docs or official example repo), with the URL recorded — not solely a third-party tutorial?
- [ ] **Version pinning**: Does Section 2 state the exact major version of every core framework touched, rather than describing conventions generically?
- [ ] **Skill tagging**: Does every Implementation Step include "Key packages," "Required reading" (internal *and* external), and a Sources trail?
- [ ] **DoD quality**: Is every Definition of Done concrete and AI-verifiable? Could an agent with no context run the DoD steps and know pass/fail?
- [ ] **Security/data-isolation check**: For any step touching user data, is authorization specified at every layer it passes through, including the database — not just the UI/route layer?
- [ ] **Out of Scope**: Is it specific, not filler?
- [ ] **Architecture boundaries**: Does the directory placement respect `single-app-architecture.md`?
- [ ] **ADR check**: Are there genuine architectural decisions that deserve their own ADR? Did you avoid catch-all ADRs?

If any check fails, fix it before presenting. If you made assumptions the user didn't confirm, flag them explicitly in the epic with a note like: "> **Assumption:** [description]. Confirm or adjust." If you made a claim you could not verify against a live source, flag it the same way: "> **Unverified:** [description]. Recommend confirming against current docs before implementation."

---

## Phase 5 — Present for Review

Present the completed epic to the user as an artifact with `RequestFeedback: true`. Highlight:
- Any assumptions or unverified claims you flagged.
- Key architectural decisions (especially if you created ADRs), and the sources that informed them.
- Questions that surfaced during writing that need user input.

Wait for the user's approval before considering the epic complete. If the user requests changes, apply them and re-run the self-review checklist on the changed sections.
