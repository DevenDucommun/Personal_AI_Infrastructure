# Ralph Loop — Autonomous Execution Pattern for PAI

**Status:** Design complete, prototype ready for testing
**Version:** PAI 4.5.0 (staged)
**Author:** William the AI + Deven

---

## Overview

The Ralph Loop is an external process that repeatedly invokes `claude -p` against a PAI PRD until all ISC criteria pass. It transforms stateless CLI calls into stateful autonomous execution using the PRD as the persistence layer.

**Named after:** The voice name in PAI's early agent configurations; became the internal term for the autonomous re-invocation pattern referenced in Algorithm docs since v0.1.

## Prior Art

Research found 5 production implementations:

| Project | Stars | Pattern | Key Innovation |
|---------|-------|---------|----------------|
| [Ralph for Claude Code](https://github.com/frankbria/ralph-claude-code) | 7.8k | Dual-condition exit gate | Heuristic + explicit signal prevents premature termination |
| [Continuous Claude](https://github.com/AnandChowdhary/continuous-claude) | 1.3k | Git PR loop | Branch-per-iteration with CI gating |
| [Ralphy](https://github.com/michaelshimeles/ralphy) | 2.6k | Multi-engine PRD orchestrator | Engine-agnostic, parallel worktrees |
| [ARIS](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep) | 464 | Cross-model review | Claude executes, GPT reviews |
| [Auto Company](https://github.com/nicepkg/auto-company) | 119 | Perpetual loop | launchd-managed with consensus memory |

### Three Universal Patterns

Every successful implementation uses these three patterns:

1. **External Memory File** — A shared file Claude both reads and writes between invocations (Ralph: `fix_plan.md`, Continuous Claude: `SHARED_TASK_NOTES.md`, Auto Company: `consensus.md`). **PAI already has this: the PRD.**

2. **Dual Exit Detection** — Single-condition ("is it done?") fails because Claude uses completion-like language mid-task. Ralph's dual gate (heuristic NLP + explicit EXIT_SIGNAL) is the proven solution.

3. **Circuit Breakers** — 3-5 consecutive failures with no progress triggers a hard stop. Non-negotiable for production use.

## PAI Integration Design

### Why PAI Is Already 80% There

PAI's existing architecture provides:
- **PRD as external memory** — frontmatter has `phase`, `progress`, criteria checkboxes
- **Algorithm phases** — structured execution with defined entry/exit per phase
- **ISC criteria** — binary pass/fail checkboxes that define completion
- **CLAUDE.md** — loads at every session, providing Algorithm context automatically

### What's Missing (the 20%)

1. **Orchestrator script** — reads PRD, invokes `claude -p`, detects completion
2. **Safety mechanisms** — max iterations, stuck detection, budget caps
3. **Context seeding prompt** — the exact text that makes each invocation resume (not restart)
4. **Iteration logging** — track what happened across invocations

## Architecture

```
ralph-loop.ts (Bun)
    |
    ├── parsePRD(path) → { phase, progress, criteria[], totalCriteria, passedCriteria }
    |
    ├── buildPrompt(prdState) → string (context seed for claude -p)
    |
    ├── invoke(prompt, options) → { exitCode, output, sessionId }
    |
    ├── detectProgress(before, after) → { delta, stuck }
    |
    ├── shouldStop(state) → { stop: boolean, reason: string }
    |   ├── All criteria passed
    |   ├── Max iterations reached
    |   ├── Stuck detection triggered (3 consecutive no-progress)
    |   ├── Budget exceeded
    |   └── Claude CLI error (non-zero exit, 3 consecutive)
    |
    └── log(iteration, before, after, duration) → appends to log file
```

## Safety Mechanisms

### 1. Maximum Iteration Count

**Default: 10 iterations.** Configurable via `--max-iterations`.

Rationale: Most PAI tasks have 8-48 ISC criteria. If 10 full Algorithm runs can't complete them, either the task needs human input or something is fundamentally wrong.

### 2. Stuck Detection

**Threshold: 3 consecutive iterations with zero criteria delta.**

After each invocation, compare `passedCriteria` before and after. If delta = 0 for 3 consecutive iterations, stop and escalate.

### 3. Budget Cap

**Default: $5.00 per loop run.** Uses `--max-budget-usd` per invocation (default $1.00 each).

Total budget = per-invocation budget * max iterations. The outer loop also tracks cumulative spend if `--output-format json` returns cost data.

### 4. CLI Error Circuit Breaker

**3 consecutive non-zero exit codes from `claude -p` → hard stop.**

Handles: API outages, auth failures, rate limits. No point retrying if Claude itself is broken.

### 5. Human Escalation

When the loop stops for any non-completion reason, it:
1. Writes the stop reason to the PRD's `## Decisions` section
2. Writes a summary to the log file
3. Exits with a descriptive exit code
4. Optionally sends a macOS notification (`osascript -e 'display notification'`)

## Context Seeding Strategy

The prompt template for each `claude -p` invocation:

```
You are resuming autonomous work on an existing PAI PRD.

PRD path: {prdPath}
Current phase: {phase}
Progress: {passed}/{total} criteria passed
Iteration: {iteration}/{maxIterations}

INSTRUCTIONS:
1. Read the PRD at the path above
2. Read your CLAUDE.md (it loads automatically) for Algorithm instructions
3. Resume from the current phase — do NOT restart from OBSERVE
4. Work on the next failing criterion (marked with `- [ ]`)
5. After completing work, update the PRD: mark criteria `- [x]`, update progress and phase
6. If ALL criteria pass, set phase to "complete" in the PRD frontmatter
7. If you encounter a criterion that requires human input, add a note to ## Decisions explaining why, and stop

Focus on making measurable progress. Every criterion you complete is progress.
```

### Fresh `-p` vs `--continue`

**Decision: Fresh `-p` per iteration.** Rationale:
- `--continue` grows context window unboundedly across iterations
- Fresh `-p` starts clean but CLAUDE.md + PRD provide full context
- PAI's Algorithm is designed for PRD-as-memory — fresh invocations are the intended pattern
- Cost is more predictable per iteration

## PRD Parsing

Parse YAML frontmatter + criteria checkboxes:

```typescript
// Frontmatter: everything between first and second `---`
const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1]
const phase = frontmatter.match(/^phase:\s*(.+)$/m)?.[1]?.trim()
const progress = frontmatter.match(/^progress:\s*(\d+)\/(\d+)$/m)

// Criteria: lines matching `- [ ] ISC-` or `- [x] ISC-`
const criteria = content.matchAll(/^- \[([ x])\] (ISC-\w+): (.+)$/gm)
const passed = [...criteria].filter(m => m[1] === 'x').length
const total = [...criteria].length
```

This is validated against the real PRD format in `~/.claude/PAI/PRDFORMAT.md`.

## Log Format

JSONL file at `{prdDir}/ralph-loop.log`:

```jsonl
{"iteration":1,"timestamp":"2026-03-13T14:30:00-08:00","phase_before":"execute","phase_after":"execute","passed_before":5,"passed_after":8,"delta":3,"duration_ms":45000,"exit_code":0,"stop_reason":null}
{"iteration":2,"timestamp":"2026-03-13T14:31:15-08:00","phase_before":"execute","phase_after":"verify","passed_before":8,"passed_after":12,"delta":4,"duration_ms":38000,"exit_code":0,"stop_reason":null}
{"iteration":3,"timestamp":"2026-03-13T14:32:30-08:00","phase_before":"verify","phase_after":"complete","passed_before":12,"passed_after":16,"delta":4,"duration_ms":42000,"exit_code":0,"stop_reason":"all_criteria_passed"}
```

## Integration with Algorithm v3.9.0

The Ralph Loop wraps around the Algorithm — it doesn't replace it:

```
Ralph Loop (outer)
  └── claude -p (invocation 1)
       └── Algorithm OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
  └── claude -p (invocation 2)
       └── Algorithm resumes from PRD phase → continues execution
  └── claude -p (invocation N)
       └── Algorithm completes → PRD phase: complete
```

Each invocation runs the full Algorithm or picks up from whatever phase the PRD indicates. The Algorithm's PRD writes are the state updates the Ralph Loop reads.

## CLI Interface

```bash
# Basic usage
bun run ralph-loop.ts <prd-path>

# With options
bun run ralph-loop.ts <prd-path> \
  --max-iterations 10 \
  --max-budget-usd 5.00 \
  --stuck-threshold 3 \
  --model opus \
  --permission-mode auto \
  --notify \
  --verbose

# Dry run (parse PRD, show plan, don't invoke)
bun run ralph-loop.ts <prd-path> --dry-run
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All criteria passed — PRD complete |
| 1 | Max iterations reached |
| 2 | Stuck detection triggered |
| 3 | Budget exceeded |
| 4 | CLI error circuit breaker |
| 5 | PRD parse error |
| 10 | User interrupt (SIGINT) |

## Open Questions (for next session)

1. Should the loop use `--worktree` for filesystem isolation?
2. Should there be a `--review` mode where each iteration pauses for human approval?
3. How does this interact with PAI's hook system (FormatReminder, etc.)?
4. Should the log include the full Claude output or just the PRD diff?
5. Integration with the `/loop` skill — should Ralph Loop be invocable as a skill?
