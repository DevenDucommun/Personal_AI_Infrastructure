# PAI Autonomous Improvements Roadmap

**Status:** Design complete
**Version:** PAI 4.5.0 (staged)
**PRD:** `MEMORY/WORK/20260324-100000_pai-autonomous-improvements-roadmap/PRD.md`

---

## Executive Summary

PAI 4.4.0 has substantial infrastructure (50 skills, 35 hooks, 18 agents, Memory v7.0, Algorithm v3.9.0). PAI 4.5.0 adds Ralph Loop and Orchestrator prototypes. The next wave of improvements focuses on **using this infrastructure autonomously** rather than building more of it.

**Priority order** (from FirstPrinciples challenge):
1. Deploy Ralph Loop — highest leverage, everything else depends on it
2. Session handoff protocol — the real memory gap
3. Research index — stop re-researching known topics
4. Lightweight visual board — visibility into active work
5. Docker isolation — design-only, defer implementation
6. Multi-AI execution — design-only, blocked on external AI CLI tools

---

## Workstream 1: Deploy & Auto-Trigger

### What Exists
- `scripts/ralph-loop.ts` — 733-line prototype with single + parallel modes
- `docs/RALPH-LOOP.md` — design doc with CLI interface, safety mechanisms
- `docs/ORCHESTRATOR.md` — parallel orchestration design
- Algorithm v3.9.0 — PRD-based execution with ISC criteria

### What's Missing
- Ralph Loop isn't deployed to live PAI (still in dev workspace)
- No hook to auto-trigger Ralph Loop when a PRD is created
- No integration point where the Algorithm can hand off to Ralph Loop

### Design: Deployment Checklist

To deploy Ralph Loop to live PAI:

1. **Copy script:** `scripts/ralph-loop.ts` → `~/.claude/scripts/ralph-loop.ts`
2. **Verify Bun:** Ralph Loop requires `bun` runtime (already installed on Deven's machine)
3. **Test manually:** `bun run ~/.claude/scripts/ralph-loop.ts <prd-path> --dry-run`
4. **Add to PATH or alias:** `alias ralph='bun run ~/.claude/scripts/ralph-loop.ts'`
5. **Test with real PRD:** Run against a simple Standard-effort PRD first
6. **Document in Algorithm:** Add "Ralph Loop handoff" as an option in Algorithm v3.9.0's EXECUTE phase

### Design: Auto-Trigger Hook

```typescript
// hooks/RalphLoopTrigger.hook.ts
// Event: PostToolUse (on Write/Edit of PRD.md)
// Condition: PRD frontmatter has `mode: autonomous`
// Action: Suggest ralph-loop invocation command (don't auto-run — safety)

// The hook reads the PRD, checks for mode: autonomous,
// and outputs a suggested command:
//   bun run ~/.claude/scripts/ralph-loop.ts <prd-path> --max-iterations 5
//
// Auto-execution is gated behind a flag:
//   RALPH_AUTO_TRIGGER=1 in settings.json
// Default: off (suggest only)
```

**Why suggest-only by default:** Ralph Loop burns API budget. Auto-triggering without user awareness could be expensive. The hook surfaces the command; the user decides to run it.

### Design: Algorithm Integration

Add to Algorithm v3.9.0 EXECUTE phase:

```markdown
### Ralph Loop Handoff (Optional)

If the PRD has `mode: autonomous` AND the user is not present (e.g., background execution):
1. Set PRD `phase: execute`
2. Exit the current session
3. Ralph Loop picks up: `bun run ralph-loop.ts <prd-path>`
4. Ralph Loop invokes `claude -p` repeatedly until criteria pass
5. On completion, PRD has `phase: complete` with all ISC checked

This is for unattended execution. Interactive sessions continue using the normal Algorithm flow.
```

### Design: Orchestrator Deployment Prerequisites

Before deploying parallel mode:
1. Single-mode Ralph Loop must complete 3+ successful autonomous PRD executions
2. Budget caps verified: default $5 total confirmed reasonable
3. Stuck detection verified: 3-iteration zero-delta stop actually triggers
4. SIGINT cleanup verified: all child processes actually die on interrupt

---

## Workstream 2: Agent Intelligence

### What Exists
- `MEMORY/RESEARCH/` — archived research outputs by date
- 5 researcher agents (Claude, Gemini, Grok, Perplexity, Codex)
- Research skill with mode routing (quick/standard/extensive/deep)
- Delegation system with model selection matrix
- ComposeAgent for dynamic agent creation with trait composition

### What's Missing
- No index of what research exists — agents can't discover prior work
- Agent context seeding doesn't include references to relevant prior research
- No standardized output format across different agent types
- Smart delegation rules are documented but not enforced programmatically

### Design: Research Index Schema

```json
// MEMORY/RESEARCH/index.json
{
  "version": 1,
  "updated": "2026-03-24T10:00:00-07:00",
  "entries": [
    {
      "id": "2026-03-15_ralph-loop-implementations",
      "date": "2026-03-15",
      "topic": "Ralph Loop autonomous execution patterns",
      "keywords": ["ralph loop", "autonomous", "claude -p", "agent loop", "PRD execution"],
      "path": "MEMORY/RESEARCH/2026-03/2026-03-15_ralph-loop-implementations.md",
      "agents_used": ["PerplexityResearcher"],
      "mode": "quick",
      "summary": "5 external implementations of autonomous Claude Code execution loops"
    }
  ]
}
```

**Maintenance:** A `PostToolUse` hook on Write to `MEMORY/RESEARCH/` auto-appends to `index.json`. Or a periodic script scans the directory and rebuilds the index.

### Design: Agent Context Seeding with Prior Research

When spawning any agent, the delegation system should:

1. Extract keywords from the agent's task description
2. Search `MEMORY/RESEARCH/index.json` for matching entries
3. Include top 3 matches in the agent's prompt:

```
## Prior Research Available
The following research has already been completed. Read these files for context before starting new research:
- 2026-03-15: Ralph Loop implementations → MEMORY/RESEARCH/2026-03/...
- 2026-03-10: Token efficiency patterns → MEMORY/RESEARCH/2026-03/...

Do NOT re-research topics already covered. Build on existing findings.
```

### Design: Smart Delegation Rules

Formalize the Delegation system's model selection as a lookup function:

```typescript
function selectAgentConfig(task: string): { type: string; model: string } {
  // Pattern matching on task description
  if (task.match(/research|investigate|find|look up/i)) return { type: "ClaudeResearcher", model: "sonnet" };
  if (task.match(/implement|code|build|write.*function/i)) return { type: "Engineer", model: "sonnet" };
  if (task.match(/design|architect|system|infrastructure/i)) return { type: "Architect", model: "opus" };
  if (task.match(/review|check|verify|validate/i)) return { type: "QATester", model: "haiku" };
  if (task.match(/security|pentest|vulnerability/i)) return { type: "Pentester", model: "sonnet" };
  return { type: "general-purpose", model: "sonnet" }; // default
}
```

### Design: Standardized Agent Output Format

All agent outputs should follow:

```markdown
## Agent Output: [Agent Name] ([Agent Type])
**Task:** [What was requested]
**Duration:** [Time taken]
**Model:** [Model used]

### Findings
[Main output]

### Files Modified
- [path]: [what changed]

### Decisions Made
- [Decision]: [Rationale]

### Open Questions
- [Anything that needs human input]
```

This format is parseable by the orchestrator for progress aggregation.

---

## Workstream 3: Visual Board

### What Exists
- `MEMORY/STATE/work.json` — work registry with all PRD metadata
- `MEMORY/WORK/{slug}/PRD.md` — individual PRDs with ISC criteria, phases
- `TaskCreate/TaskList` — CLI-only task management
- `PRDSync.hook.ts` — keeps work.json in sync with PRD changes

### What's Missing
- No visual representation of active work
- No at-a-glance view of what's in progress, blocked, or complete
- No way to see all PRDs and their ISC progress simultaneously

### Design: Tech Stack Decision

**Selected: Single-file HTML + tiny Bun server**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Nullboard-style single HTML | Zero deps, instant | No live filesystem access | Need server wrapper |
| Tasks.md (SolidJS+Koa+Docker) | Native markdown dirs | Way too heavy | Reject |
| Taskell (Haskell TUI) | Terminal-native | Haskell dep, own format | Reject |
| Vibe-kanban (Rust+PG) | Agent workspaces | Massively over-engineered for 1 user | Reject |
| **Bun serve + HTML** | **One script, reads work.json/PRDs directly, hot reload** | **Requires Bun (already installed)** | **Selected** |

**Rationale:** Bun can serve static files AND provide a JSON API in <50 lines. The HTML/JS frontend reads the API and renders a kanban board. Total: one `.ts` file + one `.html` file. No build step, no framework, no database.

### Design: Board Architecture

```
scripts/board.ts (Bun.serve)
  ├── GET /                → serves board.html
  ├── GET /api/work        → reads work.json, returns JSON
  ├── GET /api/prd/:slug   → reads specific PRD.md, returns parsed JSON
  └── watches work.json    → SSE stream for live updates

board.html (single file, no framework)
  ├── Fetches /api/work on load
  ├── Renders kanban columns: Observe | Think | Plan | Build | Execute | Verify | Complete
  ├── Each card = one PRD with: title, progress bar, effort level, last updated
  ├── Click card → expand to show ISC criteria checkboxes
  └── SSE listener → auto-refresh on work.json changes
```

### Design: Column Mapping

| Column | PRD Phase | Card Color |
|--------|-----------|------------|
| Backlog | `observe` (not started) | Gray |
| In Progress | `think`, `plan`, `build`, `execute` | Blue |
| Review | `verify` | Yellow |
| Done | `complete` | Green |
| Stuck | `progress` unchanged for 3+ iterations | Red |

### Design: Card Detail

Each card shows:
- **Title:** PRD `task` field (8 words)
- **Progress:** `progress` field as bar (e.g., 14/24 = 58%)
- **Effort:** Badge (Standard/Extended/Advanced/Deep)
- **Updated:** Relative time ("2h ago")
- **Expand:** Full ISC criteria list with checkboxes (read-only)

### Design: Auto-Refresh

The Bun server watches `work.json` using `fs.watch()`. On change, it pushes an SSE event to all connected browsers. The HTML client receives the event and re-fetches `/api/work`. No polling, no WebSocket complexity.

---

## Workstream 4: Container Isolation

### What Exists
- Worktree isolation (`EnterWorktree`/`ExitWorktree`) — git repos only
- `WorktreeSetup.hook.ts` / `WorktreeRemove.hook.ts` — lifecycle management
- `--worktree` flag in Ralph Loop prototype
- Directory scoping via `--add-dir` in `claude -p`

### What's Missing (and Why It Mostly Doesn't Matter)

**FirstPrinciples verdict:** Docker isolation solves a problem that rarely occurs in PAI's workload. 90%+ of PAI tasks are research, design, and documentation — they don't modify system files or run untrusted code.

### Design: When Docker IS Needed

Docker isolation is appropriate when:
1. **Running untrusted code** — e.g., executing code from a GitHub repo during security research
2. **Web app prototyping** — e.g., building a board.ts that serves HTTP (should run in container for port isolation)
3. **Destructive operations** — e.g., testing file deletion, system config changes
4. **Multi-agent file conflicts** — when parallel agents edit overlapping files in non-git directories

### Design: Docker Agent Sandbox (Deferred)

```yaml
# docker-compose.yml for PAI agent sandbox
services:
  agent:
    image: oven/bun:latest  # Bun runtime for TypeScript
    volumes:
      - ${WORK_DIR}:/workspace  # Mount work directory
      - ${HOME}/.claude/scripts:/scripts:ro  # Read-only access to scripts
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    working_dir: /workspace
    command: bun run /scripts/ralph-loop.ts /workspace/PRD.md
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
    network_mode: none  # No network access by default
```

**Key decisions:**
- Network disabled by default (agents shouldn't call external APIs directly — they use `claude -p` which has its own API access)
- Work directory mounted as read-write, scripts as read-only
- Memory and CPU limited to prevent runaway agents
- Uses `oven/bun` image since PAI's scripts are TypeScript/Bun

### Design: Fallback Hierarchy

```
1. Docker available? → Use container sandbox
2. Git repo? → Use worktree isolation
3. Neither? → Use directory scoping (--add-dir with temp directory)
4. Simple research task? → No isolation needed (default)
```

### Design: Cost/Performance Comparison

| Method | Startup | Isolation | Cleanup | Best For |
|--------|---------|-----------|---------|----------|
| Docker | 2-10s | Full (filesystem, network, process) | Container rm | Untrusted code, destructive ops |
| Worktree | <1s | Filesystem (git-tracked only) | Branch delete | Git repos with parallel edits |
| Directory | <1s | Filesystem (scoped path) | rm -rf temp dir | Non-git parallel work |
| None | 0s | None | N/A | Research, design, single-agent |

---

## Workstream 5: Memory & Context

### What Exists
- Memory v7.0 with WORK/, LEARNING/, STATE/, RESEARCH/ directories
- `current-work.json` — active task pointer
- `work.json` — registry of all work items
- PRD.md — persistent project state with ISC criteria, decisions, verification
- Algorithm reflections in `algorithm-reflections.jsonl`
- 200-line `MEMORY.md` in claude projects directory (auto-loaded)
- Claude Code's `--resume` flag for session continuation
- `PRDSync.hook.ts` — keeps work.json in sync
- `LoadContext.hook.ts` — injects session context at startup

### What's Missing
- No structured handoff protocol between sessions
- Context compaction is lossy — key decisions and ISC state can be lost
- `MEMORY.md` is limited to 200 lines (truncated after)
- No checkpoint mechanism to recover compacted content
- Cross-session project state requires manual context recovery

### Design: Session Handoff Protocol

When a session ends (or is about to be compacted), the AI writes a structured continuation state to the PRD:

```markdown
## Continuation State

### Session Summary
- **Session:** 2026-03-24 10:00-11:30
- **Phase completed:** BUILD (4/7)
- **ISC progress:** 14/24 passed

### What Was Done
- [Concrete list of completed work with file paths]

### What's In Progress
- [Specific task that was interrupted, with exact state]

### Key Decisions Made
- [Decision]: [Rationale] — affects ISC-X, ISC-Y

### Open Questions
- [Question that needs human input]
- [Question that needs research]

### Next Actions
1. [Exactly what the next session should do first]
2. [Then what]
3. [Then what]

### Files Modified
- [path]: [what changed, why]
```

**This goes in the PRD's `## Decisions` section**, not a separate file. The PRD is already the system of record — continuation state belongs there.

**Hook integration:** `WorkCompletionLearning.hook.ts` already fires on SessionEnd. Extend it to prompt the AI to write continuation state before exit. Or: the Algorithm's LEARN phase (7/7) already runs at session end — add continuation state as a mandatory step.

### Design: Smart Compaction

Claude Code's context compaction is internal and can't be overridden. But we can mitigate its effects:

1. **Pre-compaction checkpoint:** When the Algorithm detects context is >60% full (already in v3.9.0), write a checkpoint to the PRD before compaction occurs:
   ```markdown
   ### Context Checkpoint (2026-03-24 10:45)
   ISC: 14/24 passed (ISC-1 through ISC-14)
   Phase: BUILD
   Key files: docs/ROADMAP.md (created), scripts/board.ts (in progress)
   Next: Complete board.ts API endpoints, then ISC-15
   ```

2. **Post-compaction recovery:** When a session resumes after compaction, the first action is:
   ```
   Read PRD.md → check ## Continuation State or ## Context Checkpoint
   → Resume from documented state instead of re-exploring
   ```

3. **Critical state in frontmatter:** The PRD frontmatter already has `phase` and `progress`. Add `last_checkpoint` timestamp so recovery knows when state was last persisted.

### Design: Extended Cross-Session Memory

The 200-line MEMORY.md limit is a Claude Code constraint. Work around it:

1. **MEMORY.md as index, not storage:** Keep MEMORY.md as a table of contents pointing to topic-specific files:
   ```markdown
   # Project Memory
   ## Active Projects
   - [PAI 4.5.0](memory/pai-450.md) — autonomous improvements roadmap
   - [Release Calendar](memory/release-calendar.md) — Linksys release tracking
   ## Patterns
   - [Debugging](memory/debugging.md) — recurring fix patterns
   ```

2. **Topic files loaded on demand:** The AI reads topic files only when relevant to the current task. This stays within the 200-line limit while providing unlimited depth.

3. **Auto-pruning:** A periodic script checks MEMORY.md line count and moves stale entries to topic files if approaching 200 lines.

---

## Workstream 6: Multi-AI Orchestration

### What Exists
- 5 researcher agents: ClaudeResearcher, GeminiResearcher, GrokResearcher, PerplexityResearcher, CodexResearcher
- Research skill routing: quick (1 agent), standard (3 agents), extensive (12 agents)
- Model selection matrix in Delegation system (opus/sonnet/haiku)
- Agent Teams (TeamCreate/SendMessage) for persistent coordination
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` enabled

### What's Missing
- No multi-model orchestration for execution tasks (build, test, review)
- No cost-aware model selection integrated with budget caps
- External AI (Gemini, GPT) can't do autonomous file editing — research only

### Design: Multi-Model Execution Matrix

| Task Type | Primary Model | Fallback | Why |
|-----------|--------------|----------|-----|
| Deep architecture design | Opus | Sonnet | Maximum reasoning needed |
| Standard implementation | Sonnet | Haiku | Good balance of speed + capability |
| Code review / spot check | Haiku | Sonnet | Fast verification, sufficient intelligence |
| Research / information gathering | Sonnet | Haiku | Broad knowledge, moderate speed |
| Security analysis | Opus | Sonnet | Adversarial reasoning needs depth |
| Documentation writing | Sonnet | Haiku | Structured output, moderate complexity |
| Simple file operations | Haiku | — | Fastest, cheapest, sufficient |

### Design: Cost-Aware Model Selection

Integrate with Ralph Loop's budget cap system:

```typescript
function selectModel(task: string, remainingBudget: number, totalBudget: number): string {
  const budgetRatio = remainingBudget / totalBudget;

  // If >50% budget remaining, use optimal model
  if (budgetRatio > 0.5) return optimalModelForTask(task);

  // If 20-50% budget remaining, downgrade one tier
  if (budgetRatio > 0.2) return downgradeModel(optimalModelForTask(task));

  // If <20% budget remaining, use haiku for everything
  return "haiku";
}

function downgradeModel(model: string): string {
  if (model === "opus") return "sonnet";
  if (model === "sonnet") return "haiku";
  return "haiku";
}
```

This prevents budget exhaustion on early criteria while leaving nothing for later ones.

### Design: External AI Integration (Future)

**Current state:** External AI (Gemini, Grok, GPT) can only be used for research via API calls. They cannot:
- Edit local files
- Run CLI commands
- Execute autonomously in a loop

**When this changes:** If Google ships a Gemini CLI equivalent to `claude -p`, or OpenAI ships a GPT CLI with file access, then:
1. Ralph Loop's `invokeClaudeP()` becomes `invokeAI(model, prompt)` with a model parameter
2. Different children in parallel mode can use different AI backends
3. The orchestrator becomes model-agnostic

**For now:** Multi-AI is research-only (already working via 5 researcher agents). Execution remains Claude-only.

---

## Implementation Priority

| Priority | Workstream | Effort | Blocked By | Value |
|----------|-----------|--------|------------|-------|
| P0 | Deploy Ralph Loop (WS1) | Low — copy + test | Nothing | Unlocks autonomous execution |
| P1 | Session handoff (WS5) | Medium — hook + PRD format | Nothing | Fixes #1 user pain point |
| P1 | Research index (WS2) | Low — JSON index + hook | Nothing | Prevents wasted agent work |
| P2 | Visual board (WS3) | Medium — Bun server + HTML | Nothing | Visibility into work state |
| P3 | Docker isolation (WS4) | Design only | Docker Desktop + real need | Deferred until needed |
| P3 | Multi-AI execution (WS6) | Design only | External AI CLI tools | Deferred until possible |

---

## Open Questions

1. Should the visual board be accessible from other devices (phone/tablet) or localhost only?
2. Should Ralph Loop auto-trigger be opt-in per PRD (`mode: autonomous`) or global?
3. Should the research index be rebuilt on every session start or only on demand?
4. When Docker isolation is implemented, should containers persist between iterations or be ephemeral?
5. Should the session handoff protocol be mandatory for all effort tiers or Extended+ only?
