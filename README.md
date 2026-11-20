# Project Products — Microservices API

Uma API baseada em microserviços construída com **NestJS**, **MongoDB** e **Docker**. O projeto contempla autenticação, controle de acesso (Role-Based Access Control - RBAC), operações CRUD para gerenciamento de produtos (com suporte a soft delete, paginação e filtros) e uma robusta camada de observabilidade e testes de carga.

---

## 🏗️ Arquitetura e Stack Tecnológica

O projeto é dividido em dois microserviços principais que compartilham uma rede no Docker:

1. **Auth Service (Porta 3001):** Responsável por gerenciar os usuários e a autenticação. Retorna tokens JWT stateless para controle de acesso seguro.
2. **API Service (Porta 3000):** Responsável pelas regras de negócios de produtos (CRUD). Protegido pelos tokens JWT emitidos pelo Auth Service.

**Tecnologias Utilizadas:**
- **Framework:** NestJS 10 + TypeScript
- **Banco de Dados:** MongoDB 7 (Mongoose)
- **Segurança:** Passport JWT, bcryptjs, Helmet, Throttler (Rate Limiting)
- **Observabilidade:** Prometheus (Scraping de métricas) e Grafana (Dashboards)
- **Testes de Carga:** k6
- **Infraestrutura:** Docker e Docker Compose

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Docker](https://www.docker.com/) e Docker Compose instalados.
- [Node.js](https://nodejs.org/) (opcional, apenas se quiser rodar os serviços localmente sem o Docker).

### 1. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` na raiz do projeto:
```bash
cp .env.example .env
```
> **Nota:** Certifique-se de configurar a variável `JWT_SECRET` com uma chave forte no arquivo `.env`.

### 2. Subir a Infraestrutura (Docker Compose)
Para iniciar os bancos de dados, as APIs, o Prometheus e o Grafana, basta rodar o comando na raiz do projeto (o Docker cuidará de instalar todas as dependências automaticamente durante o build):

```bash
docker-compose up --build -d
```

Para parar a execução, utilize `docker-compose down`.

---

## 📚 Documentação das APIs (Swagger)

A documentação detalhada dos endpoints interativos está disponível via **Swagger UI** quando o projeto estiver rodando:

- **API Service (Produtos):** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Auth Service (Autenticação):** [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

### Principais Rotas

**Auth Service:**
- `POST /auth/register` — Cria um usuário comum (`user`). O papel é definido pelo servidor; um campo `role` enviado pelo cliente é ignorado.
- `POST /auth/login` — Autentica e retorna o JWT.
- `GET /auth/me` — Retorna dados do usuário autenticado.

**API Service:**
- `GET /products` — Lista produtos (suporta filtros: `category`, `minPrice`, `maxPrice`, `name`, `page`, `limit`).
- `POST /products` — (Apenas Admin) Cria um produto.
- `PATCH /products/:id` — (Apenas Admin) Atualiza um produto.
- `DELETE /products/:id` — (Apenas Admin) Realiza o soft delete de um produto.
- `PATCH /products/:id/restore` — (Apenas Admin) Restaura um produto deletado.

---

## 📊 Observabilidade

A saúde e a performance das aplicações podem ser monitoradas em tempo real.

- **Healthchecks:** 
  - API Service: `http://localhost:3000/health`
  - Auth Service: `http://localhost:3001/health`
- **Prometheus:** Interface do Prometheus em `http://localhost:9090`.
- **Grafana:** Acesse `http://localhost:3003` (Credenciais no `.env` via `GRAFANA_ADMIN_USER` e `GRAFANA_ADMIN_PASSWORD`). 
  > *O dashboard "API Microserviços Dashboard" já é provisionado automaticamente com dados de RPS, latência, erros e uso de memória.*

---

## 💥 Testes de Carga (k6)

O projeto possui scripts avançados para testes de carga. Eles rodam isolados usando um profile específico do Docker Compose.

Os scripts usam uma conta administrativa previamente autorizada **em um ambiente
isolado de testes**. Eles não criam administradores pelo cadastro público.
Cadastre a conta de teste normalmente e conceda seu papel pelo processo de
administração do banco de teste. Por exemplo, usando um e-mail fictício já
cadastrado, execute no `mongosh` do banco `auth-db` de testes:

```javascript
db.users.updateOne(
  { email: 'admin.teste@example.com' },
  { $set: { role: 'admin' } },
);
```

Não existe endpoint público de promoção de privilégios. Depois da concessão,
os scripts fazem novo login para receber o papel atualizado no JWT.
Defina `TEST_ADMIN_EMAIL` e `TEST_ADMIN_PASSWORD` no terminal e repasse essas
variáveis ao contêiner, sem colocar senhas no código ou no histórico de comandos.

Para executar os testes, utilize os comandos abaixo com os containers já rodando:

```bash
# Teste de Fumaça (Smoke Test - Básico)
docker-compose run --rm -e TEST_ADMIN_EMAIL -e TEST_ADMIN_PASSWORD k6 run /scripts/smoke-test.js

# Teste de Carga Normal (Load Test - Rampa até 50 usuários)
docker-compose run --rm -e TEST_ADMIN_EMAIL -e TEST_ADMIN_PASSWORD k6 run /scripts/load-test.js

# Teste de Estresse (Stress Test - Rampa até 200 usuários)
docker-compose run --rm -e TEST_ADMIN_EMAIL -e TEST_ADMIN_PASSWORD k6 run /scripts/stress-test.js
```

## Testes de regressão da autenticação

```bash
cd auth-service
npm ci
npm test
npm run build
```

A suíte verifica o cadastro público, tentativa de escolher `admin`, login, papel
no JWT, autorização de rotas, respostas sem hash de senha e validação de entrada.
O serviço de persistência é simulado; os controllers, validação, autenticação JWT
e guards usados nesses testes são reais. Não é necessário MongoDB ou Docker para
essa suíte. O workflow `Auth service regression tests` executa os testes e o build.

Contas criadas antes da correção não são modificadas automaticamente. Em uma
instalação existente, revise concessões administrativas anteriores; tokens já
emitidos preservam seus claims até expirar ou serem invalidados pela operação.
