#!/usr/bin/env bash
#
# Daily X Content Pipeline
#
# Generates drafts via Claude API research, saves to social/drafts/auto-generated/
# Drafts require manual approval before publishing.
#
# Usage:
#   ./scripts/daily-x-pipeline.sh              # generate drafts (default)
#   ./scripts/daily-x-pipeline.sh --autopublish # generate + auto-publish approved posts
#
# Cron (6 AM EST daily):
#   0 11 * * * cd /home/gonti/cveriskpilot && bash scripts/daily-x-pipeline.sh >> social/logs/daily-pipeline.log 2>&1
#

set -euo pipefail

ROOT="/home/gonti/cveriskpilot"
cd "$ROOT"

DATE=$(date -u +%Y-%m-%d)
LOG_DIR="$ROOT/social/logs"
DRAFT_DIR="$ROOT/social/drafts/auto-generated"
QUEUE_DIR="$ROOT/social/queue"

mkdir -p "$LOG_DIR" "$DRAFT_DIR"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"
}

log "=== Daily X Pipeline — $DATE ==="

# Step 1: Research + generate drafts
log "Step 1: Researching trending topics and generating drafts..."
node scripts/research-and-draft-x.mjs --count 10

DRAFT_FILE="$DRAFT_DIR/$DATE.json"
if [ ! -f "$DRAFT_FILE" ]; then
  log "ERROR: Draft file not created at $DRAFT_FILE"
  exit 1
fi

POST_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$DRAFT_FILE','utf8')).length)")
log "Generated $POST_COUNT drafts at $DRAFT_FILE"

# Step 2: Approve and queue drafts
if [ "${1:-}" = "--autopublish" ]; then
  log "Step 2: Auto-approving drafts and copying to queue..."
  QUEUE_FILE="$QUEUE_DIR/auto-$DATE.json"

  # Approve all drafts: set status=ready, approved_by=autopilot
  node -e "
    const fs = require('fs');
    const posts = JSON.parse(fs.readFileSync('$DRAFT_FILE', 'utf8'));
    const approved = posts.map(p => ({
      ...p,
      status: 'ready',
      approved_by: 'autopilot',
      platforms: {
        x: { ...p.platforms.x, status: 'ready' }
      }
    }));
    fs.writeFileSync('$QUEUE_FILE', JSON.stringify(approved, null, 2) + '\n');
  "
  APPROVED_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$QUEUE_FILE','utf8')).length)")
  log "Approved $APPROVED_COUNT posts -> $QUEUE_FILE"

  # Step 3: Publish at 30 min intervals
  log "Step 3: Publishing $APPROVED_COUNT posts at 30 min intervals..."
  node scripts/scheduled-x-publish.mjs --file "$QUEUE_FILE" --interval 30
else
  log "Step 2: Skipped auto-publish (manual mode)"
  log ""
  log "To review and publish:"
  log "  1. Review drafts:  cat $DRAFT_FILE"
  log "  2. Approve posts:  edit status to 'ready', set approved_by"
  log "  3. Copy to queue:  cp $DRAFT_FILE $QUEUE_DIR/auto-$DATE.json"
  log "  4. Publish:        npm run social:schedule:x -- --file $QUEUE_DIR/auto-$DATE.json"
fi

log "=== Pipeline complete ==="
