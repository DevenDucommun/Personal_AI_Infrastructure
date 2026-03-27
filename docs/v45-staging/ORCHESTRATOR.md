# Multi-Agent Orchestration Harness for PAI

**Status:** Design complete, prototype ready for testing
**Version:** PAI 4.5.0 (staged)
**Extends:** Ralph Loop (`scripts/ralph-loop.ts`, `docs/RALPH-LOOP.md`)

---

## Overview

PAI has three tiers of multi-agent orchestration, from lightest to heaviest:

| Tier | Mechanism | When | Isolation | Context |
|------|-----------|------|-----------|---------|
| **Internal/Subagent** | Agent tool with `isolation: "worktree"` | Inside a session, Algorithm dispatches subagents | Git worktree per agent | Interactive — user is present |
| **Internal/Team** | TeamCreate + SendMessage | 3+ independent workstreams, Extended+ effort | Shared filesystem, message coordination | Interactive — persistent team |
| **External/Autonomous** | ralph-loop.ts `--parallel` | Unattended multi-PRD execution | Directory scoping per child | Autonomous — no user present |

This document covers the **External/Autonomous** tier. For Internal tiers, see:
- Agent Teams: Algorithm v0.4.9 § Agent Teams / Swarm + PRD
- Delegation patterns: `~/.claude/skills/Utilities/Delegation/SKILL.md`

## How It Works

Ralph Loop's single-agent mode invokes `claude -p` against one PRD in a loop. Parallel mode extends this:

```
ralph-loop.ts --parallel --max-agents 3 --groups "1-8,9-16,17-24"
  |
  ├── parsePRD(parentPath) → read all criteria
  ├── groupCriteria(criteria, groups) → split into N groups
  ├── createChildPRDs(parentDir, groups) → write child-1.md, child-2.md, child-3.md
  |
  ├── for each iteration (up to maxIterations):
  │   ├── spawn N parallel: Bun.spawn(['claude', '-p', ...]) per incomplete child
  │   ├── Promise.allSettled(children) → wait for all to finish
  │   ├── for each child:
  │   │   ├── parsePRD(childPath) → get child progress
  │   │   ├── detect stuck / errors (independent per child)
  │   │   └── log iteration (per-child JSONL entry)
  │   ├── aggregateToParent(parentPath, childResults)
  │   ├── check: all children complete? → done
  │   └── check: all children stuck/errored? → stop
  |
  └── cleanup + summary
```

## Child PRD Format

Each child PRD is a minimal PRD with a subset of the parent's criteria:

```yaml
---
task: "Child 1 of: [parent task]"
slug: child-1
effort: standard
phase: execute
progress: 0/8
mode: autonomous
started: [timestamp]
updated: [timestamp]
parent: [parent PRD path]
---

## Context

Autonomous child agent working on criteria subset from parent PRD.
Parent: [parent path]
Criteria assigned: ISC-1 through ISC-8

## Criteria

- [ ] ISC-1: [text from parent]
- [ ] ISC-2: [text from parent]
...

## Decisions

## Verification
```

Key differences from parent PRD:
- `mode: autonomous` (not `interactive`)
- `parent:` field links back to parent PRD path
- Only assigned criteria, not all criteria
- Anti-criteria (ISC-A) stay in parent, not distributed to children

## Criteria Grouping

Three modes:

### 1. Manual Groups (recommended)
```bash
--groups "1-8,9-16,17-24"
```
User specifies ISC number ranges. Best for tasks where the user knows which criteria are independent.

### 2. Round-Robin Split
```bash
--parallel --max-agents 3
# No --groups flag → auto round-robin
```
Criteria distributed evenly: ISC-1,4,7,10... to child 1; ISC-2,5,8,11... to child 2; etc. Simple, works when criteria are roughly independent.

### 3. Single-Group-Per-Child
```bash
--groups "1-5,6-10,11-15,16-20,21-25"
```
Each contiguous range becomes one child. Matches how PRDs are often structured (research criteria, design criteria, build criteria).

**Anti-criteria (ISC-A) are never distributed.** They stay in the parent and are checked by the orchestrator after all children complete.

## Isolation Strategy

**Default: No isolation.** Each child `claude -p` process runs in the same working directory. This is fine when children work on different criteria that don't edit overlapping files (the common case for research, design, and documentation tasks).

**Optional: Worktree isolation.** For tasks in git repos where children edit overlapping files:
```bash
--worktree  # Each child gets `claude -p --worktree child-{N}`
```

**Optional: Directory scoping.** For non-git directories:
```bash
--add-dir /path/to/child-workspace-{N}
```

## Progress Aggregation

The orchestrator reads child PRDs after each iteration round and updates the parent:

1. For each child PRD, count passed criteria
2. Map child criteria IDs back to parent criteria IDs (they share ISC-N numbering)
3. Mark corresponding parent criteria as `[x]` if child has them as `[x]`
4. Update parent frontmatter `progress: M/N`
5. If all non-anti-criteria pass → check anti-criteria → mark parent complete

**This is "parent-decides" merge:** children only update their own PRDs. The orchestrator is the sole writer of the parent PRD. No race conditions.

## Safety Mechanisms

All Ralph Loop safety mechanisms apply, plus parallel-specific ones:

### Per-Child (independent tracking)
- **Stuck detection:** 3 consecutive zero-delta iterations per child → that child stops, siblings continue
- **Circuit breaker:** 3 consecutive CLI errors per child → that child stops
- **Budget cap:** `totalBudget / maxAgents` per child

### Orchestrator-Level
- **Max iterations:** Applies to iteration rounds (each round = all active children run once)
- **Total budget:** Sum of all child budgets. If any child exhausts its budget, it stops.
- **All-stuck detection:** If every child is stuck or errored, stop the whole orchestrator
- **SIGINT handler:** On Ctrl+C or kill signal, terminate all child processes immediately
- **Orphan prevention:** Track all spawned PIDs; kill any that survive after the orchestrator exits

### Exit Codes (extending Ralph Loop)
| Code | Meaning |
|------|---------|
| 0 | All criteria passed — parent PRD complete |
| 1 | Max iterations reached |
| 2 | All children stuck |
| 3 | Budget exceeded |
| 4 | CLI error on all children |
| 5 | PRD parse error |
| 6 | Child PRD creation failed |
| 10 | User interrupt (SIGINT) |

## Context Seeding for Child Agents

Each child `claude -p` invocation gets a prompt tailored to its criteria subset:

```
You are an autonomous agent working on a subset of criteria from a parent PRD.

Child PRD path: {childPrdPath}
Parent PRD path: {parentPrdPath}
Your criteria: ISC-{start} through ISC-{end}
Progress: {passed}/{total} of YOUR criteria passed
Iteration: {iteration}/{maxIterations}

INSTRUCTIONS:
1. Read YOUR child PRD at the path above
2. You may also read the parent PRD for context, but do NOT modify it
3. Work on your assigned criteria only
4. Update YOUR child PRD: mark criteria [x], update progress and phase
5. If ALL your criteria pass, set your child PRD phase to "complete"
6. If a criterion requires human input, note it in ## Decisions and stop

Focus only on your assigned criteria. Other agents handle the rest.
```

## CLI Interface

```bash
# Single mode (unchanged)
bun run ralph-loop.ts <prd-path>

# Parallel mode
bun run ralph-loop.ts <prd-path> --parallel

# With options
bun run ralph-loop.ts <prd-path> \
  --parallel \
  --max-agents 3 \
  --groups "1-8,9-16,17-24" \
  --max-iterations 10 \
  --max-budget-usd 10.00 \
  --model sonnet \
  --notify \
  --verbose

# Dry run (shows child PRD plan without invoking)
bun run ralph-loop.ts <prd-path> --parallel --dry-run

# With worktree isolation (git repos only)
bun run ralph-loop.ts <prd-path> --parallel --worktree
```

## Log Format (extending Ralph Loop)

Same JSONL format with added fields for parallel tracking:

```jsonl
{"iteration":1,"agent":"child-1","prd":"children/child-1.md","passed_before":0,"passed_after":3,"delta":3,"duration_ms":45000,"exit_code":0,"stop_reason":null}
{"iteration":1,"agent":"child-2","prd":"children/child-2.md","passed_before":0,"passed_after":2,"delta":2,"duration_ms":38000,"exit_code":0,"stop_reason":null}
{"iteration":1,"agent":"parent","prd":"PRD.md","passed_before":0,"passed_after":5,"delta":5,"duration_ms":0,"exit_code":0,"stop_reason":null,"aggregated":true}
```

## Open Questions (for future sessions)

1. Should child agents be able to communicate with each other (via shared notes file)?
2. Should the orchestrator support heterogeneous models (e.g., child 1 uses opus, child 2 uses sonnet)?
3. How should file-level merge work when children in worktrees edit overlapping files?
4. Should there be a `--resume` mode that picks up from existing child PRDs?
5. Integration with `/loop` skill for periodic re-runs?
