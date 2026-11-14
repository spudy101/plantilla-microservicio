// services/iam-service/src/modules/auth/routes/auth.routes.js
// Montado en /api/v1/auth

const express = require('express');
const AuthMiddleware = require('@plantilla/shared/middlewares/auth.middleware');
const RateLimitMiddleware = require('@plantilla/shared/middlewares/rate-limit.middleware');
const AuditAction = require('@plantilla/shared/middlewares/audit-action.middleware');
const ValidatorUtil = require('@plantilla/shared/utils/validators.util');
const AuthController = require('../controllers/auth.controller');
const AuthValidator = require('../validators/auth.validator');

const router = express.Router();
const ENTITY = { entityType: 'User' };

// ─── Públicas (el gateway las deja pasar sin token) ───────────────────────────

router.post(
  '/register',
  RateLimitMiddleware.authLimiter(),
  AuthValidator.register(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('USER_REGISTERED', ENTITY),
  AuthController.register
);

router.post(
  '/login',
  RateLimitMiddleware.authLimiter(),
  AuthValidator.login(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('USER_LOGGED_IN', ENTITY),
  AuthController.login
);

router.post(
  '/refresh',
  RateLimitMiddleware.authLimiter(),
  AuthValidator.refresh(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('SESSION_REFRESHED', { entityType: 'UserSession' }),
  AuthController.refresh
);

// ─── Autenticadas ─────────────────────────────────────────────────────────────

router.post(
  '/logout',
  AuthMiddleware.authenticate,
  RateLimitMiddleware.apiLimiter(),
  AuditAction.declare('USER_LOGGED_OUT', { entityType: 'UserSession' }),
  AuthController.logout
);

router.get(
  '/me',
  AuthMiddleware.authenticate,
  RateLimitMiddleware.apiLimiter(),
  AuditAction.declare('USER_ME_VIEWED', ENTITY),
  AuthController.me
);

module.exports = router;
