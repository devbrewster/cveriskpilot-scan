# CVERiskPilot Security Pentest Suite

## Quick Start

```bash
# 1. Start the app
npm run dev

# 2. Run the full pentest (default: http://localhost:3000)
chmod +x tests/security/pentest-runbook.sh
./tests/security/pentest-runbook.sh

# 3. Against a different target
./tests/security/pentest-runbook.sh https://staging.example.com
```

## What It Tests

| Phase | Tests | Attack Surface |
|-------|-------|----------------|
| 1 | Auth bypass, session forgery, CSRF, rate limits | Authentication layer |
| 2 | IDOR, cross-tenant access, bulk exfil, config takeover | Data access controls |
| 3 | Path traversal, XSS/CSV injection, DoS, proto pollution | Upload + parser pipeline |
| 4 | Prompt injection, input validation, info disclosure | AI/LLM subsystem |
| 5 | Security headers, CSP, HSTS | HTTP infrastructure |
| 6 | Full attack chains combining multiple vulns | End-to-end exploitation |

## Results

- Reports saved to `tests/security/results/pentest_TIMESTAMP.log`
- Test payloads saved to `tests/security/results/payloads/`
- Exit code 1 = vulnerabilities found, 0 = all passed

## Manual Testing Guide

See `manual-tests.md` for exploit chains that require browser interaction
or multi-step sequences that can't be fully automated.
