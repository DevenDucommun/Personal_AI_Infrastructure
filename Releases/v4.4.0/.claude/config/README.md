# PAI Configuration Files

This directory contains the **source of truth** for PAI configuration. Edit files here,
then run `BuildSettings.ts` to regenerate `settings.json`.

```
bun ~/.claude/hooks/handlers/BuildSettings.ts
```

`settings.json` is also auto-rebuilt at each SessionStart if any config file is newer.

## Domain Files (JSONC — supports `//` and `/* */` comments)

| File | Contents |
|------|----------|
| `identity.jsonc` | `daidentity` (name, color, personality) + `principal` (name, timezone) |
| `hooks.jsonc` | `hooks` (all lifecycle registrations) + `statusLine` |
| `permissions.jsonc` | `permissions` (allow / deny / ask lists) |
| `notifications.jsonc` | `notifications` (ntfy, Discord, Twilio routing) |
| `preferences.jsonc` | `env`, `memory`, `techStack`, `mcpServers`, and all other settings |

## Spinner Data Files (Plain JSON arrays)

| File | Contents |
|------|----------|
| `spinner-verbs.json` | Custom loading verbs (personality text shown while Claude thinks) |
| `spinner-tips.json` | Feature tips shown in the spinner UI |

These are injected by `BuildSettings.ts` into `settings.json > spinnerVerbs.verbs`
and `settings.json > spinnerTipsOverride.tips`.

## Relationship to settings.json

`settings.json` is a **generated file** — do not edit it directly.

**Build strategy: FULL REBUILD (not merge).** `BuildSettings.ts` reads all config
files, expands `${PAI_DIR}` variables, and writes a complete new `settings.json`
via spread-merge:

```typescript
{ ...preferences, ...permissions, ...identity, ...hooks, ...notifications,
  spinnerVerbs, spinnerTipsOverride, counts, feedbackSurveyState }
```

The `counts` section is initialized to zeros on each rebuild — `UpdateCounts.hook.ts`
populates it at runtime. Any manual edits to `settings.json` will be lost on
the next SessionStart (which triggers a rebuild if config files are newer).

```
config/*.jsonc  ──┐
config/spinner-*.json  ──┤  BuildSettings.ts  ──→  settings.json (complete replacement)
generated counts/state ──┘
```
