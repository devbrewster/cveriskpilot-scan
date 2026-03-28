# Social Media Updates

Structured post queue for LinkedIn and X.com. The current in-repo publisher
reads from `queue/`, posts approved X items, then moves fully published files
to `published/`.

## Folder Layout

```
social/
  config.json       Bot configuration: platforms, handles, limits, rules
  queue/            Posts approved and ready to publish
  published/        Archive of posted content (moved here by bot after posting)
  drafts/           Work in progress — not yet reviewed or approved
```

## Post Lifecycle

```
drafts/  →  (human review + approval)  →  queue/  →  (bot posts)  →  published/
```

1. **Create a draft** in `drafts/` using the filename format `YYYY-MM-DD-slug.json`
2. **Set `status: "ready"`** and fill both `linkedin.content` and `x.content` when the post is approved
3. **Move to `queue/`** — the X publisher will pick it up on its next run
4. The publisher records timestamps and post IDs, then moves fully published files to `published/`

## Post Schema

Each file is a JSON object:

```json
{
  "id": "YYYY-MM-DD-slug",
  "created_at": "YYYY-MM-DD",
  "type": "release | feature | fix | security | progress | announcement",
  "status": "draft | ready | published",
  "source": {
    "release": "v2.0.2-beta",
    "changelog_heading": "## 2026-03-17 — Beta 2.0.2",
    "evidence_paths": ["apps/web/src/lib/release-metadata.json", "CHANGELOG.md"]
  },
  "platforms": {
    "linkedin": {
      "status": "draft | ready | published",
      "content": "Post body — no character limit but aim for 600–1200 chars",
      "character_count": 0,
      "post_id": null,
      "published_at": null
    },
    "x": {
      "status": "draft | ready | published",
      "content": "Post body — 280 char limit",
      "character_count": 0,
      "post_id": null,
      "published_at": null
    }
  },
  "hashtags": ["#CVERiskPilot"],
  "approved_by": null,
  "published_at": null
}
```

## Posting Rules

- Do not claim a feature is live unless it appears in `currentRelease` or the public changelog
- Do not claim a patch is shipped until release metadata promotes it and deployment evidence exists
- X posts must stay at or under 280 characters (URLs count as 23)
- LinkedIn posts should be professional tone — use the highlights and trust signals from `release-metadata.json` as the source of truth
- `approved_by` must be set before a post moves from `drafts/` to `queue/`
- The bot must never post a file with `status: "draft"` — only `"ready"`
- The current in-repo automation only publishes `platforms.x` content. LinkedIn
  copy remains manual or scheduler-driven.
- Native X polls still require manual posting until the queue schema includes a
  poll payload the publisher can send safely.

## Triggering New Posts

When a notable change lands — patch release, security fix, new feature, CI/CD
milestone — create a new draft in `drafts/` referencing the commit, task, or
changelog entry as the source. See `config.json` for cadence guidance.

## Commands

From the repo root:

```bash
npm run social:preflight:x -- --id YYYY-MM-DD-slug
npm run social:push:x -- --id YYYY-MM-DD-slug
npm run social:publish:x -- --dry-run
npm run social:publish:x
```

`social:preflight:x` validates the queued post, checks required X credentials,
and confirms the authenticated account before publishing anything.

`social:push:x` runs the same preflight and then hands off to the live publisher
for the selected queue item.

`--dry-run` validates queued posts without requiring X credentials or making
live posts.
