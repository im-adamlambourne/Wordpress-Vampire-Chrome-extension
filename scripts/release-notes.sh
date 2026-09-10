#!/bin/bash
# release-notes.sh — print the CHANGELOG.md section for one version, for GitHub release notes.
# Usage: ./scripts/release-notes.sh 0.9.0
# Exits non-zero when that version has no section, so a release is never cut with empty notes.

set -euo pipefail

version="${1:-}"
if [[ -z "$version" ]]; then
  echo "usage: $(basename "$0") <version>   # e.g. $(basename "$0") 0.9.0" >&2
  exit 64
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
changelog="$root/CHANGELOG.md"

# Everything between "## [<version>]" and the next "## " heading, blank lines trimmed.
notes="$(awk -v version="$version" '
  index($0, "## [" version "]") == 1 { found = 1; next }
  found && /^## / { exit }
  found { lines[++n] = $0 }
  END {
    first = 1
    while (first <= n && lines[first] ~ /^[[:space:]]*$/) first++
    last = n
    while (last >= first && lines[last] ~ /^[[:space:]]*$/) last--
    for (i = first; i <= last; i++) print lines[i]
  }
' "$changelog")"

if [[ -z "$notes" ]]; then
  echo "CHANGELOG.md has no '## [$version]' section, or it is empty." >&2
  echo "Move [Unreleased] into '## [$version] - YYYY-MM-DD' before releasing." >&2
  exit 1
fi

printf '%s\n' "$notes"
