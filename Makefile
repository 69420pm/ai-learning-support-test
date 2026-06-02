.PHONY: help setup build lint format typecheck test check clean check-github agent-start-branch agent-validate agent-submit-pr

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

# --- AI Agent Helper Targets ---

# 1. Initialize a new clean branch for an issue
# Usage: make agent-start-branch ISSUE=123
agent-start-branch: check-github
	@if [ -z "$(ISSUE)" ]; then echo "Error: ISSUE variable is required. Example: make agent-start-branch ISSUE=123"; exit 1; fi
	@git checkout main
	@git pull origin main
	@git checkout -b "agent/issue-$(ISSUE)"
	@echo "Ready to work on branch: agent/issue-$(ISSUE)"

# 2. Local Deterministic Validation (Zero LLM cost sanity check)
# Usage: make agent-validate
agent-validate:
	@echo "=== Running Deterministic Validation ==="
	pnpm run lint
	pnpm run typecheck
	pnpm run test
	@echo "=== All Checks Passed! ==="

# 3. Commit, Push, and Create a Draft PR on GitHub
# Usage: make agent-submit-pr ISSUE=123 TITLE="implement user auth" DESC_FILE="specs/issues/feature-1/issue-123.md"
agent-submit-pr: check-github
	@if [ -z "$(ISSUE)" ] || [ -z "$(TITLE)" ] || [ -z "$(DESC_FILE)" ]; then \
		echo "Error: ISSUE, TITLE, and DESC_FILE are all required."; \
		exit 1; \
	fi
	@echo "Committing changes..."
	git add .
	git commit -m "impl: resolve issue #$(ISSUE)"
	@echo "Pushing branch..."
	git push origin "agent/issue-$(ISSUE)"
	@echo "Creating Draft PR using GH CLI..."
	gh pr create \
		--title "Draft: [Issue #$(ISSUE)] $(TITLE)" \
		--body-file "$(DESC_FILE)" \
		--draft
	@echo "Draft PR successfully created!"
