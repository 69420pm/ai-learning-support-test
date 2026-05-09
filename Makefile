.PHONY: help setup build lint format typecheck test check clean check-github

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
...
check:
	pnpm run check

check-github:
	@which gh > /dev/null || (echo "Error: GitHub CLI (gh) is not installed. Please install it first." && exit 1)
	@gh auth status > /dev/null 2>&1 || (echo "Error: GitHub CLI is not authenticated. Please run 'gh auth login'." && exit 1)
	@echo "GitHub CLI is installed and authenticated."

clean:
	rm -rf node_modules

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
