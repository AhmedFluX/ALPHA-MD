
const { randomUUID } = require('crypto');

class AlphaQueue {
  constructor(options = {}) {
    this.concurrency = Math.max(
      1,
      options.concurrency || 3
    );

    this.maxRetries = Math.max(
      0,
      options.maxRetries ?? 2
    );

    this.maxQueueSize = options.maxQueueSize || 1000;

    this.tasks = [];
    this.activeTasks = new Map();
    this.completedTasks = [];
    this.failedTasks = [];

    this.paused = false;
    this.processing = false;

    this.stats = {
      added: 0,
      completed: 0,
      failed: 0,
      retried: 0,
      cancelled: 0
    };
  }

  add(task, options = {}) {
    if (typeof task !== 'function') {
      throw new TypeError('Task must be a function.');
    }

    if (this.tasks.length >= this.maxQueueSize) {
      throw new Error('Task queue is full.');
    }

    const item = {
      id: randomUUID(),
      task,
      priority: Number(options.priority) || 0,
      retries: 0,
      maxRetries: options.maxRetries ?? this.maxRetries,
      createdAt: Date.now(),
      status: 'pending',
      metadata: options.metadata || null
    };

    this.tasks.push(item);

    this.tasks.sort((a, b) => {
      return b.priority - a.priority ||
        a.createdAt - b.createdAt;
    });

    this.stats.added++;

    this.process();

    return item.id;
  }

  async process() {
    if (this.paused || this.processing) return;

    this.processing = true;

    try {
      while (
        !this.paused &&
        this.activeTasks.size < this.concurrency &&
        this.tasks.length > 0
      ) {
        const item = this.tasks.shift();

        this.activeTasks.set(item.id, item);

        this.runTask(item);
      }
    } finally {
      this.processing = false;
    }
  }

  async runTask(item) {
    item.status = 'running';
    item.startedAt = Date.now();

    try {
      const result = await item.task({
        id: item.id,
        attempt: item.retries + 1,
        metadata: item.metadata
      });

      item.status = 'completed';
      item.result = result;
      item.finishedAt = Date.now();

      this.stats.completed++;
      this.completedTasks.push(item);

      this.trimHistory(this.completedTasks);
    } catch (error) {
      item.error = error.message;

      if (item.retries < item.maxRetries) {
        item.retries++;
        item.status = 'pending';

        this.stats.retried++;
        this.tasks.push(item);

        this.tasks.sort((a, b) => {
          return b.priority - a.priority ||
            a.createdAt - b.createdAt;
        });
      } else {
        item.status = 'failed';
        item.finishedAt = Date.now();

        this.stats.failed++;
        this.failedTasks.push(item);

        this.trimHistory(this.failedTasks);
      }
    } finally {
      this.activeTasks.delete(item.id);
      this.process();
    }
  }

  trimHistory(list, limit = 100) {
    if (list.length > limit) {
      list.splice(0, list.length - limit);
    }
  }

  pause() {
    this.paused = true;
    return true;
  }

  resume() {
    this.paused = false;
    this.process();
    return true;
  }

  cancel(taskId) {
    const index = this.tasks.findIndex(
      item => item.id === taskId
    );

    if (index === -1) {
      return false;
    }

    const [item] = this.tasks.splice(index, 1);

    item.status = 'cancelled';
    item.finishedAt = Date.now();

    this.stats.cancelled++;

    return true;
  }

  clear() {
    const count = this.tasks.length;

    this.stats.cancelled += count;
    this.tasks = [];

    return count;
  }

  getTask(taskId) {
    return (
      this.tasks.find(item => item.id === taskId) ||
      this.activeTasks.get(taskId) ||
      this.completedTasks.find(item => item.id === taskId) ||
      this.failedTasks.find(item => item.id === taskId) ||
      null
    );
  }

  getStats() {
    return {
      ...this.stats,
      pending: this.tasks.length,
      running: this.activeTasks.size,
      completed: this.completedTasks.length,
      failed: this.failedTasks.length,
      paused: this.paused,
      concurrency: this.concurrency
    };
  }

  getPending() {
    return this.tasks.map(({ task, ...item }) => item);
  }

  getActive() {
    return [...this.activeTasks.values()].map(
      ({ task, ...item }) => item
    );
  }

  getFailed() {
    return this.failedTasks.map(({ task, ...item }) => item);
  }

  getCompleted() {
    return this.completedTasks.map(({ task, ...item }) => item);
  }

  async waitForIdle(timeout = 30000) {
    const started = Date.now();

    while (
      this.tasks.length > 0 ||
      this.activeTasks.size > 0
    ) {
      if (Date.now() - started > timeout) {
        throw new Error('Queue idle timeout exceeded.');
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return true;
  }
}

const queue = new AlphaQueue({
  concurrency: 3,
  maxRetries: 2,
  maxQueueSize: 1000
});

module.exports = {
  AlphaQueue,
  queue
};
