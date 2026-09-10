# Content Studio Chrome Plugin

Codename **Vampire**. Read and follow [`AGENTS.md`](AGENTS.md). Treat `.agents/skills/` as required plugins (Chrome Extensions and Modern Web Guidance) before changing code.

## Documentation

- [`README.md`](README.md) is the high-level product overview for humans (what it does, supported editors, sign-in, local setup). Keep it accurate when behaviour, hosts, post types, or login change.
- [`AGENTS.md`](AGENTS.md) is architecture and contributor notes. Keep it in step with the README for product name, supported surfaces, and where login and other docs live.

## Changelog (required)

Every change must be added to [`CHANGELOG.md`](CHANGELOG.md) in the same change. Put a bullet under `[Unreleased]` (`Added`, `Changed`, `Fixed`, `Removed`, or `Security`). When bumping `manifest.json` `version`, move `[Unreleased]` into a new `## [x.y.z] - YYYY-MM-DD` heading that matches the manifest. Do not finish a task with a stale changelog.
