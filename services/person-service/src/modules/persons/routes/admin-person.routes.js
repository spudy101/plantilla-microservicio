// services/person-service/src/modules/persons/routes/admin-person.routes.js
// Montado en /api/v1/admin/persons

const express = require('express');
const AuthMiddleware = require('@plantilla/shared/middlewares/auth.middleware');
const RbacMiddleware = require('@plantilla/shared/middlewares/rbac.middleware');
const RateLimitMiddleware = require('@plantilla/shared/middlewares/rate-limit.middleware');
const AuditAction = require('@plantilla/shared/middlewares/audit-action.middleware');
const ValidatorUtil = require('@plantilla/shared/utils/validators.util');
const { RBAC_MODULES, RBAC_ACTIONS } = require('@plantilla/shared/constants/rbac');
const PersonController = require('../controllers/person.controller');
const PersonValidator = require('../validators/person.validator');

const router = express.Router();
const ENTITY = { entityType: 'Person' };

router.use(AuthMiddleware.authenticate, RateLimitMiddleware.apiLimiter());

router.get(
  '/',
  RbacMiddleware.requirePermission(RBAC_MODULES.PERSONS, RBAC_ACTIONS.READ),
  PersonValidator.listQuery(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('ADMIN_PERSONS_LISTED', ENTITY),
  PersonController.adminList
);

router.get(
  '/:personId',
  RbacMiddleware.requirePermission(RBAC_MODULES.PERSONS, RBAC_ACTIONS.READ),
  PersonValidator.getById(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('ADMIN_PERSON_VIEWED', ENTITY),
  PersonController.adminGetById
);

module.exports = router;
