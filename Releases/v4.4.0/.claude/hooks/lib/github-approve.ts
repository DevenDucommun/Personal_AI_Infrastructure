#!/usr/bin/env bun
/**
 * github-approve.ts - Pre-approve a specific GitHub write command
 *
 * Run this AFTER the user confirms, BEFORE re-running the blocked command.
 * Creates a 60-second approval token that GitHubWriteGuard.hook.ts will accept.
 *
 * Usage:
 *   bun ~/.claude/hooks/lib/github-approve.ts "git push origin main"
 *   bun ~/.claude/hooks/lib/github-approve.ts "gh pr create --title ..."
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

const command = process.argv[2];

if (!command) {
  console.error('Usage: bun github-approve.ts "command to approve"');
  process.exit(1);
}

const BASE_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const STATE_DIR = join(BASE_DIR, 'MEMORY', 'STATE');
const APPROVALS_DIR = join(STATE_DIR, 'github-approvals');

if (!existsSync(APPROVALS_DIR)) {
  mkdirSync(APPROVALS_DIR, { recursive: true });
}

const hash = createHash('sha256').update(command.trim()).digest('hex').slice(0, 12);
const tokenPath = join(APPROVALS_DIR, `${hash}.json`);

writeFileSync(tokenPath, JSON.stringify({
  command: command.trim(),
  hash,
  approved_at: Date.now(),
  expires_at: Date.now() + 60_000, // 60-second window
}), 'utf-8');

console.log(`✅ GitHub command approved (60s window): "${command.trim()}"`);
console.log(`   Token: ${hash}`);
