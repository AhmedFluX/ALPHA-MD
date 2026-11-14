
const fs = require('fs');
const path = require('path');
const config = require('../config/settings');

const LOG_DIR = path.join(process.cwd(), 'logs');

const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m',
  WHITE: '\x1b[37m'
};

const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  SUCCESS: 2,
  WARN: 3,
  ERROR: 4
};

class AlphaLogger {
  constructor(options = {}) {
    this.enabled = options.enabled ?? config.logging?.enabled ?? true;
    this.level = String(
      options.level || config.logging?.level || 'info'
    ).toUpperCase();

    this.fileLogging = options.fileLogging ?? true;
    this.consoleLogging = options.consoleLogging ?? true;
    this.maxFileSize = options.maxFileSize || 5 * 1024 * 1024;

    this.file = path.join(LOG_DIR, 'alpha-md.log');

    if (this.enabled && this.fileLogging) {
      this.initialize();
    }
  }

  initialize() {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }

      if (!fs.existsSync(this.file)) {
        fs.writeFileSync(this.file, '', 'utf8');
      }
    } catch (error) {
      console.error('Logger initialization failed:', error.message);
    }
  }

  getTimestamp() {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: config.bot?.timezone || 'Asia/Karachi',
      dateStyle: 'short',
      timeStyle: 'medium',
      hour12: false
    }).format(new Date());
  }

  getColor(level) {
    const colors = {
      DEBUG: COLORS.GRAY,
      INFO: COLORS.CYAN,
      SUCCESS: COLORS.GREEN,
      WARN: COLORS.YELLOW,
      ERROR: COLORS.RED
    };

    return colors[level] || COLORS.WHITE;
  }

  shouldLog(level) {
    if (!this.enabled) return false;

    const configured = LEVELS[this.level] ?? LEVELS.DEBUG;
    const requested = LEVELS[level] ?? LEVELS.INFO;

    return requested >= configured;
  }

  rotateFile() {
    try {
      if (!fs.existsSync(this.file)) return;

      const stats = fs.statSync(this.file);

      if (stats.size < this.maxFileSize) return;

      const backup = path.join(
        LOG_DIR,
        `alpha-md-${Date.now()}.log`
      );

      fs.renameSync(this.file, backup);
      fs.writeFileSync(this.file, '', 'utf8');
    } catch (error) {
      console.error('Log rotation failed:', error.message);
    }
  }

  formatData(data) {
    if (data instanceof Error) {
      return `${data.message}\n${data.stack || ''}`;
    }

    if (typeof data === 'object' && data !== null) {
      try {
        return JSON.stringify(data);
      } catch {
        return '[Unserializable Object]';
      }
    }

    return String(data ?? '');
  }

  log(level, message, data = '') {
    level = String(level).toUpperCase();

    if (!this.shouldLog(level)) return;

    const timestamp = this.getTimestamp();
    const details = this.formatData(data);

    const line = [
      `[${timestamp}]`,
      `[${level}]`,
      String(message),
      details
    ].filter(Boolean).join(' ');

    if (this.consoleLogging) {
      const color = this.getColor(level);

      console.log(
        `${color}${line}${COLORS.RESET}`
      );
    }

    if (this.fileLogging) {
      try {
        this.initialize();
        this.rotateFile();

        fs.appendFileSync(
          this.file,
          line + '\n',
          'utf8'
        );
      } catch (error) {
        console.error('Unable to write log:', error.message);
      }
    }
  }

  debug(message, data) {
    this.log('DEBUG', message, data);
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  success(message, data) {
    this.log('SUCCESS', message, data);
  }

  warn(message, data) {
    this.log('WARN', message, data);
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  command(command, sender, chat) {
    this.info('COMMAND EXECUTED', {
      command,
      sender,
      chat
    });
  }

  connection(status, details = '') {
    this.info('CONNECTION', {
      status,
      details
    });
  }

  plugin(name, status, details = '') {
    this.info('PLUGIN', {
      name,
      status,
      details
    });
  }

  group(action, group, sender) {
    this.info('GROUP ACTION', {
      action,
      group,
      sender
    });
  }

  activity(action, details = {}) {
    this.info('BOT ACTIVITY', {
      action,
      ...details
    });
  }
}

const logger = new AlphaLogger();

module.exports = {
  AlphaLogger,
  logger,
  COLORS,
  LEVELS
};
