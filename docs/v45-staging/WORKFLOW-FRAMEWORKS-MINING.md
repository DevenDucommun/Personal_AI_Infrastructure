# Workflow Frameworks Mining: SuperClaude, RIPER, Simone

> Researched 2026-03-26 for PAI v4.5.0 improvement patterns.
> Goal: Mine community frameworks for adoptable patterns — not replace PAI's approach.

---

## 1. Framework Summaries

### 1.1 SuperClaude

**Repo:** github.com/SuperClaude-Org/SuperClaude_Framework (21.9k stars)
**Creator:** SuperClaude-Org / Dr. Ernesto Lee
**Version:** 4.3.0 | **License:** MIT

**What it is:** A meta-programming configuration framework that enhances Claude Code through behavioral instruction injection and component orchestration. Not a standalone tool — it's a context framework that injects behavioral instructions to enable structured workflows with specialized agents.

**Key Patterns:**

| Pattern | Description |
|---------|-------------|
| **7 Behavioral Modes** | Brainstorming, Deep Research, Orchestration, Token-Efficiency, Business Panel, Task Management, Introspection |
| **20 Specialized Agents** | PM, Deep Research, Security Engineer, Frontend Architect, Backend, DevOps, etc. — auto-routed by context |
| **30+ Slash Commands** | `/sc:research`, `/sc:brainstorm`, `/sc:implement`, `/sc:test`, `/sc:analyze`, `/sc:workflow`, `/sc:design` |
| **4-Phase Implementation** | Research → Planning → Implementation → Validation |
| **SuperFlag Framework** | 17 contextual flags controlling AI thinking and behavior |
| **Token Efficiency** | Context clearing between phases; 60% context usage ceiling; 30-50% token savings with MCP |
| **Provider Switching** | SuperClaude Hybrid enables Claude ↔ GLM switching for cost optimization |
| **Case-Based Learning** | Agents learn from previous interactions within a session |

**File Structure:**
- `~/.claude/` — Markdown-based context files
- `skills/` — Modular reusable skill components
- `plugins/superclaude/` — Plugin architecture
- `PLANNING.md`, `TASK.md`, `KNOWLEDGE.md`, `AGENTS.md` — Core docs

---

### 1.2 RIPER

**Repos:** tony/claude-code-riper-5 (73 stars), huisezhiyin/sdd-riper (23 stars), james20141606/tasks-workflow-skill (RIPER-7)
**Creators:** Multiple (tony, huisezhiyin, James Cheng, nategarelik)

**What it is:** A strict phase-based state machine for AI-assisted development. Enforces capability restrictions per phase — the AI cannot skip phases or access tools outside its current mode. Treats specifications as primary assets, code as implementation detail.

**Phases (RIPER-5):**

| Phase | Purpose | Access | Constraints |
|-------|---------|--------|-------------|
| **R — Research** | Investigate existing codebase | Read-only | No suggestions, no planning, no code |
| **I — Innovate** | Explore approaches (optional) | Discussion only | No concrete plans, no code |
| **P — Plan** | Create detailed specs | Read + memory write | Must be approved before execution |
| **E — Execute** | Implement approved plan | Full system access | Must follow plan exactly; deviations return to Plan |
| **R — Review** | Validate against plan | Read + test | Three-axis: spec alignment, code quality, goal achievement |

**RIPER-7 Extensions:** Adds Mode 0 (Task Confirmation) and Mode 6 (Task End) with L0-L3 risk grading.

**Key Patterns:**

| Pattern | Description |
|---------|-------------|
| **Spec-as-Asset** | Specifications are permanent primary deliverables; code is consumable. Formula: Spec + AI = Software 2.0 |
| **Mode Declaration** | Every response starts with `[MODE N: {MODE_NAME}]` — explicit phase boundaries |
| **Capability Restriction** | Tools locked per phase (read-only → discussion → write → full → read) |
| **Memory Bank** | `.claude/memory-bank/[branch-name]/` with plans/, reviews/, sessions/ subdirs |
| **No Silent Destruction** | Refuses destructive ops without explicit approval |
| **Specialist Agents** | research-innovate agent, plan-execute agent, review agent |
| **Approval Gates** | PLAN→EXECUTE requires human approval; high-risk ops need sign-off |
| **Triangulation Verification** | Cross-reference specs, execution logs, and generated code |

**Reported Results (SDD-RIPER):** 18-37% bug reduction, 55% labor reduction, 2-month→1-month timeline compression.

---

### 1.3 Simone

**Repo:** github.com/Helmi/claude-simone (550+ stars)
**Creator:** Helmi (Munich, Germany)
**Version:** MCP v0.4.0 | **License:** MIT

**What it is:** A project and task management system for AI-assisted development that solves context decay through structured task decomposition. Each task is self-contained with all necessary project context, enabling fresh-session execution.

**Three-Tier Hierarchy:**

| Tier | Format | Purpose |
|------|--------|---------|
| **Milestones** | `M##_Name/` | Major feature sets / project phases |
| **Sprints** | `S##_M##_Name/` | Logical groupings of related tasks |
| **Tasks** | `T###_Description.md` / `TX###_Done.md` | Atomic work items for single sessions |

**Key Patterns:**

| Pattern | Description |
|---------|-------------|
| **Context-per-Task** | Each task includes ALL necessary project context — no carryover dependency |
| **Fresh Session Model** | Tasks designed for independent execution in new sessions |
| **ADRs** | `05_ARCHITECTURAL_DECISIONS/` captures why choices were made |
| **Project State Snapshots** | `10_STATE_OF_PROJECT/` — timestamped project health reviews |
| **Parallel Execution** | Multiple AI instances on same project via independent tasks |
| **TX Prefix Completion** | `T001_Task.md` → `TX001_Task.md` when done — clear history |
| **Handlebars Templating** | MCP version uses customizable Handlebars templates for prompts |
| **Sprint Insertion** | Supports inserting sprints with automatic downstream renumbering |
| **Self-Referential** | Simone manages its own development using its own framework |

**File Structure:**
```
.simone/
├── 00_PROJECT_MANIFEST.md
├── 01_PROJECT_DOCS/
├── 02_REQUIREMENTS/M##_Name/
├── 03_SPRINTS/S##_M##_Name/
├── 04_GENERAL_TASKS/
├── 05_ARCHITECTURAL_DECISIONS/
├── 10_STATE_OF_PROJECT/
└── 99_TEMPLATES/
```

---

## 2. Phase Model Comparison

### Comparison Table: All Three Frameworks vs PAI Algorithm

| Dimension | PAI Algorithm v3.9.0 | SuperClaude | RIPER-5 | Simone |
|-----------|---------------------|-------------|---------|--------|
| **Phase Count** | 7 | 4 (informal) | 5 (strict) | 3-tier hierarchy (not phases) |
| **Phases** | OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN | Research → Planning → Implementation → Validation | Research → Innovate → Plan → Execute → Review | Milestones → Sprints → Tasks |
| **Phase Enforcement** | Mandatory headers; PRD phase tracking | Mode switching; context flags | Strict state machine; capability locks | Task isolation; no phase within task |
| **Criteria System** | ISC with [E/I/R] confidence tags, QG1-7 gates | None formal | Spec-based acceptance | Task completion (T→TX) |
| **Effort Tiers** | 6 tiers (Micro→Comprehensive) with ISC ranges | Implicit via mode selection | Implicit; RIPER-7 adds L0-L3 risk | Implicit via task scoping |
| **Memory** | Memory v7.0 (file-based, indexed) | Session case-based learning | Branch-scoped memory bank | Context-per-task docs + ADRs + state snapshots |
| **Verification** | Dedicated VERIFY phase + evidence in PRD | `/sc:analyze` quality/security checks | Three-axis Review (spec, quality, goal) | No formal verification phase |
| **Learning** | Dedicated LEARN phase + JSONL reflections | Case-based within session | Post-review archival (RIPER-7) | ADRs capture decisions |
| **Agent Model** | 18 agents + delegation system | 20 specialized domain agents | 3 specialist agents (research, plan, review) | Single AI per task |
| **Capability Selection** | Explicit per-task from 50 skills | Auto-routed by context | Fixed per phase | N/A |
| **Human Gates** | AskUserQuestion at decision points | Implicit | PLAN→EXECUTE approval mandatory | Task review optional |
| **Context Management** | Compaction at phase transitions (60% threshold) | Token-efficiency mode; 60% ceiling | Spec anchoring; branch-scoped memory | Fresh sessions; context-per-task |
| **PRD/Spec Tracking** | PRD.md as system of record | PLANNING.md + TASK.md | Spec-as-asset (permanent) | PROJECT_MANIFEST + Requirements |
| **Anti-patterns** | Anti-criteria (ISC-A prefix) | None formal | "No Silent Destruction" principle | None formal |
| **Cost Optimization** | N/A | Provider switching (Claude ↔ GLM) | N/A | N/A |

### Phase Alignment Map

```
PAI:         OBSERVE    THINK    PLAN    BUILD    EXECUTE    VERIFY    LEARN
SuperClaude: Research   ------   Planning ------  Implement  Valid.    ------
RIPER:       Research   Innovate Plan    ------   Execute    Review    ------
Simone:      [Milestone/Sprint decomposition]     [do_task]  [TX mark] [ADR]
```

**Key Observations:**
- PAI is the only framework with dedicated THINK (pressure-testing) and LEARN (reflection) phases
- RIPER's Innovate phase maps loosely to PAI's THINK but focuses on design exploration vs. assumption testing
- SuperClaude collapses THINK/PLAN into a single Planning phase
- Simone operates at a different abstraction level — project management vs. per-task execution
- All frameworks share Research → Plan → Execute → Review as a core skeleton
- PAI's BUILD phase (preparation before execution) has no direct equivalent in any framework

---

## 3. Adoptable Patterns

### Pattern 1: Capability Restriction per Phase (from RIPER)

**What:** Each phase has explicitly defined tool access. Research = read-only. Plan = read + write specs. Execute = full access. Review = read + test only.

**Why it's valuable:** Prevents premature implementation during research, and prevents unreviewed changes during review. Reduces "mode confusion" where the AI drifts from investigation into coding.

**PAI Integration Point:** Add tool-access annotations to each Algorithm phase in `v3.9.0.md`. OBSERVE/THINK could be read-only (Grep/Glob/Read only). BUILD/EXECUTE get full write access. VERIFY returns to read + test only.

**Effort:** Low — documentation change + optional hook enforcement.

---

### Pattern 2: Mode Declaration Headers (from RIPER)

**What:** Every AI response starts with `[MODE N: {MODE_NAME}]` declaring which phase is active, making phase boundaries explicit and auditable.

**PAI Status:** PAI already does this with `━━━ PHASE ━━━ N/7` headers. **Already present — no action needed.** PAI's implementation is more detailed (includes phase number).

---

### Pattern 3: Context-per-Task Model (from Simone)

**What:** Each task is packaged with ALL necessary project context so it can execute in a fresh session. No dependency on prior conversation context.

**Why it's valuable:** Eliminates context decay in long sessions. Enables parallel execution by multiple AI instances. Makes task handoff trivial.

**PAI Integration Point:** The PRD already serves as a partial context anchor, but lacks Simone's "everything needed to execute" bundling. Enhancement: when creating PRD.md for Extended+ tasks, include a `### Context Bundle` subsection listing the specific files/resources the AI will need. For Ralph Loop autonomous execution, each dispatched task could include its full context bundle.

**Effort:** Medium — PRD format enhancement + Ralph Loop integration.

---

### Pattern 4: Spec-as-Asset / Triangulation Verification (from RIPER)

**What:** Specifications are treated as permanent primary deliverables, not throwaway planning docs. After execution, verify by cross-referencing the spec, the execution logs, and the generated code (triangulation).

**Why it's valuable:** Creates audit trail. Enables non-original-author maintenance. Catches drift between plan and implementation.

**PAI Integration Point:** PAI's PRD is already partially this — it persists beyond execution and tracks criteria. Enhancement: in VERIFY phase, explicitly require triangulation: (1) re-read each ISC criterion, (2) check the actual code/output, (3) compare against original request. Add as a VERIFY sub-protocol.

**Effort:** Low — Algorithm documentation update.

---

### Pattern 5: Architectural Decision Records (from Simone)

**What:** Dedicated `05_ARCHITECTURAL_DECISIONS/` directory with numbered ADR files capturing WHY choices were made, not just WHAT was chosen.

**Why it's valuable:** Prevents repeated "why did we do this?" moments. Preserves decision rationale across sessions. Critical for systems that evolve over months.

**PAI Integration Point:** PAI's PRD `## Decisions` section captures per-task decisions. But there's no cross-task ADR system. Enhancement: create a `MEMORY/DECISIONS/` directory for significant architectural decisions that span multiple tasks. Each decision gets its own file with context, options considered, rationale, and date.

**Effort:** Medium — new memory subsystem + decision promotion logic.

---

### Pattern 6: Project State Snapshots (from Simone)

**What:** Timestamped project health reviews stored in `10_STATE_OF_PROJECT/` providing a historical record of project state at key moments.

**Why it's valuable:** Enables "time travel" — understanding what the project looked like at a given point. Useful for debugging regressions and understanding evolution.

**PAI Integration Point:** PAI's `work.json` tracks active work but doesn't snapshot project state. Enhancement: periodic state snapshots (perhaps at each version release) stored in `MEMORY/SNAPSHOTS/` capturing system stats, skill count, hook count, known issues.

**Effort:** Low-Medium — new snapshot mechanism.

---

### Pattern 7: Branch-Scoped Memory (from RIPER)

**What:** Memory bank organized by git branch: `.claude/memory-bank/[branch-name]/plans/reviews/sessions/`. Prevents context cross-contamination between features.

**Why it's valuable:** When working on multiple features simultaneously, keeps context isolated. Prevents "feature A" context bleeding into "feature B" work.

**PAI Integration Point:** PAI Memory v7.0 is topic-based, not branch-based. For the PAI system itself this isn't critical (single-developer, single-branch mostly), but for the PRD/work system it could help. Enhancement: optionally scope `WORK/` entries by branch when multiple features are in flight.

**Effort:** Medium — requires memory system changes.

---

## 4. Patterns Already Present in PAI (Avoiding Duplication)

| Pattern | Source | PAI Equivalent | Status |
|---------|--------|---------------|--------|
| Phase declaration headers | RIPER | `━━━ PHASE ━━━ N/7` banners | Already present, more detailed |
| Human approval gates | RIPER | AskUserQuestion + steering rules | Already present, more flexible |
| Capability/skill selection | SuperClaude | OBSERVE capability selection with min counts | Already present, more rigorous |
| Token/context management | SuperClaude | 60% compaction threshold at phase transitions | Already present, same threshold |
| Specialized agents | SuperClaude | 18 agents + delegation system | Already present |
| Learning/reflection | None (PAI unique) | LEARN phase + JSONL reflections | PAI-unique advantage |
| Anti-criteria | None (PAI unique) | ISC-A prefix anti-criteria | PAI-unique advantage |
| Effort tiering | None (PAI unique) | 6-tier effort system with ISC ranges | PAI-unique advantage |
| Confidence tagging | None (PAI unique) | [E/I/R] tags on criteria | PAI-unique advantage |
| Quality gates | None (PAI unique) | QG1-QG7 mandatory gates | PAI-unique advantage |
| Slash commands | SuperClaude | 50 skills via Skill tool | Already present, more extensive |
| No destructive ops | RIPER | Steering rules + hook enforcement | Already present |

**PAI Unique Strengths (not found in any framework):**
1. THINK phase (pressure-testing assumptions before planning)
2. LEARN phase (structured post-execution reflection with JSONL logging)
3. ISC confidence tagging [E/I/R] and priority classification
4. Quality Gates (QG1-7) as mandatory checkpoints
5. Anti-criteria (ISC-A) — defining what must NOT happen
6. 6-tier effort system scaling from Micro to Comprehensive
7. Performance signal tracking and learning from user feedback

---

## 5. Priority Ranking of Adoptable Patterns

| Priority | Pattern | Source | Effort | Value | Rationale |
|----------|---------|--------|--------|-------|-----------|
| **1** | Capability restriction per phase | RIPER | Low | High | Prevents mode confusion; adds safety. Documentation change with optional hook enforcement |
| **2** | Triangulation verification sub-protocol | RIPER | Low | High | Strengthens existing VERIFY phase. Small Algorithm doc update |
| **3** | Context-per-task bundling | Simone | Medium | High | Critical for Ralph Loop autonomous execution. PRD format enhancement |
| **4** | Architectural Decision Records | Simone | Medium | Medium | Valuable for long-running PAI evolution. New memory subsystem |
| **5** | Project state snapshots | Simone | Low-Med | Medium | Useful for tracking PAI system evolution over time |
| **6** | Branch-scoped work isolation | RIPER | Medium | Low | Less critical for single-developer workflow; future-proofing |

**Recommended v4.5.0 scope:** Patterns 1-3 (high-value, reasonable effort).
**Recommended v4.6.0+ scope:** Patterns 4-5 (medium-value, builds over time).
**Deferred:** Pattern 6 (low immediate value for current workflow).

---

## 6. Summary

All three frameworks confirm that PAI's core architecture — phased execution with criteria tracking, capability selection, and structured verification — is well-aligned with community best practices. PAI's unique strengths (THINK phase, LEARN phase, ISC methodology, quality gates, anti-criteria, effort tiering) have no equivalents in any of the three frameworks researched.

The highest-value adoptions are:
1. **Phase-locked tool access** (from RIPER) — adds safety rails to existing phases
2. **Triangulation verification** (from RIPER) — strengthens the existing VERIFY phase
3. **Context bundling for autonomous tasks** (from Simone) — enables better Ralph Loop execution
