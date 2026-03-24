# PAI Releases

Complete `.claude/` directories ready to install. Copy the release, run the installer, restart Claude Code.

## Current Release

### v4.4.0 — Voice Removal & Install Hardening

- Voice/TTS system fully removed
- BuildSettings.ts env-var expansion at build time
- Hook execute-bit fixes
- Algorithm v3.9.0
- Full doc cleanup

**[Get v4.4.0 →](v4.4.0/)**

## Installation

```bash
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git
cd Personal_AI_Infrastructure/Releases/v4.4.0
cp -r .claude ~/ && cd ~/.claude && bash install.sh
```

See the [main README](../README.md#-installation) for full instructions and upgrade path.

> **Note:** Previous releases (v2.3–v4.3.1) were removed to reduce repo size. All history is preserved in git.
