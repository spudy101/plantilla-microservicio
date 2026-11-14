# Arquitectura

## Por qué estos servicios

Los límites salen de los dominios que `plantilla-base` ya tenía como módulos (`kyc/iam`, `kyc/person`,
`notification`, `records/audit`), separados por **quién es dueño del dato** y **qué cambia junto**:

| Servicio | Dueño de | Por qué separado |
| --- | --- | --- |
| iam-service | credenciales, sesiones, roles | Superficie de seguridad crítica; único con la clave privada JWT. |
| person-service | datos personales (PII) | La PII queda aislada en un esquema y un servicio con su propia llave AES. |
| notification-service | bandeja y envíos | Depende de proveedores externos (SES); sus caídas no deben afectar el login. |
| audit-service | rastro de auditoría | Append-only, crece mucho y tiene requisitos de retención propios. |
| api-gateway | nada (sin estado) | Un único punto de entrada para CORS, rate limit y ruteo. |

## Datos

- **Una instancia de PostgreSQL, un esquema por servicio** (`iam`, `person`, `notification`, `audit`).
  Barato y simple de operar; para separar a una base por servicio solo cambian `DB_HOST`/`DB_NAME`.
- Cada servicio crea su esquema (`scripts/ensure-schema.js`) y guarda el tracking de migraciones
  (`SequelizeMeta` / `SequelizeData`) **dentro** de su esquema.
- **Prohibido** leer o escribir tablas de otro servicio. Las referencias entre servicios (`user_id` en
  `person.persons`) son lógicas: sin foreign key, la consistencia la dan los eventos.
- Recomendado en producción: un usuario de BD por servicio con permisos solo sobre su esquema.

## Comunicación

| Necesito… | Uso | Ejemplo |
| --- | --- | --- |
| Avisar que algo pasó | **Evento** (`EventBus.publish`) | iam publica `iam.user.registered` |
| Un dato de otro servicio para continuar | **HTTP interno** (`ServiceClient` → `/internal/v1/...`) | notification pide el email a iam |
| Que el front consuma algo | **Gateway** (`/api/v1/...`) | `GET /api/v1/persons/me` |

Reglas del HTTP interno:

- Rutas bajo `/internal/v1`, protegidas con `AuthMiddleware.internalOnly` (`X-Internal-Api-Key`).
- El gateway **nunca** las enruta y además borra `X-Internal-Api-Key` de los requests externos.
- `ServiceClient` propaga `X-Correlation-Id`, aplica timeout y reintenta solo errores transitorios en
  métodos idempotentes.

## Pipeline de un request

```
Cliente
  → api-gateway: correlationId → helmet/cors → bloquear /internal → resolver ruta
                 → JWT (si no es pública) + revocación → rate limit → proxy (stream)
  → servicio:    correlationId (el mismo) → helmet/cors → body → contexto (AsyncLocalStorage)
                 → Auth (re-verifica JWT) → RBAC → RateLimit → Validator → AuditAction.declare
                 → Controller → Service → Repository → Model
                 → ApiResponse  (o AppError → handler global → logAudit failure)
```

## Arranque y apagado (BaseServer)

`Redis (opcional) → BD → event bus + audit sink → handlers de eventos → workers → HTTP`

Ante `SIGTERM` (ECS) se cierra en orden inverso con timeout de 10 s.

## Observabilidad

- Logs JSON con `service` y `correlationId` en cada línea.
- `GET /health` (readiness: BD + Redis + extras) y `GET /health/live` (liveness).
- El gateway agrega el estado de cada servicio en su `/health`.
- `logAudit` deja un rastro consultable por `correlationId` en audit-service.
