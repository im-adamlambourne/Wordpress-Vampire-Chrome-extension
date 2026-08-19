#!/bin/bash
# package-cws.sh — ZIP for Chrome Web Store upload (runtime files only).

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

version="$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")"
name="content-studio-plugin"
output_dir="$root/dist"
output="$output_dir/${name}-v${version}.zip"

mkdir -p "$output_dir"
rm -f "$output"

zip -r "$output" \
  manifest.json \
  background \
  content \
  popup \
  offscreen \
  icons \
  assets \
  -x "*.DS_Store" \
  -x "offscreen/src/*"

echo "Packaged: $output ($(du -h "$output" | cut -f1))"
echo "Upload this ZIP at https://chrome.google.com/webstore/devconsole"
echo "Do not include .git, docs, or CHROMEWEBSTORE.md — this script already omits them."
