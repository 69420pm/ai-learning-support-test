# Project overview template

If the user doesn't have an overview file yet, offer this as a starting
point rather than skipping personalization entirely. It's split into two
parts on purpose — they go stale at different rates and have different
owners:

- **Facts**: mechanically derivable (stack, structure, scale). Cheap to
  regenerate with `scripts/recon.sh`, which is exactly what the
  staleness-checker subagent does before each report.
- **Judgment**: only the user (or their team) knows this. No amount of
  repo-scanning reconstructs *why* a decision was made or what's currently
  painful — this section has to be written and kept up by a human.

```markdown
---
project: <name>
stage: <prototype | mvp | production | mature>
last_updated: <YYYY-MM-DD>
---

# Facts
(safe to regenerate mechanically — see scripts/recon.sh)

## Stack
- Language(s):
- Framework(s):
- Database / storage:
- Key infra (queues, cache, deploy target, etc.):

## Structure
- Top-level layout (brief):
- Where core business logic lives:
- Where tests live / how they're run:

## Scale
- Rough size (LOC, number of services, team size — whatever's meaningful):
- Team size / solo:

# Judgment
(edit by hand — this is the part no scan can reconstruct)

## Why we chose what we chose
- <decision>: <short reason>, see ADR-<n> for full detail if one exists

## Explicitly rejected approaches
- <approach>: rejected because <reason>, see ADR-<n> if applicable
(This section exists specifically so future repo analyses don't propose
re-litigating something you already settled.)

## Current pain points
- 

## Active priorities / non-goals right now
- 

## Adopted from prior repo analyses
- <pattern/library> — adopted from <repo>, see report <date>
(Append here whenever a repo-deep-dive report leads to an actual change —
this is what keeps future reports from suggesting things you've already
tried, or lets them build on what you adopted.)
```

If the user has ADRs, the overview doesn't need to duplicate them — a
one-line pointer per major decision is enough. The main skill greps the ADR
directory directly when a topic comes up rather than relying on the
overview to have summarized every ADR.
