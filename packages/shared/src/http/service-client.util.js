// packages/shared/src/http/service-client.util.js
//
// Cliente HTTP para llamadas SÍNCRONAS servicio → servicio (endpoints /internal).
//   - Propaga X-Correlation-Id del contexto actual.
//   - Firma con X-Internal-Api-Key + X-Source-Service.
//   - Timeout por request y reintentos con backoff SOLO en errores transitorios
//     (red, 502/503/504) y SOLO para métodos idempotentes.
//
// Regla: preferir eventos. Usar llamadas síncronas solo cuando el caller necesita
// la respuesta para continuar (p.ej. validar que algo existe).
//
//   const iamClient = new ServiceClient({ name: 'iam', baseUrl: config.services.iamUrl });
//   const user = await iamClient.get(`/internal/v1/users/${userId}`);

const AppError = require('../utils/app-error.util');
const RequestContext = require('../utils/request-context.util');
const { logger } = require('../utils/logger.util');
const { internal, server } = require('../config/env');
const { HEADERS, HTTP_STATUS } = require('../constants/http');

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRIES = 2;
const BACKOFF_BASE_MS = 200;
const RETRYABLE_STATUS = new Set([HTTP_STATUS.BAD_GATEWAY, HTTP_STATUS.SERVICE_UNAVAILABLE, HTTP_STATUS.GATEWAY_TIMEOUT]);
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

class ServiceClient {
  /**
   * @param {{ name: string, baseUrl: string, timeoutMs?: number, retries?: number }} options
   */
  constructor({ name, baseUrl, timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES }) {
    if (!baseUrl) {
      throw new Error(`ServiceClient(${name}): baseUrl requerido`);
    }
    this.name = name;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.retries = retries;
  }

  get(path, options) {
    return this.request('GET', path, undefined, options);
  }

  post(path, body, options) {
    return this.request('POST', path, body, options);
  }

  put(path, body, options) {
    return this.request('PUT', path, body, options);
  }

  delete(path, options) {
    return this.request('DELETE', path, undefined, options);
  }

  /**
   * @returns {Promise<any>} el `data` de la respuesta estándar (ApiResponse)
   * @throws AppError (404 se propaga como 404; el resto como 502/503)
   */
  async request(method, path, body, { headers = {} } = {}) {
    const maxAttempts = IDEMPOTENT_METHODS.has(method) ? this.retries + 1 : 1;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.#send(method, path, body, headers);
      } catch (error) {
        lastError = error;
        if (!error.retryable || attempt === maxAttempts) {
          break;
        }
        await sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1));
      }
    }
    throw lastError.appError ?? lastError;
  }

  async #send(method, path, body, extraHeaders) {
    const ctx = RequestContext.getSafe();
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          [HEADERS.CORRELATION_ID]: ctx.correlationId,
          [HEADERS.INTERNAL_API_KEY]: internal.apiKey,
          [HEADERS.SOURCE_SERVICE]: server.serviceName,
          ...extraHeaders
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      logger.warn(`Fallo de red llamando a ${this.name}`, { method, path, error: error.message });
      throw Object.assign(new Error(error.message), {
        retryable: true,
        appError: AppError.serviceUnavailable(`El servicio ${this.name} no está disponible`)
      });
    }

    const payload = await response.json().catch(() => null);
    if (response.ok) {
      return payload?.data ?? payload;
    }

    const message = payload?.message ?? `Error en ${this.name}`;
    if (response.status === HTTP_STATUS.NOT_FOUND) {
      throw AppError.notFound(message);
    }
    logger.warn(`Respuesta de error desde ${this.name}`, { method, path, status: response.status });
    throw Object.assign(new Error(message), {
      retryable: RETRYABLE_STATUS.has(response.status),
      appError: AppError.badGateway(`Error en el servicio ${this.name}`, { upstreamStatus: response.status })
    });
  }
}

module.exports = ServiceClient;
