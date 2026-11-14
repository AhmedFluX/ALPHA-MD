
class AlphaAntiFlood {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 10000;
    this.maxMessages = options.maxMessages || 8;
    this.blockDuration = options.blockDuration || 15000;
    this.maxEntries = options.maxEntries || 10000;

    this.users = new Map();

    this.stats = {
      checked: 0,
      blocked: 0,
      allowed: 0
    };
  }

  getKey(chat, user) {
    return `${chat}:${user}`;
  }

  check(chat, user) {
    if (!chat || !user) {
      return {
        allowed: false,
        reason: 'INVALID_USER'
      };
    }

    this.stats.checked++;

    const now = Date.now();
    const key = this.getKey(chat, user);

    let data = this.users.get(key);

    if (data && data.blockedUntil > now) {
      this.stats.blocked++;

      return {
        allowed: false,
        reason: 'TEMPORARILY_BLOCKED',
        remaining: data.blockedUntil - now
      };
    }

    if (!data) {
      if (this.users.size >= this.maxEntries) {
        this.cleanup();

        if (this.users.size >= this.maxEntries) {
          return {
            allowed: false,
            reason: 'TRACKING_LIMIT'
          };
        }
      }

      data = {
        messages: [],
        blockedUntil: 0
      };
    }

    data.messages = data.messages.filter(
      timestamp => now - timestamp < this.windowMs
    );

    data.messages.push(now);

    if (data.messages.length > this.maxMessages) {
      data.blockedUntil = now + this.blockDuration;
      data.messages = [];

      this.users.set(key, data);
      this.stats.blocked++;

      return {
        allowed: false,
        reason: 'FLOOD_DETECTED',
        remaining: this.blockDuration,
        count: this.maxMessages
      };
    }

    this.users.set(key, data);
    this.stats.allowed++;

    return {
      allowed: true,
      count: data.messages.length,
      remaining: Math.max(
        0,
        this.windowMs - (now - data.messages[0])
      )
    };
  }

  isBlocked(chat, user) {
    const data = this.users.get(this.getKey(chat, user));

    return Boolean(
      data && data.blockedUntil > Date.now()
    );
  }

  reset(chat, user) {
    return this.users.delete(this.getKey(chat, user));
  }

  resetAll() {
    this.users.clear();
    return true;
  }

  cleanup() {
    const now = Date.now();

    for (const [key, data] of this.users.entries()) {
      data.messages = data.messages.filter(
        timestamp => now - timestamp < this.windowMs
      );

      if (
        data.messages.length === 0 &&
        data.blockedUntil <= now
      ) {
        this.users.delete(key);
      }
    }

    return this.users.size;
  }

  getStats() {
    return {
      ...this.stats,
      trackedUsers: this.users.size,
      windowMs: this.windowMs,
      maxMessages: this.maxMessages,
      blockDuration: this.blockDuration
    };
  }
}

const antiFlood = new AlphaAntiFlood();

module.exports = {
  AlphaAntiFlood,
  antiFlood
};
