// packages/shared/src/middlewares/rbac.middleware.js

const AppError = require('../utils/app-error.util');
const { hasPermission } = require('../constants/rbac');
const { ERROR_MESSAGES } = require('../constants/http');

class RbacMiddleware {
  /**
   * Exige permiso (módulo × acción) según el rol del token. Va después de authenticate.
   * @param {string} module - RBAC_MODULES.*
   * @param {string} action - RBAC_ACTIONS.*
   */
  static requirePermission(module, action) {
    return (req, res, next) => {
      if (!req.user) {
        return next(AppError.unauthorized());
      }
      if (!hasPermission(req.user.role, module, action)) {
        return next(AppError.forbidden(ERROR_MESSAGES.FORBIDDEN, { module, action }));
      }
      return next();
    };
  }

  /**
   * Exige uno de los roles dados. Preferir requirePermission en endpoints admin.
   * @param {...string} roles
   */
  static requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return next(AppError.unauthorized());
      }
      if (!roles.includes(req.user.role)) {
        return next(AppError.forbidden(ERROR_MESSAGES.FORBIDDEN));
      }
      return next();
    };
  }
}

module.exports = RbacMiddleware;
