# GranolaMCP SKILL.md — Prototype (PAI 4.5.0 Pattern Demo)

**Purpose:** Demonstrates the CLI + SKILL.md pattern for GranolaMCP integration.
**Status:** Prototype — GranolaMCP CLI not yet built. This is the SKILL.md design.
**Pattern:** Follows mcp2cli Tier 1 recommendation: CLI + SKILL.md over raw MCP server.

---

# GranolaMCP — Meeting Intelligence Skill

Sync Granola meeting notes to action items, query past meetings, and surface follow-ups.

## When to Use This Skill
- Extract action items from a meeting ("what did I commit to in the Pinnacle sync?")
- Find past meeting context ("what was decided in the TR-369 discussion?")
- List unresolved action items across all recent meetings
- Sync latest notes from Granola into PAI's action item store

## Commands

### `granola sync`
Pull latest notes from Granola, parse action items, write to local store.
```
granola sync [--days N]   # Default: last 7 days
granola sync --all        # Full resync
```

### `granola list`
Show action items across meetings, optionally filtered.
```
granola list                        # All unresolved items
granola list --meeting "Pinnacle"   # From a specific meeting
granola list --owner deven          # Assigned to Deven
granola list --since 2026-03-01     # Since a date
```

### `granola get`
Get full notes for a specific meeting.
```
granola get "Pinnacle 2.0 sync"    # By meeting name (fuzzy match)
granola get --latest               # Most recent meeting
```

### `granola actions`
Show action items due or overdue.
```
granola actions --due-today
granola actions --overdue
granola actions --pending           # All unresolved
```

### `granola complete`
Mark an action item as complete.
```
granola complete <item-id>
```

## Output Format
All commands return plain text (not JSON). Action item lists use this format:
```
[ID] Meeting: <name> | Date: <date> | Owner: <name>
     Action: <item text>
     Status: pending|complete | Due: <date or none>
```

## Token Profile
- This SKILL.md: ~800 tokens (loaded once when skill invoked)
- Typical `granola list` output: 200–500 tokens
- Total per session: ~1,000–1,300 tokens
- vs. GranolaMCP server (if 8 tools): ~968 tokens per turn × N turns

## Integration Notes
- CLI binary: `~/.claude/tools/granola-mcp` (to be built)
- Data store: `~/.claude/MEMORY/granola/` (JSON files by meeting date)
- Auth: Granola API key in `~/.config/PAI/secrets.env`
- Sync daemon: already complete (47/47 tests passing) — CLI wraps its output

---

*This prototype demonstrates the target architecture. Build the TypeScript CLI against the existing sync daemon, then this SKILL.md is the complete integration.*
