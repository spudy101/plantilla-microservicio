// services/person-service/src/modules/persons/controllers/person.controller.js

const ApiResponse = require('@plantilla/shared/utils/app-response.util');
const { asyncHandler } = require('@plantilla/shared/middlewares/error.middleware');
const PersonService = require('../services/person.service');

class PersonController {
  /** GET /persons/me */
  getMe = asyncHandler(async (req, res) => {
    const result = await PersonService.getMe(req.user.userId);
    return ApiResponse.success(res, 'Perfil obtenido', result);
  });

  /** PUT /persons/me */
  updateMe = asyncHandler(async (req, res) => {
    const result = await PersonService.updateMe(req.user.userId, req.body);
    return ApiResponse.success(res, 'Perfil actualizado', result);
  });

  /** GET /admin/persons */
  adminList = asyncHandler(async (req, res) => {
    const result = await PersonService.adminList(req.query, req.user.userId);
    return ApiResponse.success(res, 'Personas obtenidas exitosamente', result);
  });

  /** GET /admin/persons/:personId */
  adminGetById = asyncHandler(async (req, res) => {
    const result = await PersonService.adminGetById(req.params.personId, req.user.userId);
    return ApiResponse.success(res, 'Persona obtenida exitosamente', result);
  });
}

module.exports = new PersonController();
