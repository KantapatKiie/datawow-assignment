import http from 'k6/http';
import { fail } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api';

export const ADMIN = {
  email: __ENV.ADMIN_EMAIL || 'admin@datawow.io',
  password: __ENV.ADMIN_PASSWORD || 'Admin@1234',
};

export const json = (token) => ({
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});

export function login(email, password) {
  const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email, password }), json());

  if (response.status !== 200) {
    fail(`login failed for ${email}: ${response.status} ${response.body}`);
  }

  return response.json('accessToken');
}

export function registerOrLogin(email, name, password) {
  const response = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, name, password }),
    json(),
  );

  if (response.status === 201) {
    return response.json('accessToken');
  }

  // 409 means the account survived an earlier run, which is fine.
  if (response.status === 409) {
    return login(email, password);
  }

  fail(`register failed for ${email}: ${response.status} ${response.body}`);
}

export function createConcert(adminToken, name, totalSeats) {
  const response = http.post(
    `${BASE_URL}/concerts`,
    JSON.stringify({
      name,
      description: 'Concert created by the k6 load test, safe to delete.',
      totalSeats,
    }),
    json(adminToken),
  );

  if (response.status !== 201) {
    fail(`could not create concert: ${response.status} ${response.body}`);
  }

  return response.json();
}

/**
 * Signs a pool of load-test accounts in. Registration is bcrypt-bound, so the requests are
 * batched instead of sent one at a time - a thousand sequential calls would blow past the
 * default setup timeout. Accounts left over from a previous run come back as 409 and are
 * logged in instead.
 */
export function provisionUsers(count, prefix, password = 'Passw0rd1', batchSize = 50) {
  const tokens = new Array(count);
  const needsLogin = [];

  for (let start = 0; start < count; start += batchSize) {
    const end = Math.min(start + batchSize, count);
    const requests = [];

    for (let i = start; i < end; i++) {
      requests.push([
        'POST',
        `${BASE_URL}/auth/register`,
        JSON.stringify({
          email: `${prefix}${i}@test.io`,
          name: `${prefix} ${i}`,
          password,
        }),
        json(),
      ]);
    }

    const responses = http.batch(requests);

    responses.forEach((response, offset) => {
      const index = start + offset;
      if (response.status === 201) {
        tokens[index] = response.json('accessToken');
      } else if (response.status === 409) {
        needsLogin.push(index);
      } else {
        fail(`register failed for ${prefix}${index}: ${response.status} ${response.body}`);
      }
    });
  }

  for (let start = 0; start < needsLogin.length; start += batchSize) {
    const slice = needsLogin.slice(start, start + batchSize);
    const responses = http.batch(
      slice.map((index) => [
        'POST',
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email: `${prefix}${index}@test.io`, password }),
        json(),
      ]),
    );

    responses.forEach((response, offset) => {
      if (response.status !== 200) {
        fail(`login failed for ${prefix}${slice[offset]}: ${response.status} ${response.body}`);
      }
      tokens[slice[offset]] = response.json('accessToken');
    });
  }

  return tokens;
}
