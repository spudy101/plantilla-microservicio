# Plantilla Microservicio — Node.js (monorepo pnpm)

> Plantilla base para arrancar sistemas en **microservicios** con el núcleo transversal ya resuelto:
> **API Gateway, identidad propia (JWT RS256 + sesiones con refresh rotativo), RBAC, eventos
> durables (Redis Streams / SNS+SQS), auditoría centralizada, notificaciones y cifrado de PII**.
>
> Es la versión distribuida de [`plantilla-base`](https://github.com/spudy101/plantilla-base): mismas
> convenciones (capas, DTOs, `AppError`/`ApiResponse`, `logAudit`, kebab-case), partidas en servicios
> independientes que se comunican por eventos.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspaces-orange.svg)](https://pnpm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Streams-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📋 Tabla de contenidos

- [Arquitectura](#️-arquitectura)
- [Servicios](#-servicios)
- [Estructura](#-estructura)
- [Puesta en marcha](#-puesta-en-marcha)
- [Flujo de ejemplo](#-flujo-de-ejemplo)
- [Testing y calidad](#-testing-y-calidad)
- [Documentación](#-documentación)
- [Qué falta / próximos pasos](#-qué-falta--próximos-pasos)

---

## 🏛️ Arquitectura

```
                         ┌──────────────────────────┐
  Cliente / Front  ───▶  │       api-gateway :4000  │  JWT (pública) · rate limit · correlationId
                         └────────────┬─────────────┘  bloquea /internal
          ┌─────────────────┬─────────┴───────┬────────────────────┐
          ▼                 ▼                 ▼                    ▼
   iam-service:4001  person-service:4002  notification:4003   audit-service:4004
   (emite JWT)       (PII cifrada)        (in-app + email)    (append-only)
          │                 │                 ▲                    ▲
          └──── publica ────┴──── eventos ────┴──── audit.log.recorded (todos) ──┘
                        Redis Streams (local) │ SNS + SQS (AWS)

   PostgreSQL: una instancia, UN ESQUEMA POR SERVICIO (iam, person, notification, audit)
```

**Principios**

| Principio | Cómo se aplica |
| --- | --- |
| Cada servicio es dueño de sus datos | Esquema propio; nunca JOIN contra tablas de otro servicio. Las referencias cruzadas (`user_id`) son lógicas, sin FK. |
| Eventos antes que llamadas síncronas | Lo que "pasó" se publica (`iam.user.registered`); quien le interesa reacciona. HTTP interno solo cuando hace falta la respuesta. |
| Zero-trust | El gateway valida el JWT para cortar temprano, **y cada servicio lo vuelve a verificar** con la clave pública. |
| Solo IAM firma tokens | Clave privada RS256 únicamente en `iam-service`; el resto solo tiene la pública. |
| Trazabilidad de punta a punta | `X-Correlation-Id` viaja gateway → servicio → evento → handler → auditoría. |
| Idempotencia | El bus entrega "al menos una vez"; los consumidores deduplican por `eventId` (Redis) y con restricciones `UNIQUE` en BD. |

Detalle: [`docs/architecture.md`](docs/architecture.md).

---

## 🧩 Servicios

| Servicio | Puerto | Responsabilidad | Publica | Consume |
| --- | --- | --- | --- | --- |
| **api-gateway** | 4000 | Entrada única, ruteo por prefijo, JWT, rate limit | — | — |
| **iam-service** | 4001 | Registro, login, refresh rotativo con detección de reuso, logout, bloqueo de usuarios, roles | `iam.user.registered`, `iam.user.logged-in`, `iam.user.status-changed`, `iam.session.revoked` | — |
| **person-service** | 4002 | Perfil personal (documento y teléfono cifrados) | `person.person.created`, `person.person.updated` | `iam.user.registered` |
| **notification-service** | 4003 | Bandeja in-app + email (SES o consola) | — | `iam.user.registered`, `iam.session.revoked`, `iam.user.status-changed`, `notification.notification.requested` |
| **audit-service** | 4004 | Rastro de auditoría centralizado e inmutable | — | `audit.log.recorded` (de todos) |
| **@plantilla/shared** | — | BaseApp/BaseServer, middlewares, utils, event bus, cliente HTTP interno | | |

### Endpoints (vía gateway `http://localhost:4000`)

| Método | Ruta | Acceso |
| --- | --- | --- |
| POST | `/api/v1/auth/register` · `/login` · `/refresh` | público |
| POST/GET | `/api/v1/auth/logout` · `/api/v1/auth/me` | autenticado |
| GET/PATCH | `/api/v1/admin/users[/:id[/status]]`, `/api/v1/admin/roles` | RBAC `users` / `roles` |
| GET/PUT | `/api/v1/persons/me` | autenticado (dueño) |
| GET | `/api/v1/admin/persons[/:id]` | RBAC `persons:read` (PII enmascarada) |
| GET/PATCH | `/api/v1/notifications`, `/unread-count`, `/:id/read`, `/read-all` | autenticado (dueño) |
| POST | `/api/v1/admin/notifications` | RBAC `notifications:create` |
| GET | `/api/v1/admin/audit-logs[/:id]` | RBAC `audit:read` |

Cada servicio publica su OpenAPI en `GET /docs` (p.ej. `http://localhost:4001/docs` en desarrollo).

---

## 📁 Estructura

```
.
├── packages/
│   └── shared/                     # @plantilla/shared — infraestructura transversal
│       └── src/
│           ├── base/               # BaseApp (pipeline Express + /health + /docs), BaseServer (arranque/apagado)
│           ├── config/             # env.js (fail-fast), database.config.js
│           ├── constants/          # http, rbac (matriz), events (catálogo de eventos)
│           ├── database/           # createDatabase (carga *.model.js), ensure-schema
│           ├── events/             # EventBus + adapters (memory | redis-streams | sns-sqs), idempotencia
│           ├── http/               # ServiceClient (llamadas internas con correlationId + API key + retries)
│           ├── middlewares/        # correlation, security, auth, rbac, rate-limit, audit-context, error…
│           ├── repositories/       # BaseRepository
│           ├── utils/              # app-error, app-response, logger(+logAudit), jwt, encryption, hash, masking…
│           ├── validators/         # BaseValidator
│           └── dtos/               # MetadataDTO / ListResponseDTO
├── services/
│   ├── api-gateway/
│   └── <x>-service/
│       ├── src/
│       │   ├── config/             # index.js (carga .env — SIEMPRE el primer require), database.js (sequelize-cli)
│       │   ├── schemas/            # CAPA DE DATOS: models/ + repositories/ + index.js (conexión)
│       │   ├── modules/<dominio>/  # controllers/ services/ routes/ dtos/ validators/
│       │   ├── events/index.js     # handlers de eventos que consume
│       │   ├── docs/openapi.js
│       │   ├── app.js              # extiende BaseApp: monta rutas
│       │   └── server.js           # BaseServer: Redis → BD → bus → workers → HTTP
│       ├── migrations/ · seeders/ · scripts/ensure-schema.js
│       ├── tests/                  # jest: SQLite en memoria + bus en memoria + claves efímeras
│       └── .env.example
├── docker/                         # service.Dockerfile (uno para todos) + entrypoint.sh
├── docker-compose.yml              # Postgres + Redis + 5 servicios
├── scripts/generate-keys.util.js   # genera claves y crea services/*/.env
└── docs/
```

Los imports internos usan **subpath imports** de Node (`#schemas/...`, `#modules/...`, `#config/...`)
en vez de `../../../../`, y el paquete compartido se importa por ruta: `@plantilla/shared/utils/app-error.util`.

---

## 🚀 Puesta en marcha

**Requisitos:** Node 20+, pnpm 9+ (`corepack enable`), Docker.

```bash
# 1. Dependencias (la primera vez genera pnpm-lock.yaml: versiónalo)
pnpm install

# 2. Claves y .env de cada servicio (RSA, AES, pepper, API key interna, password del admin)
pnpm keys:generate
```

### Opción A — todo en Docker

```bash
docker compose up -d --build        # migra y siembra automáticamente
curl http://localhost:4000/health   # estado del gateway + cada servicio
```

### Opción B — servicios en local con hot-reload

```bash
pnpm docker:infra     # solo Postgres + Redis
pnpm db:migrate       # crea esquemas y tablas de cada servicio
pnpm db:seed          # roles + admin inicial
pnpm dev              # los 5 servicios con nodemon (o pnpm dev:iam, dev:gateway, …)
```

Credenciales del admin inicial: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` en `services/iam-service/.env`.

---

## 🔁 Flujo de ejemplo

```bash
# Registro → iam publica iam.user.registered
curl -X POST localhost:4000/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"Segura#2026x","firstName":"Ana","lastName":"Pérez"}'

#   person-service      → crea el perfil
#   notification-service→ bienvenida in-app + email
#   audit-service       → guarda USER_REGISTERED (mismo correlationId en todo)

TOKEN=$(curl -s -X POST localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"Segura#2026x"}' | jq -r .data.accessToken)

curl localhost:4000/api/v1/persons/me      -H "Authorization: Bearer $TOKEN"
curl localhost:4000/api/v1/notifications   -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 Testing y calidad

```bash
pnpm test        # todos los paquetes (sin Postgres/Redis: SQLite + bus en memoria)
pnpm lint        # mismas reglas que plantilla-base (kebab-case, require-await, no-process-env…)
pnpm format
```

CI (`.github/workflows/ci.yml`): lint + tests y build de la imagen Docker de cada servicio.

---

## 📚 Documentación

| Documento | Contenido |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | Decisiones, límites de cada servicio, datos, comunicación |
| [`docs/events.md`](docs/events.md) | Bus de eventos, sobre estándar, garantías, idempotencia, DLQ, catálogo |
| [`docs/auth.md`](docs/auth.md) | JWT RS256, sesiones, refresh rotativo, revocación, RBAC, llamadas internas |
| [`docs/conventions.md`](docs/conventions.md) | Capas, nombres, plantillas de código, **cómo agregar un endpoint o un servicio nuevo** |

---

## 🗺️ Qué falta / próximos pasos

Esta plantilla prioriza el núcleo. Quedan fuera a propósito (y están en `plantilla-base` para portarlos
cuando un proyecto los necesite):

- **MFA** (TOTP/SMS) y login biométrico.
- **Doble aprobación (maker-checker)**.
- **Transactional outbox**: hoy los eventos se publican después del commit con `publishSafe`; si el
  broker cae justo ahí el evento se pierde (queda logueado). Para flujos críticos, guardar el evento
  en una tabla `outbox` dentro de la misma transacción y publicarlo con un worker.
- Rate limit distribuido (store Redis) y tracing distribuido (OpenTelemetry).
- Infraestructura (Terraform): se adapta desde [`terraform-base`](https://github.com/spudy101/terraform-base)
  con un servicio ECS + ECR por microservicio, un topic SNS y una cola SQS (con DLQ) por consumidor.

## 📄 Licencia

MIT — ver [LICENSE](LICENSE).
