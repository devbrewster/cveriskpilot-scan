#!/usr/bin/env bash

# Simulate typing effect
type_cmd() {
  local cmd="$1"
  for ((i=0; i<${#cmd}; i++)); do
    printf '%s' "${cmd:$i:1}"
    sleep 0.04
  done
  echo ""
}

clear
sleep 1

# Scene 1: Introduction
echo -e "\033[1;36m# CVERiskPilot — Pipeline Compliance Scanner\033[0m"
echo -e "\033[0;90m# One command. Three scanners. Six frameworks.\033[0m"
echo ""
sleep 2

# Scene 2: Install and scan
echo -e "\033[0;90m# Scan any project — no install needed\033[0m"
type_cmd "npx @cveriskpilot/scan --preset startup"
sleep 1

# Run the actual scan
npx @cveriskpilot/scan --preset startup 2>/dev/null
sleep 3

# Scene 3: Show framework presets
echo ""
echo -e "\033[0;90m# Choose your compliance scope\033[0m"
type_cmd "npx @cveriskpilot/scan --list-frameworks"
sleep 1
npx @cveriskpilot/scan --list-frameworks 2>/dev/null
sleep 3

# Scene 4: CI mode
echo ""
echo -e "\033[0;90m# Add to your CI/CD pipeline\033[0m"
type_cmd "npx @cveriskpilot/scan --preset defense --ci --fail-on high"
sleep 1
npx @cveriskpilot/scan --preset defense --ci --fail-on high 2>/dev/null || true
sleep 3

# Scene 5: Closing
echo ""
echo -e "\033[1;36m# Free. Local. No credit card.\033[0m"
echo -e "\033[1;36m# npmjs.com/package/@cveriskpilot/scan\033[0m"
echo -e "\033[0;90m# 100% Veteran Owned. Built in Texas.\033[0m"
sleep 4
