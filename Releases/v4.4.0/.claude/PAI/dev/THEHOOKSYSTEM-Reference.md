# The Hook System — Reference (PAI v4.4.0)

> Source of truth: `config/hooks.jsonc` → `BuildSettings.ts` → `settings.json`
> Last updated: 2026-03-12

## Architecture Overview

PAI's hook system extends Claude Code's lifecycle events with TypeScript handlers that run as child processes. Hooks receive JSON payloads on stdin, can modify Claude's behavior via stdout JSON, and share state through `MEMORY/STATE/` files.

### Execution Model

```
Claude Code lifecycle event
  → hooks.jsonc matcher selects hook(s)
  → bun executes hook .ts file as child process
  → stdin: JSON payload (session_id, tool_name, transcript, etc.)
  → stdout: JSON response (decision: allow/block, or context injection)
  → exit 0: success | exit 1: error (non-blocking)
```

### Directory Layout

```
hooks/
├── *.hook.ts          # 23 hook entry points (20 registered, 3 orphaned)
├── handlers/          # 6 handler modules (called by hooks or BuildSettings)
│   ├── BuildCLAUDE.ts
│   ├── BuildSettings.ts
│   ├── DocCrossRefIntegrity.ts
│   ├── SystemIntegrity.ts
│   ├── TabState.ts
│   └── UpdateCounts.ts
└── lib/               # 18 shared library modules
    ├── algorithm-state.ts
    ├── atomic.ts
    ├── change-detection.ts
    ├── classify.ts
    ├── hook-io.ts
    ├── identity.ts
    ├── learning-readback.ts
    ├── learning-utils.ts
    ├── notifications.ts
    ├── output-validators.ts
    ├── paths.ts
    ├── payload-schema.ts
    ├── prd-template.ts
    ├── prd-utils.ts
    ├── recovery-block.ts
    ├── tab-constants.ts
    ├── tab-setter.ts
    └── time.ts
```

---

## Lifecycle Events (7)

| Event | When | Can Block? | Receives Transcript? |
|-------|------|-----------|---------------------|
| **SessionStart** | New session or post-compaction | No | No |
| **UserPromptSubmit** | Every user message | Yes (modify prompt) | No |
| **PreToolUse** | Before tool invocation | Yes (block tool) | No |
| **PostToolUse** | After tool invocation | No | No |
| **Stop** | AI finishes a response | No | Yes |
| **SessionEnd** | Session terminates | No | Yes |
| **ConfigChange** | settings.json modified | Yes (block change) | No |

---

## Hook Registry (from hooks.jsonc)

### SessionStart (4 hooks + 1 compact matcher)

| Hook | Purpose |
|------|---------|
| **TerminalState.hook.ts** | Initialize terminal state tracking |
| **LoadContext.hook.ts** | Inject relationship, learning, and work context |
| **BuildCLAUDE.ts** (handler) | Rebuild CLAUDE.md if algorithm version or DA name changed |
| **BuildSettings.ts** (handler) | Rebuild settings.json from config/*.jsonc if stale |
| **PostCompactRecovery.hook.ts** | Re-inject context after context window compaction (matcher: `compact`) |

### UserPromptSubmit (5 hooks)

| Hook | Purpose |
|------|---------|
| **ModeClassifier.hook.ts** | Classify effort tier, inject context modifications |
| **RatingCapture.hook.ts** | Capture 1-10 ratings from prompt patterns |
| **TerminalState.hook.ts** | Track terminal state for output rendering |
| **SessionAutoName.hook.ts** | Auto-generate four-word session names |
| **UpdateTabTitle.hook.ts** | Update terminal tab title with prompt summary via inference |

### PreToolUse (7 registrations, 4 unique hooks)

| Matcher | Hook | Purpose |
|---------|------|---------|
| `Bash` | **SecurityValidator.hook.ts** | Block dangerous filesystem/system commands |
| `Edit` | **SecurityValidator.hook.ts** | Validate edit targets |
| `Write` | **SecurityValidator.hook.ts** | Validate write targets |
| `Read` | **SecurityValidator.hook.ts** | Validate read targets |
| `AskUserQuestion` | **TerminalState.hook.ts** | Track terminal state for interactive prompts |
| `Task` | **AgentExecutionGuard.hook.ts** | Validate agent parameters before execution |
| `Skill` | **SkillGuard.hook.ts** | Validate skill invocations |

### PostToolUse (7 registrations, 3 unique hooks)

| Matcher | Hook | Purpose |
|---------|------|---------|
| `AskUserQuestion` | **QuestionAnswered.hook.ts** | Restore terminal state after prompt resolves |
| `Write` | **PRDSync.hook.ts** | Sync PRD frontmatter to work.json |
| `Edit` | **PRDSync.hook.ts** | Sync PRD frontmatter to work.json |
| `Bash` | **AlgorithmTracker.hook.ts** | Detect algorithm phases from notification curls |
| `TaskCreate` | **AlgorithmTracker.hook.ts** | Track algorithm criteria creation |
| `TaskUpdate` | **AlgorithmTracker.hook.ts** | Track algorithm criteria status updates |
| `Task` | **AlgorithmTracker.hook.ts** | Track algorithm agent spawns |

### Stop (3 hooks)

| Hook | Purpose |
|------|---------|
| **LastResponseCache.hook.ts** | Cache last response for quick reference |
| **TerminalState.hook.ts** | Update terminal state after response completes |
| **StopOrchestrator.hook.ts** | Distribute parsed transcript to handlers (TabState + DocCrossRefIntegrity) |

### SessionEnd (5 hooks)

| Hook | Purpose |
|------|---------|
| **WorkCompletionLearning.hook.ts** | Extract learning signals from completed work |
| **SessionCleanup.hook.ts** | Clean up stale STATE files (>30 days) |
| **RelationshipMemory.hook.ts** | Update relationship context from session |
| **UpdateCounts.hook.ts** | Update session/interaction counters |
| **IntegrityCheck.hook.ts** | Run system integrity checks |

### ConfigChange (0 registered)

No hooks currently registered for this event. See Orphaned Hooks below.

---

## Orphaned Hooks (3)

These hook files exist but are **not registered** in hooks.jsonc:

| Hook | Intended Event | Status |
|------|---------------|--------|
| **GitHubWriteGuard.hook.ts** | PreToolUse/Bash | **Should be registered** — blocks GitHub-mutating commands (push, pr create/merge, etc.) until explicitly approved via token mechanism |
| **ConfigChange.hook.ts** | ConfigChange | **Should be registered** — guards against mid-session security hook disabling |
| **DocIntegrity.hook.ts** | Stop | **Superseded** — replaced by StopOrchestrator which calls DocCrossRefIntegrity handler directly |

---

## Key Patterns

### StopOrchestrator Pattern

Single entry point for the Stop event that parses the transcript once and distributes it to multiple handlers via `Promise.allSettled`:

```
Stop event → StopOrchestrator.hook.ts
  → parseTranscript(input)
  → Promise.allSettled([
       handleTabState(parsed, input),
       handleDocCrossRefIntegrity(parsed, input)
     ])
```

This avoids each handler independently parsing the transcript.

### SecurityValidator Pattern

Registered on 4 PreToolUse matchers (Bash, Edit, Write, Read). Single hook file that inspects tool parameters and blocks operations targeting protected paths or dangerous commands.

### AlgorithmTracker Pattern

Registered on 4 PostToolUse matchers, each detecting a different signal:

- **Bash**: Phase transitions from notification curl commands
- **TaskCreate**: New criteria added to algorithm state
- **TaskUpdate**: Criteria status changes (pending → completed/failed)
- **Task**: Agent spawns during algorithm execution

State stored in `MEMORY/STATE/algorithm-phase.json` via `lib/algorithm-state.ts`.

### Config Pipeline

```
config/preferences.jsonc  ─┐
config/hooks.jsonc         ─┤→ BuildSettings.ts → settings.json
config/identity.jsonc      ─┤
config/permissions.jsonc   ─┤
config/notifications.jsonc ─┘
```

BuildSettings merges all `.jsonc` files into a single `settings.json`. Runs on SessionStart; also runnable manually via `bun ~/.claude/hooks/handlers/BuildSettings.ts`.

### CLAUDE.md Pipeline

```
CLAUDE.md.template → BuildCLAUDE.ts → CLAUDE.md
  Resolves: {{PAI_VERSION}}, {{ALGO_PATH}}
  Source: settings.json (pai.version, pai.algorithmVersion)
```

---

## Shared Libraries (lib/)

| Module | Purpose |
|--------|---------|
| **algorithm-state.ts** | Read/write algorithm phase state (MEMORY/STATE/algorithm-phase.json) |
| **atomic.ts** | Atomic file write operations |
| **change-detection.ts** | Detect file changes by mtime comparison |
| **classify.ts** | Mode/effort classification logic |
| **hook-io.ts** | Read stdin JSON, parse transcript from input |
| **identity.ts** | DA identity resolution (name, version) |
| **learning-readback.ts** | Read learning signals for context injection |
| **learning-utils.ts** | Learning signal storage and retrieval |
| **notifications.ts** | Notification dispatch (terminal) |
| **output-validators.ts** | Validate hook output JSON format |
| **paths.ts** | `paiPath()` — resolve paths relative to PAI_DIR |
| **payload-schema.ts** | Type definitions for hook payloads |
| **prd-template.ts** | PRD file template generation |
| **prd-utils.ts** | PRD frontmatter parsing and sync |
| **recovery-block.ts** | Deadlock prevention for hook re-entry |
| **tab-constants.ts** | Terminal tab title constants |
| **tab-setter.ts** | Terminal tab title setter (Kitty escape sequences) |
| **time.ts** | Time formatting utilities |

---

## Handler Modules (handlers/)

Handlers are larger processing units called by hooks or directly by the build pipeline:

| Handler | Called By | Purpose |
|---------|-----------|---------|
| **BuildCLAUDE.ts** | SessionStart (direct) | Template resolution for CLAUDE.md |
| **BuildSettings.ts** | SessionStart (direct) | Merge config/*.jsonc → settings.json |
| **DocCrossRefIntegrity.ts** | StopOrchestrator | Validate cross-references in modified docs |
| **SystemIntegrity.ts** | IntegrityCheck.hook.ts | System-wide integrity validation |
| **TabState.ts** | StopOrchestrator | Reset terminal tab state after response |
| **UpdateCounts.ts** | UpdateCounts.hook.ts | Persist session/interaction counters |

---

## State Files (MEMORY/STATE/)

| File | Written By | Purpose |
|------|-----------|---------|
| `algorithm-phase.json` | AlgorithmTracker | Current algorithm phase, criteria, agents |
| `terminal-state.json` | TerminalState | Terminal rendering state |
| `last-response.json` | LastResponseCache | Cached last AI response |
| `session-name.json` | SessionAutoName | Current session name |
| `config-changes.jsonl` | ConfigChange | Config change audit log |
| `github-approvals/*.json` | GitHubWriteGuard | Short-lived approval tokens (60s TTL) |
| `work.json` | PRDSync | Active work/PRD state |
