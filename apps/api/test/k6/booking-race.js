import { check } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { BASE_URL, ADMIN, createConcert, json, login, provisionUsers } from './lib.js';

/**
 * The scenario the brief asks about: a crowd goes for the last seats at the same moment.
 * Every virtual user fires one reservation at the same tiny concert, then the teardown reads
 * the row back and asserts the counter landed exactly on capacity.
 *
 *   k6 run apps/api/test/k6/booking-race.js
 *   k6 run -e SEATS=10 -e USERS=1000 apps/api/test/k6/booking-race.js
 *
 * The whole run comes from one IP, so the API has to be started with the rate limiter opened
 * up or most requests come back 429 instead of reaching the booking path:
 *
 *   AUTH_THROTTLE_LIMIT=100000 THROTTLE_LIMIT=1000000 docker compose up -d api
 */
const SEATS = Number(__ENV.SEATS || 10);
const USERS = Number(__ENV.USERS || 200);

// Losing the race is a correct outcome, not a failed request. 429 is also expected unless the
// API was started with a raised THROTTLE_LIMIT - the rate limiter sees one IP, not 1000 people.
http.setResponseCallback(http.expectedStatuses(200, 201, 409, 429));

const reserved = new Counter('seats_reserved');
const rejected = new Counter('seats_rejected');
const overbooked = new Counter('overbooked_seats');
const throttled = new Counter('rate_limited');

export const options = {
  scenarios: {
    everyone_at_once: {
      executor: 'per-vu-iterations',
      vus: USERS,
      iterations: 1,
      maxDuration: '2m',
    },
  },
  // Provisioning a large user pool is bcrypt-bound, so give setup room to finish.
  setupTimeout: '10m',
  teardownTimeout: '1m',
  thresholds: {
    checks: ['rate==1.0'],
    // The two numbers that matter: capacity was filled, and never exceeded.
    seats_reserved: [`count==${SEATS}`],
    overbooked_seats: ['count==0'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const adminToken = login(ADMIN.email, ADMIN.password);
  const concert = createConcert(adminToken, `k6 race ${Date.now()}`, SEATS);

  const tokens = provisionUsers(USERS, 'k6.race');

  console.log(`${USERS} users are about to fight over ${SEATS} seats`);

  return { adminToken, tokens, concertId: concert.id };
}

export default function (data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];

  const response = http.post(
    `${BASE_URL}/reservations`,
    JSON.stringify({ concertId: data.concertId }),
    json(token),
  );

  // 201 = got a seat, 409 = the concert was already full. Anything else is a bug.
  check(response, {
    'reservation resolved cleanly (201, 409 or 429)': (r) =>
      r.status === 201 || r.status === 409 || r.status === 429,
    'no server error under contention': (r) => r.status < 500,
  });

  if (response.status === 201) {
    reserved.add(1);
  } else if (response.status === 429) {
    throttled.add(1);
  } else {
    rejected.add(1);
  }
}

export function teardown(data) {
  const concert = http
    .get(`${BASE_URL}/concerts/${data.concertId}`, json(data.adminToken))
    .json();

  const surplus = Math.max(0, concert.reservedSeats - concert.totalSeats);
  overbooked.add(surplus);

  console.log(
    `final state: reserved=${concert.reservedSeats} capacity=${concert.totalSeats} available=${concert.availableSeats}`,
  );

  check(concert, {
    'reserved seats never exceed capacity': (c) => c.reservedSeats <= c.totalSeats,
    'every seat was taken': (c) => c.reservedSeats === c.totalSeats,
    'concert reports itself sold out': (c) => c.isSoldOut === true,
  });

  http.del(`${BASE_URL}/concerts/${data.concertId}`, null, json(data.adminToken));
}
