// packages/shared/src/middlewares/audit-action.middleware.js
//
// La route DECLARA qué acción de negocio representa. Si el handler falla, el
// error handler global audita ESA acción con outcome=failure (en vez de un
// genérico SYSTEM_ERROR). Va siempre justo antes del controller.

class AuditAction {
  /**
   * @param {string} action - Ej: 'PERSON_PROFILE_UPDATED'
   * @param {{ entityType?: string }} [meta]
   */
  static declare(action, meta = {}) {
    return (req, res, next) => {
      res.locals.auditAction = { action, entityType: meta.entityType ?? null };
      next();
    };
  }
}

module.exports = AuditAction;
