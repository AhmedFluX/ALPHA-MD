
const crypto = require('crypto');

class AlphaScheduler {
  constructor(options = {}) {
    this.tasks = new Map();
    this.maxTasks = options.maxTasks || 1000;
    this.maxDelay = 2147483647;
    this.running = false;
  }

  schedule(callback, delay, options = {}) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!Number.isFinite(delay) || delay < 0 || delay > this.maxDelay) {
      throw new RangeError('Invalid task delay');
    }

    if (this.tasks.size >= this.maxTasks) {
      throw new Error('Scheduler task limit reached');
    }

    const id = crypto.randomUUID();
    const interval = options.interval || 0;

    if (
      interval &&
      (!Number.isFinite(interval) ||
        interval <= 0 ||
        interval > this.maxDelay)
    ) {
      throw new RangeError('Invalid recurring interval');
    }

    const task = {
      id,
      callback,
      delay,
      interval,
      name: options.name || 'Untitled Task',
      createdAt: Date.now(),
      nextRun: Date.now() + delay,
      status: 'scheduled',
      timer: null,
      runs: 0,
      maxRuns: options.maxRuns || 0
    };

    this.tasks.set(id, task);
    this.startTask(task);

    return id;
  }

  startTask(task) {
    if (!task || task.status === 'cancelled') return;

    task.status = 'scheduled';

    const wait = Math.max(0, task.nextRun - Date.now());

    task.timer = setTimeout(async () => {
      if (task.status === 'cancelled') return;

      task.status = 'running';
      task.runs++;

      try {
        await task.callback({
          id: task.id,
          name: task.name,
          runs: task.runs
        });
      } catch (error) {
        task.lastError = error.message;
        console.error(`[ALPHA SCHEDULER] ${task.name}:`, error.message);
      }

      if (
        task.interval > 0 &&
        task.status !== 'cancelled' &&
        (!task.maxRuns || task.runs < task.maxRuns)
      ) {
        task.nextRun = Date.now() + task.interval;
        this.startTask(task);
      } else {
        task.status = 'completed';
        this.tasks.delete(task.id);
      }
    }, wait);

    if (typeof task.timer.unref === 'function') {
      task.timer.unref();
    }
  }

  once(callback, delay, options = {}) {
    return this.schedule(callback, delay, options);
  }

  repeat(callback, interval, options = {}) {
    return this.schedule(callback, interval, {
      ...options,
      interval
    });
  }

  cancel(id) {
    const task = this.tasks.get(id);

    if (!task) return false;

    task.status = 'cancelled';

    if (task.timer) {
      clearTimeout(task.timer);
    }

    this.tasks.delete(id);
    return true;
  }

  cancelAll() {
    let cancelled = 0;

    for (const id of this.tasks.keys()) {
      if (this.cancel(id)) cancelled++;
    }

    return cancelled;
  }

  get(id) {
    const task = this.tasks.get(id);

    if (!task) return null;

    return {
      id: task.id,
      name: task.name,
      status: task.status,
      createdAt: task.createdAt,
      nextRun: task.nextRun,
      runs: task.runs,
      interval: task.interval,
      lastError: task.lastError || null
    };
  }

  getAll() {
    return Array.from(this.tasks.values()).map(task => this.get(task.id));
  }

  getByName(name) {
    return this.getAll().filter(task => task.name === name);
  }

  has(id) {
    return this.tasks.has(id);
  }

  get size() {
    return this.tasks.size;
  }

  getStats() {
    const tasks = this.getAll();

    return {
      total: tasks.length,
      scheduled: tasks.filter(t => t.status === 'scheduled').length,
      running: tasks.filter(t => t.status === 'running').length,
      recurring: tasks.filter(t => t.interval > 0).length
    };
  }

  shutdown() {
    this.cancelAll();
    this.running = false;
    return true;
  }
}

const scheduler = new AlphaScheduler();

module.exports = {
  AlphaScheduler,
  scheduler
};
