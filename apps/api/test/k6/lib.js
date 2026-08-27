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
