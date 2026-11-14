# Autenticación y autorización

## Tokens

| Token | Algoritmo | Vida | Claims |
| --- | --- | --- | --- |
| Access | RS256 | `JWT_ACCESS_TOKEN_TTL` (15 min) | `sub` (userId), `sid` (sessionId), `role`, `typ=access`, `iss`, `aud` |
| Refresh | RS256 | hasta el tope absoluto de la sesión (`SESSION_MAX_HOURS`, 8 h) | `sub`, `sid`, `jti`, `typ=refresh` |

- **Solo iam-service tiene `JWT_PRIVATE_KEY`.** Gateway y servicios verifican con `JWT_PUBLIC_KEY`.
- El access token **no lleva PII** (ni email ni documento): viaja por todos los servicios.

## Sesiones

Tabla `iam.user_sessions`, una fila por login:

- `refresh_token_hash = sha256(jti)` del refresh **vigente**.
- **Rotación** en cada `/auth/refresh`: nuevo `jti`, update atómico
  `WHERE refresh_token_hash = <hash anterior>`.
- **Detección de reuso**: si llega un refresh con un `jti` que ya no es el vigente (alguien lo copió),
  o dos refresh compiten, se **revoca la sesión entera**, se audita `REFRESH_TOKEN_REUSE_DETECTED` y
  notification-service avisa al usuario.
- **Expiración**: tope absoluto (`expires_at`) + inactividad (`SESSION_IDLE_MINUTES`); el worker
  `session-cleanup` las marca `EXPIRED`.
- **Bloqueo por intentos**: `AUTH_MAX_FAILED_ATTEMPTS` fallos → `locked_until` por `AUTH_LOCK_MINUTES`
  (responde 429 con `Retry-After`). Email inexistente y password incorrecta responden igual y tardan
  lo mismo (hash dummy) para no permitir enumerar usuarios.

## Revocación inmediata

Un JWT sigue siendo válido hasta su `exp`. Para que logout/bloqueo surtan efecto al instante:

1. iam escribe `auth:revoked-session:<sid>` en Redis con TTL = vida del access token.
2. `AuthMiddleware.authenticate` (gateway **y** servicios) rechaza tokens de sesiones revocadas.
3. Sin Redis cae a memoria por proceso (sirve en dev, **no** en producción multi-réplica).

## RBAC

Matriz en `packages/shared/src/constants/rbac.js` (rol × módulo × acción). Todos los servicios la
evalúan localmente con el claim `role`, sin llamar a iam.

```js
router.get('/', AuthMiddleware.authenticate,
  RbacMiddleware.requirePermission(RBAC_MODULES.PERSONS, RBAC_ACTIONS.READ), ...);
```

| Rol | users | roles | persons | notifications | audit |
| --- | --- | --- | --- | --- | --- |
| ADMIN | CRUD | R | CRUD | CRUD | R |
| OPERATOR | R | — | R/U | R | R |
| CLIENT | — (solo endpoints `/me`) | — | — | — | — |

Cambiar la matriz implica redeploy de los servicios. Si se necesitan permisos editables en runtime,
moverlos a iam y agregarlos como claim `perms` en el token.

## Llamadas internas

- `ServiceClient` agrega `X-Internal-Api-Key` (`INTERNAL_API_KEY`, igual en todos) y `X-Source-Service`.
- `AuthMiddleware.internalOnly` compara en tiempo constante.
- Rutas bajo `/internal/v1`: el gateway responde 404 y además elimina ese header de requests externos.
- Lectura de PII interna se audita (`INTERNAL_USER_CONTACT_READ` con el servicio que la pidió).
- En AWS, además, los security groups deben permitir `/internal` solo desde los otros servicios.
