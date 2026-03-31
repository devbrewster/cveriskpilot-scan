# CVERiskPilot — Founders Beta Launch Checklist

## Launch Target: Week of 2026-04-07

### Pre-Launch Go/No-Go (2026-04-04)

#### Infrastructure
- [ ] Cloud Run healthy (`/api/health` returns 200)
- [ ] Database migrated (mfaBackupCodes + indexes)
- [ ] Redis cache operational
- [ ] Stripe webhooks verified (test mode → live mode)
- [ ] DNS and SSL certificates valid
- [ ] Cloud Armor WAF rules active
- [ ] Error monitoring alerts configured

#### Application
- [ ] Signup flow tested end-to-end (email, Google OAuth, GitHub OAuth)
- [ ] Upload + parse tested with all 11 formats
- [ ] AI triage tested (billing gates active)
- [ ] Pricing page loads correctly with all tiers
- [ ] Onboarding checklist displays for new users
- [ ] Demo mode accessible without auth
- [ ] Export (CSV, PDF) functional
- [ ] Email delivery verified (Resend/SMTP)

#### Security
- [ ] RBAC enforced on all 140+ API routes
- [ ] CSRF protection active on all mutations
- [ ] Rate limiting on auth endpoints
- [ ] No secrets in client bundles
- [ ] CSP headers correct
- [ ] Audit logging functional

#### Content
- [ ] Landing page copy finalized
- [ ] Blog post "We Scanned Ourselves" published
- [ ] Product Hunt ship page claimed
- [ ] Social media queue loaded (7+ posts)
- [ ] OG images and Twitter cards working

---

### Launch Day Timeline (2026-04-07)

| Time (CT) | Action | Owner |
|-----------|--------|-------|
| 06:00 | Final health check — all endpoints green | Auto |
| 06:30 | Switch Stripe to live mode | Founder |
| 07:00 | Product Hunt launch goes live | Founder |
| 07:15 | First social media post (announcement) | Auto |
| 07:30 | Email to waitlist: "We're live" | Manual |
| 08:00 | Monitor PH upvotes and early signups | Founder |
| 09:00 | Second social post (demo video/GIF) | Auto |
| 12:00 | LinkedIn post with launch story | Manual |
| 14:00 | Third social post (feature highlight) | Auto |
| 17:00 | Reply to all PH comments | Founder |
| 20:00 | Day 1 metrics snapshot | Auto |

---

### Day 1 Success Metrics

| Metric | Target | Stretch |
|--------|--------|---------|
| Product Hunt upvotes | 50 | 150 |
| Signups (free) | 10 | 30 |
| Paid conversions | 1 | 3 |
| Landing page visits | 500 | 2,000 |
| CLI installs (npx) | 20 | 100 |
| Social impressions | 5,000 | 20,000 |

---

### Week 1 Success Metrics

| Metric | Target | Stretch |
|--------|--------|---------|
| Total signups | 30 | 100 |
| Founders Beta ($29) | 5 | 15 |
| Pro trial starts | 2 | 5 |
| Scans uploaded | 50 | 200 |
| MRR | $145 | $435 |
| GitHub stars (scan CLI) | 10 | 50 |

---

### Post-Launch (Week 1)

- [ ] Reply to every Product Hunt comment within 4 hours
- [ ] Daily social post from queued content
- [ ] Monitor error rates and fix any production issues
- [ ] Collect feedback from first 5 users
- [ ] Write "Lessons from Launch Day" blog post
- [ ] Send follow-up email to signups who haven't uploaded

---

### Contingency Plans

| Issue | Response |
|-------|----------|
| Site goes down | Cloud Run auto-scales; manual restart via `gcloud run services update` |
| Stripe webhooks fail | Check Cloud Run logs; manual tier assignment via admin API |
| AI API rate-limited | Anthropic rate limits are generous; degrade to manual triage |
| Security incident | Revoke sessions via `/api/auth/revoke-sessions`; enable IP allowlist |
| Negative PH reviews | Respond professionally; fix cited issues within 24h |
| Zero signups | Increase social posting frequency; direct outreach to 10 GRC contacts |

---

### Marketing Channels — Launch Week

1. **Product Hunt** — Primary launch vehicle
2. **X/Twitter** — 23 posts scheduled (pipeline-compliance-campaign.md)
3. **LinkedIn** — 5 posts (founder story, product demo, compliance focus)
4. **Hacker News** — "Show HN: AI-powered vulnerability management" (Day 2-3)
5. **Reddit** — r/cybersecurity, r/netsec, r/devops (Day 2-3)
6. **Dev.to** — Cross-post blog articles
7. **Direct outreach** — 10 target GRC teams from network
