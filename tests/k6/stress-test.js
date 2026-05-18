import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Stress Test: rampa até 200 VUs ──────────────────
export const options = {
  stages: [
    { duration: '30s', target: 20 },    // ramp-up
    { duration: '1m', target: 50 },     // carga normal
    { duration: '1m', target: 100 },    // carga alta
    { duration: '1m', target: 200 },    // estresse
    { duration: '30s', target: 200 },   // sustenta estresse
    { duration: '1m', target: 0 },      // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],   // mais tolerante no stress
    http_req_failed: ['rate<0.05'],      // 5% de erro aceitável em stress
  },
};

const BASE_URL = 'http://api-service:3000';
const AUTH_URL = 'http://auth-service:3001';

export function setup() {
  const uniqueId = Date.now();

  http.post(
    `${AUTH_URL}/auth/register`,
    JSON.stringify({
      name: 'Stress Test Admin',
      email: `stresstest_admin_${uniqueId}@test.com`,
      password: 'SenhaForte@123',
      role: 'admin',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const loginRes = http.post(
    `${AUTH_URL}/auth/login`,
    JSON.stringify({
      email: `stresstest_admin_${uniqueId}@test.com`,
      password: 'SenhaForte@123',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const token = JSON.parse(loginRes.body).access_token;

  // Criar produtos de teste
  for (let i = 0; i < 50; i++) {
    http.post(
      `${BASE_URL}/products`,
      JSON.stringify({
        name: `Produto Stress ${i}`,
        description: `Produto para stress test ${i}`,
        price: Math.random() * 5000,
        category: ['eletronicos', 'livros', 'roupas', 'alimentos', 'esportes'][i % 5],
        stock: Math.floor(Math.random() * 200),
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

  // Mix de operações
  const rand = Math.random();

  if (rand < 0.6) {
    // 60% — Listar produtos
    const listRes = http.get(`${BASE_URL}/products?page=1&limit=10`, {
      headers: authHeaders,
    });
    check(listRes, { 'list 200': (r) => r.status === 200 });
  } else if (rand < 0.8) {
    // 20% — Health check
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, { 'health 200': (r) => r.status === 200 });
  } else if (rand < 0.9) {
    // 10% — Buscar por nome
    const searchRes = http.get(`${BASE_URL}/products?name=Stress`, {
      headers: authHeaders,
    });
    check(searchRes, { 'search 200': (r) => r.status === 200 });
  } else {
    // 10% — Filtrar por categoria
    const categories = ['eletronicos', 'livros', 'roupas', 'alimentos', 'esportes'];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const filterRes = http.get(`${BASE_URL}/products?category=${cat}`, {
      headers: authHeaders,
    });
    check(filterRes, { 'filter 200': (r) => r.status === 200 });
  }

  sleep(0.3);
}
