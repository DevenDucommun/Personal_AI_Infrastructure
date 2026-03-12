# PAI v4.4.0 — Final Status

> Branch: `v4.4.0-dev` → merging to `main`
> Updated: 2026-03-12

---

## Completed (v4.4.0)

### P0 Bug Fixes
- [x] `payload-schema.ts` — `prompt` → `user_prompt` field name mismatch broke ModeClassifier, FormatReminder, TerminalState
- [x] StopOrchestrator — 3 broken imports (phantom handlers + wrong TranscriptParser path)
- [x] UpdateTabTitle — 2 broken imports (wrong Inference path, phantom PromptAnalysis)
- [x] IntegrityMaintenance — stale `_SYSTEM` path + added existence guard
- [x] PAI-Install config-gen — stale `skills/PAI/` paths
- [x] Inference.ts — `claude` binary not found in hook subprocess PATH (resolved via absolute path lookup)
- [x] DocIntegrity/StopOrchestrator dedup — removed DocIntegrity.hook.ts, StopOrchestrator owns DocCrossRefIntegrity

### Infrastructure
- [x] Synced 27 hook files from local to repo (12 new, 8 voice cleanup, 5 new libs, 2 fixes)
- [x] hooks.jsonc expanded — 42 registrations across 10 lifecycle events
- [x] Local settings.json regenerated from updated config
- [x] Branch cleanup — merged v4.4.0-dev + v4.4.1-dev, deleted stale branches
- [x] GitHubWriteGuard safeguard — requires AskUserQuestion response to generate approval token

### Version & Docs
- [x] CLAUDE.md version 4.3.0 → 4.4.0, template updated with effort tier routing
- [x] THEHOOKSYSTEM-Reference.md rewritten (1255 → 256 lines)
- [x] IMPROVEMENT-INDEX.md P0 items marked fixed
- [x] AUDIT-STATUS.md created with full tracking

---

## Deferred to v4.5.0

### Statusline Context Feature
Show project/domain context per tab so multiple PAI sessions are distinguishable.
- Investigate `statusline-command.sh` and Claude Code statusline API
- Detect `cwd` or project name, prepend to tab title

### Non-Hook Local Drift Audit
Diff `~/.claude/` against repo beyond hooks:
- Skills (48 locally vs 47 in repo)
- PAI Tools, agent definitions, algorithm versions, configs

### Documentation Consolidation
- Update THEHOOKSYSTEM-Reference.md (now 42 registrations, doc says 34)
- Merge AUDIT-STATUS.md + NEXT-STEPS.md + IMPROVEMENT-INDEX.md into single tracker

### Architecture Improvements
- Hook timeout guards — no protection against hung hooks
- Test coverage — 7 test files for 35+ hooks, 47 skills, 14 agents
- Memory TTL/archival — WISDOM, LEARNING, RELATIONSHIP grow unbounded
- Banner tool consolidation (7 files, 167KB)
- TerminalState deduplication (registered on 3+ events)
- ACTIONS runner v1→v2 migration
- Skill category nesting standardization

---

## Reference

| Commit | Description |
|--------|-------------|
| `be4aced` | fix: remove DocIntegrity.hook.ts — dedup DocCrossRefIntegrity on Stop |
| `eaf7bca` | fix: resolve claude binary PATH for hook subprocesses |
| `1a8e286` | fix: require user response in github-approve.ts |
| `5c71450` | merge: unify v4.4.0-dev + v4.4.1-dev into single branch |
| `5dcd1da` | chore: register 14 new hooks in hooks.jsonc config |
| `9eb3829` | fix: sync 27 hooks — payload-schema bug fix, voice cleanup, new hooks |
