.PHONY: help setup build lint format typecheck test check clean check-github check-env \
	create-branch switch-branch sync-branch commit push \
	create-issue view-issue list-issues edit-issue close-issue reopen-issue comment-issue view-issue-comments \
	create-pr view-pr list-prs checkout-pr close-pr reopen-pr comment-pr view-pr-comments approve-pr request-changes-pr merge-pr \
	generate-issue get-issue list-issue-comments get-pr

# Default target: show help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Local Development & Verification:"
	@echo "  setup                  Install dependencies using pnpm"
	@echo "  build                  Build all packages in the monorepo using Turbo"
	@echo "  lint                   Lint all files using Biome via Turbo"
	@echo "  format                 Format all files using Biome via Turbo"
	@echo "  typecheck              Run TypeScript type checking across all packages"
	@echo "  test                   Run tests for all packages using Vitest via Turbo"
	@echo "  check                  Run all validation tasks (build, lint, typecheck, test)"
	@echo "  clean                  Remove build artifacts and node_modules"
	@echo ""
	@echo "Environment Verification:"
	@echo "  check-env              Verify Git installation and GitHub CLI authentication status"
	@echo "  check-github           Alias for check-env"
	@echo ""
	@echo "Git Branching & Syncing:"
	@echo "  create-branch NAME=\"...\"                  Create a new branch and switch to it"
	@echo "  switch-branch NAME=\"...\"                  Switch to an existing branch"
	@echo "  sync-branch [BRANCH=\"main\"]                Fetch and merge updates from remote base branch"
	@echo "  commit MSG=\"...\"                          Validate code via check and commit all changes"
	@echo "  push                                       Push current branch and set upstream if needed"
	@echo ""
	@echo "GitHub Issues CRUD & Comments:"
	@echo "  create-issue TITLE=\"...\" [BODY=\"...\"] [BODY_FILE=\"...\"] [LABEL=\"...\"] [ASSIGNEE=\"...\"]"
	@echo "                                             Create a GitHub issue"
	@echo "  view-issue NUMBER=<num>                    View details of a GitHub issue"
	@echo "  list-issues [STATE=open|closed|all] [ASSIGNEE=\"...\"]"
	@echo "                                             List GitHub issues"
	@echo "  edit-issue NUMBER=<num> [TITLE=\"...\"] [BODY=\"...\"] [LABEL=\"...\"] [ASSIGNEE=\"...\"]"
	@echo "                                             Edit a GitHub issue"
	@echo "  close-issue NUMBER=<num> [REASON=\"...\"]    Close a GitHub issue"
	@echo "  reopen-issue NUMBER=<num>                  Reopen a closed GitHub issue"
	@echo "  comment-issue NUMBER=<num> [BODY=\"...\"] [BODY_FILE=\"...\"]"
	@echo "                                             Add a comment to a GitHub issue"
	@echo "  view-issue-comments NUMBER=<num>           View comments on a GitHub issue"
	@echo ""
	@echo "GitHub Pull Requests CRUD, Comments & Reviews:"
	@echo "  create-pr [TITLE=\"...\"] [BODY=\"...\"] [BODY_FILE=\"...\"] [FILL=true] [BASE=\"...\"] [DRAFT=true] [LABEL=\"...\"] [REVIEWER=\"...\"] [ASSIGNEE=\"...\"]"
	@echo "                                             Create a GitHub pull request"
	@echo "  view-pr NUMBER=<num>                       View pull request details and diff"
	@echo "  list-prs [STATE=open|closed|all]           List pull requests"
	@echo "  checkout-pr NUMBER=<num>                   Checkout a pull request branch locally"
	@echo "  close-pr NUMBER=<num>                      Close a pull request"
	@echo "  reopen-pr NUMBER=<num>                     Reopen a pull request"
	@echo "  comment-pr NUMBER=<num> [BODY=\"...\"] [BODY_FILE=\"...\"]"
	@echo "                                             Add a comment to a pull request"
	@echo "  view-pr-comments NUMBER=<num>              View comments on a pull request"
	@echo "  approve-pr NUMBER=<num> [BODY=\"...\"]       Approve a pull request"
	@echo "  request-changes-pr NUMBER=<num> BODY=\"...\" Request changes on a pull request"
	@echo "  merge-pr NUMBER=<num> [METHOD=squash|merge|rebase]"
	@echo "                                             Merge a pull request"
	@echo ""
	@echo "Legacy / Backward Compatibility Aliases:"
	@echo "  generate-issue TITLE=\"...\"                Alias for create-issue"
	@echo "  get-issue NUMBER=<num>                     Alias for view-issue"
	@echo "  get-pr NUMBER=<num>                        Alias for view-pr"
	@echo "  list-issue-comments NUMBER=<num>           Alias for view-issue-comments"

# --- Local Development & Verification ---

setup:
	pnpm install

build:
	pnpm run build

lint:
	pnpm run lint

format:
	pnpm run format

typecheck:
	pnpm run typecheck

test:
	pnpm run test

check:
	pnpm run check

clean:
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/*/dist
	rm -rf .turbo

# --- Environment Diagnostics ---

check-env:
	@bash .agents/scripts/git-workflow.sh check-status

check-github: check-env

# --- Git Branching & Syncing ---

create-branch:
	@NAME="$(NAME)" bash .agents/scripts/git-workflow.sh create-branch

switch-branch:
	@NAME="$(NAME)" bash .agents/scripts/git-workflow.sh switch-branch

sync-branch:
	@BRANCH="$(BRANCH)" bash .agents/scripts/git-workflow.sh sync-branch

commit:
	@MSG="$(MSG)" bash .agents/scripts/git-workflow.sh commit

push:
	@bash .agents/scripts/git-workflow.sh push

# --- GitHub Issues CRUD & Comments ---

create-issue:
	@TITLE="$(TITLE)" BODY="$(BODY)" BODY_FILE="$(BODY_FILE)" LABEL="$(LABEL)" ASSIGNEE="$(ASSIGNEE)" \
		PARENT="$(PARENT)" BLOCKED_BY="$(BLOCKED_BY)" BLOCKING="$(BLOCKING)" \
		bash .agents/scripts/git-workflow.sh create-issue

view-issue:
	@NUMBER="$(NUMBER)" bash .agents/scripts/git-workflow.sh view-issue

list-issues:
	@STATE="$(STATE)" ASSIGNEE="$(ASSIGNEE)" bash .agents/scripts/git-workflow.sh list-issues

edit-issue:
	@NUMBER="$(NUMBER)" TITLE="$(TITLE)" BODY="$(BODY)" BODY_FILE="$(BODY_FILE)" LABEL="$(LABEL)" ASSIGNEE="$(ASSIGNEE)" \
		PARENT="$(PARENT)" BLOCKED_BY="$(BLOCKED_BY)" BLOCKING="$(BLOCKING)" \
		bash .agents/scripts/git-workflow.sh edit-issue

close-issue:
	@NUMBER="$(NUMBER)" REASON="$(REASON)" bash .agents/scripts/git-workflow.sh close-issue

reopen-issue:
	@NUMBER="$(NUMBER)" bash .agents/scripts/git-workflow.sh reopen-issue

comment-issue:
	@NUMBER="$(NUMBER)" BODY="$(BODY)" BODY_FILE="$(BODY_FILE)" \
		bash .agents/scripts/git-workflow.sh comment-issue

view-issue-comments:
	@NUMBER="$(NUMBER)" bash .agents/scripts/git-workflow.sh view-issue-comments

# --- GitHub Pull Requests CRUD, Comments & Reviews ---

create-pr:
	@TITLE="$(TITLE)" BODY="$(BODY)" BODY_FILE="$(BODY_FILE)" FILL="$(FILL)" BASE="$(BASE)" HEAD="$(HEAD)" DRAFT="$(DRAFT)" LABEL="$(LABEL)" REVIEWER="$(REVIEWER)" ASSIGNEE="$(ASSIGNEE)" \
		bash .agents/scripts/git-workflow.sh create-pr

view-pr:
	@NUMBER="$(NUMBER)" bash .agents/scripts/git-workflow.sh view-pr

list-prs:
	@STATE="$(STATE)" bash .agents/scripts/git-workflow.sh list-prs

checkout-pr:
	@NUMBER="$(NUMBER)" bash .agents/scripts/git-workflow.sh checkout-pr

close-pr:
	@NUMBER="$(NUMBER)" bash .agents/scripts/git-workflow.sh close-pr

reopen-pr:
	@NUMBER="$(NUMBER)" bash .agents/scripts/git-workflow.sh reopen-pr

comment-pr:
	@NUMBER="$(NUMBER)" BODY="$(BODY)" BODY_FILE="$(BODY_FILE)" \
		bash .agents/scripts/git-workflow.sh comment-pr

view-pr-comments:
	@NUMBER="$(NUMBER)" bash .agents/scripts/git-workflow.sh view-pr-comments

approve-pr:
	@NUMBER="$(NUMBER)" BODY="$(BODY)" bash .agents/scripts/git-workflow.sh approve-pr

request-changes-pr:
	@NUMBER="$(NUMBER)" BODY="$(BODY)" bash .agents/scripts/git-workflow.sh request-changes-pr

merge-pr:
	@NUMBER="$(NUMBER)" METHOD="$(METHOD)" bash .agents/scripts/git-workflow.sh merge-pr

# --- Legacy / Backward Compatibility Aliases ---

generate-issue: create-issue
get-issue: view-issue
list-issue-comments: view-issue-comments
get-pr: view-pr
