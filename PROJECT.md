# 🚀 API Microserviços — NestJS + MongoDB + Docker

> **Documento de desenvolvimento para uso com Cursor / GitHub Copilot / Claude**
> Mantenha este arquivo aberto enquanto desenvolve. Marque as tarefas com `[x]` conforme conclui.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Stack Definitiva](#stack-definitiva)
- [Arquitetura](#arquitetura)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [To-Do por Fase](#to-do-por-fase)
- [Contratos da API](#contratos-da-api)
- [Schemas MongoDB](#schemas-mongodb)
- [Regras de Negócio](#regras-de-negócio)
- [Padrões de Código](#padrões-de-código)
- [Comandos Úteis](#comandos-úteis)
- [Checklist de Apresentação](#checklist-de-apresentação)

---

## Visão Geral

| Campo        | Valor                                                    |
|--------------|----------------------------------------------------------|
| Disciplina   | Desenvolvimento de Software                              |
| Apresentação | **15/06/2025**                                           |
| Backend      | NestJS (Node.js)                                         |
| Arquitetura  | Microserviços via Docker Compose                         |
| Banco        | MongoDB + Mongoose                                       |
| Auth         | JWT (access token) — perfis `admin` e `user`            |
| Docs         | Swagger (OpenAPI 3.0) via `@nestjs/swagger`              |
| Observa.     | Prometheus + Grafana                                     |
| Testes       | k6 (como microserviço Docker)                            |

---

## Stack Definitiva

```
Backend:        NestJS 10 + TypeScript
ODM:            Mongoose 8 (@nestjs/mongoose)
Auth:           @nestjs/jwt + @nestjs/passport + passport-jwt
Validação:      class-validator + class-transformer
Docs:           @nestjs/swagger + swagger-ui-express
Observab.:      prom-client + @willsoto/nestjs-prometheus
Segurança:      helmet + @nestjs/throttler (rate limit) + cors
Logs:           @nestjs/common Logger (nativo)
Testes carga:   k6 (grafana/k6 Docker image)
Containers:     Docker + docker-compose v3.9
Banco:          MongoDB 7 (container) + Mongoose
Monitoramento:  Prometheus 2.x + Grafana 10.x
```

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Cliente / Swagger UI                  │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP
           ┌───────────────┴───────────────┐
           │                               │
   ┌───────▼────────┐             ┌────────▼───────┐
   │  auth-service  │             │  api-service   │
   │   NestJS :3001 │             │  NestJS :3000  │
   │                │             │                │
   │  POST /auth/   │             │  /products     │
   │  register      │             │  (CRUD +       │
   │  login         │             │   soft delete  │
   │  me            │             │   filtros      │
   │                │             │   paginação)   │
   └───────┬────────┘             └────────┬───────┘
           │                               │
           └──────────┬────────────────────┘
                      │ Mongoose
             ┌────────▼────────┐
             │   MongoDB :27017 │
             │  db: auth        │
             │  db: api         │
             └─────────────────┘

             ┌─────────────────┐
             │ Prometheus :9090 │◄── scrape /metrics
             └────────┬────────┘    (ambos serviços)
                      │
             ┌────────▼────────┐
             │  Grafana :3003   │
             │  dashboards      │
             └─────────────────┘

             ┌─────────────────┐
             │   k6 (runner)   │──► load tests → api-service
             └─────────────────┘
```

### Comunicação entre serviços

- `api-service` valida o JWT localmente com a **mesma `JWT_SECRET`** do `auth-service`
- Não há chamadas HTTP entre serviços (JWT é stateless)
- Todos na mesma Docker network `app-net` (bridge)

---

## Estrutura de Diretórios

```
projeto/
├── docker-compose.yml
├── .env                          # NÃO commitar
├── .env.example                  # commitar este
├── .gitignore
│
├── auth-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── src/
│       ├── main.ts               # bootstrap + Swagger + helmet
│       ├── app.module.ts         # imports globais
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── strategies/
│       │   │   └── jwt.strategy.ts
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts
│       │   │   └── roles.guard.ts
│       │   ├── decorators/
│       │   │   └── roles.decorator.ts
│       │   └── dto/
│       │       ├── register.dto.ts
│       │       └── login.dto.ts
│       └── users/
│           ├── users.module.ts
│           ├── users.service.ts
│           ├── user.schema.ts    # Mongoose schema
│           └── dto/
│               └── create-user.dto.ts
│
├── api-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── products/             # ← domínio principal (adapte o nome)
│       │   ├── products.module.ts
│       │   ├── products.controller.ts
│       │   ├── products.service.ts
│       │   ├── product.schema.ts
│       │   └── dto/
│       │       ├── create-product.dto.ts
│       │       ├── update-product.dto.ts
│       │       └── query-product.dto.ts
│       ├── common/
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts
│       │   │   └── roles.guard.ts
│       │   ├── decorators/
│       │   │   └── roles.decorator.ts
│       │   ├── interceptors/
│       │   │   └── metrics.interceptor.ts
│       │   └── filters/
│       │       └── http-exception.filter.ts
│       └── health/
│           ├── health.module.ts
│           └── health.controller.ts  # GET /health + GET /metrics
│
├── observability/
│   ├── prometheus.yml
│   └── grafana/
│       └── provisioning/
│           ├── datasources/
│           │   └── prometheus.yml
│           └── dashboards/
│               └── api-dashboard.json
│
└── tests/
    └── k6/
        ├── load-test.js
        ├── smoke-test.js
        └── stress-test.js
```

---

## Variáveis de Ambiente

### `.env.example` (commitar)

```env
# ── Geral ──────────────────────────────────────
NODE_ENV=development

# ── Auth Service ───────────────────────────────
AUTH_PORT=3001
AUTH_MONGO_URI=mongodb://mongodb:27017/auth-db
JWT_SECRET=TROQUE_POR_UM_SECRET_LONGO_E_ALEATORIO
JWT_EXPIRES_IN=24h

# ── API Service ────────────────────────────────
API_PORT=3000
API_MONGO_URI=mongodb://mongodb:27017/api-db

# ── Rate Limit ─────────────────────────────────
THROTTLE_TTL=60
THROTTLE_LIMIT=30

# ── Grafana ────────────────────────────────────
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123
```

> ⚠️ **Nunca commite o `.env` real.** Adicione ao `.gitignore`.

---

## To-Do por Fase

> Use `[x]` para marcar concluído. Ideal para colar no Cursor como contexto.

### Fase 0 — Setup do Projeto

- [x] Criar repositório Git (`git init`, `.gitignore`, `README.md`)
- [x] Criar `.env.example` com todas as variáveis
- [x] Criar `docker-compose.yml` base (MongoDB + redes)
- [x] Inicializar `auth-service` com NestJS CLI: `nest new auth-service`
- [x] Inicializar `api-service` com NestJS CLI: `nest new api-service`
- [x] Criar `Dockerfile` para cada serviço (multi-stage recomendado)
- [ ] Testar `docker-compose up --build` — todos os containers sobem sem erro

---

### Fase 1 — Auth Service

- [x] Instalar dependências de auth:
  ```bash
  npm i @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs
  npm i -D @types/passport-jwt @types/bcryptjs
  ```
- [x] Criar `User` schema com Mongoose (campos: name, email, password, role, isActive)
- [x] Criar `UsersModule` + `UsersService` (findByEmail, create)
- [x] Criar `AuthModule` com `JwtModule.register()`
- [x] Criar `POST /auth/register` com DTO validado (`class-validator`)
- [x] Criar `POST /auth/login` → retorna `{ access_token, user }`
- [x] Criar `GET /auth/me` protegido por `JwtAuthGuard`
- [x] Criar `JwtStrategy` (passport) + `JwtAuthGuard`
- [x] Criar `RolesGuard` + decorator `@Roles('admin')`
- [x] Hash de senha com bcrypt (salt rounds = 12) antes de salvar
- [x] Configurar Swagger no `main.ts` do auth-service:
  ```ts
  const config = new DocumentBuilder()
    .setTitle('Auth Service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  ```
- [x] Anotar todos os DTOs e controller com decorators do `@nestjs/swagger`
- [ ] Validar funcionamento via Swagger UI em `http://localhost:3001/api-docs`

---

### Fase 2 — API Service (CRUD Principal)

- [x] Instalar dependências:
  ```bash
  npm i @nestjs/mongoose mongoose @nestjs/jwt @nestjs/passport passport passport-jwt
  npm i class-validator class-transformer
  npm i -D @types/passport-jwt
  ```
- [x] Copiar `JwtAuthGuard` + `RolesGuard` + `RolesDecorator` do auth-service para `common/`
- [x] Configurar `JwtStrategy` no api-service (mesma `JWT_SECRET`)
- [x] Criar `Product` schema (campos: name, description, price, category, stock, isDeleted, deletedAt, createdBy, timestamps)
- [x] Criar `ProductsModule` + `ProductsController` + `ProductsService`
- [x] Implementar rotas:

  | Método   | Rota                          | Guard              |
  |----------|-------------------------------|--------------------|
  | `GET`    | `/products`                   | `JwtAuthGuard`     |
  | `GET`    | `/products/:id`               | `JwtAuthGuard`     |
  | `POST`   | `/products`                   | `JwtAuthGuard` + `Roles('admin')` |
  | `PUT`    | `/products/:id`               | `JwtAuthGuard` + `Roles('admin')` |
  | `PATCH`  | `/products/:id`               | `JwtAuthGuard` + `Roles('admin')` |
  | `DELETE` | `/products/:id`               | `JwtAuthGuard` + `Roles('admin')` |
  | `PATCH`  | `/products/:id/restore`       | `JwtAuthGuard` + `Roles('admin')` |
  | `GET`    | `/products/deleted`           | `JwtAuthGuard` + `Roles('admin')` |

- [x] Implementar **soft delete**: `DELETE` seta `isDeleted: true` + `deletedAt: new Date()`
- [x] Implementar **restore**: `PATCH /:id/restore` seta `isDeleted: false`, limpa `deletedAt`
- [x] Implementar **busca por ID** (`findById` + erro 404 customizado)
- [x] Implementar **busca por nome** (query param `?name=x`, usar `$regex` + `$options: 'i'`)
- [x] Implementar **paginação**: query params `?page=1&limit=10`
- [x] Implementar **filtros**: `?category=x&minPrice=10&maxPrice=200`
- [x] Implementar **ordenação**: `?sort=price&order=asc`
- [x] Todas as queries devem incluir `{ isDeleted: false }` por padrão
- [x] Criar `QueryProductDto` com `@ApiPropertyOptional` para todos os params
- [x] Configurar `ValidationPipe` global no `main.ts`:
  ```ts
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  ```
- [x] Configurar Swagger no `main.ts` do api-service
- [ ] Testar todas as rotas via Swagger UI em `http://localhost:3000/api-docs`

---

### Fase 3 — Segurança

- [x] Instalar:
  ```bash
  npm i helmet @nestjs/throttler
  ```
- [x] Adicionar `helmet()` no `main.ts` de ambos os serviços
- [x] Configurar `ThrottlerModule` no `AppModule` (TTL e limite via env)
- [x] Adicionar `ThrottlerGuard` globalmente
- [x] Configurar CORS no `main.ts`:
  ```ts
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*' });
  ```
- [x] Criar `HttpExceptionFilter` global para padronizar erros:
  ```json
  { "success": false, "statusCode": 404, "error": "...", "message": "..." }
  ```
- [x] Garantir que senhas **nunca** aparecem nas respostas (usar `select: false` no schema)
- [ ] Validar que rotas de admin retornam `403` para role `user`

---

### Fase 4 — Health Check & Métricas (Observabilidade)

- [x] Instalar:
  ```bash
  npm i prom-client @willsoto/nestjs-prometheus
  ```
- [x] Criar `HealthModule` em ambos os serviços
- [x] Implementar `GET /health`:
  ```json
  { "status": "ok", "uptime": 3600, "mongo": "connected", "timestamp": "..." }
  ```
- [x] Expor `GET /metrics` no formato Prometheus (prom-client padrão)
- [x] Criar `MetricsInterceptor` para registrar:
  - `http_requests_total` (counter por rota + método + status)
  - `http_request_duration_seconds` (histogram)
- [x] Aplicar `MetricsInterceptor` globalmente no `AppModule`
- [x] Configurar `observability/prometheus.yml`:
  ```yaml
  global:
    scrape_interval: 15s
  scrape_configs:
    - job_name: 'api-service'
      static_configs:
        - targets: ['api-service:3000']
      metrics_path: '/metrics'
    - job_name: 'auth-service'
      static_configs:
        - targets: ['auth-service:3001']
      metrics_path: '/metrics'
  ```
- [x] Adicionar Prometheus e Grafana no `docker-compose.yml`
- [ ] Verificar scrape funcionando em `http://localhost:9090/targets`
- [x] Criar dashboard Grafana com pelo menos 4 painéis:
  - [x] Requests por segundo
  - [x] Latência p95
  - [x] Taxa de erros
  - [x] Uso de memória Node.js

---

### Fase 5 — Testes de Carga (k6)

- [x] Criar `tests/k6/smoke-test.js` (1 VU, 30s)
- [x] Criar `tests/k6/load-test.js` (rampa até 50 VUs, 5min)
- [x] Criar `tests/k6/stress-test.js` (rampa até 200 VUs)
- [x] Adicionar serviço `k6` no `docker-compose.yml`:
  ```yaml
  k6:
    image: grafana/k6
    volumes:
      - ./tests/k6:/scripts
    command: run /scripts/load-test.js
    depends_on: [api-service]
    networks: [app-net]
    profiles: [testing]   # só sobe com --profile testing
  ```
- [x] Definir thresholds mínimos no script:
  - `http_req_duration: ['p(95)<500']`
  - `http_req_failed: ['rate<0.01']`
- [ ] Executar e salvar screenshot dos resultados para os slides
- [ ] Validar que métricas aparecem no Grafana durante os testes

---

### Fase 6 — Docker Compose Final

- [x] Garantir `depends_on` com `condition: service_healthy` para MongoDB
- [x] Adicionar `healthcheck` no container MongoDB:
  ```yaml
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
  ```
- [x] Usar `restart: unless-stopped` em todos os serviços de produção
- [x] Verificar que volumes persistem dados entre restarts (`mongo_data`, `grafana_data`)
- [ ] Testar `docker-compose down -v && docker-compose up --build` do zero

---

### Fase 7 — Apresentação

- [ ] Criar slides conforme roteiro do professor (13 slides)
- [ ] Ensaiar demo ao vivo completo (register → login → CRUD → Grafana → k6)
- [ ] Testar demo com internet instável / offline (docker local)
- [ ] Cada aluno sabe o que vai apresentar e está preparado
- [ ] **APRESENTAÇÃO: 15/06/2025** ⚠️ Ausentes = nota zero

---

## Contratos da API

### Auth Service — `localhost:3001`

#### `POST /auth/register`
```json
// Request Body
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "SenhaForte@123",
  "role": "user"   // opcional, default: "user"
}

// Response 201
{
  "success": true,
  "data": {
    "_id": "664a...",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "user",
    "createdAt": "2025-06-01T10:00:00Z"
  }
}
```

#### `POST /auth/login`
```json
// Request Body
{ "email": "joao@email.com", "password": "SenhaForte@123" }

// Response 200
{
  "success": true,
  "access_token": "eyJhbGci...",
  "user": { "_id": "664a...", "name": "João Silva", "role": "user" }
}
```

#### `GET /auth/me` 🔒
```json
// Header: Authorization: Bearer <token>

// Response 200
{
  "success": true,
  "data": { "_id": "664a...", "name": "João Silva", "email": "...", "role": "user" }
}
```

---

### API Service — `localhost:3000`

#### `GET /products` 🔒
```
Query params:
  page=1, limit=10, sort=price, order=asc|desc,
  category=eletronicos, minPrice=50, maxPrice=200, name=notebook

Response 200:
{
  "success": true,
  "data": [ ...products ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 47,
    "itemsPerPage": 10
  }
}
```

#### `GET /products/:id` 🔒
```json
// Response 200
{ "success": true, "data": { ...product } }

// Response 404
{ "success": false, "statusCode": 404, "message": "Produto não encontrado" }
```

#### `POST /products` 🔒👑 (admin)
```json
// Request Body
{
  "name": "Notebook Pro",
  "description": "Notebook para desenvolvimento",
  "price": 4999.99,
  "category": "eletronicos",
  "stock": 15
}

// Response 201
{ "success": true, "data": { ...product } }
```

#### `DELETE /products/:id` 🔒👑 — Soft Delete
```json
// Response 200
{
  "success": true,
  "message": "Produto removido com sucesso",
  "data": { "_id": "...", "isDeleted": true, "deletedAt": "..." }
}
```

#### `PATCH /products/:id/restore` 🔒👑
```json
// Response 200
{ "success": true, "message": "Produto restaurado com sucesso" }
```

#### `GET /health`
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2025-06-15T10:00:00Z",
  "mongo": "connected"
}
```

---

## Schemas MongoDB

### Collection: `users` (auth-db)

```typescript
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false }) // NUNCA retorna a senha
  password: string;

  @Prop({ enum: ['admin', 'user'], default: 'user' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;
}
```

### Collection: `products` (api-db)

```typescript
@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ index: true })
  category: string;

  @Prop({ default: 0, min: 0 })
  stock: number;

  @Prop({ default: false, index: true })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;

  @Prop({ type: String }) // ID do usuário que criou
  createdBy: string;
}
```

> **Índices importantes:**
> - `products`: `{ name: 'text' }` para busca full-text
> - `products`: `{ isDeleted: 1, category: 1 }` índice composto
> - `users`: `{ email: 1 }` unique

---

## Regras de Negócio

```
✅ Qualquer usuário autenticado pode:
   - Listar produtos (com filtros, paginação, ordenação)
   - Buscar produto por ID
   - Buscar produto por nome
   - Ver seus próprios dados (/auth/me)

✅ Apenas admin pode:
   - Criar produto
   - Editar produto (PUT / PATCH)
   - Soft delete de produto
   - Restaurar produto deletado
   - Listar produtos deletados

❌ Ninguém pode:
   - Ver a senha de qualquer usuário
   - Ver produtos com isDeleted=true nas listagens normais
   - Acessar rotas protegidas sem token válido
   - Exceder o rate limit (30 req/min por IP)
```

---

## Padrões de Código

### Resposta de sucesso padrão

```typescript
// Sempre retornar neste formato
return {
  success: true,
  data: result,
  // + pagination quando for listagem
};
```

### Resposta de erro padrão (via HttpExceptionFilter)

```typescript
{
  success: false,
  statusCode: 404,
  error: 'Not Found',
  message: 'Produto não encontrado',
  timestamp: '2025-06-01T10:00:00Z',
  path: '/products/123',
}
```

### Nomenclatura

| Item            | Convenção         | Exemplo                  |
|-----------------|-------------------|--------------------------|
| Arquivos        | kebab-case        | `products.service.ts`    |
| Classes         | PascalCase        | `ProductsService`        |
| Métodos/vars    | camelCase         | `findAllProducts()`      |
| Env vars        | UPPER_SNAKE_CASE  | `JWT_SECRET`             |
| Rotas           | kebab-case        | `/api/my-products`       |
| Mongo coleções  | camelCase plural  | `products`, `users`      |

### Estrutura de serviço NestJS (padrão do projeto)

```typescript
@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async findAll(query: QueryProductDto) {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc',
            category, name, minPrice, maxPrice } = query;

    const filter: any = { isDeleted: false };
    if (category) filter.category = category;
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ [sort]: order === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .select('-__v'),
      this.productModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    };
  }
}
```

---

## Comandos Úteis

```bash
# ── Docker ──────────────────────────────────────────────
docker-compose up --build              # Sobe tudo e reconstrói
docker-compose up --build -d           # Em background
docker-compose down                    # Para containers
docker-compose down -v                 # Para + apaga volumes
docker-compose logs -f api-service     # Logs em tempo real
docker-compose restart api-service     # Reinicia serviço específico
docker ps                              # Containers ativos
docker exec -it <container> sh         # Shell dentro do container

# ── NestJS (dentro do serviço) ──────────────────────────
nest new auth-service                  # Criar projeto
nest generate module products          # Gerar módulo
nest generate controller products      # Gerar controller
nest generate service products         # Gerar serviço
npm run start:dev                      # Dev com hot-reload

# ── k6 ──────────────────────────────────────────────────
docker-compose --profile testing up k6              # Rodar testes
k6 run tests/k6/load-test.js           # Localmente (se k6 instalado)

# ── MongoDB ─────────────────────────────────────────────
docker exec -it <mongo_container> mongosh
> use api-db
> db.products.find({ isDeleted: false }).pretty()
> db.products.createIndex({ name: 'text' })

# ── Verificar serviços ───────────────────────────────────
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:9090/targets     # Prometheus targets
```

---

## Checklist de Apresentação

> Fazer o ensaio completo no dia 14/06 com tudo funcionando.

### Técnico
- [ ] `docker-compose up --build` funciona do zero em máquina limpa
- [ ] Swagger acessível em `:3000/api-docs` e `:3001/api-docs`
- [ ] Fluxo completo: register → login → usar token → CRUD
- [ ] Soft delete funcionando (produto some da lista, restaura com `/restore`)
- [ ] Filtros e paginação funcionando
- [ ] Rate limit retorna `429` ao exceder limite
- [ ] Rota de admin retorna `403` para usuário comum
- [ ] `/health` retornando `200` em ambos os serviços
- [ ] `/metrics` expondo dados no formato Prometheus
- [ ] Prometheus em `localhost:9090` com targets `UP`
- [ ] Grafana em `localhost:3003` com dashboard funcional
- [ ] k6 executando e mostrando métricas nos gráficos Grafana

### Slides (13 slides obrigatórios)
- [ ] Slide 1: Capa (nome do projeto, integrantes, disciplina, data)
- [ ] Slide 2: Visão Geral (Aluno 1)
- [ ] Slide 3: Arquitetura com diagrama visual (Aluno 1)
- [ ] Slide 4: Docker e containers (Aluno 2)
- [ ] Slide 5: MongoDB e modelagem (Aluno 2)
- [ ] Slide 6: Funcionalidades da API (Aluno 3)
- [ ] Slide 7: Demo ao vivo da API (Aluno 3)
- [ ] Slide 8: Segurança — JWT, RBAC, proteções (Aluno 4)
- [ ] Slide 9: Testes de carga com k6 + resultados (Aluno 4)
- [ ] Slide 10: Prometheus + Grafana ao vivo (Aluno 5)
- [ ] Slide 11: Deploy (Aluno 5)
- [ ] Slide 12: Swagger ao vivo (Aluno 5)
- [ ] Slide 13: Conclusão (Todos)

---

## Notas e Decisões Técnicas

> Use esta seção para registrar decisões importantes enquanto desenvolve.

```
[DATA] Decisão: ...
Motivo: ...
Alternativas consideradas: ...
```

---

*Última atualização: início do projeto*
*Apresentação: **15/06/2025** — grupos sem apresentação = nota zero*
