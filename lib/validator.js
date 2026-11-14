
class AlphaValidator {
  static isString(value) {
    return typeof value === 'string';
  }

  static isNonEmptyString(value) {
    return this.isString(value) && value.trim().length > 0;
  }

  static isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  static isInteger(value) {
    return Number.isInteger(value);
  }

  static isPositiveNumber(value) {
    return this.isNumber(value) && value > 0;
  }

  static isBoolean(value) {
    return typeof value === 'boolean';
  }

  static isArray(value) {
    return Array.isArray(value);
  }

  static isObject(value) {
    return value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value);
  }

  static isPhoneNumber(value) {
    const phone = String(value).replace(/[\s()+-]/g, '');

    return /^\d{7,15}$/.test(phone);
  }

  static isWhatsAppJid(value) {
    return typeof value === 'string' &&
      /^(?:\d+|[a-zA-Z0-9._-]+)@(s\.whatsapp\.net|g\.us|lid)$/.test(value);
  }

  static isGroupJid(value) {
    return typeof value === 'string' &&
      value.endsWith('@g.us');
  }

  static isPrivateJid(value) {
    return typeof value === 'string' &&
      value.endsWith('@s.whatsapp.net');
  }

  static isURL(value) {
    try {
      const url = new URL(value);

      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  static isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
  }

  static isUsername(value) {
    return /^[a-zA-Z0-9_]{3,30}$/.test(String(value));
  }

  static isPrefix(value) {
    return typeof value === 'string' &&
      value.length >= 1 &&
      value.length <= 5 &&
      !/\s/.test(value);
  }

  static isCommand(value) {
    return /^[a-zA-Z0-9_-]{1,40}$/.test(String(value));
  }

  static isSafeFilename(value) {
    const filename = String(value);

    return filename.length > 0 &&
      filename.length <= 100 &&
      !/[<>:"/\\|?*\x00-\x1F]/.test(filename) &&
      filename !== '.' &&
      filename !== '..';
  }

  static isTextLength(value, min = 1, max = 1000) {
    if (!this.isString(value)) return false;

    const length = value.trim().length;

    return length >= min && length <= max;
  }

  static isInRange(value, min, max) {
    return this.isNumber(value) &&
      value >= min &&
      value <= max;
  }

  static isJSON(value) {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  static isOneOf(value, allowed = []) {
    return Array.isArray(allowed) &&
      allowed.includes(value);
  }

  static validateArguments(args = [], rules = []) {
    if (!Array.isArray(args) || !Array.isArray(rules)) {
      return {
        valid: false,
        errors: ['Arguments and rules must be arrays.']
      };
    }

    const errors = [];

    rules.forEach((rule, index) => {
      const value = args[index];

      if (rule.required && (
        value === undefined ||
        value === null ||
        value === ''
      )) {
        errors.push(`${rule.name || `Argument ${index + 1}`} is required.`);
        return;
      }

      if (value === undefined || value === null) return;

      if (rule.type === 'string' && !this.isString(value)) {
        errors.push(`${rule.name} must be text.`);
      }

      if (rule.type === 'number' && !this.isNumber(value)) {
        errors.push(`${rule.name} must be a number.`);
      }

      if (rule.type === 'integer' && !this.isInteger(value)) {
        errors.push(`${rule.name} must be an integer.`);
      }

      if (rule.type === 'boolean' && !this.isBoolean(value)) {
        errors.push(`${rule.name} must be true or false.`);
      }

      if (
        rule.min !== undefined &&
        typeof value === 'number' &&
        value < rule.min
      ) {
        errors.push(`${rule.name} must be at least ${rule.min}.`);
      }

      if (
        rule.max !== undefined &&
        typeof value === 'number' &&
        value > rule.max
      ) {
        errors.push(`${rule.name} must not exceed ${rule.max}.`);
      }

      if (
        rule.maxLength !== undefined &&
        typeof value === 'string' &&
        value.length > rule.maxLength
      ) {
        errors.push(`${rule.name} is too long.`);
      }

      if (
        rule.allowed &&
        !this.isOneOf(value, rule.allowed)
      ) {
        errors.push(`${rule.name} has an invalid value.`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static sanitizeText(value, maxLength = 1000) {
    if (typeof value !== 'string') return '';

    return value
      .replace(/\u0000/g, '')
      .trim()
      .slice(0, maxLength);
  }

  static sanitizeFilename(value) {
    return String(value)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100);
  }
}

module.exports = {
  AlphaValidator,
  validator: AlphaValidator
};
