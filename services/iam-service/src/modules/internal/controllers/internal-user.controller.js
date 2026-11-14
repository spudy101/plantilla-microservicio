// services/iam-service/src/modules/internal/controllers/internal-user.controller.js

const ApiResponse = require('@plantilla/shared/utils/app-response.util');
const AppError = require('@plantilla/shared/utils/app-error.util');
const EncryptionUtil = require('@plantilla/shared/utils/encryption.util');
const { asyncHandler } = require('@plantilla/shared/middlewares/error.middleware');
const { logAudit } = require('@plantilla/shared/utils/logger.util');
const userRepository = require('#schemas/repositories/user.repository');

class InternalUserController {
  /**
   * GET /internal/v1/users/:userId
   * Datos de contacto para otros servicios (p.ej. notification-service necesita el
   * email para enviar). Se audita qué servicio pidió la PII.
   */
  getContact = asyncHandler(async (req, res) => {
    const user = await userRepository.findByIdWithRole(req.params.userId);
    if (!user) {
      throw AppError.notFound('Usuario no encontrado');
    }

    logAudit(
      'INTERNAL_USER_CONTACT_READ',
      'system',
      { requestedBy: req.sourceService },
      { entityType: 'User', entityId: user.user_id }
    );

    return ApiResponse.success(res, 'Usuario obtenido', {
      userId: user.user_id,
      email: EncryptionUtil.safeDecrypt(user.email_encrypted),
      role: user.role?.code ?? null,
      status: user.status
    });
  });
}

module.exports = new InternalUserController();
