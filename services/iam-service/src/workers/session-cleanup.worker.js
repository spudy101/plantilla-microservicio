// services/iam-service/src/workers/session-cleanup.worker.js
//
// Expira sesiones vencidas (tope absoluto o inactividad) cada N minutos.
// Con varias réplicas corre en todas; es idempotente (UPDATE ... WHERE ACTIVE).

const RequestContext = require('@plantilla/shared/utils/request-context.util');
const { logger, logAudit } = require('@plantilla/shared/utils/logger.util');
const config = require('#config/index');
const sessionRepository = require('#schemas/repositories/user-session.repository');

const MS_PER_MINUTE = 60000;

class SessionCleanupWorker {
  #timer = null;

  start() {
    if (!config.workers.enabled || this.#timer) {
      return;
    }
    this.#timer = setInterval(() => this.runOnce(), config.workers.sessionCleanupEveryMinutes * MS_PER_MINUTE);
    this.#timer.unref();
    logger.info('✅ SessionCleanupWorker iniciado');
  }

  stop() {
    clearInterval(this.#timer);
    this.#timer = null;
  }

  /** Un ciclo (exportado para tests). Nunca lanza. */
  runOnce() {
    return RequestContext.runAsWorker('iam.session-cleanup', async () => {
      try {
        const idleCutoff = new Date(Date.now() - config.auth.sessionIdleMinutes * MS_PER_MINUTE);
        const expired = await sessionRepository.expireStale(idleCutoff);
        if (expired.length) {
          logAudit('SESSIONS_EXPIRED', 'system', { count: expired.length }, { entityType: 'UserSession' });
        }
        return expired.length;
      } catch (error) {
        logger.error('Falló el ciclo de limpieza de sesiones', { error: error.message });
        return 0;
      }
    });
  }
}

module.exports = new SessionCleanupWorker();
