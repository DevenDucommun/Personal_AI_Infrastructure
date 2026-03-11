#!/usr/bin/env bun

/**
 * ComposeAgent - Dynamic Agent Composition from Traits
 *
 * Composes specialized agents on-the-fly by combining traits.
 * Merges base traits (ships with PAI) with user customizations.
 *
 * Configuration files:
 *   Base:  ~/.claude/skills/Agents/Data/Traits.yaml
 *   User:  ~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/Agents/Traits.yaml
 *
 * Usage:
 *   # Infer traits from task description
 *   bun run ComposeAgent.ts --task "Review this security architecture"
 *
 *   # Specify traits explicitly
 *   bun run ComposeAgent.ts --traits "security,skeptical,thorough"
 *
 *   # Output formats
 *   bun run ComposeAgent.ts --task "..." --output json
 *   bun run ComposeAgent.ts --task "..." --output prompt (default)
 *
 *   # List available traits
 *   bun run ComposeAgent.ts --list
 *
 * @version 2.0.0
 */

import { parseArgs } from "util";
import { readFileSync, existsSync, readdirSync, unlinkSync, mkdirSync, writeFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import Handlebars from "handlebars";

// Paths
const HOME = process.env.HOME || "~";
const BASE_TRAITS_PATH = `${HOME}/.claude/skills/Agents/Data/Traits.yaml`;
const USER_TRAITS_PATH = `${HOME}/.claude/PAI/USER/SKILLCUSTOMIZATIONS/Agents/Traits.yaml`;
const TEMPLATE_PATH = `${HOME}/.claude/skills/Agents/Templates/DynamicAgent.hbs`;
const CUSTOM_AGENTS_DIR = `${HOME}/.claude/custom-agents`;

// Types
interface TraitDefinition {
  name: string;
  description: string;
  prompt_fragment?: string;
  keywords?: string[];
}

interface TraitsData {
  expertise: Record<string, TraitDefinition>;
  personality: Record<string, TraitDefinition>;
  approach: Record<string, TraitDefinition>;
  examples: Record<string, { description: string; traits: string[] }>;
}

interface ComposedAgent {
  name: string;
  traits: string[];
  expertise: TraitDefinition[];
  personality: TraitDefinition[];
  approach: TraitDefinition[];
  color: string;
  prompt: string;
}

// Color palette for custom agents - vibrant, distinguishable colors
const AGENT_COLOR_PALETTE = [
  "#FF6B35", // Coral Orange
  "#4ECDC4", // Teal
  "#9B59B6", // Purple
  "#2ECC71", // Emerald
  "#E74C3C", // Red
  "#3498DB", // Blue
  "#F39C12", // Orange
  "#1ABC9C", // Turquoise
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#8BC34A", // Light Green
  "#FF5722", // Deep Orange
  "#673AB7", // Deep Purple
  "#009688", // Teal Dark
  "#FFC107", // Amber
];

/**
 * Deep merge two objects (user overrides base)
 */
function deepMerge<T extends Record<string, unknown>>(base: T, user: Partial<T>): T {
  const result = { ...base };

  for (const key of Object.keys(user) as (keyof T)[]) {
    const userVal = user[key];
    const baseVal = base[key];

    if (
      userVal !== undefined &&
      typeof userVal === "object" &&
      userVal !== null &&
      !Array.isArray(userVal) &&
      typeof baseVal === "object" &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        userVal as Record<string, unknown>
      ) as T[keyof T];
    } else if (userVal !== undefined) {
      // User value overrides base
      result[key] = userVal as T[keyof T];
    }
  }

  return result;
}

/**
 * Merge arrays by concatenating (for mappings)
 */
function mergeArrays<T>(base: T[], user: T[]): T[] {
  return [...base, ...user];
}

/**
 * Load and merge traits from base + user YAML files
 */
function loadTraits(): TraitsData {
  // Load base traits (required)
  if (!existsSync(BASE_TRAITS_PATH)) {
    console.error(`Error: Base traits file not found at ${BASE_TRAITS_PATH}`);
    process.exit(1);
  }
  const baseContent = readFileSync(BASE_TRAITS_PATH, "utf-8");
  const base = parseYaml(baseContent) as TraitsData;

  // Load user traits (optional)
  if (existsSync(USER_TRAITS_PATH)) {
    const userContent = readFileSync(USER_TRAITS_PATH, "utf-8");
    const user = parseYaml(userContent) as Partial<TraitsData>;

    // Merge each section
    const merged: TraitsData = {
      expertise: deepMerge(base.expertise || {}, user.expertise || {}),
      personality: deepMerge(base.personality || {}, user.personality || {}),
      approach: deepMerge(base.approach || {}, user.approach || {}),
      examples: deepMerge(base.examples || {}, user.examples || {}),
    };

    return merged;
  }

  return base;
}

/**
 * Load and compile the agent template
 */
function loadTemplate(): HandlebarsTemplateDelegate {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`Error: Template file not found at ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(TEMPLATE_PATH, "utf-8");
  return Handlebars.compile(content);
}

/**
 * Infer appropriate traits from a task description
 */
function inferTraitsFromTask(task: string, traits: TraitsData): string[] {
  const inferred: string[] = [];
  const taskLower = task.toLowerCase();

  // Check expertise keywords
  for (const [key, def] of Object.entries(traits.expertise)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Check personality keywords
  for (const [key, def] of Object.entries(traits.personality)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Check approach keywords
  for (const [key, def] of Object.entries(traits.approach)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Apply smart defaults if categories are missing
  const hasExpertise = inferred.some((t) => traits.expertise[t]);
  const hasPersonality = inferred.some((t) => traits.personality[t]);
  const hasApproach = inferred.some((t) => traits.approach[t]);

  if (!hasPersonality) inferred.push("analytical");
  if (!hasApproach) inferred.push("thorough");
  if (!hasExpertise) inferred.push("research");

  return [...new Set(inferred)];
}

/**
 * Generate a unique color for an agent based on trait combination
 * Uses a hash of the sorted traits to ensure consistent color per combination
 */
function generateAgentColor(traitKeys: string[]): string {
  // Create a hash from the sorted traits
  const sortedTraits = [...traitKeys].sort().join(",");
  let hash = 0;
  for (let i = 0; i < sortedTraits.length; i++) {
    const char = sortedTraits.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Use absolute value and modulo to get palette index
  const index = Math.abs(hash) % AGENT_COLOR_PALETTE.length;
  return AGENT_COLOR_PALETTE[index];
}

/**
 * Compose an agent from traits
 */
function composeAgent(
  traitKeys: string[],
  task: string,
  traits: TraitsData,
  timing?: string
): ComposedAgent {
  const expertise: TraitDefinition[] = [];
  const personality: TraitDefinition[] = [];
  const approach: TraitDefinition[] = [];

  for (const key of traitKeys) {
    if (traits.expertise[key]) expertise.push(traits.expertise[key]);
    if (traits.personality[key]) personality.push(traits.personality[key]);
    if (traits.approach[key]) approach.push(traits.approach[key]);
  }

  const nameParts: string[] = [];
  if (expertise.length) nameParts.push(expertise[0].name);
  if (personality.length) nameParts.push(personality[0].name);
  if (approach.length) nameParts.push(approach[0].name);
  const name = nameParts.length > 0 ? nameParts.join(" ") : "Dynamic Agent";

  const color = generateAgentColor(traitKeys);

  // Compute timing data for template
  const validTimings = ['fast', 'standard', 'deep'];
  const timingValue = timing && validTimings.includes(timing) ? timing : undefined;
  const timingData = timingValue ? {
    timing: timingValue,
    isFast: timingValue === 'fast',
    isStandard: timingValue === 'standard',
    isDeep: timingValue === 'deep',
  } : {};

  const template = loadTemplate();
  const prompt = template({
    name,
    task,
    expertise,
    personality,
    approach,
    color,
    ...timingData,
  });

  return {
    name,
    traits: traitKeys,
    expertise,
    personality,
    approach,
    color,
    prompt,
  };
}

/**
 * List all available traits
 */
function listTraits(traits: TraitsData): void {
  console.log("AVAILABLE TRAITS (base + user merged)\n");

  console.log("EXPERTISE (domain knowledge):");
  for (const [key, def] of Object.entries(traits.expertise)) {
    console.log(`  ${key.padEnd(15)} - ${def.name}`);
  }

  console.log("\nPERSONALITY (behavior style):");
  for (const [key, def] of Object.entries(traits.personality)) {
    console.log(`  ${key.padEnd(15)} - ${def.name}`);
  }

  console.log("\nAPPROACH (work style):");
  for (const [key, def] of Object.entries(traits.approach)) {
    console.log(`  ${key.padEnd(15)} - ${def.name}`);
  }

  }
}

/**
 * Load a saved custom agent's prompt
 */
function loadAgent(name: string, traits: TraitsData, task?: string): ComposedAgent | null {
  const slug = slugify(name);
  const filePath = `${CUSTOM_AGENTS_DIR}/${slug}.md`;

  if (!existsSync(filePath)) {
    console.error(`Error: Custom agent "${name}" not found at ${filePath}`);
    console.error("Use --list-saved to see available agents");
    return null;
  }

  const content = readFileSync(filePath, "utf-8");
  const traitsMatch = content.match(/^traits:\s*\[([^\]]+)\]/m);

  if (!traitsMatch) {
    console.error(`Error: Could not extract traits from ${filePath}`);
    return null;
  }

  const traitKeys = traitsMatch[1]
    .replace(/"/g, "")
    .split(",")
    .map((t) => t.trim());

  return composeAgent(traitKeys, task || "", traits);
}

/**
 * Delete a saved custom agent
 */
function deleteAgent(name: string): boolean {
  const slug = slugify(name);
  const filePath = `${CUSTOM_AGENTS_DIR}/${slug}.md`;

  if (!existsSync(filePath)) {
    console.error(`Error: Custom agent "${name}" not found at ${filePath}`);
    return false;
  }

  unlinkSync(filePath);
  console.log(`Deleted custom agent: ${slug} (${filePath})`);
  return true;
}

/**
 * Main entry point
 */
async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      task: { type: "string", short: "t" },
      traits: { type: "string", short: "r" },
      output: { type: "string", short: "o", default: "prompt" },
      timing: { type: "string" },
      list: { type: "boolean", short: "l" },
      save: { type: "boolean", short: "s" },
      "list-saved": { type: "boolean" },
      load: { type: "string" },
      delete: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
ComposeAgent - Compose dynamic agents from traits

USAGE:
  bun run ComposeAgent.ts [options]

OPTIONS:
  -t, --task <desc>    Task description (traits will be inferred)
  -r, --traits <list>  Comma-separated trait keys (security,skeptical,thorough)
  -o, --output <fmt>   Output format: prompt (default), json, yaml, summary
  --timing <tier>      Timing scope: fast, standard (default), deep
  -l, --list           List all available traits
  -s, --save           Save composed agent to ~/.claude/custom-agents/
  --list-saved         List all saved custom agents
  --load <name>        Load a saved custom agent's prompt
  --delete <name>      Delete a saved custom agent
  -h, --help           Show this help

CONFIGURATION:
  Base traits:    ~/.claude/skills/Agents/Data/Traits.yaml
  User traits:    ~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/Agents/Traits.yaml
  Custom agents:  ~/.claude/custom-agents/

  User traits are merged over base (user takes priority).

EXAMPLES:
  # Infer traits from task and save
  bun run ComposeAgent.ts -t "Review this security architecture" --save

  # Specify traits explicitly
  bun run ComposeAgent.ts -r "security,skeptical,adversarial,thorough"

  # Save and get JSON output
  bun run ComposeAgent.ts -t "Analyze competitors" -o json --save

  # List saved custom agents
  bun run ComposeAgent.ts --list-saved

  # Load a saved agent
  bun run ComposeAgent.ts --load "security-skeptical"

  # Delete a saved agent
  bun run ComposeAgent.ts --delete "security-skeptical"

  # See all available traits (base + user merged)
  bun run ComposeAgent.ts --list

OUTPUT (json format includes):
  - name, traits, color
  - prompt (complete agent prompt)

  Colors are unique per trait combination - same traits always get same color.
`);
    return;
  }

  const traits = loadTraits();

  if (values.list) {
    listTraits(traits);
    return;
  }

  // Custom agent management commands
  if (values["list-saved"]) {
    listSavedAgents();
    return;
  }

  if (values.delete) {
    deleteAgent(values.delete);
    return;
  }

  if (values.load) {
    const agent = loadAgent(values.load, traits, values.task);
    if (!agent) process.exit(1);

    switch (values.output) {
      case "json":
        console.log(JSON.stringify({
          name: agent.name,
          traits: agent.traits,
          color: agent.color,
          prompt: agent.prompt,
        }, null, 2));
        break;
      case "summary":
        console.log(`LOADED AGENT: ${agent.name}`);
        console.log(`Traits: ${agent.traits.join(", ")}`);
        console.log(`Color: ${agent.color}`);
        break;
      default:
        console.log(agent.prompt);
    }
    return;
  }

  let traitKeys: string[] = [];

  if (values.traits) {
    traitKeys = values.traits.split(",").map((t) => t.trim().toLowerCase());
  }

  if (values.task) {
    const inferred = inferTraitsFromTask(values.task, traits);
    traitKeys = [...new Set([...traitKeys, ...inferred])];
  }

  if (traitKeys.length === 0) {
    console.error("Error: Provide --task or --traits to compose an agent");
    console.error("Use --help for usage information");
    process.exit(1);
  }

  const allTraitKeys = [
    ...Object.keys(traits.expertise),
    ...Object.keys(traits.personality),
    ...Object.keys(traits.approach),
  ];
  const invalidTraits = traitKeys.filter((t) => !allTraitKeys.includes(t));
  if (invalidTraits.length > 0) {
    console.error(`Error: Unknown traits: ${invalidTraits.join(", ")}`);
    console.error("Use --list to see available traits");
    process.exit(1);
  }

  const agent = composeAgent(traitKeys, values.task || "", traits, values.timing);

  // Save if requested
  if (values.save) {
    const savedPath = saveAgent(agent);
    console.error(`Saved custom agent to: ${savedPath}`);
  }

  switch (values.output) {
    case "json":
      console.log(
        JSON.stringify(
          {
            name: agent.name,
            traits: agent.traits,
            color: agent.color,
            expertise: agent.expertise.map((e) => e.name),
            personality: agent.personality.map((p) => p.name),
            approach: agent.approach.map((a) => a.name),
            prompt: agent.prompt,
          },
          null,
          2
        )
      );
      break;

    case "yaml":
      console.log(`name: "${agent.name}"`);
      console.log(`color: "${agent.color}"`);
      console.log(`traits: [${agent.traits.join(", ")}]`);
      break;

    case "summary":
      console.log(`COMPOSED AGENT: ${agent.name}`);
      console.log(`─────────────────────────────────────`);
      console.log(`Traits:      ${agent.traits.join(", ")}`);
      console.log(`Expertise:   ${agent.expertise.map((e) => e.name).join(", ") || "General"}`);
      console.log(`Personality: ${agent.personality.map((p) => p.name).join(", ")}`);
      console.log(`Approach:    ${agent.approach.map((a) => a.name).join(", ")}`);
      console.log(`Color:       ${agent.color}`);
      break;

    default:
      console.log(agent.prompt);
  }
}

main().catch(console.error);
