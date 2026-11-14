// services/iam-service/src/schemas/repositories/user-session.repository.js

const { Op } = require('sequelize');
const BaseRepository = require('@plantilla/shared/repositories/base.repository');
const { models } = require('#schemas');
const { SESSION_STATUS } = require('#schemas/models/user-session.model');

class UserSessionRepository extends BaseRepository {
  constructor() {
    super(models.UserSession);
  }

  /**
   * Rotación ATÓMICA del refresh: solo actualiza si el hash vigente es el esperado.
   * Si dos refresh llegan a la vez, solo uno gana; el otro ve 0 filas → reuse.
   * @returns {Promise<boolean>} true si rotó
   */
  async rotateRefreshHash(sessionId, currentHash, newHash) {
    const [affected] = await this.model.update(
      { refresh_token_hash: newHash, last_activity_at: new Date() },
      { where: { session_id: sessionId, refresh_token_hash: currentHash, status: SESSION_STATUS.ACTIVE } }
    );
    return affected === 1;
  }

  revoke(sessionId, reason) {
    return this.model.update(
      { status: SESSION_STATUS.REVOKED, revoked_at: new Date(), revoked_reason: reason },
      { where: { session_id: sessionId, status: SESSION_STATUS.ACTIVE } }
    );
  }

  /** @returns {Promise<string[]>} ids de las sesiones revocadas */
  async revokeAllForUser(userId, reason) {
    const active = await this.findAll({ user_id: userId, status: SESSION_STATUS.ACTIVE }, { attributes: ['session_id'] });
    const ids = active.map(s => s.session_id);
    if (ids.length) {
      await this.model.update(
        { status: SESSION_STATUS.REVOKED, revoked_at: new Date(), revoked_reason: reason },
        { where: { session_id: { [Op.in]: ids } } }
      );
    }
    return ids;
  }

  /**
   * Marca como EXPIRED las sesiones vencidas por tope absoluto o por inactividad.
   * @returns {Promise<string[]>} ids expiradas
   */
  async expireStale(idleCutoff) {
    const now = new Date();
    const stale = await this.findAll(
      {
        status: SESSION_STATUS.ACTIVE,
        [Op.or]: [{ expires_at: { [Op.lt]: now } }, { last_activity_at: { [Op.lt]: idleCutoff } }]
      },
      { attributes: ['session_id'] }
    );
    const ids = stale.map(s => s.session_id);
    if (ids.length) {
      await this.model.update(
        { status: SESSION_STATUS.EXPIRED, revoked_at: now, revoked_reason: 'EXPIRED' },
        { where: { session_id: { [Op.in]: ids } } }
      );
    }
    return ids;
  }
}

module.exports = new UserSessionRepository();
