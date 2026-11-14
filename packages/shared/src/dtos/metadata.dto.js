// packages/shared/src/dtos/metadata.dto.js

/**
 * Metadata de paginación estándar para todas las listas.
 * Nunca construir este objeto a mano en un DTO: usar MetadataDTO.build.
 */
const MetadataDTO = {
  build(metadata = {}) {
    return {
      totalItems: metadata.totalItems ?? 0,
      totalPages: metadata.totalPages ?? 0,
      page: metadata.page ?? 1,
      limit: metadata.limit ?? 0,
      sortBy: metadata.sortBy ?? null,
      order: metadata.order ?? null,
      filters: metadata.filters ?? {}
    };
  }
};

/**
 * Construye la respuesta { data, metadata } de una lista paginada.
 * @param {Array} rows
 * @param {Object} metadata
 * @param {(row: any) => Object} mapper - componente DTO de cada fila
 */
const ListResponseDTO = (rows, metadata, mapper) => ({
  data: Array.isArray(rows) ? rows.map(mapper) : [],
  metadata: MetadataDTO.build(metadata)
});

module.exports = { MetadataDTO, ListResponseDTO };
