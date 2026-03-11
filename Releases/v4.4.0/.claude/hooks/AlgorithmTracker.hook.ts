#!/usr/bin/env bun
/**
 * AlgorithmTracker.hook.ts — Consolidated Algorithm State Tracker (PostToolUse)
 *
 * Single hook replaces CriteriaTracker + SessionReactivator. Three responsibilities:
 * 1. Criteria tracking: Intercepts TaskCreate for ISC criteria → criteriaAdd()
 * 2. Criteria updates:  Intercepts TaskUpdate status changes → criteriaUpdate()
 * 3. Agent tracking:    Intercepts Task tool for agent spawns → agentAdd()
 *
 * Session activation is folded in: on any matched tool call, checks if session
 * needs activation (replaces SessionReactivator.hook.ts).
 *
 * TRIGGER: PostToolUse (matcher: TaskCreate, TaskUpdate, Task)
 * PERFORMANCE: ~3ms. Never blocks — outputs continue immediately.
 *
 * NO transcript scanning. NO regex on output text. All data from structured tool_input.
 */

import {
  readState, writeState, phaseTransition, criteriaAdd, criteriaUpdate, agentAdd, effortLevelUpdate,
} from './lib/algorithm-state';
import type { AlgorithmCriterion, AlgorithmPhase, AlgorithmState } from './lib/algorithm-state';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { setPhaseTab } from './lib/tab-setter';

// ── Criteria Detection ──

const CRITERION_PATTERNS = [
  /ISC-(C\d+):\s*(.+)/,
  /ISC-(A\d+):\s*(.+)/,
  // Domain-named ISC: ISC-Hooks-1, ISC-A-Integration-1, etc.
  /ISC-([\w]+-\d+):\s*(.+)/,
  /ISC-(A-[\w]+-\d+):\s*(.+)/,
  /^(C\d+):\s*(.+)/,
  /^(A\d+):\s*(.+)/,
];
const TASK_NUMBER = /Task\s+#(\d+)\s+created successfully/;

function parseCriterion(text: string): { id: string; description: string } | null {
  for (const p of CRITERION_PATTERNS) {
    const m = text.match(p);
    if (m) return { id: m[1], description: m[2].trim() };
  }
  return null;
}

// ── Session Activation (replaces SessionReactivator) ──

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');

function getSessionName(sid: string): string {
  try {
    const snPath = join(BASE_DIR, 'MEMORY', 'STATE', 'session-names.json');
    if (existsSync(snPath)) {
      const names = JSON.parse(readFileSync(snPath, 'utf-8'));
      if (names[sid]) return names[sid];
    }
  } catch {}
  // Return session ID prefix instead of "Starting..." to avoid phantom dashboard entries
  return sid.slice(0, 8);
}

function ensureSessionActive(sessionId: string): void {
  const existing = readState(sessionId);
  if (existing && existing.active) return; // Already active

  const now = Date.now();

  if (!existing) {
    // New session — create state
    writeState({
      active: true,
      sessionId,
      taskDescription: getSessionName(sessionId),
      currentPhase: 'OBSERVE',
      phaseStartedAt: now,
      algorithmStartedAt: now,
      sla: 'Standard',
      criteria: [],
      agents: [],
      capabilities: ['Task Tool'],
      phaseHistory: [{ phase: 'OBSERVE', startedAt: now, criteriaCount: 0, agentCount: 0 }],
    } as AlgorithmState);
  } else {
    // Completed session — reactivate
    existing.active = true;
    delete existing.completedAt;
    delete existing.summary;
    writeState(existing);
  }
}

// ── Main ──

async function main() {
  // Output continue immediately — never block
  console.log(JSON.stringify({ continue: true }));

  let input: any;
  try {
    const reader = Bun.stdin.stream().getReader();
    let raw = '';
    const read = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += new TextDecoder().decode(value, { stream: true });
      }
    })();
    await Promise.race([read, new Promise<void>(r => setTimeout(r, 200))]);
    if (!raw.trim()) return;
    input = JSON.parse(raw);
  } catch { return; }

  const { tool_name, tool_input, tool_result, session_id } = input;
  if (!session_id) return;

  // ── 1. TaskCreate → Criteria tracking ──
  if (tool_name === 'TaskCreate') {
    let criterion: { id: string; description: string } | null = null;
    let taskNumber: string | undefined;

    if (tool_result) {
      const m = tool_result.match(TASK_NUMBER);
      if (m) taskNumber = m[1];
    }
    if (tool_input?.subject) criterion = parseCriterion(tool_input.subject);
    if (!criterion && tool_result) {
      const after = tool_result.match(/created successfully:\s*(.+)/);
      if (after) criterion = parseCriterion(after[1]);
    }

    if (criterion) {
      ensureSessionActive(session_id);
      const state = readState(session_id);
      const c: AlgorithmCriterion = {
        id: criterion.id,
        description: criterion.description,
        type: criterion.id.startsWith('A') ? 'anti-criterion' : 'criterion',
        status: 'pending',
        createdInPhase: state?.currentPhase || 'OBSERVE',
        ...(taskNumber && { taskId: taskNumber }),
      };
      criteriaAdd(session_id, c);

      // Real-time effort level inference from criteria count
      // Only upgrades when still at default 'Standard'
      const updated = readState(session_id);
      if (updated && updated.sla === 'Standard') {
        const count = updated.criteria.length;
        let inferred: typeof updated.sla | null = null;
        if (count >= 40) inferred = 'Deep';
        else if (count >= 20) inferred = 'Advanced';
        else if (count >= 12) inferred = 'Extended';
        if (inferred) {
          effortLevelUpdate(session_id, inferred);
          process.stderr.write(`[AlgorithmTracker] effort level inferred: ${inferred} (${count} criteria)\n`);
        }
      }
    }
  }

  // ── 2. TaskUpdate → Criteria status updates ──
  else if (tool_name === 'TaskUpdate' && tool_input?.taskId && tool_input?.status) {
    const statusMap: Record<string, AlgorithmCriterion['status']> = {
      pending: 'pending', in_progress: 'in_progress', completed: 'completed', deleted: 'failed',
    };
    const mapped = statusMap[tool_input.status];
    if (mapped) criteriaUpdate(session_id, tool_input.taskId, mapped);
  }

  // ── 3. Task → Agent spawn tracking ──
  else if (tool_name === 'Task' && tool_input) {
    const agentName = tool_input.name || tool_input.description || 'unnamed';
    const agentType = tool_input.subagent_type || 'general-purpose';
    const task = tool_input.description || tool_input.prompt?.slice(0, 80);

    agentAdd(session_id, {
      name: agentName,
      agentType,
      task,
    });
    process.stderr.write(`[AlgorithmTracker] agent spawned: ${agentName} (${agentType})\n`);
  }
}

main().catch(() => {});
