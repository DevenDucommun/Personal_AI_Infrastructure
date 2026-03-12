# PAI v4.4.1 — Next Steps

> Tracking remaining work for the v4.4.1-dev branch.
> Updated: 2026-03-12

---

## Completed

- [x] **P0 Bug fix**: `payload-schema.ts` — `prompt` → `user_prompt` field name mismatch broke ModeClassifier, FormatReminder, TerminalState on every prompt
- [x] **Sync 27 hook files** from local to repo (12 new hooks, 8 voice cleanup, 5 new libs, 2 bug fixes)
- [x] **hooks.jsonc config update** — 23 → 34 registered hooks, 5 new lifecycle event types
- [x] All 27 files tested (12 hooks exit 0, 5 libs parse clean)

---

## Up Next

### 1. Statusline Context Feature
**Priority:** High
**Goal:** Show the working project/domain context per tab so multiple PAI sessions are distinguishable at a glance.

**Problem:** With multiple Claude Code tabs open, you can't tell which tab is working on what project. Tab titles show the current action ("Fixing auth bug.") but not the domain ("release-notes" vs "PAI hooks").

**Approach TBD:**
- Detect `cwd` or project name from session
- Prepend to tab title: `release-notes | Fixing auth bug.`
- Or use Claude Code's statusline API for persistent context display
- Investigate `statusline-command.sh` and Claude Code statusline capabilities

### 2. Non-Hook Local Drift Audit
**Priority:** Medium
**Goal:** Diff local `~/.claude/` against repo for changes beyond hooks.

**Areas to check:**
- [ ] Skills (48 skills locally)
- [ ] PAI Tools (Inference, TranscriptParser, etc.)
- [ ] Agent definitions (`custom-agents/`, `Agents/`)
- [ ] Algorithm versions
- [ ] CLAUDE.md templates
- [ ] Config files beyond hooks.jsonc

### 3. Local Registration Gap
**Priority:** Low
**Goal:** Two hooks shipped in repo but aren't registered in local `settings.json`:
- [ ] `AutoWorkCreation.hook.ts` (UserPromptSubmit)
- [ ] `SessionSummary.hook.ts` (SessionEnd)
- [ ] `AlgorithmTracker.hook.ts` (Stop — in repo config, not in local settings)
- [ ] `StopOrchestrator.hook.ts` (Stop — in repo config, not in local settings)

These run in the repo config but not on Deven's machine until `BuildSettings.ts` regenerates from hooks.jsonc.

---

## Reference

| Commit | Description |
|--------|-------------|
| `9eb3829` | fix: sync 27 hooks — payload-schema bug fix, voice cleanup, new hooks |
| `5dcd1da` | chore: register 14 new hooks in hooks.jsonc config |
| Branch | `v4.4.1-dev` on `DevenDucommun/Personal_AI_Infrastructure` |
