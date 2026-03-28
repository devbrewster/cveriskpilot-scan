# Marketing State

This directory holds tracked policy plus regenerated local-only artifacts for the
marketing and social publishing worker agents.

## Tracked Files

- `publishing-policy.json`: cadence, role, and source-of-truth policy
- `x-monetization-tracker.json`: manual scoreboard for verified followers, rolling impressions, and weekly pace toward X monetization eligibility

## Generated Files

The generator writes runtime artifacts under `state/marketing/generated/`:

- `current.json`
- `overview.md`
- `x-drafts.md`
- one brief per marketing worker role

Those generated files are git-ignored because they should always be recreated
from the current repo truth before review or publishing.
