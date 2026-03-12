# PAI v4.4.0 — Next Steps

> Tracking remaining work on the `v4.4.0-dev` branch.
> Updated: 2026-03-12

---

## Completed

- [x] **P0 Bug fix**: `payload-schema.ts` — `prompt` → `user_prompt` field name mismatch broke ModeClassifier, FormatReminder, TerminalState on every prompt
- [x] **P0 Bug fix**: StopOrchestrator phantom imports + wrong TranscriptParser path
- [x] **P0 Bug fix**: UpdateTabTitle broken imports (Inference path, phantom PromptAnalysis)
- [x] **P0 Bug fix**: IntegrityMaintenance stale `_SYSTEM` path
- [x] **P0 Bug fix**: PAI-Install config-gen stale `skills/PAI/` paths
- [x] **Sync 27 hook files** from local to repo (12 new hooks, 8 voice cleanup, 5 new libs, 2 bug fixes)
- [x] **hooks.jsonc config update** — 23 → 34 registered hooks, 10 lifecycle event types
- [x] All 27 files tested (12 hooks exit 0, 5 libs parse clean)
- [x] **CLAUDE.md version** corrected (4.3.0 → 4.4.0) + template updated with effort tier routing
- [x] **THEHOOKSYSTEM-Reference.md** rewritten (1255 stale lines → 256 accurate)
- [x] **IMPROVEMENT-INDEX.md** P0 items marked fixed
- [x] **Branch cleanup** — merged v4.4.0-dev + v4.4.1-dev into single `v4.4.0-dev`, deleted remote `v4.4.1-dev`, applied stashed version fixes, no data lost

---

## Up Next

### 1. Stop Event Deduplication (P0 Bug)
**Priority:** Critical
**Problem:** DocCrossRefIntegrity runs twice per Stop event — once from `DocIntegrity.hook.ts` and again from `StopOrchestrator.hook.ts`. Creates race conditions on shared state files.
**Fix:** Remove DocIntegrity.hook.ts from hooks.jsonc Stop registration (StopOrchestrator owns it), then delete the orphaned file.

### 2. Statusline Context Feature
**Priority:** High
**Goal:** Show the working project/domain context per tab so multiple PAI sessions are distinguishable at a glance.

**Problem:** With multiple Claude Code tabs open, you can't tell which tab is working on what project. Tab titles show the current action ("Fixing auth bug.") but not the domain ("release-notes" vs "PAI hooks").

**Approach TBD:**
- Detect `cwd` or project name from session
- Prepend to tab title: `release-notes | Fixing auth bug.`
- Or use Claude Code's statusline API for persistent context display
- Investigate `statusline-command.sh` and Claude Code statusline capabilities

### 3. Non-Hook Local Drift Audit
**Priority:** Medium
**Goal:** Diff local `~/.claude/` against repo for changes beyond hooks.

**Areas to check:**
- [ ] Skills (48 skills locally)
- [ ] PAI Tools (Inference, TranscriptParser, etc.)
- [ ] Agent definitions (`custom-agents/`, `Agents/`)
- [ ] Algorithm versions
- [ ] CLAUDE.md templates
- [ ] Config files beyond hooks.jsonc

### 4. Local Registration Gap
**Priority:** Low
**Goal:** Repo hooks.jsonc has 34 registrations but local `settings.json` was built from an older config. Until `BuildSettings.ts` regenerates, some hooks won't fire locally:
- [ ] `AutoWorkCreation.hook.ts` (not registered anywhere — even in repo hooks.jsonc)
- [ ] New registrations that haven't been installed locally
**Fix:** Run `bun ~/.claude/hooks/handlers/BuildSettings.ts`

### 5. Documentation Consolidation
**Priority:** Low
- [ ] Update THEHOOKSYSTEM-Reference.md (stale again — written with 23 hooks, now 34 registrations)
- [ ] Consolidate AUDIT-STATUS.md, NEXT-STEPS.md, and IMPROVEMENT-INDEX.md (3 overlapping trackers)

### 6. Architecture Improvements (Backlog)
- [ ] Hook deduplication — TerminalState registered on 3+ events
- [ ] Hook timeout guards — no protection against hung hooks
- [ ] Test coverage — 7 test files for 35 hooks + 47 skills
- [ ] Memory TTL/archival — WISDOM, LEARNING, RELATIONSHIP grow unbounded
- [ ] Banner tool consolidation (7 files, 167KB)

---

## Reference

| Commit | Description |
|--------|-------------|
| `5c71450` | merge: unify v4.4.0-dev + v4.4.1-dev into single branch |
| `08b9a80` | docs: update AUDIT-STATUS and IMPROVEMENT-INDEX |
| `5dcd1da` | chore: register 14 new hooks in hooks.jsonc config |
| `9eb3829` | fix: sync 27 hooks — payload-schema bug fix, voice cleanup, new hooks |
| Branch | `v4.4.0-dev` on `DevenDucommun/Personal_AI_Infrastructure` |
