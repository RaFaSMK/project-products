import http from 'k6/http';
import { check, sleep } from 'k6';
import { loginAdmin } from './auth.js';

// ── Smoke Test: 1 VU, 30 segundos ──────────────────
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    checks: ['rate==1'],
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://api-service:3000';
const AUTH_URL = 'http://auth-service:3001';

export function setup() {
  const adminToken = loginAdmin(AUTH_URL);
  // O cadastro público cria apenas uma conta comum.
  const uniqueId = Date.now();
  const registerRes = http.post(
    `${AUTH_URL}/auth/register`,
    JSON.stringify({
      name: `Smoke User ${uniqueId}`,
      email: `smoke_${uniqueId}@test.com`,
      password: 'SenhaForte@123',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(registerRes, {
    'register status 201': (r) => r.status === 201,
    'register creates user role': (r) => r.json().data?.role === 'user',
  });

  // 2. Login
  const loginRes = http.post(
    `${AUTH_URL}/auth/login`,
    JSON.stringify({
      email: `smoke_${uniqueId}@test.com`,
      password: 'SenhaForte@123',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => JSON.parse(r.body).access_token !== undefined,
  });

  const userToken = JSON.parse(loginRes.body).access_token;
  const denied = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({ name: 'Forbidden', price: 1, category: 'teste', stock: 1 }),
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      responseCallback: http.expectedStatuses(403),
    },
  );
  check(denied, { 'ordinary user cannot create products': (r) => r.status === 403 });
  return { token: adminToken };
}

export default function (data) {
  const uniqueId = `${__VU}_${__ITER}_${Date.now()}`;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // 3. Criar produto
  const createRes = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({
      name: `Produto Smoke ${uniqueId}`,
      description: 'Teste de carga smoke',
      price: 99.99,
      category: 'teste',
      stock: 10,
    }),
    { headers: authHeaders },
  );

  check(createRes, {
    'create product 201': (r) => r.status === 201,
  });

  // 4. Listar produtos
  const listRes = http.get(`${BASE_URL}/products`, { headers: authHeaders });

  check(listRes, {
    'list products 200': (r) => r.status === 200,
    'list has data': (r) => JSON.parse(r.body).data !== undefined,
  });

  // 5. Health check
  const healthRes = http.get(`${BASE_URL}/health`);

  check(healthRes, {
    'health 200': (r) => r.status === 200,
    'health status ok': (r) => JSON.parse(r.body).status === 'ok',
  });

  sleep(1);
}
