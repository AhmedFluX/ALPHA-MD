
const config = require('../config/settings');

class AntiSpam {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 10000;
    this.maxMessages = options.maxMessages || 7;
    this.maxDuplicates = options.maxDuplicates || 3;
    this.muteMs = options.muteMs || 30000;
    this.maxWarnings = options.maxWarnings || 3;

    this.users = new Map();
    this.cleanupInterval = null;
  }

  getKey(chat, sender) {
    return `${chat}:${sender}`;
  }

  getRecord(chat, sender) {
    const key = this.getKey(chat, sender);

    if (!this.users.has(key)) {
      this.users.set(key, {
        messages: [],
        lastMessage: '',
        duplicates: 0,
        warnings: 0,
        mutedUntil: 0
      });
    }

    return this.users.get(key);
  }

  normalizeText(text = '') {
    return String(text)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  check({ chat, sender, text = '', isOwner = false }) {
    if (!chat || !sender) {
      return {
        spam: false,
        reason: null,
        warnings: 0,
        muted: false
      };
    }

    if (isOwner) {
      return {
        spam: false,
        reason: null,
        warnings: 0,
        muted: false
      };
    }

    const now = Date.now();
    const record = this.getRecord(chat, sender);
    const normalized = this.normalizeText(text);

    if (record.mutedUntil > now) {
      return {
        spam: true,
        reason: 'temporary_restriction',
        warnings: record.warnings,
        muted: true,
        remaining: record.mutedUntil - now
      };
    }

    record.messages = record.messages.filter(
      timestamp => now - timestamp < this.windowMs
    );

    record.messages.push(now);

    if (normalized && normalized === record.lastMessage) {
      record.duplicates++;
    } else {
      record.duplicates = 0;
    }

    record.lastMessage = normalized;

    let reason = null;

    if (record.messages.length > this.maxMessages) {
      reason = 'message_flood';
    }

    if (record.duplicates >= this.maxDuplicates) {
      reason = 'duplicate_messages';
    }

    if (reason) {
      record.warnings++;

      record.messages = [];

      if (record.warnings >= this.maxWarnings) {
        record.mutedUntil = now + this.muteMs;
        record.warnings = 0;
      }

      return {
        spam: true,
        reason,
        warnings: record.warnings,
        muted: record.mutedUntil > now,
        remaining: record.mutedUntil > now
          ? record.mutedUntil - now
          : 0
      };
    }

    return {
      spam: false,
      reason: null,
      warnings: record.warnings,
      muted: false
    };
  }

  reset(chat, sender) {
    this.users.delete(this.getKey(chat, sender));
    return true;
  }

  resetWarnings(chat, sender) {
    const record = this.getRecord(chat, sender);

    record.warnings = 0;
    record.duplicates = 0;
    record.messages = [];
    record.mutedUntil = 0;

    return true;
  }

  getStatus(chat, sender) {
    const record = this.getRecord(chat, sender);

    return {
      warnings: record.warnings,
      messages: record.messages.length,
      muted: record.mutedUntil > Date.now(),
      remaining: Math.max(0, record.mutedUntil - Date.now())
    };
  }

  clearExpired() {
    const now = Date.now();

    for (const [key, record] of this.users.entries()) {
      record.messages = record.messages.filter(
        timestamp => now - timestamp < this.windowMs
      );

      if (
        record.messages.length === 0 &&
        record.mutedUntil <= now &&
        record.warnings === 0
      ) {
        this.users.delete(key);
      }
    }
  }

  startCleanup(interval = 60000) {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(
      () => this.clearExpired(),
      interval
    );

    this.cleanupInterval.unref?.();
  }

  stopCleanup() {
    if (!this.cleanupInterval) return;

    clearInterval(this.cleanupInterval);
    this.cleanupInterval = null;
  }

  getStats() {
    let mutedUsers = 0;
    let warningUsers = 0;

    for (const record of this.users.values()) {
      if (record.mutedUntil > Date.now()) mutedUsers++;
      if (record.warnings > 0) warningUsers++;
    }

    return {
      trackedUsers: this.users.size,
      mutedUsers,
      warningUsers
    };
  }
}

const antiSpam = new AntiSpam({
  windowMs: 10000,
  maxMessages: 7,
  maxDuplicates: 3,
  muteMs: 30000,
  maxWarnings: 3
});

module.exports = {
  AntiSpam,
  antiSpam
};
