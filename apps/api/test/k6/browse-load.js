import { check } from 'k6';
import http from 'k6/http';
import { BASE_URL, ADMIN, json, login } from './lib.js';

/**
 * Read-heavy load on the listing endpoint, which is what a real audience does before a drop.
 * Useful for spotting N+1 queries and missing indexes as the dataset grows.
 *
 *   k6 run apps/api/test/k6/browse-load.js
 */
export const options = {
  scenarios: {
    browsing: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: __ENV.RAMP || '20s', target: Number(__ENV.VUS || 50) },
        { duration: __ENV.HOLD || '40s', target: Number(__ENV.VUS || 50) },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
  },
};

export function setup() {
  return { token: login(ADMIN.email, ADMIN.password) };
}

export default function (data) {
  const page = 1 + (__ITER % 3);

  const listing = http.get(`${BASE_URL}/concerts?page=${page}&limit=9`, json(data.token));
  check(listing, {
    'listing returns 200': (r) => r.status === 200,
    'listing is paginated': (r) => r.json('meta.page') === page,
  });

  const stats = http.get(`${BASE_URL}/concerts/stats`, json(data.token));
  check(stats, { 'stats return 200': (r) => r.status === 200 });
}
