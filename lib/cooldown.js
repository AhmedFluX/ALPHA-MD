
class AlphaCooldown {
  constructor(options = {}) {
    this.defaultCooldown = options.defaultCooldown || 3000;
    this.maxEntries = options.maxEntries || 10000;
    this.cooldowns = new Map();
    this.cleanupInterval = null;
  }

  createKey(command, user, chat = 'global') {
    return [
      String(chat).toLowerCase(),
      String(user).toLowerCase(),
      String(command).toLowerCase()
    ].join(':');
  }

  set(command, user, chat, duration = this.defaultCooldown) {
    if (!command || !user) {
      throw new Error('Command and user are required.');
    }

    const key = this.createKey(command, user, chat);
    const cooldown = Math.max(0, Number(duration) || 0);
    const now = Date.now();

    if (!this.cooldowns.has(key) &&
        this.cooldowns.size >= this.maxEntries) {
      this.cleanup();

      if (this.cooldowns.size >= this.maxEntries) {
        this.evictOldest();
      }
    }

    this.cooldowns.set(key, {
      command,
      user,
      chat,
      createdAt: now,
      expiresAt: now + cooldown
    });

    return {
      key,
      duration: cooldown,
      expiresAt: now + cooldown
    };
  }

  check(command, user, chat = 'global') {
    const key = this.createKey(command, user, chat);
    const entry = this.cooldowns.get(key);

    if (!entry) {
      return {
        active: false,
        remaining: 0,
        key
      };
    }

    const remaining = entry.expiresAt - Date.now();

    if (remaining <= 0) {
      this.cooldowns.delete(key);

      return {
        active: false,
        remaining: 0,
        key
      };
    }

    return {
      active: true,
      remaining,
      expiresAt: entry.expiresAt,
      key
    };
  }

  use(command, user, chat, duration = this.defaultCooldown) {
    const status = this.check(command, user, chat);

    if (status.active) {
      return {
        success: false,
        ...status
      };
    }

    const result = this.set(command, user, chat, duration);

    return {
      success: true,
      active: true,
      remaining: result.duration,
      expiresAt: result.expiresAt,
      key: result.key
    };
  }

  reset(command, user, chat = 'global') {
    return this.cooldowns.delete(
      this.createKey(command, user, chat)
    );
  }

  resetUser(user, chat) {
    let removed = 0;

    for (const [key, entry] of this.cooldowns.entries()) {
      if (
        entry.user === user &&
        (chat === undefined || entry.chat === chat)
      ) {
        this.cooldowns.delete(key);
        removed++;
      }
    }

    return removed;
  }

  resetCommand(command) {
    let removed = 0;

    for (const [key, entry] of this.cooldowns.entries()) {
      if (entry.command === command) {
        this.cooldowns.delete(key);
        removed++;
      }
    }

    return removed;
  }

  resetAll() {
    const count = this.cooldowns.size;
    this.cooldowns.clear();
    return count;
  }

  getRemaining(command, user, chat = 'global') {
    return this.check(command, user, chat).remaining;
  }

  isOnCooldown(command, user, chat = 'global') {
    return this.check(command, user, chat).active;
  }

  formatRemaining(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
  }

  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cooldowns.entries()) {
      if (entry.expiresAt <= now) {
        this.cooldowns.delete(key);
        removed++;
      }
    }

    return removed;
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cooldowns.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cooldowns.delete(oldestKey);
    }
  }

  startCleanup(interval = 60000) {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(
      () => this.cleanup(),
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
    this.cleanup();

    return {
      total: this.cooldowns.size,
      maxEntries: this.maxEntries
    };
  }
}

const cooldown = new AlphaCooldown({
  defaultCooldown: 3000,
  maxEntries: 10000
});

cooldown.startCleanup();

module.exports = {
  AlphaCooldown,
  cooldown
};
