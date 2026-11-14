
class AlphaCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.ttl || 5 * 60 * 1000;

    this.store = new Map();

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      expired: 0
    };

    this.cleanupInterval = null;
  }

  isExpired(entry) {
    return entry.expiresAt !== 0 &&
      Date.now() >= entry.expiresAt;
  }

  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.stats.expired++;
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    if (key === undefined || key === null) {
      throw new Error('Cache key is required.');
    }

    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      this.evictOldest();
    }

    const duration = Math.max(0, Number(ttl) || 0);

    this.store.set(key, {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: duration === 0
        ? 0
        : Date.now() + duration
    });

    this.stats.sets++;

    return value;
  }

  has(key) {
    const entry = this.store.get(key);

    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.stats.expired++;
      return false;
    }

    return true;
  }

  delete(key) {
    const deleted = this.store.delete(key);

    if (deleted) {
      this.stats.deletes++;
    }

    return deleted;
  }

  clear() {
    this.store.clear();
    return true;
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.store.delete(oldestKey);
    }
  }

  cleanup() {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (
        entry.expiresAt !== 0 &&
        now >= entry.expiresAt
      ) {
        this.store.delete(key);
        this.stats.expired++;
      }
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

  getOrSet(key, callback, ttl = this.defaultTTL) {
    if (this.has(key)) {
      return this.get(key);
    }

    const value = callback();

    if (value && typeof value.then === 'function') {
      return value.then(result => {
        this.set(key, result, ttl);
        return result;
      });
    }

    this.set(key, value, ttl);

    return value;
  }

  getMany(keys = []) {
    const result = {};

    for (const key of keys) {
      result[key] = this.get(key);
    }

    return result;
  }

  setMany(data = {}, ttl = this.defaultTTL) {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value, ttl);
    }

    return true;
  }

  deleteMany(keys = []) {
    let deleted = 0;

    for (const key of keys) {
      if (this.delete(key)) deleted++;
    }

    return deleted;
  }

  keys() {
    this.cleanup();
    return [...this.store.keys()];
  }

  size() {
    this.cleanup();
    return this.store.size;
  }

  getStats() {
    return {
      ...this.stats,
      size: this.store.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits + this.stats.misses === 0
        ? 0
        : Number(
            (
              this.stats.hits /
              (this.stats.hits + this.stats.misses)
            ).toFixed(2)
          )
    };
  }

  resetStats() {
    for (const key of Object.keys(this.stats)) {
      this.stats[key] = 0;
    }

    return true;
  }
}

const cache = new AlphaCache({
  maxSize: 1000,
  ttl: 5 * 60 * 1000
});

cache.startCleanup();

module.exports = {
  AlphaCache,
  cache
};
