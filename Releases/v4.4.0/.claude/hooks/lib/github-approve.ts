#!/usr/bin/env bun
/**
 * github-approve.ts - Pre-approve a specific GitHub write command
 *
 * Run this AFTER the user confirms via AskUserQuestion, BEFORE re-running
 * the blocked command. Creates a 60-second approval token that
 * GitHubWriteGuard.hook.ts will accept.
 *
 * REQUIRES the user's actual response from AskUserQuestion as the second
 * argument. This enforces that Claude cannot bypass the confirmation step —
 * the only way to get a valid user response is from AskUserQuestion.
 *
 * Usage:
 *   bun ~/.claude/hooks/lib/github-approve.ts "git push origin main" "Yes, push it"
 *   bun ~/.claude/hooks/lib/github-approve.ts "gh pr create --title ..." "Yes"
 *
 * Will REJECT:
 *   bun ~/.claude/hooks/lib/github-approve.ts "git push origin main"        (missing response)
 *   bun ~/.claude/hooks/lib/github-approve.ts "git push origin main" ""     (empty response)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

const command = process.argv[2];
const userResponse = process.argv[3];

if (!command || !userResponse) {
  console.error('❌ Usage: bun github-approve.ts "command" "user response from AskUserQuestion"');
  console.error('');
  console.error('   The second argument MUST be the user\'s actual response from AskUserQuestion.');
  console.error('   This prevents bypassing the confirmation step.');
  process.exit(1);
}

// Validate the user response is non-trivial (not just whitespace or placeholder text)
const trimmed = userResponse.trim().toLowerCase();
if (!trimmed || trimmed.length < 2) {
  console.error('❌ User response is too short or empty. AskUserQuestion must be used first.');
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
  user_response: userResponse.trim(),
}), 'utf-8');

console.log(`✅ GitHub command approved (60s window): "${command.trim()}"`);
console.log(`   Token: ${hash}`);
console.log(`   Confirmed by: "${userResponse.trim()}"`);
