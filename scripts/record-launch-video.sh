#!/usr/bin/env bash
#
# Product Hunt Launch Video — Master Script
#
# Records both terminal CLI demo and browser walkthrough,
# then provides instructions for stitching into a single video.
#
# Usage:
#   bash scripts/record-launch-video.sh              # both recordings
#   bash scripts/record-launch-video.sh --terminal    # terminal only
#   bash scripts/record-launch-video.sh --browser     # browser only
#
# Output:
#   social/assets/terminal-demo.gif     (terminal recording)
#   social/assets/browser-demo/*.webm   (browser recording)
#

set -euo pipefail

ROOT="/home/gonti/cveriskpilot"
OUT="$ROOT/social/assets"
MODE="${1:-both}"

mkdir -p "$OUT"

echo "════════════════════════════════════════════"
echo "  CVERiskPilot — Launch Video Recorder"
echo "════════════════════════════════════════════"
echo ""

# ─── Terminal Demo ───
if [ "$MODE" = "both" ] || [ "$MODE" = "--terminal" ]; then
  echo "▶ PART 1: Terminal Demo"
  echo "  This records the CLI scan in action."
  echo ""

  # Check if terminalizer is available
  if command -v terminalizer &>/dev/null || npx terminalizer --version &>/dev/null 2>&1; then
    echo "  Starting terminalizer recording..."
    echo "  → Run the demo commands when the terminal opens"
    echo "  → Press Ctrl+D when finished"
    echo ""
    npx terminalizer record terminal-demo \
      --config "$ROOT/scripts/record-terminal-demo.yml" \
      --skip-sharing
    echo ""
    echo "  Rendering GIF..."
    npx terminalizer render terminal-demo -o "$OUT/terminal-demo.gif"
    echo "  ✓ Terminal demo saved: $OUT/terminal-demo.gif"
  else
    echo "  Terminalizer not found. Manual recording:"
    echo ""
    echo "  Option A — Use Loom / OBS / Win+G:"
    echo "    1. Start screen recording"
    echo "    2. Run: bash scripts/demo-commands.sh"
    echo "    3. Stop recording"
    echo ""
    echo "  Option B — Install terminalizer:"
    echo "    npm install -g terminalizer"
    echo "    bash scripts/record-launch-video.sh --terminal"
    echo ""

    # Generate the demo commands script anyway
    bash "$ROOT/scripts/record-terminal-demo.sh" 2>/dev/null || true
  fi
  echo ""
fi

# ─── Browser Demo ───
if [ "$MODE" = "both" ] || [ "$MODE" = "--browser" ]; then
  echo "▶ PART 2: Browser Walkthrough"
  echo ""

  # Check if dev server is running
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null | grep -q "200"; then
    echo "  Dev server detected at localhost:3000"
    echo "  Recording browser walkthrough..."
    node "$ROOT/scripts/record-browser-demo.mjs"
    echo "  ✓ Browser demo saved: $OUT/browser-demo/"
  else
    echo "  ⚠ Dev server not running at localhost:3000"
    echo ""
    echo "  Option A — Start dev server first:"
    echo "    npm run dev &"
    echo "    bash scripts/record-launch-video.sh --browser"
    echo ""
    echo "  Option B — Record against production:"
    echo "    node scripts/record-browser-demo.mjs --url https://cveriskpilot.com"
    echo ""
  fi
  echo ""
fi

# ─── Stitching Instructions ───
echo "════════════════════════════════════════════"
echo "  STITCHING INTO FINAL VIDEO"
echo "════════════════════════════════════════════"
echo ""
echo "  Recommended final video: 60-90 seconds"
echo ""
echo "  Structure:"
echo "    0:00-0:05  Title card (CVERiskPilot logo + tagline)"
echo "    0:05-0:25  Terminal: npx scan running with results"
echo "    0:25-0:35  PR comment screenshot (social/assets/screenshot-pr-comment.png)"
echo "    0:35-0:55  Browser: landing page → docs → dashboard demo"
echo "    0:55-1:00  CTA: Free CLI + URL"
echo ""
echo "  Option A — ffmpeg (if available):"
echo "    ffmpeg -i $OUT/browser-demo/*.webm -c:v libx264 $OUT/browser-demo.mp4"
echo "    # Then stitch with terminal GIF in any video editor"
echo ""
echo "  Option B — Loom:"
echo "    1. Open terminal, run: bash scripts/demo-commands.sh"
echo "    2. Switch to browser, walk through the site"
echo "    3. Loom records both in one take"
echo ""
echo "  Option C — CapCut / iMovie / DaVinci Resolve:"
echo "    Import terminal-demo.gif + browser-demo.mp4"
echo "    Add title card + CTA slides"
echo "    Export as MP4 (1920x1080, 30fps)"
echo ""
echo "  Product Hunt specs:"
echo "    Format: MP4 or GIF"
echo "    Max size: 50MB"
echo "    Recommended: 1920x1080, under 2 minutes"
echo ""
