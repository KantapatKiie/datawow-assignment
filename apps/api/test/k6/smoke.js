import { check, sleep } from 'k6';
import http from 'k6/http';
import { BASE_URL, ADMIN, createConcert, json, login, registerOrLogin } from './lib.js';

/**
 * Smallest possible pass/fail run: is the deployment healthy and does the happy path work?
 * Meant for CI and for a quick check after `docker compose up`.
 *
 *   k6 run apps/api/test/k6/smoke.js
 */
// This run deliberately exercises the rejection paths, so 400/403/409 count as expected
// responses. Anything outside this list moves http_req_failed and trips the threshold.
http.setResponseCallback(http.expectedStatuses(200, 201, 400, 403, 409));

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export function setup() {
  const adminToken = login(ADMIN.email, ADMIN.password);
  const concert = createConcert(adminToken, `k6 smoke ${Date.now()}`, 5);
  const userToken = registerOrLogin('k6.smoke@test.io', 'K6 Smoke', 'Passw0rd1');

  return { adminToken, userToken, concertId: concert.id };
}

export default function (data) {
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health returns 200': (r) => r.status === 200,
    'health reports ok': (r) => r.json('status') === 'ok',
  });

  const concerts = http.get(`${BASE_URL}/concerts?limit=10`, json(data.userToken));
  check(concerts, {
    'concerts returns 200': (r) => r.status === 200,
    'concerts are paginated': (r) => Array.isArray(r.json('items')),
  });

  const reserve = http.post(
    `${BASE_URL}/reservations`,
    JSON.stringify({ concertId: data.concertId }),
    json(data.userToken),
  );
  check(reserve, { 'reserve returns 201': (r) => r.status === 201 });

  const duplicate = http.post(
    `${BASE_URL}/reservations`,
    JSON.stringify({ concertId: data.concertId }),
    json(data.userToken),
  );
  check(duplicate, { 'a second seat is rejected with 409': (r) => r.status === 409 });

  const forbidden = http.post(
    `${BASE_URL}/concerts`,
    JSON.stringify({ name: 'not allowed', description: 'user must not create', totalSeats: 10 }),
    json(data.userToken),
  );
  check(forbidden, { 'a USER cannot create a concert': (r) => r.status === 403 });

  const invalid = http.post(
    `${BASE_URL}/concerts`,
    JSON.stringify({ name: 'x', description: 'short', totalSeats: 0 }),
    json(data.adminToken),
  );
  check(invalid, {
    'invalid payload returns 400': (r) => r.status === 400,
    'validation errors are listed': (r) => Array.isArray(r.json('message')),
  });

  const cancel = http.del(`${BASE_URL}/reservations/${reserve.json('id')}`, null, json(data.userToken));
  check(cancel, { 'cancel returns 200': (r) => r.status === 200 });

  sleep(0.2);
}

export function teardown(data) {
  http.del(`${BASE_URL}/concerts/${data.concertId}`, null, json(data.adminToken));
}
