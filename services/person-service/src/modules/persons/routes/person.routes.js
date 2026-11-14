// services/person-service/src/modules/persons/routes/person.routes.js
// Montado en /api/v1/persons (cliente: solo su propio perfil)

const express = require('express');
const AuthMiddleware = require('@plantilla/shared/middlewares/auth.middleware');
const RateLimitMiddleware = require('@plantilla/shared/middlewares/rate-limit.middleware');
const AuditAction = require('@plantilla/shared/middlewares/audit-action.middleware');
const ValidatorUtil = require('@plantilla/shared/utils/validators.util');
const PersonController = require('../controllers/person.controller');
const PersonValidator = require('../validators/person.validator');

const router = express.Router();
const ENTITY = { entityType: 'Person' };

router.use(AuthMiddleware.authenticate, RateLimitMiddleware.apiLimiter());

router.get('/me', AuditAction.declare('PERSON_PROFILE_VIEWED', ENTITY), PersonController.getMe);

router.put(
  '/me',
  PersonValidator.updateMe(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('PERSON_PROFILE_UPDATED', ENTITY),
  PersonController.updateMe
);

module.exports = router;
