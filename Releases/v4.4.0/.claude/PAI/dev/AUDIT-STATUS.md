# PAI v4.4.0 Audit — Status & Next Steps

> Branch: `v4.4.1-dev` | Last updated: 2026-03-12

## Completed

### P0 Bug Fixes (committed `c9cf407`)
- **StopOrchestrator.hook.ts** — Fixed 3 broken imports (phantom `RebuildSkill`, `AlgorithmEnrichment`, wrong `TranscriptParser` path)
- **UpdateTabTitle.hook.ts** — Fixed 2 broken imports (wrong `Inference` path, phantom `PromptAnalysis.hook` import)
- **AlgorithmTracker.hook.ts** — Created missing `lib/algorithm-state.ts` shared module
- **hooks.jsonc** — Registered 3 orphaned hooks:
  - `UpdateTabTitle` on UserPromptSubmit
  - `AlgorithmTracker` on PostToolUse (4 matchers: Bash, TaskCreate, TaskUpdate, Task)
  - `StopOrchestrator` replacing `DocIntegrity` on Stop event
- **IntegrityMaintenance.ts** — Fixed stale `_SYSTEM` path, added existence guard
- **PAI-Install/engine/config-gen.ts** — Fixed stale `skills/PAI/` installer paths

### Version & Template Fixes
- **CLAUDE.md** — Version corrected from 4.3.0 → 4.4.0
- **CLAUDE.md.template** — Updated to match current structure (effort tier table, Micro/Standard+ routing, `{{ALGO_PATH}}` variable)
- **config/preferences.jsonc** — Version corrected from 4.3.1 → 4.4.0

### Documentation (committed `50f1a18`)
- **THEHOOKSYSTEM-Reference.md** — Complete rewrite (1255 stale lines → 256 accurate lines). Covers all 23 hook files, 6 handlers, 18 lib modules, 7 lifecycle events, build pipelines, state files.

---

## Next Steps

### P1 — Orphaned Hook Registration

1. **Register `GitHubWriteGuard.hook.ts`** on PreToolUse/Bash
   - Real security hook that blocks GitHub-mutating commands (push, pr create/merge, etc.)
   - Uses approval token mechanism in `MEMORY/STATE/github-approvals/`
   - Deven has owner access across personal + Linksys org repos — this matters

2. **Register `ConfigChange.hook.ts`** on ConfigChange event
   - Guards against mid-session security hook disabling
   - Logs all config changes to `MEMORY/STATE/config-changes.jsonl`

### P2 — Cleanup Orphaned Files

3. **Delete `DocIntegrity.hook.ts`**
   - Superseded by StopOrchestrator which calls DocCrossRefIntegrity handler directly

4. **Audit 12 untracked hook files** — determine keep vs delete:
   | File | Notes |
   |------|-------|
   | `AutoWorkCreation.hook.ts` | Unknown purpose |
   | `CheckVersion.hook.ts` | Unknown purpose |
   | `FormatReminder.hook.ts` | Unknown purpose |
   | `PreCompact.hook.ts` | Unknown purpose |
   | `PromptAnalysis.hook.ts` | Was imported by UpdateTabTitle — now removed |
   | `SessionSummary.hook.ts` | Unknown purpose |
   | `SetQuestionTab.hook.ts` | Phantom name from old reference doc |
   | `StartupGreeting.hook.ts` | Unknown purpose |
   | `TaskCompleted.hook.ts` | Unknown purpose |
   | `TeammateIdle.hook.ts` | Unknown purpose |
   | `WorktreeRemove.hook.ts` | Unknown purpose |
   | `WorktreeSetup.hook.ts` | Unknown purpose |

5. **Audit 3 untracked handler/lib files:**
   - `handlers/AlgorithmEnrichment.ts` — Was phantom-imported by StopOrchestrator (removed)
   - `handlers/RebuildSkill.ts` — Was phantom-imported by StopOrchestrator (removed)
   - `lib/metadata-extraction.ts` — Unknown purpose

### P3 — Documentation Consolidation

6. **Merge `ARCHITECTURAL-UNDERSTANDING.md`** into `ARCHITECTURE-REVIEW-v4.4.1.md`
   - Significant overlap between the two docs
   - ARCHITECTURE-REVIEW is the stronger document

7. **Update `IMPROVEMENT-INDEX.md`** — Mark resolved items from this audit

### P4 — Architecture Improvements (from ARCHITECTURE-REVIEW)

8. **Evaluate hook deduplication** — TerminalState registered 3 times across events
9. **Consider hook timeout guards** — No current protection against hung hooks
10. **Review SecurityValidator coverage** — Registered on Read but unclear what it validates there
