---
name: repo-deep-dive
description: Analyzes a cloned GitHub repository into a structured learning report covering how a professional team built it and, specifically, how they use the particular library/pattern/database/tool that made this repo worth reading in the first place. Cross-references findings against the user's own project — via a maintained overview file and their ADRs — so recommendations are concrete and don't re-litigate decisions already made. Use this whenever the user points at a cloned repo folder and wants to learn from it, study how it's built, mine it for patterns, or understand how it uses something specific. Trigger on phrasing like "I cloned X, can you dig into how they do Y", "what can I learn from this repo", "analyze this codebase for patterns I should adopt", or "how does this company's repo handle their queueing/caching/auth", even if the user never says "skill" or "report" explicitly.
---

# Repo Deep Dive

## What this is for

Reading a professional codebase to learn from it is a good instinct, but it
fails in predictable ways if you let it: it produces generic engineering
advice that isn't actually tied to the code ("this repo favors composition
over inheritance" — says who, where?), it treats a curated public repo as a
window into a company's full internal practice, and it recommends patterns
sized for a 200-engineer org to someone running a solo project. This skill
exists to avoid those failure modes, not just to produce a long document.

Two things make this work: every claim has to be grounded in an actual file
(cite it, don't paraphrase-and-hope), and the user's own project has to be
part of the analysis from the start — not bolted on as a generic "here's
what you could do" afterthought.

## Inputs

Work out these before starting. If something's missing, use a sensible
default and say so rather than stopping to ask — except where noted.

1. **`repo_path`** — required. The folder with the cloned repo.
2. **`repo_url`** — the GitHub URL/org-name, if known. Used for report
   metadata and to reason about "public face vs. internal practice" later.
3. **`focus`** — the specific thing the user wants deep-dived (a library,
   pattern, database, architectural choice) and ideally *why* they picked
   this repo. If the user hasn't said, ask — this one's worth a real
   question, since the whole deep-dive section depends on it, and a guess
   here is likely to miss what they actually wanted.
4. **`own_project_path`** and **`overview_path`** — the user's own project
   and its overview file. Check for a conventional filename first
   (`OVERVIEW.md`, `PROJECT_OVERVIEW.md`, or similar in the project root)
   before asking. If no overview file exists at all, tell the user and offer
   `references/overview-template.md` as a starting point — then proceed with
   the analysis anyway, just without the personalized cross-referencing in
   the later steps. Don't block the whole report on this.
5. **`adr_path`** — look for a conventional ADR directory (`docs/adr`,
   `docs/decisions`, `adr/`, etc.) under `own_project_path`. Not every
   project has one; if there isn't one, skip step 4 below silently.

## Step 1: Recon the target repo (before reading any code)

Run:
```
scripts/recon.sh <repo_path> "<focus keyword>"
```
This gets you manifest contents, a top-level tree, git churn hotspots,
contributor/commit activity, ADR/CHANGELOG detection, and — because you gave
it a focus keyword — the files that actually mention it and any commit
messages referencing it (often the best signal for *why* something exists).

Read this once and reason from it. The point of recon is to replace open-
ended directory browsing with a fixed, cheap set of facts — if you find
yourself listing directories or opening files just to get your bearings,
you're redoing what this script already gave you.

## Step 2: Load your project's context

Read the overview file (one read, it's meant to be short). Note which parts
are Facts (stack, structure, scale — use these to judge whether a pattern
even fits the user's situation) versus Judgment (why they chose what they
chose, what's already been rejected, current pain points — use these to
avoid recommending something already tried or irrelevant to their actual
priorities).

## Step 3: Staleness check — delegate it, don't redo it yourself

An overview file is only useful if it's trustworthy. Rather than re-explore
the user's whole project to verify it (expensive, and not what this skill
is for), spin off a narrow check:

- **If you can spawn a subagent/sub-task**, do so using
  `agents/staleness-checker.md` as its instructions, passing it
  `own_project_path` and the overview's Facts section. It runs a quick
  recon of the user's own project and reports back only mismatches (or
  confirms there are none).
- **If you can't spawn a subagent**, run `scripts/recon.sh <own_project_path>
  --quick` yourself and eyeball it against the Facts section. This is two or
  three commands, not a re-exploration — don't let it turn into one.

Whatever comes back gets folded into the report's Caveats section later.
Don't chase this further than a smoke-detector check — if something looks
substantially off, flag it and move on; a full audit of the user's own
project is out of scope here.

## Step 4: Check for relevant prior decisions — on demand, not exhaustively

The goal is narrow: don't have the report recommend something the user's
team already explicitly considered and rejected. It is not to summarize
every ADR, and reading them all upfront would burn context on mostly
irrelevant material.

If an ADR directory was found:
1. Build a short list of topics from the recon output and the stated focus
   area (e.g. if the focus is "message queues", that's your search term).
2. Grep the ADR directory for those topics; read in full only the ones that
   match.
3. If a match turns up a past rejection or decision relevant to what you're
   about to recommend, surface it explicitly in the report rather than
   recommending blind.

Separately — and this applies regardless of whether the user has ADRs —
check whether the **target repo itself** has decision records, a
CHANGELOG, or design docs (recon step 1 already looked for these). These are
often the best source for *why* the repo does what it does with the focus
area, better than guessing from the code alone.

## Step 5: Decide what to actually read

Based on recon — churn hotspots, focus-area hits, entry points, the module
that owns the pattern of interest — pick a short, specific list of files to
read deeply. Naming this list explicitly (even briefly, to yourself) before
diving in avoids the two failure modes on either side of it: reading the
whole repo, or picking files at random.

## Step 6: Read, and ground every claim

This is the part that determines whether the report is actually useful or
just plausible-sounding filler.

- **Every substantive claim needs a file citation** (path, and a line range
  where it helps). If you can't point to where you got it, don't state it as
  fact — reframe it as a question or drop it.
- **Use short snippets as evidence**, not large code dumps. A few lines
  next to a citation is more useful than a wall of quoted code, and keeps
  the report readable.
- **For the focus area specifically, look for trade-offs and friction, not
  just a highlight reel.** The user picked this repo because it uses the
  thing they're curious about, which nudges toward writing up only the good
  parts. Actively look for: places the code works around the tool's
  limitations, complexity it introduced, or things that would've been
  simpler another way. This is the difference between a sales pitch and an
  honest evaluation.
- **When rationale isn't discoverable** — no ADR, no commit message, no
  comment explains why — say "rationale unclear" rather than inventing a
  plausible-sounding story. A wrong confident guess is worse than an
  acknowledged gap, because the user has no way to tell them apart later.
- **Watch for the public-repo trap.** A public OSS repo is often a curated
  subset of how an org actually works — shaped by contributor-friendliness,
  external backward-compat obligations, and sanitized internals. If
  something looks like it might be an OSS-facing norm rather than a genuine
  internal practice, say so instead of implying this is a window into the
  company's full engineering culture.

## Step 7: Cross-reference against the user's project

This is where the overview file and any matched ADRs actually get used,
not just loaded for show:

- Filter every recommendation through the user's actual stage/scale (from
  Facts). A pattern that makes sense at significant scale can be genuinely
  wrong for a small or solo project — call this out rather than presenting
  every finding as equally applicable.
- Check recommendations against the Judgment section and any ADRs matched
  in Step 4. If something lands on ground already covered, say so plainly
  instead of re-suggesting it as if new.
- Where possible, tie suggestions to actual paths/modules in the user's
  project (from the overview) rather than leaving them generic — "here's
  how this would slot into your `services/` layer" beats "consider doing
  this."

## Step 8: Write the report

Follow `references/report-template.md` exactly — the frontmatter schema is
what makes reports comparable to each other later, across many repos, so
don't drop fields even when a value feels obvious in the moment.

Default save location: `<own_project_path>/docs/repo-analyses/<repo-name>-
<YYYY-MM-DD>.md`. Mention this default and adjust if the user wants
something else, but don't block on asking.

## Step 9: Close the loop

An overview file only stays useful if adopted patterns get folded back into
it. Before ending, check whether anything in the report seems genuinely
worth adopting, and if so, offer the ready-to-paste snippet from the
report's final section for the user to drop into their overview's Judgment
section. Don't force this if nothing in the report rises to that level —
an empty gesture here is worse than skipping it.
