# PAI Hook System

> **Lifecycle event handlers that extend Claude Code with memory, tab state, and security.**

This document is the authoritative reference for PAI's hook system. When modifying any hook, update both the hook's inline documentation AND this README.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Hook Lifecycle Events](#hook-lifecycle-events)
3. [Hook Registry](#hook-registry)
4. [Inter-Hook Dependencies](#inter-hook-dependencies)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Shared Libraries](#shared-libraries)
7. [Configuration](#configuration)
8. [Documentation Standards](#documentation-standards)
9. [Maintenance Checklist](#maintenance-checklist)

---

## Architecture Overview

Hooks are TypeScript scripts that execute at specific lifecycle events in Claude Code. They enable:

- **Memory Capture**: Session summaries, work tracking, learnings
- **Security Validation**: Command filtering, path protection, prompt injection defense
- **Context Injection**: Identity, preferences, format specifications

### Design Principles

1. **Non-blocking by default**: Hooks should not delay the user experience
2. **Fail gracefully**: Errors in one hook must not crash the session
3. **Single responsibility**: Each hook does one thing well
4. **Shared utilities over duplication**: Use `hooks/lib/hook-io.ts` for stdin reading

### Execution Model

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Claude Code Session                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SessionStart ──┬──► TerminalState (init terminal tracking)          │
│                 ├──► LoadContext (dynamic context injection)          │
│                 ├──► BuildCLAUDE (regenerate CLAUDE.md)              │
│                 ├──► BuildSettings (regenerate settings.json)         │
│                 └──► PostCompactRecovery (compact matcher only)       │
│                                                                      │
│  UserPromptSubmit ──┬──► ModeClassifier (effort tier classification)  │
│                     ├──► RatingCapture (explicit + implicit ratings)  │
│                     ├──► TerminalState (track terminal state)         │
│                     ├──► UpdateTabTitle (tab title + working state)   │
│                     └──► SessionAutoName (session naming)             │
│                                                                      │
│  PreToolUse ──┬──► SecurityValidator (Bash/Edit/Write/Read)          │
│               ├──► GitHubWriteGuard (Bash — GitHub push protection)  │
│               ├──► TerminalState (AskUserQuestion)                   │
│               ├──► AgentExecutionGuard (Task)                        │
│               └──► SkillGuard (Skill)                                │
│                                                                      │
│  PostToolUse ──┬──► QuestionAnswered (AskUserQuestion)               │
│                └──► PRDSync (Write/Edit — PRD → work.json sync)      │
│                                                                      │
│  Stop ──┬──► LastResponseCache (cache response for ratings)          │
│         ├──► TerminalState (update terminal state)                   │
│         ├──► DocIntegrity (cross-ref checks)                         │
│         ├──► StopOrchestrator (orchestrate stop-phase hooks)         │
│         └──► AlgorithmTracker (phase + progress tracking)            │
│                                                                      │
│  SessionEnd ──┬──► WorkCompletionLearning (insight extraction)       │
│               ├──► SessionCleanup (work completion + state clear)     │
│               ├──► RelationshipMemory (relationship notes)            │
│               ├──► UpdateCounts (system counts + usage cache)         │
│               └──► IntegrityCheck (PAI + doc drift detection)         │
│                                                                      │
│  ConfigChange ──► ConfigChange (react to config modifications)        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Hook Lifecycle Events

**SessionStart** — Session begins. Context loading, settings rebuild, terminal init.
**UserPromptSubmit** — User sends a message. Mode classification, ratings, tab state.
**PreToolUse** — Before a tool executes. Security validation, agent/skill guards.
**PostToolUse** — After a tool executes. Tab state reset, PRD sync.
**Stop** — Claude finishes a response. Caching, integrity checks, tracking.
**SessionEnd** — Session terminates. Learning extraction, cleanup, counts.
**ConfigChange** — Configuration modified. React to settings/preference changes.

### Event Payload Structure

All hooks receive JSON via stdin with event-specific fields:

```typescript
// Common fields
interface BasePayload {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

// UserPromptSubmit
interface UserPromptPayload extends BasePayload {
  prompt: string;
}

// PreToolUse
interface PreToolUsePayload extends BasePayload {
  tool_name: string;
  tool_input: Record<string, any>;
}

// Stop
interface StopPayload extends BasePayload {
  stop_hook_active: boolean;
}
```

---

## Hook Registry

### SessionStart Hooks

- **TerminalState.hook.ts** — Initialize terminal state tracking. Non-blocking.
- **LoadContext.hook.ts** — Inject dynamic context (relationship, learning, work). Blocking (stdout). Depends on `settings.json`, `MEMORY/`.
- **BuildCLAUDE** (`handlers/BuildCLAUDE.ts`) — Regenerate CLAUDE.md from templates. Run via `bun`.
- **BuildSettings** (`handlers/BuildSettings.ts`) — Regenerate settings.json from config/*.jsonc. Run via `bun`.
- **PostCompactRecovery.hook.ts** — Restore context after compact event. Matcher: `compact`.

### UserPromptSubmit Hooks

- **ModeClassifier.hook.ts** — Classify effort tier and inject context modifications. Blocking (stdout).
- **RatingCapture.hook.ts** — Explicit/implicit rating capture + sentiment analysis. Blocking (stdout). Depends on Inference API, `ratings.jsonl`.
- **TerminalState.hook.ts** — Track terminal state for proper output rendering. Non-blocking.
- **UpdateTabTitle.hook.ts** — Set tab title + working state. Non-blocking. Uses Inference API.
- **SessionAutoName.hook.ts** — Name session on first prompt. Non-blocking. Uses Inference API, `session-names.json`.

### PreToolUse Hooks

- **SecurityValidator.hook.ts** — Validate Bash/Edit/Write/Read commands. Blocking (decision). Depends on `patterns.yaml`, `MEMORY/SECURITY/`.
- **GitHubWriteGuard.hook.ts** — Guard GitHub push operations. Matcher: `Bash`. Blocking (decision).
- **TerminalState.hook.ts** — Track state for interactive prompts. Matcher: `AskUserQuestion`. Non-blocking.
- **AgentExecutionGuard.hook.ts** — Guard agent spawning. Matcher: `Task`. Blocking (decision).
- **SkillGuard.hook.ts** — Prevent erroneous skill invocations. Matcher: `Skill`. Blocking (decision).

### PostToolUse Hooks

- **QuestionAnswered.hook.ts** — Reset state after question answered. Matcher: `AskUserQuestion`. Non-blocking.
- **PRDSync.hook.ts** — Sync PRD frontmatter → work.json. Matcher: `Write`, `Edit`. Non-blocking. Depends on `MEMORY/WORK/`.

### Stop Hooks

- **LastResponseCache.hook.ts** — Cache last response for RatingCapture bridge. Non-blocking.
- **TerminalState.hook.ts** — Update terminal state after response completes. Non-blocking.
- **DocIntegrity.hook.ts** — Cross-ref + semantic drift checks. Non-blocking. Uses Inference API.
- **StopOrchestrator.hook.ts** — Orchestrate stop-phase hooks. Non-blocking.
- **AlgorithmTracker.hook.ts** — Track algorithm phase progress. Non-blocking. Depends on `work.json`.

### SessionEnd Hooks

- **WorkCompletionLearning.hook.ts** — Extract learnings from work. Non-blocking. Uses Inference API, `MEMORY/LEARNING/`.
- **SessionCleanup.hook.ts** — Mark work complete + clear state. Non-blocking. Depends on `MEMORY/WORK/`, `current-work.json`.
- **RelationshipMemory.hook.ts** — Capture relationship notes. Non-blocking. Depends on `MEMORY/RELATIONSHIP/`.
- **UpdateCounts.hook.ts** — Update system counts + usage cache. Non-blocking. Depends on `settings.json`, Anthropic API.
- **IntegrityCheck.hook.ts** — PAI change detection + doc drift. Non-blocking. Depends on `MEMORY/STATE/integrity-state.json`, `handlers/`.

### ConfigChange Hooks

- **ConfigChange.hook.ts** — React to configuration modifications. Non-blocking.

---

## Inter-Hook Dependencies

### Rating System Flow

```
User Message
    │
    ▼
RatingCapture ─── explicit "8 - great work"? ──► write + exit
    │ (no explicit match)
    ▼
    └── implicit sentiment (Haiku) ──────────► write
                                                │
                                                ▼
                                        ratings.jsonl
                                              │
                                              ▼
                                      Status Line Display
                                      (statusline-command.sh)
```

**Design**: Single hook handles both paths. Explicit pattern checked first (no inference). If no match, Haiku inference runs for implicit sentiment. Both paths write to `ratings.jsonl`.

### Work Tracking Flow

```
SessionStart
    │
    ▼
Algorithm (AI) ─► Creates WORK/<slug>/PRD.md directly
    │                                          │
    │                                          ▼
    │                               current-work.json (state)
    │                                          │
    ▼                                          │
SessionEnd ─┬─► WorkCompletionLearning ────────┤
            │                                  │
            └─► SessionCleanup ─► Marks as COMPLETED
```

**Coordination**: `current-work.json` is the shared state file. The AI creates it during Algorithm execution, SessionCleanup clears it.

### Security Validation Flow

```
PreToolUse (Bash/Edit/Write/Read)
    │
    ▼
SecurityValidator ─► patterns.yaml
    │
    ├─► {continue: true} ──────────────► Tool executes
    │
    ├─► {decision: "ask", message} ────► User prompted
    │
    └─► exit(2) ───────────────────────► Hard block

All events logged to: MEMORY/SECURITY/security-events.jsonl
```

### Tab State Flow

```
UserPromptSubmit
    │
    ▼
UpdateTabTitle
    ├─► Sets tab to PURPLE (#5B21B6) ─► "Processing..."
    ├─► Inference summarizes prompt
    └─► Sets tab to ORANGE (#B35A00) ─► "Fixing auth..."

PreToolUse (AskUserQuestion)
    │
    ▼
TerminalState ─► Tracks interactive prompt state

Stop
    │
    ▼
TerminalState ─► Update terminal state after response
```

---

## Data Flow Diagrams

### Memory System Integration

```
┌──────────────────────────────────────────────────────────────────┐
│                         MEMORY/                                  │
├────────────────┬─────────────────┬───────────────────────────────┤
│    WORK/       │   LEARNING/     │   STATE/                      │
│                │                 │                               │
│ ┌────────────┐ │ ┌─────────────┐ │ ┌───────────────────────────┐ │
│ │ Session    │ │ │ SIGNALS/    │ │ │ current-work.json         │ │
│ │ Directories│ │ │ ratings.jsonl│ │ │ trending-cache.json       │ │
│ │            │ │ │             │ │ │ model-cache.txt           │ │
│ └─────▲──────┘ │ └──────▲──────┘ │ └───────────▲───────────────┘ │
│       │        │        │        │             │                 │
└───────┼────────┴────────┼────────┴─────────────┼─────────────────┘
        │                 │                      │
        │                 │                      │
┌───────┴─────────────────┴──────────────────────┴─────────────────┐
│                        HOOKS                                     │
│                                                                  │
│  PRDSync ──────────────────────────────────► work.json          │
│  RatingCapture ────────────────────────────► ratings.jsonl      │
│  WorkCompletionLearning ────────────────────► LEARNING/          │
│  SessionCleanup ────────────────────────────► WORK/ + state      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Shared Libraries

Located in `hooks/lib/`:

| Library | Purpose | Used By |
|---------|---------|---------|
| `identity.ts` | Get DA name, principal from settings | Most hooks |
| `time.ts` | PST timestamps, ISO formatting | Rating hooks, work hooks |
| `paths.ts` | Canonical path construction | Work hooks, security |
| `notifications.ts` | ntfy push notifications | SessionEnd hooks, UpdateTabTitle |
| `output-validators.ts` | Tab title output validation | UpdateTabTitle, TabState, SetQuestionTab |
| `hook-io.ts` | Shared stdin reader + transcript parser | All Stop hooks |
| `learning-utils.ts` | Learning categorization | Rating hooks, WorkCompletion |
| `change-detection.ts` | Detect file/code changes | IntegrityCheck |
| `tab-constants.ts` | Tab title colors and states | tab-setter.ts |
| `tab-setter.ts` | Kitty tab title manipulation | Tab-related hooks |

---

## Configuration

Hooks are configured in two places:
1. **Source of truth**: `config/hooks.jsonc` — uses `${PAI_DIR}` variable
2. **Generated output**: `settings.json` — built by `BuildSettings.ts`, uses `${HOME}/.claude`

`BuildSettings.ts` does a **full rebuild** (not merge) — the hooks section in settings.json comes entirely from hooks.jsonc.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "${PAI_DIR}/hooks/TerminalState.hook.ts" },
          { "type": "command", "command": "${PAI_DIR}/hooks/LoadContext.hook.ts" }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "${PAI_DIR}/hooks/SecurityValidator.hook.ts" },
          { "type": "command", "command": "${PAI_DIR}/hooks/GitHubWriteGuard.hook.ts" }
        ]
      }
    ]
  }
}
```

### Matcher Patterns

For `PreToolUse`/`PostToolUse` hooks, matchers filter by tool name:
- `"Bash"` — Bash tool calls (SecurityValidator, GitHubWriteGuard)
- `"Edit"` — Edit tool calls (SecurityValidator)
- `"Write"` — Write tool calls (SecurityValidator, PRDSync)
- `"Read"` — Read tool calls (SecurityValidator)
- `"AskUserQuestion"` — Interactive prompts (TerminalState, QuestionAnswered)
- `"Task"` — Agent spawning (AgentExecutionGuard)
- `"Skill"` — Skill invocation (SkillGuard)

For `SessionStart`, the `"compact"` matcher fires PostCompactRecovery only on compact events.

---

## Documentation Standards

### Hook File Structure

Every hook MUST follow this documentation structure:

```typescript
#!/usr/bin/env bun
/**
 * HookName.hook.ts - [Brief Description] ([Event Type])
 *
 * PURPOSE:
 * [2-3 sentences explaining what this hook does and why it exists]
 *
 * TRIGGER: [Event type, e.g., UserPromptSubmit]
 *
 * INPUT:
 * - [Field]: [Description]
 * - [Field]: [Description]
 *
 * OUTPUT:
 * - stdout: [What gets injected into context, if any]
 * - exit(0): [Normal completion]
 * - exit(2): [Hard block, for security hooks]
 *
 * SIDE EFFECTS:
 * - [File writes]
 * - [External calls]
 * - [State changes]
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: [Other hooks this requires]
 * - COORDINATES WITH: [Hooks that share data/state]
 * - MUST RUN BEFORE: [Ordering constraints]
 * - MUST RUN AFTER: [Ordering constraints]
 *
 * ERROR HANDLING:
 * - [How errors are handled]
 * - [What happens on failure]
 *
 * PERFORMANCE:
 * - [Blocking vs async]
 * - [Typical execution time]
 * - [Resource usage notes]
 */

// Implementation follows...
```

### Inline Documentation

Functions should have JSDoc comments explaining:
- What the function does
- Parameters and return values
- Any side effects
- Error conditions

### Update Protocol

When modifying ANY hook:

1. Update the hook's header documentation
2. Update this README's Hook Registry section
3. Update Inter-Hook Dependencies if relationships change
4. Update Data Flow Diagrams if data paths change
5. Test the hook in isolation AND with related hooks

---

## Maintenance Checklist

Use this checklist when adding or modifying hooks:

### Adding a New Hook

- [ ] Create hook file with full documentation header
- [ ] Add to `settings.json` under appropriate event
- [ ] Add to Hook Registry table in this README
- [ ] Document inter-hook dependencies
- [ ] Update Data Flow Diagrams if needed
- [ ] Add to shared library imports if using lib/
- [ ] Test hook in isolation
- [ ] Test hook with related hooks
- [ ] Verify no performance regressions

### Modifying an Existing Hook

- [ ] Update inline documentation
- [ ] Update hook header if behavior changes
- [ ] Update this README if interface changes
- [ ] Update inter-hook docs if dependencies change
- [ ] Test modified hook
- [ ] Test hooks that depend on this hook
- [ ] Verify no performance regressions

### Removing a Hook

- [ ] Remove from `settings.json`
- [ ] Remove from Hook Registry in this README
- [ ] Update inter-hook dependencies
- [ ] Update Data Flow Diagrams
- [ ] Check for orphaned shared state files
- [ ] Delete hook file
- [ ] Test related hooks still function

---

## Troubleshooting

### Hook Not Executing

1. Verify hook is in `settings.json` under correct event
2. Check file is executable: `chmod +x hook.ts`
3. Check shebang: `#!/usr/bin/env bun`
4. Run manually: `echo '{"session_id":"test"}' | bun hooks/HookName.hook.ts`

### Hook Blocking Session

1. Check if hook writes to stdout (only LoadContext/FormatEnforcer should)
2. Verify timeouts are set for external calls
3. Check for infinite loops or blocking I/O

### Security Validation Issues

1. Check `patterns.yaml` for matching patterns
2. Review `MEMORY/SECURITY/security-events.jsonl` for logs
3. Test pattern matching: `bun hooks/SecurityValidator.hook.ts < test-input.json`

---

*Last updated: 2026-03-11*
*Hooks: 23 files | Events: 7 (incl. ConfigChange) | Shared libs: 10 | Handlers: 2*
