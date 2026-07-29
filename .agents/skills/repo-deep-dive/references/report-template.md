# Report template

Use this structure for every report. The frontmatter matters as much as the
body — it's what makes reports comparable to each other six months from now,
so don't skip fields even if a value feels obvious in the moment.

```markdown
---
repo: <org/repo-name>
url: <github url, if known>
analyzed_date: <YYYY-MM-DD>
focus_area: <the specific thing that made this repo worth reading>
primary_stack: [<language>, <framework>, <db>, ...]
tags: [<free-form tags for future filtering, e.g. "event-sourcing", "monorepo", "go">]
your_project_overview: <path to the overview file used for cross-referencing>
---

# <repo-name>: <one-line description of what it is>

## Why this repo
The user's stated reason for picking this repo (verbatim or lightly
paraphrased). If no reason was given beyond the focus area, say so plainly.

## TL;DR
3-5 bullets. The part someone reads if they read nothing else. Each bullet
should be a specific, groundable claim, not a vague platitude.

## Stack & structure snapshot
Grounded facts from recon: languages, frameworks, directory layout, module
boundaries, how the build/test/CI pipeline works. This section anchors
everything after it — keep it to what recon + a few targeted reads actually
showed, not inference.

## General findings
Whatever is genuinely interesting about how this team works, organized
however fits the repo (testing strategy, error handling conventions, dependency
management, code review signals from commit history, docs practices, CI/CD
setup — use the categories that actually apply, don't force ones that don't).
Every claim cited to a file path (and line range where useful). Prefer a few
well-grounded findings over a long list of thin ones.

## Focus area deep dive: <focus_area>
This is the section the user most wants. Cover:
- How it's actually used here (grounded, with short snippets as evidence)
- Why, if discoverable (git history, commit messages, ADRs, docs) — mark
  "rationale unclear" rather than inventing a story if it isn't
- Trade-offs and friction: where this choice cost them something, where they
  worked around its limitations, what it made harder. A repo chosen because
  it uses the thing you're curious about will tempt a highlight-reel
  writeup — resist that; the costs are as informative as the benefits.

## Caveats
- Public-repo caveat: note anywhere this might reflect OSS-facing norms
  (contributor-friendliness, external backward compat, sanitized internals)
  rather than the org's full internal practice.
- Anything staleness-checked as out of date (see below).
- Any claims marked "rationale unclear" above, listed together for visibility.

## Relevance to your project
This is where the overview file and ADRs earn their keep:
- Filter recommendations through your project's actual stage/scale (from the
  overview's Facts) — call out anything that looks like it's sized for a
  much bigger team than yours, or vice versa.
- Cross-check against the overview's Judgment section and any matched ADRs.
  If a recommendation lands on ground your team already covered, say so
  explicitly instead of re-suggesting it cold (e.g. "your ADR-0004 already
  rejected a message queue here for reason X — worth reopening only if X no
  longer holds").
- Give concrete "how this would slot in" suggestions tied to actual paths/
  modules in your project where possible, not generic advice.

## If you adopt something from this
A ready-to-paste snippet for the overview's Judgment section, e.g.:
> Adopted <pattern/library> from <repo>, see report <date>. Rationale: ...

Only include this if something in the report actually seems worth adopting —
don't manufacture one for the sake of completeness.
```
