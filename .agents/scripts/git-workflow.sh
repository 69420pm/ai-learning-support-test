#!/usr/bin/env bash
# git-workflow.sh - Helper script for Git/GitHub workflows
# Designed for safe, structured usage by AI agents and developers.

set -euo pipefail

# Helper to output error messages and exit
error_exit() {
  echo "Error: $1" >&2
  exit 1
}

# 1. Validation checks
check_git() {
  if ! command -v git >/dev/null 2>&1; then
    error_exit "git is not installed or not in PATH."
  fi
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    error_exit "Not in a git repository."
  fi
}

check_github() {
  check_git
  if ! command -v gh >/dev/null 2>&1; then
    error_exit "GitHub CLI (gh) is not installed. Please install it first."
  fi
  if ! gh auth status >/dev/null 2>&1; then
    error_exit "GitHub CLI is not authenticated. Please run 'gh auth login' on your host machine."
  fi
}

# Require check helper
require_var() {
  local var_name="$1"
  local var_val="${!var_name:-}"
  if [ -z "$var_val" ]; then
    error_exit "Missing required parameter: $var_name"
  fi
}

# Subcommands
cmd_create_branch() {
  check_git
  require_var "NAME"
  
  # Check if branch already exists
  if git show-ref --verify --quiet "refs/heads/$NAME"; then
    echo "Branch '$NAME' already exists. Switching to it..."
    git switch "$NAME"
  else
    echo "Creating and switching to branch '$NAME'..."
    git switch -c "$NAME"
  fi
}

cmd_switch_branch() {
  check_git
  require_var "NAME"
  echo "Switching to branch '$NAME'..."
  git switch "$NAME"
}

cmd_sync_branch() {
  check_git
  local base="${BRANCH:-main}"
  local current
  current=$(git branch --show-current)
  if [ -z "$current" ]; then
    error_exit "Not currently on a branch (detached HEAD)."
  fi
  
  echo "Fetching remote updates..."
  git fetch origin
  
  # Check if remote base branch exists
  if ! git show-ref --verify --quiet "refs/remotes/origin/$base"; then
    error_exit "Remote branch 'origin/$base' does not exist."
  fi

  echo "Merging 'origin/$base' into current branch '$current'..."
  git merge "origin/$base" --no-edit
}

cmd_commit() {
  check_git
  require_var "MSG"
  
  # Run validation check via Make if it exists
  if [ -f Makefile ] && grep -q "^check:" Makefile; then
    echo "Running validation check before committing..."
    make check
  fi

  echo "Staging all changes..."
  git add .
  
  echo "Committing changes..."
  git commit -m "$MSG"
}

cmd_push() {
  check_git
  local current
  current=$(git branch --show-current)
  if [ -z "$current" ]; then
    error_exit "Not currently on a branch (detached HEAD)."
  fi

  # Check if upstream is set
  if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    echo "Upstream branch not set. Pushing to origin and setting upstream..."
    git push --set-upstream origin "$current"
  else
    echo "Pushing changes to remote..."
    git push
  fi
}

cmd_create_issue() {
  check_github
  require_var "TITLE"

  local args=(--title "$TITLE")
  
  if [ -n "${BODY_FILE:-}" ]; then
    if [ ! -f "$BODY_FILE" ]; then
      error_exit "Body file '$BODY_FILE' does not exist."
    fi
    args+=(--body-file "$BODY_FILE")
  elif [ -n "${BODY:-}" ]; then
    args+=(--body "$BODY")
  else
    args+=(--body "")
  fi

  if [ -n "${LABEL:-}" ]; then
    args+=(--label "$LABEL")
  fi

  if [ -n "${ASSIGNEE:-}" ]; then
    args+=(--assignee "$ASSIGNEE")
  fi

  echo "Creating GitHub issue..."
  gh issue create "${args[@]}"
}

cmd_view_issue() {
  check_github
  require_var "NUMBER"
  gh issue view "$NUMBER"
}

cmd_list_issues() {
  check_github
  local state="${STATE:-open}"
  local args=(--state "$state")
  
  if [ -n "${ASSIGNEE:-}" ]; then
    args+=(--assignee "$ASSIGNEE")
  fi
  
  gh issue list "${args[@]}"
}

cmd_edit_issue() {
  check_github
  require_var "NUMBER"
  
  local args=()
  
  if [ -n "${TITLE:-}" ]; then
    args+=(--title "$TITLE")
  fi

  if [ -n "${BODY_FILE:-}" ]; then
    if [ ! -f "$BODY_FILE" ]; then
      error_exit "Body file '$BODY_FILE' does not exist."
    fi
    args+=(--body-file "$BODY_FILE")
  elif [ -n "${BODY:-}" ]; then
    args+=(--body "$BODY")
  fi

  if [ -n "${LABEL:-}" ]; then
    args+=(--add-label "$LABEL")
  fi

  if [ -n "${ASSIGNEE:-}" ]; then
    args+=(--add-assignee "$ASSIGNEE")
  fi

  if [ ${#args[@]} -eq 0 ]; then
    error_exit "No fields to update specified. Provide TITLE, BODY/BODY_FILE, LABEL, or ASSIGNEE."
  fi

  echo "Editing GitHub issue #$NUMBER..."
  gh issue edit "$NUMBER" "${args[@]}"
}

cmd_close_issue() {
  check_github
  require_var "NUMBER"
  
  local args=()
  if [ -n "${REASON:-}" ]; then
    args+=(--reason "$REASON")
  fi
  
  echo "Closing GitHub issue #$NUMBER..."
  gh issue close "$NUMBER" "${args[@]}"
}

cmd_reopen_issue() {
  check_github
  require_var "NUMBER"
  echo "Reopening GitHub issue #$NUMBER..."
  gh issue reopen "$NUMBER"
}

cmd_comment_issue() {
  check_github
  require_var "NUMBER"
  
  local args=()
  if [ -n "${BODY_FILE:-}" ]; then
    if [ ! -f "$BODY_FILE" ]; then
      error_exit "Body file '$BODY_FILE' does not exist."
    fi
    args+=(--body-file "$BODY_FILE")
  elif [ -n "${BODY:-}" ]; then
    args+=(--body "$BODY")
  else
    error_exit "Either BODY or BODY_FILE is required to comment."
  fi
  
  echo "Adding comment to GitHub issue #$NUMBER..."
  gh issue comment "$NUMBER" "${args[@]}"
}

cmd_view_issue_comments() {
  check_github
  require_var "NUMBER"
  gh issue view "$NUMBER" --comments
}

cmd_create_pr() {
  check_github
  
  local current
  current=$(git branch --show-current)
  if [ -z "$current" ]; then
    error_exit "Not currently on a branch (detached HEAD)."
  fi
  
  if [ "$current" = "main" ] || [ "$current" = "master" ]; then
    error_exit "Cannot create a PR from '$current' branch. Switch to a feature branch first."
  fi

  # Auto-push if remote branch is not up to date or doesn't exist
  echo "Checking remote branch status..."
  if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    echo "No upstream branch detected. Pushing current branch to origin first..."
    git push --set-upstream origin "$current"
  else
    local unpushed
    unpushed=$(git log @{u}..HEAD --oneline)
    if [ -n "$unpushed" ]; then
      echo "Local commits detected that are not on remote. Pushing changes..."
      git push
    fi
  fi

  local args=()
  
  if [ "${FILL:-}" = "true" ]; then
    args+=(--fill)
  else
    require_var "TITLE"
    args+=(--title "$TITLE")
    
    if [ -n "${BODY_FILE:-}" ]; then
      if [ ! -f "$BODY_FILE" ]; then
        error_exit "Body file '$BODY_FILE' does not exist."
      fi
      args+=(--body-file "$BODY_FILE")
    elif [ -n "${BODY:-}" ]; then
      args+=(--body "$BODY")
    else
      args+=(--body "")
    fi
  fi

  if [ -n "${BASE:-}" ]; then
    args+=(--base "$BASE")
  fi

  if [ -n "${HEAD:-}" ]; then
    args+=(--head "$HEAD")
  fi

  if [ "${DRAFT:-}" = "true" ]; then
    args+=(--draft)
  fi

  if [ -n "${LABEL:-}" ]; then
    args+=(--label "$LABEL")
  fi

  if [ -n "${REVIEWER:-}" ]; then
    args+=(--reviewer "$REVIEWER")
  fi

  if [ -n "${ASSIGNEE:-}" ]; then
    args+=(--assignee "$ASSIGNEE")
  fi

  echo "Creating GitHub Pull Request..."
  gh pr create "${args[@]}"
}

cmd_view_pr() {
  check_github
  require_var "NUMBER"
  gh pr view "$NUMBER"
  echo ""
  echo "--- Pull Request Diff ---"
  gh pr diff "$NUMBER"
}

cmd_list_prs() {
  check_github
  local state="${STATE:-open}"
  gh pr list --state "$state"
}

cmd_checkout_pr() {
  check_github
  require_var "NUMBER"
  echo "Checking out Pull Request #$NUMBER..."
  gh pr checkout "$NUMBER"
}

cmd_close_pr() {
  check_github
  require_var "NUMBER"
  echo "Closing Pull Request #$NUMBER..."
  gh pr close "$NUMBER"
}

cmd_reopen_pr() {
  check_github
  require_var "NUMBER"
  echo "Reopening Pull Request #$NUMBER..."
  gh pr reopen "$NUMBER"
}

cmd_comment_pr() {
  check_github
  require_var "NUMBER"

  local args=()
  if [ -n "${BODY_FILE:-}" ]; then
    if [ ! -f "$BODY_FILE" ]; then
      error_exit "Body file '$BODY_FILE' does not exist."
    fi
    args+=(--body-file "$BODY_FILE")
  elif [ -n "${BODY:-}" ]; then
    args+=(--body "$BODY")
  else
    error_exit "Either BODY or BODY_FILE is required to comment."
  fi

  echo "Commenting on Pull Request #$NUMBER..."
  gh pr comment "$NUMBER" "${args[@]}"
}

cmd_view_pr_comments() {
  check_github
  require_var "NUMBER"
  gh pr view "$NUMBER" --comments
}

cmd_approve_pr() {
  check_github
  require_var "NUMBER"
  
  local args=(--approve)
  if [ -n "${BODY:-}" ]; then
    args+=(--body "$BODY")
  fi
  
  echo "Approving Pull Request #$NUMBER..."
  gh pr review "$NUMBER" "${args[@]}"
}

cmd_request_changes_pr() {
  check_github
  require_var "NUMBER"
  require_var "BODY"
  
  echo "Requesting changes on Pull Request #$NUMBER..."
  gh pr review "$NUMBER" --request-changes --body "$BODY"
}

cmd_merge_pr() {
  check_github
  require_var "NUMBER"
  
  local method="${METHOD:-squash}"
  local flag="--squash"
  if [ "$method" = "merge" ]; then
    flag="--merge"
  elif [ "$method" = "rebase" ]; then
    flag="--rebase"
  fi
  
  echo "Merging Pull Request #$NUMBER using method '$method'..."
  gh pr merge "$NUMBER" "$flag" --delete-branch
}

cmd_check_status() {
  echo "=== Running Environment Diagnostics ==="
  
  local success=true
  
  # Git status check
  if ! command -v git >/dev/null 2>&1; then
    echo "[-] Git: NOT INSTALLED"
    success=false
  else
    echo "[+] Git: Installed ($(git --version))"
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      echo "    Current branch: $(git branch --show-current)"
      local remote_url
      remote_url=$(git remote get-url origin 2>/dev/null || echo "None")
      echo "    Remote 'origin': $remote_url"
    else
      echo "    [-] Git status: Not inside a git repository"
      success=false
    fi
  fi
  
  # GitHub CLI check
  if ! command -v gh >/dev/null 2>&1; then
    echo "[-] GitHub CLI (gh): NOT INSTALLED"
    success=false
  else
    echo "[+] GitHub CLI (gh): Installed ($(gh --version | head -n 1))"
    if gh auth status >/dev/null 2>&1; then
      echo "[+] GitHub CLI Auth: AUTHENTICATED"
      gh auth status
    else
      echo "[-] GitHub CLI Auth: NOT AUTHENTICATED. Please run 'gh auth login' to authenticate."
      success=false
    fi
  fi
  
  if [ "$success" = "true" ]; then
    echo "[+] Diagnostics: PASSED"
  else
    echo "[-] Diagnostics: FAILED"
    exit 1
  fi
}

# Main command dispatcher
case "${1:-help}" in
  create-branch)       cmd_create_branch ;;
  switch-branch)       cmd_switch_branch ;;
  sync-branch)         cmd_sync_branch ;;
  commit)              cmd_commit ;;
  push)                cmd_push ;;
  create-issue)        cmd_create_issue ;;
  view-issue)          cmd_view_issue ;;
  list-issues)         cmd_list_issues ;;
  edit-issue)          cmd_edit_issue ;;
  close-issue)         cmd_close_issue ;;
  reopen-issue)        cmd_reopen_issue ;;
  comment-issue)       cmd_comment_issue ;;
  view-issue-comments) cmd_view_issue_comments ;;
  create-pr)           cmd_create_pr ;;
  view-pr)             cmd_view_pr ;;
  list-prs)            cmd_list_prs ;;
  checkout-pr)         cmd_checkout_pr ;;
  close-pr)            cmd_close_pr ;;
  reopen-pr)           cmd_reopen_pr ;;
  comment-pr)          cmd_comment_pr ;;
  view-pr-comments)    cmd_view_pr_comments ;;
  approve-pr)          cmd_approve_pr ;;
  request-changes-pr)  cmd_request_changes_pr ;;
  merge-pr)            cmd_merge_pr ;;
  check-status)        cmd_check_status ;;
  *)
    echo "Unknown command: ${1:-}"
    exit 1
    ;;
esac
