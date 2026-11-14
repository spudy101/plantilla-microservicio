// services/iam-service/src/modules/admin-users/services/admin-user.service.js

const AppError = require('@plantilla/shared/utils/app-error.util');
const PaginationHelper = require('@plantilla/shared/utils/pagination.util');
const EventBus = require('@plantilla/shared/events/event-bus');
const { logAudit } = require('@plantilla/shared/utils/logger.util');
const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const userRepository = require('#schemas/repositories/user.repository');
const roleRepository = require('#schemas/repositories/role.repository');
const { USER_STATUS } = require('#schemas/models/user.model');
const SessionService = require('#modules/auth/services/session.service');
const { AdminUserListDTO, AdminUserDetailDTO, RoleDTO } = require('../dtos/admin-user.dto');

const ENTITY = { entityType: 'User' };

class AdminUserService {
  async list(query, adminUserId) {
    const paginationParams = PaginationHelper.getPaginationParams(query);
    const filters = PaginationHelper.buildFilters(query, ['status', 'roleId']);

    const { rows, count } = await userRepository.findAllPaginatedWithStatus(filters, paginationParams);

    logAudit('ADMIN_USERS_LISTED', adminUserId, { totalItems: count, page: paginationParams.page }, ENTITY);
    return AdminUserListDTO(rows, PaginationHelper.buildListMetadata(count, paginationParams, filters));
  }

  async getById(userId, adminUserId) {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) {
      throw AppError.notFound('Usuario no encontrado');
    }
    logAudit('ADMIN_USER_VIEWED', adminUserId, {}, { ...ENTITY, entityId: userId });
    return AdminUserDetailDTO(user);
  }

  /**
   * Bloquear revoca TODAS las sesiones activas del usuario (efecto inmediato en
   * gateway y servicios vía lista de revocación).
   */
  async updateStatus(userId, { status, reason }, adminUserId) {
    if (userId === adminUserId) {
      throw AppError.conflict('No puedes cambiar el estado de tu propia cuenta');
    }
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) {
      throw AppError.notFound('Usuario no encontrado');
    }
    if (user.status === status) {
      return AdminUserDetailDTO(user);
    }

    const previousStatus = user.status;
    await user.update({ status, ...(status === USER_STATUS.ACTIVE && { failed_login_attempts: 0, locked_until: null }) });

    let revokedSessions = 0;
    if (status === USER_STATUS.BLOCKED) {
      revokedSessions = await SessionService.revokeAllForUser(userId, 'USER_BLOCKED');
    }

    await EventBus.get().publishSafe(EVENT_TYPES.USER_STATUS_CHANGED, { userId, previousStatus, status, reason: reason ?? null });
    logAudit(
      'ADMIN_USER_STATUS_CHANGED',
      adminUserId,
      { previousStatus, status, reason: reason ?? null, revokedSessions },
      { ...ENTITY, entityId: userId }
    );

    return AdminUserDetailDTO(user);
  }

  async listRoles(adminUserId) {
    const roles = await roleRepository.findAllActive();
    logAudit('ADMIN_ROLES_LISTED', adminUserId, { total: roles.length }, { entityType: 'Role' });
    return roles.map(RoleDTO);
  }
}

module.exports = new AdminUserService();
