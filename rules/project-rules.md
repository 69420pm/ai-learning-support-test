# Project Philosophy & Rules

- **Lean & Simple**: Simplicity is key. Avoid unnecessary abstractions, premature optimization, or overly rigid workflows.
- **Feature Isolation**: Features (`packages/core/src/features`) should be isolated. They must not cross-import. Orchestration belongs in `services`.
- **Adapter Pattern**: Always write against interfaces for database and storage, allowing hot-swapping between Local and Cloud modes.
- **Reversibility**: Prefer architectural decisions that are easy to change later over "perfect" but rigid ones.
- **Maintanability**: Emulate high-value engineering cultures (Anthropic, Meta): highly scalable, well-documented, and robust.
