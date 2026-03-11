# PAI v4.4.0 — Improvement Index

> Master index of all cleanup, streamlining, and architectural improvements identified during the full system review. Created 2026-03-11.
>
> **Scope:** `Releases/v4.4.0/.claude/` — 1,156 files, 47 skills, 23 hooks, 14 agents.
> **Companion doc:** `SYSTEM-ATLAS.md` (structural map of the full system)

---

# PRIORITY 1 — CRITICAL (Broken / Runtime Errors)

These issues will cause failures at runtime.

## 1.1 Phantom Hook References in settings.json — ✅ FIXED

**10 hooks were registered in settings.json but had NO corresponding .ts file.** Removed all phantom entries.

Missing hooks:
- `VoiceGate.hook.ts` — voice cleanup leftover, still in PreToolUse/Bash matcher (settings.json:170)
- `PromptAnalysis.hook.ts` — referenced in UserPromptSubmit (settings.json:297)
- `SetQuestionTab.hook.ts` — referenced in PreToolUse/AskUserQuestion (settings.json:209)
- `CheckVersion.hook.ts` — referenced in SessionStart (settings.json:331)
- `StartupGreeting.hook.ts` — referenced in SessionStart (settings.json:335)
- `WorktreeSetup.hook.ts` — referenced in WorktreeCreate (settings.json:380)
- `WorktreeRemove.hook.ts` — referenced in WorktreeRemove (settings.json:390)
- `TaskCompleted.hook.ts` — referenced in TaskCompleted (settings.json:400)
- `TeammateIdle.hook.ts` — referenced in TeammateIdle (settings.json:410)
- `PreCompact.hook.ts` — referenced in PreCompact (settings.json:360)

**Fix:** Remove phantom entries from settings.json AND from config/hooks.jsonc (since BuildSettings.ts generates settings.json from config/). Alternatively, create stub implementations for hooks that should exist.

## 1.2 config/hooks.jsonc Out of Sync with settings.json — ✅ FIXED

BuildSettings.ts does a full rebuild (not merge). hooks.jsonc was missing 5 real hooks (GitHubWriteGuard, UpdateTabTitle, AlgorithmTracker, StopOrchestrator, ConfigChange). Added them. Both files now reference exactly 23 hooks matching the 23 .ts files.

## 1.3 MEMORY/README.md Still References VOICE/ — ✅ FIXED

Removed VOICE/ line, replaced with WISDOM/ directory listing.

---

# PRIORITY 2 — HIGH (Stale Data / Misleading Docs)

These won't crash but will confuse both the AI and users.

## 2.1 Version String Sprawl — ✅ FIXED

Updated all stale version strings to 4.4.0:
- `config/preferences.jsonc:pai.version` → 4.4.0
- `install.sh` banner → v4.4.0 / Algo v3.9.0
- `config/spinner-tips.json` → v4.4.0

Future: centralize to ONE source with dynamic injection.

## 2.2 DOCUMENTATIONINDEX.md References 5 Missing Files — ✅ FIXED

Removed all 5 missing doc references from DOCUMENTATIONINDEX.md. Also removed voice ref from agents description.

## 2.3 hooks/README.md Documents Non-Existent Hooks — ✅ FIXED

Rewrote architecture diagram, hook registry, lifecycle events, configuration section, and tab state flow. Removed 4 phantom hooks, added all missing real hooks. README now matches the actual 23 .ts files + 2 handlers.

## 2.4 Incorrect Counts in Documentation — ✅ FIXED

PAI/README.md updated to 11 categories, 47 skills, 23 hooks. spinner-tips.json hook count updated (21→23).

Remaining: settings.json `counts` section still has all zeros (populated at runtime by UpdateCounts.hook.ts).

## 2.5 config/README.md References Voice Section — ✅ FIXED

Removed `voices`, `voice clone`, and `voice` references from config/README.md.

---

# PRIORITY 3 — MEDIUM (Bloat / Streamlining)

These increase repo size, context consumption, and maintenance burden.

## 3.1 Releases Directory: 336MB of Historical Releases

12 release directories totaling 336MB:
- v2.3 (93MB!), v2.4 (24MB), v2.5 (25MB), v3.0 (50MB)
- v4.0.0–v4.0.3 (20MB each), v4.1.0 (21MB), v4.2.0 (21MB)
- v4.3.1 (4K — EMPTY/stub from earlier branch work)
- v4.4.0 (20MB — the current release)

**Fix:** Remove all releases except the latest (v4.4.0) and MAYBE one prior major (v4.0.0 or v4.2.0). All history is in git. The empty v4.3.1 should definitely be deleted.

## 3.2 Spinner Verb Bloat: 430+ Lines

`config/spinner-verbs.json` contains 430+ custom spinner verbs (lines 472-898 of settings.json). While fun/personalized, this is a huge chunk of config that gets loaded every session.

**Fix:** Consider moving to a separate file that's loaded lazily, or trim to a curated 50-100. Group by theme for easier maintenance.

## 3.3 Spinner Tips: 200+ Lines

`config/spinner-tips.json` contains 200+ tips (settings.json lines 900-1103). Many reference specific skill counts and version numbers that go stale.

**Fix:** Move tips that contain version numbers to be dynamically generated. Trim stale/duplicate tips.

## 3.4 Algorithm Version Accumulation

`PAI/Algorithm/` ships 4 versions: v3.5.0, v3.7.0, v3.8.0, v3.9.0 (plus MICRO.md, CapabilitySelection.md, Examples.md, ISC-Methodology.md). Only v3.9.0 (LATEST) is used.

**Fix:** Archive old algorithm versions. Keep only LATEST + supporting docs.

## 3.5 Banner Tool Proliferation

6+ banner tools in PAI/Tools/:
- Banner.ts (39KB), BannerMatrix.ts (22KB), BannerNeofetch.ts (26KB)
- BannerPrototypes.ts (11KB), BannerRetro.ts (28KB), BannerTokyo.ts (12KB)
- NeofetchBanner.ts (29KB) — possibly duplicate of BannerNeofetch.ts

Total: ~167KB of banner code.

**Fix:** Consolidate to one Banner.ts with theme selection. Move others to an archive or remove.

## 3.6 Duplicate Action Runner/Types Files

`PAI/ACTIONS/lib/` has both:
- `runner.ts` (6.7KB) AND `runner.v2.ts` (9.5KB)
- `types.ts` (4.2KB) AND `types.v2.ts` (4.2KB)

**Fix:** Migrate to v2, remove old versions.

## 3.7 Loose Transcription Artifacts in PAI/Tools/

- `Transcribe-bun.lock` (13KB)
- `Transcribe-package.json` (228B)

These are dependency artifacts mixed in with actual tools.

**Fix:** Move to a `Transcribe/` subdirectory or remove if SplitAndTranscribe.ts doesn't need them.

## 3.8 Pipeline Monitor UI Shipped in Repo

`PAI/Tools/pipeline-monitor-ui/` is a full React+Vite app with its own package.json, tsconfig, eslint config, etc. (~15 files).

**Fix:** Consider if this should be a separate repo/package, or at minimum add it to .gitignore for the public release.

## 3.9 manifest.json is 204KB

The manifest catalogs every file with SHA256 hashes. At 204KB it's the 2nd largest single file.

**Fix:** Consider if this needs to be checked into git (it's regenerated by GenerateManifest.ts). Add to .gitignore if so.

---

# PRIORITY 4 — LOW (Architecture / Design Improvements)

Longer-term improvements for maintainability and consistency.

## 4.1 Hook Architecture: TerminalState Handles Too Many Events

`TerminalState.hook.ts` is registered for SessionStart, UserPromptSubmit (via PromptAnalysis reference), PreToolUse/AskUserQuestion, AND Stop. It's doing multiple jobs across the lifecycle.

**Fix:** Consider splitting TerminalState into event-specific handlers or documenting why the single-hook-many-events pattern is intentional.

## 4.2 Test Coverage Gap

Only 7 test files for 23 hooks + 47 skills + 14 agents + ~40 tools:
- AtomicWrite.test.ts
- BuildSettings.test.ts
- Integration.test.ts
- ModeClassifier.test.ts
- PayloadSchema.test.ts
- PostCompactRecovery.test.ts
- Upgrade.test.ts

No tests for: SecurityValidator, LoadContext, RatingCapture, SessionAutoName, RelationshipMemory, any skills, any agents, any PAI Tools.

**Fix:** Prioritize tests for security-critical hooks (SecurityValidator, AgentExecutionGuard) and the most-used Tools (algorithm.ts, Inference.ts, BuildCLAUDE.ts).

## 4.3 Agent Template Consistency

All 14 agents share an identical output format block (~25 lines). This is duplicated 14 times.

**Fix:** Extract the output format into a shared partial (e.g., `agents/partials/output-format.md`) and include it via the agent composition system.

## 4.4 Skills Category Inconsistency

Some categories are deeply nested (Security has Recon/Tools/, PromptInjection/Workflows/) while others are flat (USMetrics, ContentAnalysis). The Agents skill category doubles as both a skill AND the agent system docs.

**Fix:** Standardize nesting depth. Consider separating agent system docs from the Agents skill.

## 4.5 lib/migration/ Purpose Unclear

5 files (extractor.ts, index.ts, merger.ts, scanner.ts, validator.ts) totaling 48KB. Purpose: apparently for migrating between PAI versions.

**Fix:** Add a README.md explaining purpose, usage, and whether this is actively used.

## 4.6 USER/ Directory in Public Release

`PAI/USER/` contains template directories (PROJECTS, BUSINESS, TELOS, WORK, etc.) with placeholder README.md files. These are personal data directories that ship as templates.

**Fix:** Ensure all USER/ content is truly template-only (no personal data leaks). Consider a `.user-template/` pattern that gets copied on install.

## 4.7 Settings.json Has Both Static and Dynamic Sections

settings.json mixes:
- Static config (env, permissions, hooks) that should come from config/*.jsonc
- Dynamic runtime state (counts, feedbackSurveyState) written by hooks
- Generated content (spinner verbs/tips) from separate JSON files

**Fix:** Document the merge strategy clearly. Consider splitting the runtime state into a separate file (e.g., `state.json`) so settings.json stays clean.

## 4.8 extract-transcript.py is the Only Python File

`PAI/Tools/extract-transcript.py` is a Python script among ~40 TypeScript tools.

**Fix:** Port to TypeScript for consistency, or document why Python is needed here.

---

# PRIORITY 5 — REPO-LEVEL (Outside .claude/)

Improvements to the repo structure itself.

## 5.1 Top-Level Docs Are Stale

- `ARCHITECTURAL_REVIEW.md` (20KB) — from a prior review, needs updating
- `PAI-v4.1.0-plan.md` and `PAI-v4.1.0-summary.md` — specific to v4.1.0, historical
- `PLATFORM.md` and `SECURITY.md` — need freshness check

**Fix:** Update or archive stale docs. ARCHITECTURAL_REVIEW.md should reference this index.

## 5.2 .github/ Directory

Needs review for CI/CD relevance, especially if workflows reference features that no longer exist.

## 5.3 Tools/ at Repo Root

Contains `BackupRestore.ts`, `validate-protected.ts`, `README.md`, and a PNG. These are repo-level utilities separate from PAI Tools.

**Fix:** Clarify distinction from PAI/Tools/. Consider merging or renaming.

---

# SUMMARY — Action Priority Matrix

**Immediate (P1 — fix now):**
- [x] Remove 10 phantom hook registrations from settings.json
- [x] Reconcile config/hooks.jsonc with actual hook files
- [x] Remove VOICE/ from MEMORY/README.md

**Next session (P2 — fix soon):**
- [x] Update all version strings to 4.4.0
- [x] Remove 5 missing doc references from DOCUMENTATIONINDEX.md
- [x] Rewrite hooks/README.md to match reality
- [x] Fix documentation counts
- [x] Remove voice ref from config/README.md

**Planned work (P3 — reduce bloat):**
- [ ] Delete old releases (save ~316MB)
- [ ] Archive old Algorithm versions
- [ ] Consolidate Banner tools
- [ ] Remove duplicate runner/types files
- [ ] Clean up Transcribe artifacts

**Backlog (P4/P5 — design improvements):**
- [ ] Expand test coverage
- [ ] Extract shared agent output format
- [ ] Standardize skill category nesting
- [ ] Split settings.json static/dynamic sections
- [ ] Port extract-transcript.py to TypeScript
