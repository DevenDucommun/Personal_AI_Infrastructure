#!/usr/bin/env bun
/**
 * PAI Visual Board — Lightweight kanban for PAI work tracking
 *
 * Reads work.json and PRD.md files from ~/.claude/MEMORY/ and serves
 * a single-page kanban board at http://localhost:3333
 *
 * Usage:
 *   bun run board.ts                    # Default: reads ~/.claude/MEMORY/
 *   bun run board.ts --port 8080        # Custom port
 *   bun run board.ts --dir /path/to/memory  # Custom memory directory
 */

import { watch } from "fs";
import { readdir, readFile } from "fs/promises";
import { join, resolve } from "path";

// --- CLI Args ---
const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const dirIdx = args.indexOf("--dir");
const PORT = portIdx >= 0 ? parseInt(args[portIdx + 1]) : 3333;
const MEMORY_DIR = dirIdx >= 0 ? resolve(args[dirIdx + 1]) : join(process.env.HOME!, ".claude", "MEMORY");
const WORK_DIR = join(MEMORY_DIR, "WORK");
const STATE_DIR = join(MEMORY_DIR, "STATE");

// --- Types ---
interface PRDFrontmatter {
  task: string;
  slug: string;
  effort: string;
  phase: string;
  progress: string;
  mode: string;
  started: string;
  updated: string;
}

interface WorkItem {
  slug: string;
  task: string;
  effort: string;
  phase: string;
  passed: number;
  total: number;
  mode: string;
  started: string;
  updated: string;
  criteria: { id: string; text: string; passed: boolean }[];
}

// --- PRD Parser ---
function parseFrontmatter(content: string): PRDFrontmatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }
  return fm as unknown as PRDFrontmatter;
}

function parseCriteria(content: string): { id: string; text: string; passed: boolean }[] {
  const criteria: { id: string; text: string; passed: boolean }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^- \[([ x])\] (ISC-\S+):\s*(.+?)(?:\s*\[[EIR]\])?$/);
    if (match) {
      criteria.push({ id: match[2], text: match[3].trim(), passed: match[1] === "x" });
    }
  }
  return criteria;
}

async function loadWorkItems(): Promise<WorkItem[]> {
  const items: WorkItem[] = [];
  try {
    const dirs = await readdir(WORK_DIR);
    for (const dir of dirs) {
      if (dir === "decisions" || dir.startsWith(".")) continue;
      const prdPath = join(WORK_DIR, dir, "PRD.md");
      try {
        const content = await readFile(prdPath, "utf-8");
        const fm = parseFrontmatter(content);
        if (!fm) continue;
        const criteria = parseCriteria(content);
        const progressMatch = fm.progress?.match(/(\d+)\/(\d+)/);
        items.push({
          slug: fm.slug || dir,
          task: fm.task || dir,
          effort: fm.effort || "standard",
          phase: fm.phase || "observe",
          passed: progressMatch ? parseInt(progressMatch[1]) : 0,
          total: progressMatch ? parseInt(progressMatch[2]) : 0,
          mode: fm.mode || "interactive",
          started: fm.started || "",
          updated: fm.updated || "",
          criteria,
        });
      } catch {
        // PRD.md doesn't exist or is unreadable — skip
      }
    }
  } catch {
    // WORK_DIR doesn't exist
  }
  // Sort by updated date, newest first
  items.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  return items;
}

// --- SSE ---
const sseClients = new Set<ReadableStreamDefaultController>();

function broadcastUpdate() {
  for (const controller of sseClients) {
    try {
      controller.enqueue("data: update\n\n");
    } catch {
      sseClients.delete(controller);
    }
  }
}

// Watch work.json and WORK/ directory for changes
try {
  watch(join(STATE_DIR, "work.json"), () => broadcastUpdate());
} catch { /* work.json may not exist yet */ }
try {
  watch(WORK_DIR, { recursive: true }, () => broadcastUpdate());
} catch { /* WORK_DIR may not exist yet */ }

// --- HTML ---
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PAI Board</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Fira Code', monospace;
    background: #0d1117;
    color: #c9d1d9;
    min-height: 100vh;
  }
  header {
    padding: 16px 24px;
    border-bottom: 1px solid #21262d;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  header h1 {
    font-size: 18px;
    font-weight: 600;
    color: #58a6ff;
  }
  header .stats {
    font-size: 13px;
    color: #8b949e;
    margin-left: auto;
  }
  .board {
    display: flex;
    gap: 16px;
    padding: 20px 24px;
    overflow-x: auto;
    min-height: calc(100vh - 60px);
  }
  .column {
    min-width: 280px;
    max-width: 320px;
    flex-shrink: 0;
  }
  .column-header {
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-radius: 8px 8px 0 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .column-header .count {
    background: #30363d;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 400;
  }
  .column-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 0;
  }
  .card {
    background: #161b22;
    border: 1px solid #21262d;
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .card:hover { border-color: #58a6ff; }
  .card-title {
    font-size: 13px;
    font-weight: 500;
    color: #e6edf3;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .badge-micro { background: #1f2937; color: #9ca3af; }
  .badge-standard { background: #1e3a5f; color: #58a6ff; }
  .badge-extended { background: #2d1f4e; color: #a78bfa; }
  .badge-advanced { background: #3b1f1f; color: #f87171; }
  .badge-deep { background: #1f3b2d; color: #4ade80; }
  .badge-comprehensive { background: #3b351f; color: #fbbf24; }
  .badge-autonomous { background: #1f3b3b; color: #2dd4bf; }
  .progress-bar {
    height: 4px;
    background: #21262d;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 6px;
  }
  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s;
  }
  .progress-text {
    font-size: 11px;
    color: #8b949e;
  }
  .card-time {
    font-size: 11px;
    color: #484f58;
    margin-top: 4px;
  }
  .card-criteria {
    display: none;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #21262d;
  }
  .card.expanded .card-criteria { display: block; }
  .criterion {
    font-size: 12px;
    padding: 3px 0;
    color: #8b949e;
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  .criterion.passed { color: #3fb950; }
  .criterion .check { flex-shrink: 0; width: 14px; text-align: center; }

  /* Column colors */
  .col-backlog .column-header { background: #21262d; color: #8b949e; }
  .col-progress .column-header { background: #0d1f3c; color: #58a6ff; }
  .col-review .column-header { background: #2d2305; color: #d29922; }
  .col-done .column-header { background: #0d2818; color: #3fb950; }

  .progress-fill.pf-backlog { background: #484f58; }
  .progress-fill.pf-progress { background: #58a6ff; }
  .progress-fill.pf-review { background: #d29922; }
  .progress-fill.pf-done { background: #3fb950; }

  .empty-state {
    font-size: 12px;
    color: #484f58;
    padding: 20px;
    text-align: center;
    font-style: italic;
  }
</style>
</head>
<body>
<header>
  <h1>PAI Board</h1>
  <div class="stats" id="stats"></div>
</header>
<div class="board" id="board"></div>

<script>
const COLUMNS = [
  { id: 'backlog', label: 'Backlog', phases: ['observe'] },
  { id: 'progress', label: 'In Progress', phases: ['think', 'plan', 'build', 'execute'] },
  { id: 'review', label: 'Review', phases: ['verify', 'learn'] },
  { id: 'done', label: 'Done', phases: ['complete'] },
];

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

function progressColor(colId) { return 'pf-' + colId; }

function renderBoard(items) {
  const board = document.getElementById('board');
  const stats = document.getElementById('stats');

  const total = items.length;
  const done = items.filter(i => i.phase === 'complete').length;
  const active = items.filter(i => !['complete', 'observe'].includes(i.phase)).length;
  stats.textContent = total + ' items | ' + active + ' active | ' + done + ' done';

  board.innerHTML = COLUMNS.map(col => {
    const colItems = items.filter(i => col.phases.includes(i.phase));
    return '<div class="column col-' + col.id + '">' +
      '<div class="column-header">' + col.label +
        '<span class="count">' + colItems.length + '</span>' +
      '</div>' +
      '<div class="column-body">' +
        (colItems.length === 0
          ? '<div class="empty-state">No items</div>'
          : colItems.map(item => {
              const pct = item.total > 0 ? Math.round(item.passed / item.total * 100) : 0;
              return '<div class="card" onclick="this.classList.toggle(\'expanded\')">' +
                '<div class="card-title">' + escapeHtml(item.task) + '</div>' +
                '<div class="card-meta">' +
                  '<span class="badge badge-' + item.effort + '">' + item.effort + '</span>' +
                  (item.mode === 'autonomous'
                    ? '<span class="badge badge-autonomous">auto</span>'
                    : '') +
                '</div>' +
                '<div class="progress-bar"><div class="progress-fill ' + progressColor(col.id) +
                  '" style="width:' + pct + '%"></div></div>' +
                '<div class="progress-text">' + item.passed + '/' + item.total + ' criteria (' + pct + '%)</div>' +
                '<div class="card-time">' + relativeTime(item.updated) + '</div>' +
                '<div class="card-criteria">' +
                  item.criteria.map(c =>
                    '<div class="criterion ' + (c.passed ? 'passed' : '') + '">' +
                      '<span class="check">' + (c.passed ? '&check;' : '&cir;') + '</span>' +
                      '<span>' + escapeHtml(c.id + ': ' + c.text) + '</span>' +
                    '</div>'
                  ).join('') +
                '</div>' +
              '</div>';
            }).join('')) +
      '</div></div>';
  }).join('');
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function fetchAndRender() {
  try {
    const res = await fetch('/api/work');
    const items = await res.json();
    renderBoard(items);
  } catch (e) {
    console.error('Failed to fetch work items:', e);
  }
}

// Initial load
fetchAndRender();

// SSE for live updates
const es = new EventSource('/api/events');
es.onmessage = () => fetchAndRender();
es.onerror = () => setTimeout(() => fetchAndRender(), 5000);
</script>
</body>
</html>`;

// --- Server ---
Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/board") {
      return new Response(HTML, { headers: { "Content-Type": "text/html" } });
    }

    if (url.pathname === "/api/work") {
      const items = await loadWorkItems();
      return Response.json(items);
    }

    if (url.pathname === "/api/events") {
      const stream = new ReadableStream({
        start(controller) {
          sseClients.add(controller);
          controller.enqueue("data: connected\n\n");
        },
        cancel(controller) {
          sseClients.delete(controller);
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    if (url.pathname.startsWith("/api/prd/")) {
      const slug = url.pathname.slice("/api/prd/".length);
      try {
        const dirs = await readdir(WORK_DIR);
        const dir = dirs.find((d) => d.includes(slug));
        if (!dir) return Response.json({ error: "Not found" }, { status: 404 });
        const content = await readFile(join(WORK_DIR, dir, "PRD.md"), "utf-8");
        const fm = parseFrontmatter(content);
        const criteria = parseCriteria(content);
        return Response.json({ frontmatter: fm, criteria, raw: content });
      } catch {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`PAI Board running at http://localhost:${PORT}`);
console.log(`Reading from: ${WORK_DIR}`);
