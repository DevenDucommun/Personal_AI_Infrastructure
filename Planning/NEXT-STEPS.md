# PAI v4.5.0 — Planning

> Branch: `main` (v4.5.0-dev also active)
> Updated: 2026-03-24
> Previous: v4.4.1 merged to main, branch closed. Upstream synced (Packs system). Repo reorganized.

---

## v4.4.0 Carryover (deferred items)

### 1. Statusline Context Feature
**Priority:** High
**Goal:** Distinguish multiple PAI tabs by project/domain context.

**Problem:** Multiple Claude Code tabs are indistinguishable — titles show current action but not which project.

**Approach:**
- [ ] Investigate `statusline-command.sh` and Claude Code statusline API
- [ ] Detect `cwd` or project name from session
- [ ] Prepend domain to tab title: `release-notes | Fixing auth bug.`
- [ ] Or use statusline for persistent display separate from tab title

### 2. Non-Hook Local Drift Audit
**Priority:** High
**Goal:** Sync `~/.claude/` with repo beyond hooks (which are already synced).

**Areas:**
- [ ] Skills (48 locally vs 47 in repo — find the delta)
- [ ] PAI Tools (Inference.ts synced, check others)
- [ ] Agent definitions
- [ ] Algorithm versions
- [ ] Config files beyond hooks.jsonc

### 3. Documentation Consolidation
**Priority:** Medium — partially done
- [ ] THEHOOKSYSTEM-Reference.md — update to 42 registrations (currently says 34)
- [ ] Merge AUDIT-STATUS.md + IMPROVEMENT-INDEX.md into single tracker
- [x] ~~Clean up `Releases/Architectural Planning and Understanding/`~~ — moved to `Architecture/` top-level folder
- [x] Repo reorganized: `Architecture/` (9 docs), `Planning/` (roadmap + next-steps + 5 archived docs)
- [x] Removed root duplicates (IMPROVEMENT-INDEX, SYSTEM-ATLAS)
- [x] Removed stale voice image, release icon, rewrote Releases/README.md

---

## v4.5.0 New Work

### 4. Hook System Hardening
**Priority:** High
- [ ] Hook timeout guards — no protection against hung hooks blocking sessions
- [ ] Error reporting — surface hook errors more cleanly (currently silent or stderr-only)
- [ ] TerminalState deduplication — registered on 3+ events, evaluate if intentional or split

### 5. Test Coverage
**Priority:** Medium
- [ ] Security-critical hooks: SecurityValidator, GitHubWriteGuard, AgentExecutionGuard
- [ ] Core tools: Inference.ts, BuildCLAUDE.ts, BuildSettings.ts
- [ ] Algorithm state management: algorithm-state.ts, AlgorithmTracker
- [ ] Current: 7 test files — target: cover all hooks that can block or modify state

### 6. Memory System
**Priority:** Medium
- [ ] TTL/archival for WISDOM, LEARNING, RELATIONSHIP (grow unbounded)
- [ ] `pai memory stats` command — show sizes, entry counts, staleness
- [ ] SessionCleanup scope — currently only cleans STATE files >30 days

### 7. Config System Improvements
**Priority:** Low
- [ ] Split settings.json: static config vs runtime state (counters, timestamps)
- [ ] ACTIONS runner v1→v2 migration (both actively imported)
- [ ] Centralize version string to single source with dynamic injection

### 8. Skill System Cleanup
**Priority:** Low
- [ ] Standardize category nesting depth
- [ ] Separate agent system docs from Agents skill
- [x] ~~Banner tool consolidation~~ — 6 unused variants deleted (3,091 lines). Only Banner.ts remains.
- [ ] Pipeline monitor UI (148K) — decide: separate repo, .gitignore, or keep

### 9. Code Cleanup (ready to execute)
**Priority:** Low
- [ ] Root `Tools/` directory — 2 scripts + README + PNG, confusing with PAI/Tools/. Merge or rename.
- [x] Dead handlers removed — AlgorithmEnrichment.ts + RebuildSkill.ts (295 lines, orphaned after StopOrchestrator fix)
- [ ] Monolithic file decomposition — blueprints ready in `Architecture/ARCHITECTURE-REVIEW-v4.4.1.md §7a`:
  - algorithm.ts (1,515 lines → 5 modules)
  - pai.ts (808 lines → 4 modules)
  - DocCrossRefIntegrity.ts (882 lines → 3 modules)
  - IntegrityMaintenance.ts (922 lines → 3 modules)
- [ ] Investigate PAI Packs system for best use — 11 packs now in repo, evaluate integration with v4.4.0 skills

---

## Recently Completed (2026-03-24)

- Merged upstream `origin/main` — brought in PAI Packs (11 skill packs + ContextSearch)
- Ported Telos UpdateTelos.ts path fix to v4.4.0
- Merged fork/main parallel work (claude PATH fix, GitHubWriteGuard security fix, 14 new hooks)
- Closed `v4.4.1-dev` and `v4.4.0-dev` branches
- Reorganized repo: `Architecture/`, `Planning/`, `Planning/Archive/`
- Removed 3,528 lines of dead code (phantom handlers + unused banners)
- Rewrote Releases/README.md, deleted stale assets

## Reference

| Item | Value |
|------|-------|
| Primary branch | `main` on `DevenDucommun/Personal_AI_Infrastructure` |
| Dev branch | `v4.5.0-dev` (active) |
| Architecture docs | `Architecture/` (9 files) |
| Planning docs | `Planning/` (roadmap, next-steps, 5 archived) |
| Closed branches | v4.4.1-dev, v4.4.0-dev (merged to main, deleted) |
