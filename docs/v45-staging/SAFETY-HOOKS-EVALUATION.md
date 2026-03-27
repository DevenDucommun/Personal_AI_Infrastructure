# PAI Safety Hooks Evaluation

> Evaluation Date: 2026-03-26
> PAI Version: 4.4.0 (evaluating for v4.5.0)
> Hook Count: 42 hooks across 12 event types

---

## 1. Complete Hook Catalog

### By Event Type

| # | Event Type | Matcher | Hook Script | Purpose |
|---|-----------|---------|-------------|---------|
| 1 | SessionStart | — | LoadContext.hook.ts | Inject dynamic context (relationship, learning signals) |
| 2 | SessionStart | — | CheckVersion.hook.ts | Compare installed vs latest Claude Code version |
| 3 | SessionStart | — | StartupGreeting.hook.ts | Display PAI neofetch-style banner with metrics |
| 4 | SessionStart | — | BuildCLAUDE.ts | Build CLAUDE.md from components |
| 5 | SessionStart | — | BuildSettings.ts | Build settings.json from components |
| 6 | SessionStart | compact | PostCompactRecovery.hook.ts | Re-inject identity/state after context compaction |
| 7 | UserPromptSubmit | — | PromptAnalysis.hook.ts | Batched inference for tab title + session name |
| 8 | UserPromptSubmit | — | ModeClassifier.hook.ts | Deterministic mode pre-classification (regex, no API) |
| 9 | UserPromptSubmit | — | FormatReminder.hook.ts | Detect format violations, inject correction hint |
| 10 | UserPromptSubmit | — | RatingCapture.hook.ts | Capture explicit ratings and implicit sentiment |
| 11 | UserPromptSubmit | — | TerminalState.hook.ts | Terminal tab state management on prompt |
| 12 | UserPromptSubmit | — | UpdateTabTitle.hook.ts | Update terminal tab title with session context |
| 13 | UserPromptSubmit | — | SessionAutoName.hook.ts | Auto-generate 4-word session name on first prompt |
| 14 | PreToolUse | Bash | SecurityValidator.hook.ts | Validate Bash commands against security patterns |
| 15 | PreToolUse | Bash | GitHubWriteGuard.hook.ts | Block GitHub-mutating commands without approval |
| 16 | PreToolUse | Edit | SecurityValidator.hook.ts | Validate file edit targets against security patterns |
| 17 | PreToolUse | Write | SecurityValidator.hook.ts | Validate file write targets against security patterns |
| 18 | PreToolUse | Read | SecurityValidator.hook.ts | Validate file read targets against security patterns |
| 19 | PreToolUse | AskUserQuestion | TerminalState.hook.ts | Terminal state management before questions |
| 20 | PreToolUse | AskUserQuestion | SetQuestionTab.hook.ts | Change tab to teal color for user input needed |
| 21 | PreToolUse | Task | AgentExecutionGuard.hook.ts | Enforce background execution for agent tasks |
| 22 | PreToolUse | Skill | SkillGuard.hook.ts | Block false-positive skill invocations |
| 23 | PostToolUse | AskUserQuestion | QuestionAnswered.hook.ts | Reset tab from question state after answer |
| 24 | PostToolUse | Write | PRDSync.hook.ts | Sync PRD frontmatter/criteria to work.json |
| 25 | PostToolUse | Edit | PRDSync.hook.ts | Sync PRD frontmatter/criteria to work.json |
| 26 | Stop | — | LastResponseCache.hook.ts | Cache last response for RatingCapture bridge |
| 27 | Stop | — | TerminalState.hook.ts | Reset terminal state after response |
| 28 | Stop | — | StopOrchestrator.hook.ts | Orchestrate all Stop handlers (single transcript parse) |
| 29 | Stop | — | AlgorithmTracker.hook.ts | Track Algorithm phase/criteria state |
| 30 | SessionEnd | — | WorkCompletionLearning.hook.ts | Extract learnings from completed work |
| 31 | SessionEnd | — | SessionCleanup.hook.ts | Mark work complete, clear state, reset tab |
| 32 | SessionEnd | — | SessionSummary.hook.ts | Finalize session, mark work completed |
| 33 | SessionEnd | — | RelationshipMemory.hook.ts | Extract relationship-relevant notes from transcript |
| 34 | SessionEnd | — | UpdateCounts.hook.ts | Update system counts (skills, hooks, ratings) |
| 35 | SessionEnd | — | IntegrityCheck.hook.ts | Detect PAI system file changes, spawn maintenance |
| 36 | PreCompact | — | PreCompact.hook.ts | Inject identity/state into compaction, write checkpoint |
| 37 | ConfigChange | — | ConfigChange.hook.ts | Guard against mid-session config/security tampering |
| 38 | WorktreeCreate | — | WorktreeSetup.hook.ts | Inject PAI context into agent worktrees |
| 39 | WorktreeRemove | — | WorktreeRemove.hook.ts | Clean up PAI context from removed worktrees |
| 40 | TaskCompleted | — | TaskCompleted.hook.ts | ISC verification gate before task closure |
| 41 | TeammateIdle | — | TeammateIdle.hook.ts | Quality gate on agent idle transitions |
| 42 | PostToolUse | — | AlgorithmTracker.hook.ts | Phase/criteria tracking via PostToolUse |

### Event Type Distribution

| Event Type | Count | Category |
|-----------|-------|----------|
| PreToolUse | 9 | Security, UX, Quality |
| UserPromptSubmit | 7 | Classification, UX, Analytics |
| SessionEnd | 6 | Cleanup, Learning, Integrity |
| SessionStart | 6 | Context, UX, Infrastructure |
| Stop | 4 | Caching, UX, Tracking |
| PostToolUse | 4 | Sync, UX, Tracking |
| PreCompact | 1 | Context Preservation |
| ConfigChange | 1 | Security |
| WorktreeCreate | 1 | Agent Infrastructure |
| WorktreeRemove | 1 | Agent Infrastructure |
| TaskCompleted | 1 | Quality |
| TeammateIdle | 1 | Quality |

---

## 2. Safety-Relevant Hooks

Of the 42 hooks, **10 are safety-relevant** (security, integrity, or guardrail function):

| Hook | Event | Safety Function | Mechanism |
|------|-------|----------------|-----------|
| **SecurityValidator.hook.ts** | PreToolUse (Bash, Edit, Write, Read) | Validates commands/paths against security patterns | Pattern matching via patterns.yaml; block/ask/allow decisions |
| **GitHubWriteGuard.hook.ts** | PreToolUse (Bash) | Blocks GitHub-mutating commands without explicit approval | Regex match on git push, gh pr/issue/release/repo commands |
| **AgentExecutionGuard.hook.ts** | PreToolUse (Task) | Enforces background execution policy for agents | Checks run_in_background flag; warning injection |
| **SkillGuard.hook.ts** | PreToolUse (Skill) | Blocks false-positive skill invocations (position-bias bug) | Blocklist of known false-positive skills |
| **ConfigChange.hook.ts** | ConfigChange | Guards against mid-session security system tampering | Detects settings.json changes during active session |
| **IntegrityCheck.hook.ts** | SessionEnd | Detects unauthorized PAI system file modifications | Transcript parsing for system file changes |
| **TaskCompleted.hook.ts** | TaskCompleted | ISC verification gate — prevents premature task closure | Checks for verification evidence in task descriptions |
| **TeammateIdle.hook.ts** | TeammateIdle | Quality gate on agent output before idle | Validates structured output presence |
| **PreCompact.hook.ts** | PreCompact | Preserves security-relevant state across compaction | Injects identity/state checkpoint |
| **FormatReminder.hook.ts** | UserPromptSubmit | Enforces output format compliance (indirect safety) | Cached response analysis |

### Safety Hook Coverage by Tool

| Tool | PreToolUse Hook | What's Checked |
|------|----------------|----------------|
| Bash | SecurityValidator + GitHubWriteGuard | Destructive commands, secret exposure, GitHub mutations |
| Edit | SecurityValidator | Protected file paths |
| Write | SecurityValidator | Protected file paths |
| Read | SecurityValidator | Protected file paths (credentials, keys) |
| Task | AgentExecutionGuard | Background execution enforcement |
| Skill | SkillGuard | False-positive blocking |
| AskUserQuestion | TerminalState + SetQuestionTab | UX only (no security validation) |
| Glob | — | **No coverage** |
| Grep | — | **No coverage** |
| Agent | — | **No coverage** (only Task is covered) |
| WebFetch | — | **No coverage** |
| WebSearch | — | **No coverage** |

---

## 3. External Hook Patterns (Community Research)

### Key External Implementations

| Pattern | Source | Approach | PAI Equivalent |
|---------|--------|----------|----------------|
| Block destructive commands | karanb192, disler | Regex on rm -rf, fork bombs, curl\|sh | SecurityValidator ✅ |
| Protect .env/credentials | karanb192, disler | Block Read/Edit/Write on .env files | SecurityValidator ✅ |
| PII/secrets scanning | sensitive-canary | 24 secret rules + 7 PII rules (gitleaks/TruffleHog patterns, entropy, Luhn) | SecurityValidator (partial — patterns.yaml) |
| Prompt security filtering | disler, cchooks | Scan UserPromptSubmit for credentials | **Missing** ❌ |
| Permission auditing | disler | Log all permission requests | **Missing** ❌ |
| Block dynamic imports | mattzcarey | Prevent runtime code injection via dynamic import() | **Missing** ❌ |
| Configurable safety levels | karanb192 | Critical/High/Strict tiers | SecurityValidator has ask/block tiers ✅ |
| Real-time monitoring | disler (observability) | 12-event dashboard with SQLite + WebSocket | **Missing** ❌ |
| Shift-left validation | Continuous-Claude-v3 | Lint/typecheck after every code edit | **Missing** ❌ |
| Diff review gate | (no implementation) | LLM-judge reviews diffs before commit | **Missing** ❌ |
| Rate limiting | (no implementation) | Throttle tool calls per time window | **Missing** ❌ |
| Cost tracking | (no implementation) | Per-session token/cost estimation | **Missing** ❌ |
| Network egress control | (no implementation) | Block outbound calls to unexpected domains | **Missing** ❌ |
| Git rollback checkpoints | (no implementation) | Auto-checkpoint before destructive git ops | **Missing** ❌ |

---

## 4. PAI vs External Comparison Table

| Capability | PAI (42 hooks) | Community Best | Gap |
|-----------|---------------|----------------|-----|
| **Destructive command blocking** | ✅ SecurityValidator (patterns.yaml) | ✅ karanb192 (regex) | PAI more sophisticated (YAML-driven patterns vs inline regex) |
| **GitHub write protection** | ✅ GitHubWriteGuard (token approval flow) | ❌ Not found externally | PAI leads — unique implementation |
| **Secret/PII detection** | ⚠️ SecurityValidator (basic patterns) | ✅ sensitive-canary (24+7 rules, entropy, Luhn) | PAI gaps: no entropy detection, no Luhn validation, fewer patterns |
| **Prompt-level secret scanning** | ❌ None | ✅ sensitive-canary (UserPromptSubmit) | Missing: secrets in user prompts pass through unchecked |
| **Agent execution guardrails** | ✅ AgentExecutionGuard + TaskCompleted + TeammateIdle | ⚠️ disler (observability only) | PAI leads — enforcement not just monitoring |
| **Config tamper detection** | ✅ ConfigChange.hook.ts | ❌ Not found externally | PAI leads — unique implementation |
| **System integrity checking** | ✅ IntegrityCheck.hook.ts | ❌ Not found externally | PAI leads — unique implementation |
| **Context preservation** | ✅ PreCompact + PostCompactRecovery | ✅ Continuous-Claude-v3 (30 hooks) | Both strong; different architectures |
| **Format/quality enforcement** | ✅ FormatReminder + TaskCompleted + TeammateIdle | ✅ Bouncer (quality audit gate) | PAI has more layers |
| **Code quality validation** | ❌ None | ✅ Continuous-Claude-v3 (pyright/ruff post-edit) | Missing: no lint/typecheck after code edits |
| **Observability dashboard** | ❌ None | ✅ disler (real-time 12-event dashboard) | Missing: no centralized monitoring UI |
| **Network egress control** | ❌ None | ❌ None | Industry-wide gap |
| **Cost/rate tracking** | ❌ None | ❌ None | Industry-wide gap |
| **LLM-judge code review** | ❌ None | ❌ None | Industry-wide gap — opportunity for `prompt` hook type |
| **Rollback checkpoints** | ❌ None | ❌ None | Industry-wide gap |

**Summary:** PAI leads in agent guardrails, GitHub protection, config tamper detection, and system integrity. PAI lags in secret/PII detection depth and has no prompt-level security scanning. Neither PAI nor the community has implemented cost tracking, rate limiting, LLM-judge review gates, or network egress control.

---

## 5. Missing Hook Opportunities

### Opportunity 1: Prompt-Level Secret Scanner (P0 — Critical)
**Event:** UserPromptSubmit
**Gap:** User prompts containing API keys, passwords, or PII pass through with zero scanning. SecurityValidator only fires on PreToolUse (tool inputs), not on the prompt itself.
**Risk:** A user could paste credentials into a prompt. These get stored in transcripts, sent to API, and potentially leak through learning hooks.
**Implementation:** Scan `user_message` against patterns.yaml rules + entropy check. Block or warn before prompt reaches Claude.

### Opportunity 2: PostToolUse Code Quality Gate (P1 — Important)
**Event:** PostToolUse (Edit, Write)
**Gap:** After Claude edits code, no lint/typecheck runs. Errors accumulate until manual build.
**Implementation:** Run project-appropriate linter (eslint, pyright, tsc --noEmit) after code edits. Inject warnings as additionalContext.

### Opportunity 3: WebFetch/WebSearch Egress Monitor (P1 — Important)
**Event:** PreToolUse (WebFetch, WebSearch)
**Gap:** No validation on outbound web requests. Claude can fetch any URL or search any query.
**Implementation:** Domain allowlist/blocklist. Log all outbound requests for audit. Alert on unexpected domains.

### Opportunity 4: Glob/Grep Read Scope Guard (P2 — Nice to Have)
**Event:** PreToolUse (Glob, Grep)
**Gap:** SecurityValidator covers Read but not Glob/Grep. Sensitive file contents can be discovered via search.
**Implementation:** Extend SecurityValidator matcher to Glob/Grep, filtering results that hit protected paths.

### Opportunity 5: Git Auto-Checkpoint Before Destructive Ops (P1 — Important)
**Event:** PreToolUse (Bash)
**Gap:** When SecurityValidator allows a potentially destructive git operation (after user approval), there's no automatic backup.
**Implementation:** Before allowing `git reset`, `git checkout --`, etc., auto-create a tagged stash or branch checkpoint.

### Opportunity 6: Agent Output Validation (P2 — Nice to Have)
**Event:** PostToolUse (Agent/Task results)
**Gap:** AlgorithmTracker tracks state, but agent return values aren't validated for quality or safety.
**Implementation:** Scan agent outputs for hallucination indicators, unresolved errors, or security-sensitive content before injecting into parent context.

---

## 6. Hook Execution Order Dependencies (Safety-Relevant)

### PreToolUse Chain (Bash)
```
SecurityValidator.hook.ts → GitHubWriteGuard.hook.ts
```
**Dependency:** SecurityValidator runs first. If it blocks, GitHubWriteGuard never fires. This is correct — SecurityValidator catches broader threats, GitHubWriteGuard is GitHub-specific.
**Risk:** If SecurityValidator has a bug that allows a dangerous `git push --force`, GitHubWriteGuard is the backup. The two-layer defense is sound.

### PreToolUse Chain (AskUserQuestion)
```
TerminalState.hook.ts → SetQuestionTab.hook.ts
```
**Dependency:** Both manage terminal state. TerminalState sets base state, SetQuestionTab overrides to teal. Order matters for correct visual state.

### Stop Chain
```
LastResponseCache.hook.ts → TerminalState.hook.ts → StopOrchestrator.hook.ts → AlgorithmTracker.hook.ts
```
**Dependency:** LastResponseCache must fire first — RatingCapture (next UserPromptSubmit) depends on cached response. StopOrchestrator parses transcript once, distributes to handlers.

### SessionEnd Chain
```
WorkCompletionLearning → SessionCleanup → SessionSummary → RelationshipMemory → UpdateCounts → IntegrityCheck
```
**Dependency:** WorkCompletionLearning should extract learnings before SessionCleanup marks work complete. IntegrityCheck runs last — if it detects tampering, earlier hooks have already preserved state.
**Risk:** If SessionCleanup errors and clears state prematurely, later hooks lose context. IntegrityCheck should arguably run earlier.

### Cross-Event Dependencies
```
LastResponseCache (Stop) ←→ RatingCapture (UserPromptSubmit)
PreCompact (PreCompact) ←→ PostCompactRecovery (SessionStart:compact)
PromptAnalysis (UserPromptSubmit) ←→ UpdateTabTitle + SessionAutoName (UserPromptSubmit)
```

---

## 7. PreToolUse Safety Coverage Assessment

### Current Coverage
- **Bash:** Strong — SecurityValidator (pattern-based) + GitHubWriteGuard (GitHub-specific)
- **Edit/Write/Read:** Moderate — SecurityValidator checks file paths against patterns
- **Task:** Moderate — AgentExecutionGuard (background enforcement only)
- **Skill:** Narrow — SkillGuard (false-positive blocking only, not security)

### Coverage Gaps
- **Glob/Grep:** No coverage. Can discover sensitive file paths and contents.
- **WebFetch/WebSearch:** No coverage. Unrestricted outbound access.
- **Agent:** No PreToolUse coverage (only Task is covered; Agent tool is separate).
- **NotebookEdit:** No coverage. Could modify notebooks containing credentials.

### Completeness Score
- **Tools with PreToolUse safety hooks:** 6/12 (50%)
- **Tools with adequate safety hooks:** 4/12 (33%) — Bash has strong coverage; Edit/Write/Read have moderate; others have none or weak

---

## 8. Prioritized Recommendations

### P0 — Critical (implement before v4.5.0 release)

| # | Recommendation | Rationale |
|---|---------------|-----------|
| R1 | **Add UserPromptSubmit secret scanner** | Credentials in prompts leak to transcripts, API, learning hooks. Zero current protection. Highest risk gap. |
| R2 | **Extend SecurityValidator to Glob/Grep** | Search tools can discover protected file contents, bypassing Read protection. Easy fix — add matchers in settings.json. |

### P1 — Important (target for v4.5.x)

| # | Recommendation | Rationale |
|---|---------------|-----------|
| R3 | **Add WebFetch/WebSearch PreToolUse guard** | No outbound request validation. Risk of data exfiltration or fetching malicious content. |
| R4 | **Add PostToolUse code quality gate** | Community pattern (Continuous-Claude-v3). Catches errors earlier, reduces debugging loops. |
| R5 | **Add git auto-checkpoint before destructive ops** | SecurityValidator allows destructive ops after user approval, but no rollback safety net. |
| R6 | **Move IntegrityCheck earlier in SessionEnd chain** | Currently runs last. If earlier hooks corrupt state, integrity check can't prevent damage. |

### P2 — Nice to Have (v4.6.0+)

| # | Recommendation | Rationale |
|---|---------------|-----------|
| R7 | **Add Agent tool PreToolUse guard** | Agent tool (distinct from Task) has no PreToolUse coverage. Lower risk since agents run in controlled context. |
| R8 | **Add observability dashboard** | Community has real-time monitoring (disler). PAI logs extensively but has no unified view. |
| R9 | **Explore `prompt` hook type for LLM-judge code review** | No one in community has built this. Could be a differentiator — LLM reviews diffs before commit. |
| R10 | **Add NotebookEdit PreToolUse guard** | Edge case — notebooks could contain credentials. Low priority given limited notebook use. |

---

## Appendix: External Resources Referenced

- [sensitive-canary](https://github.com/coo-quack/sensitive-canary) — TypeScript PII/secrets guard
- [claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) — 13-hook lifecycle tutorial
- [claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) — Monitoring dashboard
- [Continuous-Claude-v3](https://github.com/parcadei/Continuous-Claude-v3) — 30-hook context system
- [karanb192/claude-code-hooks](https://github.com/karanb192/claude-code-hooks) — Safety-leveled hook collection
- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) — Community curated list
