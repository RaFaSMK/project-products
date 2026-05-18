import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Load Test: rampa até 50 VUs, 5 minutos ──────────
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // ramp-up para 10
    { duration: '2m', target: 50 },   // ramp-up para 50
    { duration: '1m', target: 50 },   // sustenta 50
    { duration: '1m', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://api-service:3000';
const AUTH_URL = 'http://auth-service:3001';

// Setup: registrar e logar um admin antes do teste
export function setup() {
  const uniqueId = Date.now();

  // Registrar admin
  http.post(
    `${AUTH_URL}/auth/register`,
    JSON.stringify({
      name: 'Load Test Admin',
      email: `loadtest_admin_${uniqueId}@test.com`,
      password: 'SenhaForte@123',
      role: 'admin',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  // Login
  const loginRes = http.post(
    `${AUTH_URL}/auth/login`,
    JSON.stringify({
      email: `loadtest_admin_${uniqueId}@test.com`,
      password: 'SenhaForte@123',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const token = JSON.parse(loginRes.body).access_token;

  // Criar alguns produtos iniciais
  for (let i = 0; i < 20; i++) {
    http.post(
      `${BASE_URL}/products`,
      JSON.stringify({
        name: `Produto Load ${i}`,
        description: `Produto para teste de carga ${i}`,
        price: Math.random() * 1000,
        category: ['eletronicos', 'livros', 'roupas', 'alimentos'][i % 4],
        stock: Math.floor(Math.random() * 100),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
  }

  return { token };
}

export default function (data) {
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Listar produtos (com filtros variados)
  const scenarios = [
    `${BASE_URL}/products`,
    `${BASE_URL}/products?page=1&limit=5`,
    `${BASE_URL}/products?category=eletronicos`,
    `${BASE_URL}/products?sort=price&order=asc`,
    `${BASE_URL}/products?minPrice=100&maxPrice=500`,
    `${BASE_URL}/products?name=Produto`,
  ];

  const url = scenarios[Math.floor(Math.random() * scenarios.length)];
  const listRes = http.get(url, { headers: authHeaders });

  check(listRes, {
    'list status 200': (r) => r.status === 200,
    'list has pagination': (r) => JSON.parse(r.body).pagination !== undefined,
  });

  // Health check (sem auth)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
