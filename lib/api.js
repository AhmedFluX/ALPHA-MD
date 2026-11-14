
const axios = require('axios');

const DEFAULT_TIMEOUT = 15000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

const sleep = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

function isPrivateIPv4(host) {
  const parts = host.split('.').map(Number);

  if (
    parts.length !== 4 ||
    parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)
  ) return false;

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function validateBaseURL(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Invalid API base URL');
  }

  const host = parsed.hostname.toLowerCase();

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS APIs are allowed');
  }

  if (
    parsed.username ||
    parsed.password ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '::1' ||
    host.startsWith('fe80:') ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    isPrivateIPv4(host)
  ) {
    throw new Error('This API host is not allowed');
  }

  return parsed.toString().replace(/\/+$/, '');
}

function normalizeError(error) {
  const status = error.response?.status;

  return {
    success: false,
    status: status || 0,
    message: status
      ? `API request failed with status ${status}`
      : error.code === 'ECONNABORTED'
        ? 'API request timed out'
        : 'Unable to connect to API',
    code: error.code || 'API_ERROR'
  };
}

class ApiClient {
  constructor(baseURL, options = {}) {
    this.baseURL = validateBaseURL(baseURL);

    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.retries = Math.max(0, options.retries ?? 2);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      maxContentLength: MAX_RESPONSE_SIZE,
      maxBodyLength: MAX_RESPONSE_SIZE,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'ALPHA-MD/1.0'
      }
    });
  }

  async request(method, endpoint, data = null, options = {}) {
    const allowedMethods = [
      'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'
    ];

    method = String(method).toUpperCase();

    if (!allowedMethods.includes(method)) {
      throw new Error('Unsupported HTTP method');
    }

    if (
      typeof endpoint !== 'string' ||
      !endpoint ||
      endpoint.startsWith('//') ||
      /^[a-z][a-z\d+.-]*:/i.test(endpoint)
    ) {
      throw new Error('A relative API endpoint is required');
    }

    const config = {
      method,
      url: endpoint,
      data,
      params: options.params || {},
      headers: {
        ...options.headers
      },
      timeout: options.timeout || this.timeout
    };

    const canRetry = ['GET', 'HEAD'].includes(method);
    const attempts = canRetry ? this.retries + 1 : 1;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await this.client.request(config);

        return {
          success: true,
          status: response.status,
          data: response.data,
          headers: response.headers
        };
      } catch (error) {
        const status = error.response?.status;
        const retryable =
          !error.response ||
          status === 408 ||
          status === 429 ||
          status >= 500;

        if (
          !canRetry ||
          !retryable ||
          attempt === attempts - 1
        ) {
          return normalizeError(error);
        }

        const delay = Math.min(1000 * (2 ** attempt), 5000);
        await sleep(delay);
      }
    }

    return {
      success: false,
      status: 0,
      message: 'API request failed',
      code: 'API_ERROR'
    };
  }

  get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  }

  post(endpoint, data = {}, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  put(endpoint, data = {}, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  patch(endpoint, data = {}, options = {}) {
    return this.request('PATCH', endpoint, data, options);
  }

  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  }

  head(endpoint, options = {}) {
    return this.request('HEAD', endpoint, null, options);
  }
}

class AlphaAPI {
  create(baseURL, options = {}) {
    return new ApiClient(baseURL, options);
  }

  getEnv(key) {
    return process.env[key] || '';
  }

  getAuthHeaders(envKey) {
    const apiKey = this.getEnv(envKey);

    if (!apiKey) {
      throw new Error(`Missing environment variable: ${envKey}`);
    }

    return {
      Authorization: `Bearer ${apiKey}`
    };
  }
}

const api = new AlphaAPI();

module.exports = {
  AlphaAPI,
  ApiClient,
  api,
  validateBaseURL,
  normalizeError
};
