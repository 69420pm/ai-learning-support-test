.PHONY: help setup build lint format typecheck test check clean check-github generate-issue get-issue list-issues get-pr create-branch switch-branch checkout-pr create-pr commit

# Default target: show help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets for AI Agents and Humans:"
	@echo "  setup         Install dependencies using pnpm"
	@echo "  build         Build all packages in the monorepo using Turbo"
	@echo "  lint          Lint all files using Biome via Turbo"
	@echo "  format        Format all files using Biome via Turbo"
	@echo "  typecheck     Run TypeScript type checking across all packages"
	@echo "  test          Run tests for all packages using Vitest via Turbo"
	@echo "  check         Run all validation tasks (build, lint, typecheck, test)"
	@echo "  check-github  Verify GitHub CLI installation and auth"
	@echo "  clean         Remove build artifacts and node_modules"
	@echo "  generate-issue TITLE=\"...\" [LABEL=\"...\"] [PARENT=\"...\"] [BLOCKED_BY=\"...\"] [BLOCKING=\"...\"]  Create a GitHub issue"
	@echo "  get-issue NUMBER=<num>                     View a GitHub issue"
	@echo "  get-pr NUMBER=<num>                        View pull request info and diff"
	@echo "  checkout-pr NUMBER=<num>                   Checkout pull request branch locally"
	@echo "  create-pr [TITLE=\"...\"] [BODY=\"...\"] [FILL=true] [BASE=\"...\"] [HEAD=\"...\"] [DRAFT=true]  Create a GitHub pull request"
	@echo "  commit MSG=\"...\"                         Validate code via check and commit all changes"

check-github:
	@which gh > /dev/null || (echo "Error: GitHub CLI (gh) is not installed. Please install it first." && exit 1)
	@gh auth status > /dev/null 2>&1 || (echo "Error: GitHub CLI is not authenticated. Please run 'gh auth login'." && exit 1)
	@echo "GitHub CLI is installed and authenticated."

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

generate-issue: check-github
	@if [ -z "$$TITLE" ] && [ -z "$(TITLE)" ]; then \
		echo "Error: TITLE is required."; \
		echo "Usage: make generate-issue TITLE=\"My Issue Title\" [BODY=\"body text\" | BODY_FILE=\"path/to/body.md\"] [LABEL=\"label1,label2\"] [PARENT=\"parent-number\"] [BLOCKED_BY=\"numbers\"] [BLOCKING=\"numbers\"]"; \
		exit 1; \
	fi
	@echo "Creating GitHub issue: $${TITLE:-$(TITLE)}..."
	@if [ -n "$${BODY_FILE:-$(BODY_FILE)}" ]; then \
		gh issue create --title "$${TITLE:-$(TITLE)}" --body-file "$${BODY_FILE:-$(BODY_FILE)}" $(if $(LABEL),--label "$(LABEL)",) $(if $(PARENT),--parent "$(PARENT)",) $(if $(BLOCKED_BY),--blocked-by "$(BLOCKED_BY)",) $(if $(BLOCKING),--blocking "$(BLOCKING)",); \
	elif [ -n "$${BODY:-$(BODY)}" ]; then \
		gh issue create --title "$${TITLE:-$(TITLE)}" --body "$${BODY:-$(BODY)}" $(if $(LABEL),--label "$(LABEL)",) $(if $(PARENT),--parent "$(PARENT)",) $(if $(BLOCKED_BY),--blocked-by "$(BLOCKED_BY)",) $(if $(BLOCKING),--blocking "$(BLOCKING)",); \
	else \
		gh issue create --title "$${TITLE:-$(TITLE)}" --body "" $(if $(LABEL),--label "$(LABEL)",) $(if $(PARENT),--parent "$(PARENT)",) $(if $(BLOCKED_BY),--blocked-by "$(BLOCKED_BY)",) $(if $(BLOCKING),--blocking "$(BLOCKING)",); \
	fi

get-issue: check-github
	@if [ -z "$$NUMBER" ] && [ -z "$(NUMBER)" ]; then \
		echo "Error: NUMBER is required. Usage: make get-issue NUMBER=<issue-number>"; \
		exit 1; \
	fi
	@gh issue view $${NUMBER:-$(NUMBER)}

list-issues: check-github
	@gh issue list

get-pr: check-github
	@if [ -z "$$NUMBER" ] && [ -z "$(NUMBER)" ]; then \
		echo "Error: NUMBER is required. Usage: make get-pr NUMBER=<pr-number>"; \
		exit 1; \
	fi
	@gh pr view $${NUMBER:-$(NUMBER)}
	@echo ""
	@echo "--- Pull Request Diff ---"
	@gh pr diff $${NUMBER:-$(NUMBER)}

create-branch:
	@if [ -z "$$NAME" ] && [ -z "$(NAME)" ]; then \
		echo "Error: NAME is required. Usage: make create-branch NAME=<branch-name>"; \
		exit 1; \
	fi
	@git switch -c $${NAME:-$(NAME)}


switch-branch:
		@if [ -z "$$NAME" ] && [ -z "$(NAME)" ]; then \
			echo "Error: NAME is required. Usage: make switch-branch NAME=<branch-name>"; \
			exit 1; \
		fi
		@git switch $${NAME:-$(NAME)}


checkout-pr: check-github
	@if [ -z "$$NUMBER" ] && [ -z "$(NUMBER)" ]; then \
		echo "Error: NUMBER is required. Usage: make checkout-pr NUMBER=<pr-number>"; \
		exit 1; \
	fi
	@gh pr checkout $${NUMBER:-$(NUMBER)}

create-pr: check-github
	@TITLE="$${TITLE:-$(TITLE)}"; \
	BODY="$${BODY:-$(BODY)}"; \
	BODY_FILE="$${BODY_FILE:-$(BODY_FILE)}"; \
	FILL="$${FILL:-$(FILL)}"; \
	BASE="$${BASE:-$(BASE)}"; \
	HEAD="$${HEAD:-$(HEAD)}"; \
	DRAFT="$${DRAFT:-$(DRAFT)}"; \
	LABEL="$${LABEL:-$(LABEL)}"; \
	REVIEWER="$${REVIEWER:-$(REVIEWER)}"; \
	ASSIGNEE="$${ASSIGNEE:-$(ASSIGNEE)}"; \
	if [ -z "$$TITLE" ] && [ -z "$$FILL" ]; then \
		echo "Error: TITLE or FILL=true is required."; \
		echo "Usage: make create-pr [TITLE=\"My PR Title\"] [BODY=\"body text\" | BODY_FILE=\"path/to/body.md\"] [FILL=true] [BASE=\"main\"] [HEAD=\"feature\"] [DRAFT=true] [LABEL=\"label1,label2\"] [REVIEWER=\"user1\"] [ASSIGNEE=\"user1\"]"; \
		exit 1; \
	fi; \
	echo "Creating GitHub Pull Request..."; \
	cmd="gh pr create"; \
	if [ -n "$$FILL" ]; then \
		cmd="$$cmd --fill"; \
	else \
		if [ -n "$$TITLE" ]; then \
			cmd="$$cmd --title \"$$TITLE\""; \
		fi; \
		if [ -n "$$BODY_FILE" ]; then \
			cmd="$$cmd --body-file \"$$BODY_FILE\""; \
		elif [ -n "$$BODY" ]; then \
			cmd="$$cmd --body \"$$BODY\""; \
		else \
			cmd="$$cmd --body \"\""; \
		fi; \
	fi; \
	if [ -n "$$BASE" ]; then cmd="$$cmd --base \"$$BASE\""; fi; \
	if [ -n "$$HEAD" ]; then cmd="$$cmd --head \"$$HEAD\""; fi; \
	if [ -n "$$DRAFT" ]; then cmd="$$cmd --draft"; fi; \
	if [ -n "$$LABEL" ]; then cmd="$$cmd --label \"$$LABEL\""; fi; \
	if [ -n "$$REVIEWER" ]; then cmd="$$cmd --reviewer \"$$REVIEWER\""; fi; \
	if [ -n "$$ASSIGNEE" ]; then cmd="$$cmd --assignee \"$$ASSIGNEE\""; fi; \
	eval $$cmd

commit:
	@git add .
	@git commit -m "$(if $(MSG),$(MSG),automated commit after check validation)"
