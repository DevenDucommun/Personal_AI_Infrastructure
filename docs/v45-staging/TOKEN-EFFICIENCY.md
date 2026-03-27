# PAI Token Efficiency Architecture — v4.5.0

**Status:** Research complete, policy defined
**Date:** 2026-03-13
**Research source:** mcp2cli (myeolinmalchi + knowsuchagency), HN discussion, Mario Zechner benchmarks

---

## Executive Summary

PAI already implements mcp2cli's core pattern via SKILL.md lazy loading — there is no token savings problem to solve today. The research revealed a governance problem instead: as PAI adds capabilities, each one needs a clear architectural home. Without a policy, MCP servers accumulate and token overhead compounds. This document defines that policy.

---

## What mcp2cli Revealed

### The Problem It Solves

MCP servers inject all tool schemas into the LLM context window on every turn at approximately 121 tokens per tool. This overhead scales as:

```
tokens_per_session = num_tools × 121 × num_turns
```

For 30 tools over 10 turns: ~36,310 tokens of pure overhead. For 120 tools over 25 turns: ~362,350 tokens.

mcp2cli converts MCP servers to CLI tools + SKILL.md documentation files, loading schemas lazily on demand.

### Token Math (cl100k_base tokenizer, verified)

| Scale | MCP Native | CLI + SKILL.md | Savings |
|-------|-----------|----------------|---------|
| 5 tools | 8,000 tok | 500 tok | 94% |
| 30 tools | 55,000 tok | 2,000 tok | 96% |
| 100 tools | 134,000 tok | 5,000 tok | 96% |
| 120 tools / 25 turns | 362,350 tok | 5,181 tok | 98.6% |

**Discovery costs (lazy approach):**
- `--list` to see available tools: ~16 tokens/tool (one time)
- `--help <tool>` for a specific tool: 80–200 tokens (only when needed)
- System overhead: ~67 tokens/turn

### Two mcp2cli Implementations

**myeolinmalchi/mcp2cli** — Claude Code plugin. Codegen approach: analyzes MCP server source, generates TypeScript CLI + SKILL.md in 5 phases. Very new (March 2026, 1 star). Build-time.

**knowsuchagency/mcp2cli** — Python runtime tool. Dynamic: points at any MCP or OpenAPI spec, materializes a CLI immediately. Zero codegen. Transport-agnostic. More mature.

---

## PAI's Current State

### Token Load Profile (measured 2026-03-13)

| Source | Bytes | Tokens | When Loaded |
|--------|-------|--------|-------------|
| loadAtStartup (4 files) | 12,647 | ~3,162 | Every session |
| Algorithm file (v3.9.0) | ~32,000 | ~8,000 | Per algorithm task |
| Per-skill SKILL.md (avg) | ~5,880 | ~1,470 | On-demand, when skill invoked |
| Per-workflow file (avg) | ~4,500 | ~1,125 | On-demand, one at a time |
| Cloudflare MCP | unknown | unknown | When tools used (auth req'd) |

**loadAtStartup breakdown:**
- `PAI/AISTEERINGRULES.md`: 4,428 bytes
- `PAI/USER/AISTEERINGRULES.md`: 3,469 bytes
- `PAI/USER/PROJECTS/PROJECTS.md`: 2,150 bytes
- `PAI/USER/TELOS/DIGEST.md`: 2,600 bytes

### Why PAI Already Does This Right

PAI's SKILL.md architecture IS the mcp2cli pattern, already implemented:
- 50 skills load nothing at startup — zero context until invoked
- When invoked, only the routing SKILL.md loads (~1,470 tokens)
- Then only the single needed workflow loads (500–4,600 tokens)
- Workflows reference sub-files that load further on-demand

PAI is already operating at the efficiency ceiling mcp2cli targets. The pattern was independently arrived at and is architecturally correct.

### Architectural Comparison

| Aspect | MCP Native | mcp2cli | PAI Skills |
|--------|-----------|---------|------------|
| Startup cost | All schemas loaded | Nothing | Nothing |
| Discovery | Full schema injection | `--list` (~16 tok/tool) | SKILL.md routing file |
| On use | Repeat schema each turn | SKILL.md once | SKILL.md + one workflow |
| Output format | Verbose JSON | Compact plain text | Markdown |
| Token profile | High, fixed | Low, on-demand | Low, on-demand |

---

## The Governance Problem

PAI has one MCP server today. But GranolaMCP is coming, and more integrations will follow (Teams, Outlook, standards trackers, etc.). Without a policy, each new capability becomes an ad-hoc decision, and the accumulation of raw MCP servers would eventually replicate the problem mcp2cli solves.

**The question for every new capability:** Should this be an MCP server or a CLI + SKILL.md?

---

## Integration Architecture Policy (PAI 4.5.0+)

### Decision Framework

For every new PAI capability, apply this framework:

| Capability Type | Recommended Pattern | Reason |
|---|---|---|
| Stateless API calls | CLI + SKILL.md | Lowest token cost, simplest |
| Complex multi-tool workflows | SKILL.md skill | PAI's native pattern |
| OAuth / enterprise auth required | MCP | MCP handles auth cleanly |
| Real-time streaming / bidirectional | MCP | CLIs can't handle these |
| Binary streams (audio/video) | MCP | Not suitable for CLI |
| Claude Desktop + Claude Code dual-target | Both (Playwright pattern) | Ship MCP + SKILL.md companion |
| Simple CRUD / read operations | CLI + SKILL.md | Tier 1 conversion |

### mcp2cli Tier Classification

Use to evaluate any MCP server for CLI conversion:

| Tier | Suitability | Examples |
|------|-------------|---------|
| 1 — Excellent | Stateless tools, SaaS APIs, DevOps, doc processing | Brave Search, Fetch, most read APIs |
| 2 — Good | Databases, search, messaging, monitoring | PostgreSQL, Slack, Sentry |
| 3 — Partial | Browser automation, code execution, memory | Puppeteer, Filesystem |
| 4 — Avoid | Aggregators, bidirectional state, cognitive tools | MCP gateways, reasoning systems |

### GranolaMCP Design Recommendation

GranolaMCP (meeting notes → action items → Claude integration) is **Tier 1** — stateless CRUD against a local data store.

**Recommendation:** Build as CLI + SKILL.md for Claude Code integration. Optionally publish a companion MCP server for Claude Desktop users. This follows the Playwright precedent: ship both, let the context decide which to use.

Benefits:
- Keeps PAI's token profile lean
- CLI is easier to test and debug than MCP
- SKILL.md integrates natively with PAI's skill routing
- MCP companion serves Claude Desktop users without compromising Claude Code efficiency

### Cloudflare MCP Decision

The current Cloudflare MCP is a single remote URL returning 401 without auth. Cannot enumerate tools without credentials.

**Action:** Log into Cloudflare to check how many tools the MCP server exposes.
- ≤ 10 tools: leave as MCP, overhead is acceptable
- > 10 tools: build a Cloudflare SKILL.md wrapping the commands actually used in PAI workflows

---

## Monitoring Guardrails

### loadAtStartup Ceiling

Current: ~3,162 tokens across 4 files. This is lean.

**Soft ceiling: 5,000 tokens total.** If any single file grows past 2,000 tokens, consider:
- Splitting into a core file (always-loaded) and an extended file (conditional)
- Compressing content without losing critical context

Watch files most likely to grow: `PROJECTS.md` and `DIGEST.md` as more projects are added.

### MCP Server Ceiling

**Policy: No more than 5 active MCP servers without a conversion evaluation.**

Before adding MCP server #3 (and each one after), apply the tier classification. If Tier 1 or 2, build CLI + SKILL.md instead.

---

## What Was NOT Built

mcp2cli conversion tooling was not implemented because PAI has 1 MCP server and is already architecturally aligned with mcp2cli principles. Building the conversion pipeline would be over-engineering for the current state.

The Cloudflare SKILL.md wrapper is deferred until tool count is verified.

---

## Next Steps (PAI 4.5.0 Backlog)

1. Verify Cloudflare MCP tool count (requires auth) → decide on SKILL.md wrapper
2. Apply this policy when designing GranolaMCP integration (CLI + SKILL.md primary)
3. Monitor loadAtStartup against 5,000 token ceiling as PROJECTS.md and DIGEST.md grow
4. Re-evaluate when adding MCP server #3
