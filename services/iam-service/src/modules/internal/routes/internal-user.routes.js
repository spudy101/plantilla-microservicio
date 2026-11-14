// services/iam-service/src/modules/internal/routes/internal-user.routes.js
// Montado en /internal/v1 — SOLO servicio a servicio (el gateway no enruta /internal).

const express = require('express');
const AuthMiddleware = require('@plantilla/shared/middlewares/auth.middleware');
const ValidatorUtil = require('@plantilla/shared/utils/validators.util');
const BaseValidator = require('@plantilla/shared/validators/base.validator');
const InternalUserController = require('../controllers/internal-user.controller');

const router = express.Router();

router.use(AuthMiddleware.internalOnly);

router.get(
  '/users/:userId',
  BaseValidator.uuidParam('userId', 'El usuario'),
  ValidatorUtil.handleValidationErrors,
  InternalUserController.getContact
);

module.exports = router;
