# PAI v4.5.0 — Planning

> Branch: `v4.5.0-dev`
> Started: 2026-03-12
> Previous: v4.4.0 merged to main (`e2fa45b`)

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
**Priority:** Medium
- [ ] THEHOOKSYSTEM-Reference.md — update to 42 registrations (currently says 34)
- [ ] Merge AUDIT-STATUS.md + IMPROVEMENT-INDEX.md into single tracker
- [ ] Clean up `Releases/Architectural Planning and Understanding/` — some docs are now stale

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
- [ ] Banner tool consolidation (7 files, 167KB → single file with theme enum)
- [ ] Pipeline monitor UI — decide: separate repo, .gitignore, or keep

---

## Reference

| Item | Value |
|------|-------|
| Branch | `v4.5.0-dev` on `DevenDucommun/Personal_AI_Infrastructure` |
| Base | `main` at `e2fa45b` (v4.4.0 merged) |
| v4.4.0 branch | `v4.4.0-dev` — kept for reference, no longer active |
