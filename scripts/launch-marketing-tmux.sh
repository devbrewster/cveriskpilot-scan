#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
SCRIPT_PATH=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")
MANIFEST_PATH="$ROOT/state/marketing/generated/current.json"
SESSION_NAME=${MARKETING_AGENT_SESSION_NAME:-marketing-agents}
TMUX_SOCKET=${AGENT_MESH_TMUX_SOCKET:-/tmp/cveriskpilot-agent-mesh.sock}
ATTACH=0

tmux_cmd() {
  tmux -S "$TMUX_SOCKET" "$@"
}

show_usage() {
  cat <<'EOF'
Usage:
  ./scripts/launch-marketing-tmux.sh [--attach]
  ./scripts/launch-marketing-tmux.sh __show <title> <path>
EOF
}

if [[ "${1:-}" == "__show" ]]; then
  TITLE=${2:-}
  FILE_PATH=${3:-}

  if [[ -z "$TITLE" || -z "$FILE_PATH" ]]; then
    echo "Missing title or file path." >&2
    exit 1
  fi

  cd "$ROOT"
  printf '%s\nFile: %s\n\n' "$TITLE" "$FILE_PATH"
  sed -n '1,240p' "$FILE_PATH"
  printf '\nPress Ctrl+D when you are done with this shell.\n'
  exec bash
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --attach)
      ATTACH=1
      shift
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      echo "Unexpected argument: $1" >&2
      show_usage >&2
      exit 1
      ;;
  esac
done

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required but was not found on PATH." >&2
  exit 1
fi

node "$ROOT/scripts/marketing-agent-tasker.mjs" generate >/dev/null

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "Marketing manifest not found: $MANIFEST_PATH" >&2
  exit 1
fi

OVERVIEW_PATH=$(node -e 'const fs = require("fs"); const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(manifest.overview.absolute_path);' "$MANIFEST_PATH")
DRAFTS_PATH=$(node -e 'const fs = require("fs"); const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(manifest.drafts.absolute_path);' "$MANIFEST_PATH")

if tmux_cmd has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Marketing session already running: $SESSION_NAME"
else
  printf -v WATCH_COMMAND '%q -lc %q' "bash" "cd '$ROOT' && node scripts/marketing-agent-tasker.mjs watch"
  printf -v OVERVIEW_COMMAND '%q __show %q %q' "$SCRIPT_PATH" "Marketing Overview" "$OVERVIEW_PATH"
  printf -v DRAFTS_COMMAND '%q __show %q %q' "$SCRIPT_PATH" "X Draft Queue" "$DRAFTS_PATH"

  tmux_cmd new-session -d -s "$SESSION_NAME" -n watch "$WATCH_COMMAND"
  tmux_cmd new-window -t "$SESSION_NAME:" -n overview "$OVERVIEW_COMMAND"
  tmux_cmd new-window -t "$SESSION_NAME:" -n drafts "$DRAFTS_COMMAND"

  while IFS=$'\t' read -r ROLE BRIEF_PATH; do
    WINDOW_NAME=${ROLE//_/-}
    printf -v BRIEF_COMMAND '%q __show %q %q' "$SCRIPT_PATH" "$ROLE" "$BRIEF_PATH"
    tmux_cmd new-window -t "$SESSION_NAME:" -n "$WINDOW_NAME" "$BRIEF_COMMAND"
  done < <(
    node -e 'const fs = require("fs"); const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); for (const entry of manifest.role_briefs) { process.stdout.write(`${entry.role}\t${entry.absolute_path}\n`); }' "$MANIFEST_PATH"
  )

  echo "Started marketing session: $SESSION_NAME"
fi

if [[ "$ATTACH" -eq 1 ]]; then
  exec tmux_cmd attach -t "$SESSION_NAME"
fi

echo "Attach with: tmux -S $TMUX_SOCKET attach -t $SESSION_NAME"
