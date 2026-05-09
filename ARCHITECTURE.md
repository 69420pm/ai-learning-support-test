# Architecture: AI Learning Support

## Overview
This project is a monorepo containing tools and libraries for AI-assisted learning. It is designed to be highly extensible and easy to use for both humans and AI agents.

## Monorepo Structure

- `packages/core`: The core logic and business rules. Shared across all interfaces.
- `packages/cli`: A command-line interface for interacting with the learning support system.
- `packages/library`: A reusable library for embedding learning support into other applications.

## Technology Stack
- **Language**: TypeScript (Strict Mode)
- **Runtime**: Node.js (ESM)
- **Monorepo Manager**: Turbo
- **Package Manager**: pnpm
- **Linter/Formatter**: Biome
- **Build Tool**: tsup
- **Testing**: Vitest

## Design Principles
1. **Agent-Optimization**: Documentation and command interfaces are designed to be easily parsed and used by LLMs.
2. **Surgical Updates**: Changes should be targeted and minimal, maintaining structural integrity.
3. **Strict Type Safety**: TypeScript is configured with strict flags to catch errors at compile-time.
4. **Consistency**: Biome enforces a uniform code style across the entire monorepo.
