import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const ttfb = new Trend('ttfb', true);

export const options = {
  scenarios: {
    // Ramp up to 100 concurrent users
    launch_page: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 25 },   // Warm up
        { duration: '15s', target: 50 },   // Half load
        { duration: '20s', target: 100 },  // Full load — 100 testers
        { duration: '30s', target: 100 },  // Sustain 100 users
        { duration: '10s', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests under 3s
    http_req_failed: ['rate<0.05'],     // Less than 5% failure rate
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Hit the launch page (SSR render)
  const launchRes = http.get(`${BASE_URL}/launch`, {
    tags: { name: 'GET /launch' },
  });

  check(launchRes, {
    'launch page status 200': (r) => r.status === 200,
    'launch page has content': (r) => r.body && r.body.length > 1000,
    'launch page contains hero': (r) => r.body && r.body.includes('8,000 CVEs'),
    'launch page contains pricing': (r) => r.body && r.body.includes('$29'),
    'launch page TTFB < 2s': (r) => r.timings.waiting < 2000,
  }) || errorRate.add(1);

  ttfb.add(launchRes.timings.waiting);

  // 2. Simulate the founders-spots API call (fires on page load)
  const spotsRes = http.get(`${BASE_URL}/api/billing/founders-spots`, {
    tags: { name: 'GET /api/billing/founders-spots' },
  });

  check(spotsRes, {
    'founders-spots status 200': (r) => r.status === 200,
    'founders-spots has remaining': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.remaining !== undefined;
      } catch {
        return false;
      }
    },
    'founders-spots TTFB < 500ms': (r) => r.timings.waiting < 500,
  }) || errorRate.add(1);

  // 3. Simulate clicking "Get API Key" → /buy page
  const buyRes = http.get(`${BASE_URL}/buy`, {
    tags: { name: 'GET /buy' },
  });

  check(buyRes, {
    'buy page status 200': (r) => r.status === 200,
    'buy page has content': (r) => r.body && r.body.length > 500,
  }) || errorRate.add(1);

  // 4. Simulate clicking "Try it now" → scroll to #get-started (same page, no request)
  // 5. Simulate signup link click
  const signupRes = http.get(`${BASE_URL}/signup`, {
    tags: { name: 'GET /signup' },
  });

  check(signupRes, {
    'signup page status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  // Think time between 1-3 seconds (simulates real user behavior)
  sleep(Math.random() * 2 + 1);
}
