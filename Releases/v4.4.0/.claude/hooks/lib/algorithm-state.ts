/**
 * algorithm-state.ts — Shared algorithm state management for hooks
 *
 * Reads/writes per-session algorithm state to MEMORY/STATE/algorithm-phase.json.
 * Used by AlgorithmTracker.hook.ts for real-time phase/criteria/agent tracking.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { paiPath } from './paths';

const STATE_DIR = paiPath('MEMORY', 'STATE');
const STATE_FILE = paiPath('MEMORY', 'STATE', 'algorithm-phase.json');

// ── Types ──

export type AlgorithmPhase = 'OBSERVE' | 'THINK' | 'PLAN' | 'BUILD' | 'EXECUTE' | 'VERIFY' | 'LEARN' | 'COMPLETE' | 'IDLE';

export interface AlgorithmCriterion {
  id: string;
  description: string;
  type: 'criterion' | 'anti-criterion';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  evidence?: string;
  createdInPhase: string;
  taskId?: string;
}

export interface AlgorithmState {
  active: boolean;
  sessionId: string;
  taskDescription: string;
  currentPhase: AlgorithmPhase;
  phaseStartedAt: number;
  algorithmStartedAt: number;
  sla: 'Standard' | 'Extended' | 'Advanced' | 'Deep' | 'Comprehensive';
  criteria: AlgorithmCriterion[];
  agents: Array<{ name: string; agentType: string; task?: string; status?: string; phase?: string }>;
  capabilities: string[];
  prdPath?: string;
  phaseHistory: Array<{ phase: string; startedAt: number; completedAt?: number; criteriaCount: number; agentCount: number }>;
  completedAt?: number;
  summary?: string;
  reworkCount?: number;
}

// ── State I/O ──

export function readState(sessionId: string): AlgorithmState | null {
  try {
    const raw = readFileSync(STATE_FILE, 'utf-8').trim();
    if (!raw || raw === '{}') return null;
    const state: AlgorithmState = JSON.parse(raw);
    if (state.sessionId !== sessionId) return null;
    return state;
  } catch {
    return null;
  }
}

export function writeState(state: AlgorithmState): void {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    // Silent — non-blocking
  }
}

// ── State Mutations ──

export function phaseTransition(sessionId: string, phase: AlgorithmPhase): void {
  const state = readState(sessionId);
  if (!state) return;

  const now = Date.now();

  // Close current phase in history
  const lastEntry = state.phaseHistory[state.phaseHistory.length - 1];
  if (lastEntry && !lastEntry.completedAt) {
    lastEntry.completedAt = now;
    lastEntry.criteriaCount = state.criteria.length;
    lastEntry.agentCount = state.agents.length;
  }

  // Detect rework (re-entering OBSERVE after LEARN/COMPLETE)
  if (phase === 'OBSERVE' && (state.currentPhase === 'LEARN' || state.currentPhase === 'COMPLETE')) {
    state.reworkCount = (state.reworkCount || 0) + 1;
  }

  state.currentPhase = phase;
  state.phaseStartedAt = now;
  state.phaseHistory.push({ phase, startedAt: now, criteriaCount: state.criteria.length, agentCount: state.agents.length });

  writeState(state);
}

export function criteriaAdd(sessionId: string, criterion: AlgorithmCriterion): void {
  const state = readState(sessionId);
  if (!state) return;

  // Avoid duplicates by id
  if (state.criteria.some(c => c.id === criterion.id)) return;

  state.criteria.push(criterion);
  writeState(state);
}

export function criteriaUpdate(sessionId: string, taskId: string, status: AlgorithmCriterion['status']): void {
  const state = readState(sessionId);
  if (!state) return;

  const criterion = state.criteria.find(c => c.taskId === taskId);
  if (criterion) {
    criterion.status = status;
    writeState(state);
  }
}

export function agentAdd(sessionId: string, agent: { name: string; agentType: string; task?: string }): void {
  const state = readState(sessionId);
  if (!state) return;

  state.agents.push({ ...agent, status: 'active', phase: state.currentPhase });
  writeState(state);
}

export function effortLevelUpdate(sessionId: string, sla: AlgorithmState['sla']): void {
  const state = readState(sessionId);
  if (!state) return;

  state.sla = sla;
  writeState(state);
}
