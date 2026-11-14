
const { pluginLoader } = require('./plugin-loader');
const { cooldown } = require('./cooldown');
const { permissions } = require('./permissions');
const { logger } = require('./logger');

class AlphaCommandHandler {
  constructor(options = {}) {
    this.prefix = options.prefix || '.';
    this.stats = new Map();
    this.defaultCooldown = options.cooldown ?? 2000;
  }

  parse(text) {
    if (typeof text !== 'string') return null;

    const body = text.trim();

    if (!body.startsWith(this.prefix)) return null;

    const input = body.slice(this.prefix.length).trim();

    if (!input) return null;

    const parts = input.split(/\s+/);
    const command = parts.shift().toLowerCase();

    return {
      command,
      args: parts,
      text: parts.join(' '),
      prefix: this.prefix
    };
  }

  getStats(command) {
    return this.stats.get(command) || {
      uses: 0,
      errors: 0,
      lastUsed: null
    };
  }

  updateStats(command, success) {
    const data = this.getStats(command);

    if (success) data.uses++;
    else data.errors++;

    data.lastUsed = Date.now();

    this.stats.set(command, data);
  }

  async checkPermissions(plugin, message, sock) {
    const isGroup = Boolean(message.isGroup);
    const sender = message.sender || message.senderJid;
    const chat = message.chat || message.from;

    if (plugin.ownerOnly) {
      const allowed = await permissions.isOwner(sender);

      if (!allowed) {
        return { allowed: false, reason: 'OWNER_ONLY' };
      }
    }

    if (plugin.groupOnly && !isGroup) {
      return { allowed: false, reason: 'GROUP_ONLY' };
    }

    if (plugin.privateOnly && isGroup) {
      return { allowed: false, reason: 'PRIVATE_ONLY' };
    }

    if (plugin.adminOnly) {
      if (!isGroup) {
        return { allowed: false, reason: 'GROUP_ADMIN_ONLY' };
      }

      const admin = await permissions.isAdmin(
        sock,
        chat,
        sender
      );

      if (!admin) {
        return { allowed: false, reason: 'ADMIN_ONLY' };
      }
    }

    return { allowed: true };
  }

  async handle(message, sock) {
    const parsed = this.parse(
      message.text || message.body || ''
    );

    if (!parsed) return null;

    const plugin = pluginLoader.get(parsed.command);

    if (!plugin) {
      return {
        success: false,
        reason: 'COMMAND_NOT_FOUND',
        command: parsed.command
      };
    }

    const sender = message.sender || message.senderJid || 'unknown';
    const chat = message.chat || message.from || 'global';

    const permission = await this.checkPermissions(
      plugin,
      message,
      sock
    );

    if (!permission.allowed) {
      return {
        success: false,
        reason: permission.reason
      };
    }

    const owner = await permissions.isOwner(sender);

    const cooldownResult = cooldown.use(
      chat,
      sender,
      parsed.command,
      owner ? 0 : this.defaultCooldown
    );

    if (!cooldownResult.allowed) {
      return {
        success: false,
        reason: 'COOLDOWN',
        remaining: cooldownResult.remaining
      };
    }

    try {
      const result = await pluginLoader.execute(
        parsed.command,
        message,
        sock,
        parsed.args
      );

      this.updateStats(parsed.command, result.success);

      if (!result.success) {
        return {
          success: false,
          reason: result.reason,
          command: parsed.command
        };
      }

      return {
        success: true,
        command: parsed.command,
        result: result.result
      };
    } catch (error) {
      this.updateStats(parsed.command, false);

      if (logger && typeof logger.error === 'function') {
        logger.error('Command Handler', error);
      } else {
        console.error('[ALPHA COMMAND HANDLER]', error);
      }

      return {
        success: false,
        reason: 'COMMAND_ERROR'
      };
    }
  }

  getAllStats() {
    return Object.fromEntries(this.stats);
  }

  resetStats() {
    this.stats.clear();
    return true;
  }
}

const commandHandler = new AlphaCommandHandler();

module.exports = {
  AlphaCommandHandler,
  commandHandler
};
