import http from 'k6/http';
import { fail } from 'k6';

// Administrator accounts must be provisioned in the isolated test environment,
// never created with a client-controlled role through public registration.
export function loginAdmin(authUrl) {
  if (!__ENV.TEST_ADMIN_EMAIL || !__ENV.TEST_ADMIN_PASSWORD) {
    fail('Configure TEST_ADMIN_EMAIL e TEST_ADMIN_PASSWORD de uma conta admin de teste previamente autorizada.');
  }

  const response = http.post(
    `${authUrl}/auth/login`,
    JSON.stringify({ email: __ENV.TEST_ADMIN_EMAIL, password: __ENV.TEST_ADMIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (response.status !== 200) {
    fail('Não foi possível autenticar a conta admin de teste.');
  }
  const body = response.json();
  if (!body.access_token || body.user?.role !== 'admin') {
    fail('A conta de teste precisa ter permissão admin concedida fora do cadastro público.');
  }
  return body.access_token;
}
