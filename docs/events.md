# Eventos

## Uso

```js
const EventBus = require('@plantilla/shared/events/event-bus');
const { EVENT_TYPES } = require('@plantilla/shared/constants/events');

// Publicar — SIEMPRE después de confirmar el cambio en BD
await EventBus.get().publishSafe(EVENT_TYPES.USER_REGISTERED, { userId, email, firstName, lastName });

// Consumir — services/<x>/src/events/index.js (lo registra BaseServer)
bus.subscribe(EVENT_TYPES.USER_REGISTERED, async (payload, event) => {
  await PersonService.createFromRegistration(payload);
});
```

- `publish` lanza si el broker falla; `publishSafe` lo loggea y sigue (efectos no críticos).
- Si un handler **lanza**, el evento se reintenta. Si un payload nunca va a ser válido, el handler debe
  **retornar** (no lanzar) para no reintentar en vano.

## Sobre estándar

```json
{
  "eventId": "uuid",
  "type": "iam.user.registered",
  "version": 1,
  "source": "iam-service",
  "occurredAt": "2026-01-01T12:00:00.000Z",
  "correlationId": "req-1735732800000-ab12cd34",
  "actorId": "uuid-del-usuario | null",
  "payload": { }
}
```

El handler corre dentro de un contexto con el `correlationId` del evento: sus logs, sus `logAudit` y
los eventos que publique quedan encadenados al request original.

## Transportes (`EVENT_BUS_DRIVER`)

| Driver | Cuándo | Cómo funciona |
| --- | --- | --- |
| `memory` | tests, un solo proceso | `EventEmitter`; no durable |
| `redis-streams` | local / dev | Un stream (`EVENT_STREAM_NAME`), un **consumer group por servicio**. ACK tras éxito; pendientes se reclaman con `XAUTOCLAIM`; tras 5 intentos van a `<stream>:dlq`. |
| `sns-sqs` | AWS | Un topic SNS; cada servicio con su cola SQS suscrita (filter policy por atributo `type`). Reintento por visibility timeout; DLQ por redrive policy. |

Si `EVENT_BUS_DRIVER=redis-streams` pero `REDIS_ENABLED=false`, el bus cae a memoria con un warning.

## Garantías

- **Al menos una vez**: un evento puede llegar más de una vez.
- **Idempotencia** en dos capas:
  1. El bus reclama `eventId` por consumidor (Redis `SET NX`, 7 días) y salta duplicados.
  2. Restricciones `UNIQUE` en BD para los efectos (`persons.user_id`,
     `notifications(source_event_id, channel)`, `audit_logs.event_id`).
- **Sin orden global garantizado** entre tipos de evento. No asumir que `B` llega después de `A`.
- **Limitación conocida**: sin *transactional outbox*, si el broker cae entre el commit y el publish,
  el evento se pierde (queda logueado con nivel error). Ver "próximos pasos" en el README.

## Contratos

- Agregar campos al payload: compatible.
- Quitar o renombrar campos: **incompatible** → publicar `version: 2` y mantener la v1 mientras haya
  consumidores.
- Datos sensibles en payloads: mínimos. `iam.user.registered` lleva email y nombre porque person y
  notification los necesitan; los logs del bus los redactan (`sanitizeForLog`).

## Catálogo

| Tipo | Publica | Payload | Consumen |
| --- | --- | --- | --- |
| `iam.user.registered` | iam | `userId, email, firstName, lastName, role` | person, notification |
| `iam.user.logged-in` | iam | `userId, sessionId, ip` | — |
| `iam.user.status-changed` | iam | `userId, previousStatus, status, reason` | notification |
| `iam.session.revoked` | iam | `sessionId, userId, reason` (`LOGOUT`, `REFRESH_TOKEN_REUSE`, `USER_BLOCKED`, …) | notification (solo reuse) |
| `person.person.created` | person | `personId, userId` | — |
| `person.person.updated` | person | `personId, userId, changedFields` | — |
| `notification.notification.requested` | cualquiera | `userId, title, body, channels?, category?, data?` | notification |
| `audit.log.recorded` | todos (vía `logAudit`) | registro de auditoría | audit |
