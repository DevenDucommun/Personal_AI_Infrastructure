# PAI 4.6.0 Changelog

## In Development

### Autonomous Execution Reliability (P0)
- [ ] Ralph Loop budget tuning — Opus research needs $4-6+/iteration, Algorithm overhead reduction, Sonnet fallback option
- [ ] Context-per-task bundling — PRD `### Context Bundle` section listing required files for autonomous execution

### Algorithm Improvements (P1)
- [ ] Phase-locked tool access — read-only in OBSERVE/THINK, full write in BUILD/EXECUTE, read+test in VERIFY
- [ ] Triangulation verification — VERIFY phase cross-references ISC criteria, actual output, and original request
- [ ] Session handoff protocol — structured continuation state in PRD `## Decisions` at session end/compaction

### Agent Intelligence (P1)
- [ ] Research index (`MEMORY/RESEARCH/index.json`) — searchable catalog of prior research
- [ ] Agent context seeding — auto-inject relevant prior research into spawned agent prompts

### Security Hardening (P1)
- [ ] WebFetch/WebSearch PreToolUse guard — outbound request validation
- [ ] PostToolUse code quality gate — error detection after tool execution

### Memory & Knowledge (P2)
- [ ] Architectural Decision Records — `MEMORY/DECISIONS/` for cross-task architectural choices
- [ ] Project state snapshots — periodic `MEMORY/SNAPSHOTS/` at version releases

### Board Enhancements (P1)
- [ ] Board write capability — change phase, check/uncheck ISC criteria from the UI
- [ ] Board Ralph Loop trigger — button to kick off autonomous execution on a PRD
- [ ] Board new PRD creation — create work items directly from the board
- [ ] Board multi-dir config — persist scan directories in a config file instead of CLI args

### Skills (P2)
- [ ] Skill collections additions — Trail of Bits, command suites, DevOps (deferred from 4.5.0)
