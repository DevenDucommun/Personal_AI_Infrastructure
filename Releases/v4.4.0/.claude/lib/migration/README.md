# PAI Migration Library

Tools for detecting, extracting, merging, and validating PAI installations during version upgrades.

## Modules

- **scanner.ts** — Detect existing PAI installations. Analyzes `~/.claude/` for version, completeness, and component inventory (settings, skills, user content, memory, hooks, agents).
- **extractor.ts** — Extract transferable content from old installations. Pulls settings, user content, custom skills/agents, memory state, and plans into a structured `ExtractedContent` object.
- **merger.ts** — Merge extracted content with a new PAI installation. Supports strategies: `keep-old`, `keep-new`, `merge`. Handles settings, user content, skills, agents, memory, and plans.
- **validator.ts** — Verify installation completeness post-migration. Checks structure, config, skills, hooks, and runtime across 5 severity levels.

## Usage

Used by `install.sh` and `PAI/Tools/upgrade.ts` during PAI version upgrades. The typical flow:

1. `scanner.scan()` — Find and analyze existing installation
2. `extractor.extract()` — Pull out user customizations
3. Install new PAI version
4. `merger.merge()` — Apply user customizations to new version
5. `validator.validate()` — Verify everything works

## Status

Actively used for PAI upgrades (v3→v4, minor version bumps). Not needed for routine operation.
