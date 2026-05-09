.PHONY: help setup build lint format typecheck test check clean

# Default target: show help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets for AI Agents and Humans:"
	@echo "  setup      Install dependencies using pnpm"
	@echo "  build      Build all packages in the monorepo using Turbo"
	@echo "  lint       Lint all files using Biome via Turbo"
	@echo "  format     Format all files using Biome via Turbo"
	@echo "  typecheck  Run TypeScript type checking across all packages"
	@echo "  test       Run tests for all packages using Vitest via Turbo"
	@echo "  check      Run all validation tasks (build, lint, typecheck, test)"
	@echo "  clean      Remove build artifacts and node_modules"
	@echo ""
	@echo "Recommended Workflow:"
	@echo "  1. make setup"
	@echo "  2. make build"
	@echo "  3. make check"

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
