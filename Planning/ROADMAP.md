# PAI Roadmap

> **For AI context:** This file maps what PAI is building toward. If you're onboarding to the project or helping plan new features, start here. The [IMPROVEMENT-INDEX.md](../Architecture/IMPROVEMENT-INDEX.md) tracks internal cleanup and architectural work; this file tracks user-facing product direction.
>
> **For humans:** Items are grouped by theme. No dates — these ship when they're ready and right.

---

## What's Recently Shipped

| Release | Highlights |
|---------|-----------|
| **v4.4.1** (2026-03-23) | 5 runtime bug fixes, phantom hook removal, doc accuracy pass, CLAUDE.md drift detection, agent output format extraction |
| **v4.4.0** (2026-03-10) | Voice TTS fully removed, BuildSettings env-var expansion, hook execute-bit fixes, algorithm v3.9.0 |
| **v4.1.0** (2026-03-06) | Atomic writes, payload schema validation, settings split from monolith, `pai upgrade` CLI |

[Full release history →](../Releases/)

---

## Upcoming

### Model Flexibility

**Local Model Support**
Run PAI with local models (Ollama, llama.cpp) for privacy and cost control. The hook and skill system should be model-agnostic — you pick the backend.

**Granular Model Routing**
Route tasks to different models based on complexity. Simple lookups go to a fast/cheap model; deep algorithm runs go to your best available model. Defined in config, not hardcoded.

---

### Connectivity

**Remote Access**
Access your PAI from other devices — mobile, web, other machines. Your DA's memory and context travels with you.

**External Notifications**
Push notifications to Email, Discord, Telegram, or Slack when long-running tasks complete or when your DA flags something important. Currently PAI notifies via terminal only.

---

## Internal / Developer Backlog

These are architectural improvements tracked in [IMPROVEMENT-INDEX.md](../Architecture/IMPROVEMENT-INDEX.md). Listed here for completeness so AI assistants can see the full picture:

- **Memory TTL/archival** — WISDOM/, LEARNING/, RELATIONSHIP/ grow unbounded; need pruning strategy
- **Action Runner v1→v2 migration** — two versions of the runner are both actively imported
- **Test coverage** — only 7 test files cover 23 hooks + 47 skills + 14 agents
- **Skill category consistency** — nesting depth varies across categories
- **TerminalState refactor** — single hook handles too many lifecycle events

---

## Out of Scope (Removed)

- **Outbound Phone Calling / Voice TTS** — Voice system (ElevenLabs/localhost:8888) was removed in v4.4.0. No plans to reintroduce it.
