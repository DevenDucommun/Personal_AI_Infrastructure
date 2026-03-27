# PAI Changelog

## PAI 4.5.0 (Released 2026-03-26)

### Autonomous Execution
- Ralph Loop autonomous execution — external process invoking `claude -p` against PRDs until ISC criteria pass (`scripts/ralph-loop.ts`)
- Multi-agent parallel orchestration — child PRD decomposition with parallel dispatch (`scripts/ralph-loop.ts --parallel`)
- PAI kanban board — Bun.serve dashboard reading PRD files with SSE auto-refresh (`scripts/board.ts`)

### Security Hardening
- SecretScanner hook — 14-pattern credential detection on UserPromptSubmit (warn-only, never blocks)
- SecurityValidator extended — Glob and Grep PreToolUse coverage added
- patterns.yaml created — path protection, command validation, destructive op confirmation
- Settings.json updated with new hook registrations

### Architecture & Research
- Token efficiency governance policy — context load analysis, lazy-load patterns
- MCP vs CLI+SKILL.md decision framework
- GranolaMCP design recommendation
- PAI autonomous improvements roadmap — 6 workstreams, P0-P3 priority tiers

### Research Documents
- Safety & Hooks ecosystem evaluation — 42-hook catalog, 6 missing hooks, 10 prioritized recommendations
- Workflow frameworks mining — SuperClaude, RIPER, Simone analyzed, 7 adoptable patterns, 12 existing PAI patterns confirmed

## PAI 4.4.0 (Released)
- EM/PLM workflow enhancements: OneOnOne, WeeklyStatus, DecisionLog, NPITracker skills
- 3 EM Named Agents: ProductStrategist, TechnicalReviewer, StakeholderCommunicator
- FormatReminder hook (UserPromptSubmit, checks PAI format compliance)
- StandardsTracker skill (TR-369, TR-069, BBF monitoring)
- CompetitiveIntel skill (Netgear, TP-Link, Asus, Eero, Google, Ubiquiti monitoring)

## PAI 4.3.1 (Prior)
- Algorithm v3.9.0
- 50 skills, 316 workflows, 35 hooks
