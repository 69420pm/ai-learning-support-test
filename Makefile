.PHONY: help setup build lint format typecheck test check clean check-github agent-start-branch agent-validate agent-submit-pr generate-issue get-issue commit

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
		echo "Usage: make generate-issue TITLE=\"My Issue Title\" [BODY=\"body text\" | BODY_FILE=\"path/to/body.md\"] [LABEL=\"label1,label2\"]"; \
		exit 1; \
	fi
	@echo "Creating GitHub issue: $${TITLE:-$(TITLE)}..."
	@if [ -n "$${BODY_FILE:-$(BODY_FILE)}" ]; then \
		gh issue create --title "$${TITLE:-$(TITLE)}" --body-file "$${BODY_FILE:-$(BODY_FILE)}" $(if $(LABEL),--label "$(LABEL)",); \
	elif [ -n "$${BODY:-$(BODY)}" ]; then \
		gh issue create --title "$${TITLE:-$(TITLE)}" --body "$${BODY:-$(BODY)}" $(if $(LABEL),--label "$(LABEL)",); \
	else \
		gh issue create --title "$${TITLE:-$(TITLE)}" --body "" $(if $(LABEL),--label "$(LABEL)",); \
	fi

get-issue: check-github
	@if [ -z "$$NUMBER" ] && [ -z "$(NUMBER)" ]; then \
		echo "Error: NUMBER is required. Usage: make get-issue NUMBER=<issue-number>"; \
		exit 1; \
	fi
	@gh issue view $${NUMBER:-$(NUMBER)}

commit: check
	@git add .
	@git commit -m "$(if $(MSG),$(MSG),automated commit after check validation)"

