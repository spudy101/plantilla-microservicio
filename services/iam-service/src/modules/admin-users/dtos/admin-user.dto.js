// services/iam-service/src/modules/admin-users/dtos/admin-user.dto.js

const EncryptionUtil = require('@plantilla/shared/utils/encryption.util');
const MaskingUtil = require('@plantilla/shared/utils/masking.util');
const { ListResponseDTO } = require('@plantilla/shared/dtos/metadata.dto');

/** Vista admin: el email sale ENMASCARADO. */
const AdminUserComponent = user => ({
  userId: user.user_id,
  email: MaskingUtil.maskEmail(EncryptionUtil.safeDecrypt(user.email_encrypted)),
  role: user.role ? { roleId: user.role.role_id, code: user.role.code, name: user.role.name } : null,
  status: user.status,
  failedLoginAttempts: user.failed_login_attempts,
  lockedUntil: user.locked_until ?? null,
  lastLoginAt: user.last_login_at ?? null,
  createdAt: user.created_at ?? user.createdAt ?? null
});

const AdminUserListDTO = (rows, metadata) => ListResponseDTO(rows, metadata, AdminUserComponent);
const AdminUserDetailDTO = user => AdminUserComponent(user);

const RoleDTO = role => ({ roleId: role.role_id, code: role.code, name: role.name, description: role.description ?? null });

module.exports = { AdminUserListDTO, AdminUserDetailDTO, RoleDTO };
