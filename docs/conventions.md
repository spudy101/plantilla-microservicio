# Convenciones

Las mismas de `plantilla-base`, adaptadas a servicios.

## Capas (dentro de un servicio)

| Capa | Ubicación | Responsabilidad |
| --- | --- | --- |
| Route | `modules/<d>/routes/*.routes.js` | Cadena de middlewares: Auth → RBAC → RateLimit → Validator → `AuditAction.declare` → Controller |
| Controller | `modules/<d>/controllers/*.controller.js` | `req` → service → `ApiResponse`. Sin lógica. `asyncHandler` siempre. |
| Service | `modules/<d>/services/*.service.js` | Toda la lógica. Lanza `AppError`. Llama `logAudit` y publica eventos. No toca Sequelize directo. |
| Repository | `schemas/repositories/*.repository.js` | Solo Sequelize. Extiende `BaseRepository`. |
| Model | `schemas/models/*.model.js` | Tabla, tipos, asociaciones (solo dentro del servicio). |
| DTO | `modules/<d>/dtos/*.dto.js` | camelCase, PII descifrada/enmascarada. Nunca spread de instancias. |
| Validator | `modules/<d>/validators/*.validator.js` | Cadenas `express-validator` con `{ message, hint }`. |
| Event handlers | `events/index.js` | Delgados: validan lo mínimo y delegan en el service. |

## Nombres

- Archivos **kebab-case + sufijo de capa**: `admin-user.service.js`, `user-session.model.js`.
- Variables/funciones camelCase, clases PascalCase, constantes UPPER_SNAKE.
- Columnas snake_case; JSON de la API camelCase.
- Eventos: `<servicio>.<entidad>.<verbo-en-pasado>`.
- Acciones de auditoría: `UPPER_SNAKE` en pasado (`PERSON_PROFILE_UPDATED`).

## Imports

```js
// paquete compartido: por ruta
const AppError = require('@plantilla/shared/utils/app-error.util');
// interno del servicio: subpath imports (package.json → "imports")
const personRepository = require('#schemas/repositories/person.repository');
```

`require('./config')` (o `#config/index`) es **siempre el primer require** de `app.js`/`server.js`:
carga el `.env` del servicio antes de que `@plantilla/shared` lea `process.env`.
`process.env` solo se lee en `config/` (regla `no-process-env`).

## Respuestas y errores

- Éxito: `ApiResponse.success(res, mensaje, data, status?)` — listas como `{ data, metadata }`.
- Error: `throw AppError.notFound(...)` / `.conflict` / `.forbidden` …; el handler global responde,
  agrega `correlationId` y audita con `outcome: failure`.

## Agregar un endpoint

1. Validator → 2. Service (con `logAudit`) → 3. DTO → 4. Controller → 5. Route (con
   `AuditAction.declare`) → 6. Si es nuevo prefijo público: agregarlo en
   `services/api-gateway/src/routing/route-table.js` → 7. `docs/openapi.js` → 8. Test.

## Agregar un servicio nuevo

1. Copiar `services/person-service` a `services/<nuevo>-service` y renombrar (package `name`,
   `SERVICE_NAME`, puerto, esquema en `config/database.js`, `schemas/index.js`, `scripts/ensure-schema.js`
   y migraciones).
2. Definir modelos/migraciones en su esquema. Nada de FK a otros esquemas.
3. Eventos: agregar los tipos que publica en `packages/shared/src/constants/events.js` y documentarlos
   en `docs/events.md`.
4. Si usa RBAC: agregar el módulo en `packages/shared/src/constants/rbac.js`.
5. Exponerlo: URL en `services/api-gateway/src/config/index.js` + prefijos en `route-table.js`.
6. Sumarlo a `docker-compose.yml`, al script `dev` (automático con el filtro `./services/**`) y a la
   matriz de build de `.github/workflows/ci.yml`.
7. `.env.example` propio; si guarda PII, agregarlo a `perService` en `scripts/generate-keys.util.js`.

## Tests

- Cada paquete: `tests/jest.setup.env.js` (SQLite en memoria, `EVENT_BUS_DRIVER=memory`,
  `REDIS_ENABLED=false`, claves RSA efímeras).
- Integración con `supertest` sobre `new XApp().getApp()`; tokens de prueba con `tests/helpers/token.helper.js`.
- Eventos: `new EventBus({ adapter: new MemoryAdapter() })` + `registerXEventHandlers(bus)`.
