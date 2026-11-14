
const os = require('os');
const process = require('process');

class AlphaHealth {
  constructor() {
    this.startedAt = Date.now();
    this.checks = new Map();
  }

  formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let index = 0;

    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index++;
    }

    return `${size.toFixed(2)} ${units[index]}`;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${remaining}s`;
  }

  getMemory() {
    const memory = process.memoryUsage();

    return {
      rss: this.formatBytes(memory.rss),
      heapTotal: this.formatBytes(memory.heapTotal),
      heapUsed: this.formatBytes(memory.heapUsed),
      external: this.formatBytes(memory.external),
      arrayBuffers: this.formatBytes(memory.arrayBuffers)
    };
  }

  getSystemMemory() {
    const total = os.totalmem();
    const free = os.freemem();

    return {
      total: this.formatBytes(total),
      free: this.formatBytes(free),
      used: this.formatBytes(total - free),
      usagePercent: Number(
        (((total - free) / total) * 100).toFixed(2)
      )
    };
  }

  getCPU() {
    const cpus = os.cpus();

    return {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      architecture: os.arch(),
      loadAverage: os.loadavg()
    };
  }

  getRuntime() {
    return {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      pid: process.pid,
      uptime: this.formatDuration(process.uptime() * 1000)
    };
  }

  addCheck(name, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Health check must be a function');
    }

    this.checks.set(name, callback);
    return this;
  }

  removeCheck(name) {
    return this.checks.delete(name);
  }

  async runChecks() {
    const results = {};

    for (const [name, callback] of this.checks.entries()) {
      try {
        const result = await callback();

        results[name] = {
          status: result === false ? 'failed' : 'healthy',
          result
        };
      } catch (error) {
        results[name] = {
          status: 'failed',
          error: error.message
        };
      }
    }

    return results;
  }

  async getReport() {
    const checks = await this.runChecks();

    const failed = Object.values(checks).filter(
      check => check.status === 'failed'
    ).length;

    return {
      name: 'ALPHA-MD',
      status: failed ? 'degraded' : 'healthy',
      uptime: this.formatDuration(Date.now() - this.startedAt),
      startedAt: new Date(this.startedAt).toISOString(),
      checkedAt: new Date().toISOString(),
      memory: this.getMemory(),
      systemMemory: this.getSystemMemory(),
      cpu: this.getCPU(),
      runtime: this.getRuntime(),
      checks,
      checkSummary: {
        total: Object.keys(checks).length,
        healthy: Object.keys(checks).length - failed,
        failed
      }
    };
  }

  getQuickStatus() {
    return {
      status: 'online',
      uptime: this.formatDuration(Date.now() - this.startedAt),
      memory: this.getMemory(),
      node: process.version
    };
  }
}

const health = new AlphaHealth();

module.exports = {
  AlphaHealth,
  health
};
