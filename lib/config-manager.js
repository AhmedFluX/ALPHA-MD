
const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  bot: {
    name: 'ALPHA-MD',
    version: '1.0.0',
    author: 'Ahmed',
    footer: 'POWERED BY AHMED'
  },

  command: {
    prefix: '.',
    mode: 'public',
    caseSensitive: false
  },

  automation: {
    autoRead: false,
    autoStatusView: false,
    autoTyping: false,
    autoReact: false
  },

  group: {
    welcome: false,
    goodbye: false,
    antiLink: false,
    antiSpam: false,
    antiBadword: false
  },

  private: {
    autoReply: false,
    antiSpam: false
  },

  menu: {
    style: 'hybrid',
    showOwner: true,
    showTime: true,
    showDate: true
  },

  security: {
    protectSession: true,
    hideErrors: true,
    validateCommands: true
  },

  database: {
    type: 'json',
    autoSave: true,
    saveInterval: 30000
  }
};

class AlphaConfigManager {
  constructor(options = {}) {
    this.file = path.resolve(
      options.file || './database/config.json'
    );

    this.config = structuredClone(DEFAULT_CONFIG);
    this.initialized = false;
  }

  async init() {
    await fs.promises.mkdir(path.dirname(this.file), {
      recursive: true
    });

    try {
      const content = await fs.promises.readFile(
        this.file,
        'utf8'
      );

      const saved = JSON.parse(content);

      this.config = this.merge(
        DEFAULT_CONFIG,
        saved
      );
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Config loading failed: ${error.message}`);
      }

      await this.save();
    }

    this.initialized = true;
    return this.config;
  }

  merge(defaults, saved) {
    const result = structuredClone(defaults);

    for (const [key, value] of Object.entries(saved || {})) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        result[key] &&
        typeof result[key] === 'object'
      ) {
        result[key] = this.merge(result[key], value);
      } else if (key in result) {
        result[key] = value;
      }
    }

    return result;
  }

  get(pathName, fallback = undefined) {
    const keys = String(pathName).split('.');
    let value = this.config;

    for (const key of keys) {
      if (
        value === null ||
        typeof value !== 'object' ||
        !(key in value)
      ) {
        return fallback;
      }

      value = value[key];
    }

    return value;
  }

  async set(pathName, value) {
    const keys = String(pathName).split('.');
    const last = keys.pop();

    if (!last || keys.some(key => !key)) {
      throw new Error('Invalid configuration path');
    }

    let target = this.config;

    for (const key of keys) {
      if (
        !target[key] ||
        typeof target[key] !== 'object' ||
        Array.isArray(target[key])
      ) {
        throw new Error('Configuration section not found');
      }

      target = target[key];
    }

    if (!(last in target)) {
      throw new Error('Unknown configuration option');
    }

    const current = target[last];

    if (
      typeof current !== typeof value ||
      (Array.isArray(current) !== Array.isArray(value))
    ) {
      throw new Error('Configuration value has the wrong type');
    }

    this.validate(pathName, value);

    target[last] = value;
    await this.save();

    return true;
  }

  validate(key, value) {
    if (key === 'command.prefix') {
      if (
        typeof value !== 'string' ||
        value.length < 1 ||
        value.length > 5 ||
        /\s/.test(value)
      ) {
        throw new Error('Invalid command prefix');
      }
    }

    if (key === 'command.mode') {
      if (!['public', 'private', 'self'].includes(value)) {
        throw new Error('Invalid bot mode');
      }
    }

    if (key === 'menu.style') {
      if (!['hybrid', 'simple', 'detailed'].includes(value)) {
        throw new Error('Invalid menu style');
      }
    }

    if (key === 'database.saveInterval') {
      if (!Number.isInteger(value) || value < 1000) {
        throw new Error('Invalid save interval');
      }
    }
  }

  async toggle(pathName) {
    const current = this.get(pathName);

    if (typeof current !== 'boolean') {
      throw new Error('This setting is not a boolean');
    }

    await this.set(pathName, !current);

    return !current;
  }

  async reset(pathName) {
    const defaultValue = this.getDefault(pathName);

    if (defaultValue === undefined) {
      throw new Error('Default setting not found');
    }

    return this.set(pathName, defaultValue);
  }

  getDefault(pathName) {
    return pathName.split('.').reduce(
      (value, key) => value?.[key],
      DEFAULT_CONFIG
    );
  }

  async resetAll() {
    this.config = structuredClone(DEFAULT_CONFIG);
    await this.save();
    return true;
  }

  getAll() {
    return structuredClone(this.config);
  }

  async save() {
    await fs.promises.mkdir(path.dirname(this.file), {
      recursive: true
    });

    const temporary = `${this.file}.tmp`;

    await fs.promises.writeFile(
      temporary,
      JSON.stringify(this.config, null, 2),
      'utf8'
    );

    await fs.promises.rename(temporary, this.file);

    return true;
  }

  export() {
    return JSON.stringify(this.config, null, 2);
  }

  async import(json) {
    let parsed;

    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Invalid configuration JSON');
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      throw new Error('Configuration must be an object');
    }

    this.config = this.merge(DEFAULT_CONFIG, parsed);
    await this.save();

    return true;
  }
}

const configManager = new AlphaConfigManager();

module.exports = {
  AlphaConfigManager,
  configManager,
  DEFAULT_CONFIG
};
