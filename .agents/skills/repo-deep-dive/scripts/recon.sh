#!/usr/bin/env bash
# recon.sh - fast structural recon of a repo, run BEFORE any deep file reading.
#
# Usage:
#   recon.sh <repo_path> [focus_keyword] [--quick]
#
# --quick restricts output to manifests + top-level tree only. Intended for
# the staleness-check subagent (see agents/staleness-checker.md), which only
# needs to verify high-level facts, not do a full recon of the target repo.
#
# Output is plain text to stdout, organized into labeled sections. It is
# meant to be read once and reasoned over, not parsed programmatically.

set -uo pipefail

REPO_PATH="${1:?Usage: recon.sh <repo_path> [focus_keyword] [--quick]}"
shift || true

FOCUS=""
QUICK=false
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=true ;;
    *) FOCUS="$arg" ;;
  esac
done

cd "$REPO_PATH" 2>/dev/null || { echo "ERROR: cannot cd into $REPO_PATH"; exit 1; }

hr() { printf '\n=== %s ===\n' "$1"; }

hr "REPO PATH"
pwd

hr "MANIFESTS / STACK SIGNALS"
found_manifest=false
for f in package.json pyproject.toml requirements.txt Pipfile setup.py setup.cfg \
         go.mod Cargo.toml pom.xml build.gradle build.gradle.kts Gemfile \
         composer.json mix.exs deno.json CMakeLists.txt *.csproj; do
  for match in $f; do
    if [ -f "$match" ]; then
      found_manifest=true
      echo "--- $match ---"
      head -c 2000 "$match"
      echo
    fi
  done
done
$found_manifest || echo "(no top-level manifest file recognized - inspect directory tree below)"

hr "TOP-LEVEL TREE"
PRUNE='node_modules|\.git|dist|build|target|__pycache__|venv|\.venv|vendor|coverage|\.next|\.turbo'
if command -v tree >/dev/null 2>&1; then
  tree -L 2 -I "$PRUNE" -a
else
  find . -maxdepth 2 \
    \( -name node_modules -o -name .git -o -name dist -o -name build -o -name target \
       -o -name __pycache__ -o -name venv -o -name .venv -o -name vendor -o -name coverage \) \
    -prune -o -print | sort
fi

if $QUICK; then
  hr "DONE (quick mode)"
  exit 0
fi

hr "DOCS / DECISION RECORDS / CHANGELOG"
adr_found=false
for d in docs/adr docs/decisions docs/architecture/decisions adr ADR doc/adr doc/architecture/decisions .adr; do
  if [ -d "$d" ]; then
    adr_found=true
    echo "Found decision-record directory: $d"
    find "$d" -maxdepth 2 -type f | sort
  fi
done
$adr_found || echo "(no conventional ADR/decision-record directory found)"

for f in CHANGELOG.md CHANGELOG CONTRIBUTING.md ARCHITECTURE.md DESIGN.md docs/architecture.md docs/design.md; do
  [ -f "$f" ] && echo "Found: $f"
done

if [ -d .git ]; then
  hr "GIT ACTIVITY"
  echo "Total commits: $(git log --oneline 2>/dev/null | wc -l)"
  echo "Contributors:  $(git log --format='%ae' 2>/dev/null | sort -u | wc -l)"
  echo "First commit:  $(git log --reverse --format='%ad' --date=short 2>/dev/null | head -1)"
  echo "Last commit:   $(git log -1 --format='%ad' --date=short 2>/dev/null)"

  hr "CHURN HOTSPOTS (most-changed files, full history)"
  git log --format=format: --name-only 2>/dev/null | grep -v '^$' | sort | uniq -c | sort -rg | head -20

  hr "RECENT ACTIVITY (last 90 days, top changed files)"
  since_date=$(date -d '90 days ago' +%Y-%m-%d 2>/dev/null || date -v-90d +%Y-%m-%d 2>/dev/null || true)
  if [ -n "$since_date" ]; then
    git log --since="$since_date" --format=format: --name-only 2>/dev/null | grep -v '^$' | sort | uniq -c | sort -rg | head -15
  fi
else
  echo "(not a git checkout - skipping git history analysis)"
fi

if [ -n "$FOCUS" ]; then
  hr "FOCUS AREA: '$FOCUS'"
  if command -v rg >/dev/null 2>&1; then
    echo "Files mentioning '$FOCUS' (match count, descending):"
    rg -i -c --no-messages "$FOCUS" 2>/dev/null | sort -t: -k2 -rn | head -25
  else
    echo "Files mentioning '$FOCUS' (ripgrep not installed, falling back to grep):"
    grep -riIl "$FOCUS" \
      --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist \
      --exclude-dir=build --exclude-dir=target --exclude-dir=__pycache__ \
      --exclude-dir=venv --exclude-dir=.venv --exclude-dir=vendor \
      . 2>/dev/null | head -25
  fi

  if [ -d .git ]; then
    hr "COMMIT MESSAGES MENTIONING '$FOCUS' (rationale signal)"
    git log --all -i --grep="$FOCUS" --format='%h %ad %s' --date=short 2>/dev/null | head -15
  fi
fi

hr "DONE"
