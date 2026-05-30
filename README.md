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
- `POST /auth/register` — Cria um novo usuário.
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

Para executar os testes, utilize os comandos abaixo com os containers já rodando:

```bash
# Teste de Fumaça (Smoke Test - Básico)
docker-compose run --rm k6 run /scripts/smoke-test.js

# Teste de Carga Normal (Load Test - Rampa até 50 usuários)
docker-compose run --rm k6 run /scripts/load-test.js

# Teste de Estresse (Stress Test - Rampa até 200 usuários)
docker-compose run --rm k6 run /scripts/stress-test.js
```
