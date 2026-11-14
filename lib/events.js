
const { formatter } = require('./formatter');
const { metadata } = require('./metadata');
const { logger } = require('./logger');

class AlphaEvents {
  constructor(options = {}) {
    this.config = options.config || {};
    this.handlers = new Map();
    this.registered = false;
  }

  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Event callback must be a function');
    }

    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }

    this.handlers.get(event).push(callback);
    return this;
  }

  async emit(event, ...args) {
    const callbacks = this.handlers.get(event) || [];

    for (const callback of callbacks) {
      try {
        await callback(...args);
      } catch (error) {
        console.error(`[ALPHA EVENTS] ${event}:`, error.message);
      }
    }
  }

  register(sock) {
    if (!sock || !sock.ev) {
      throw new Error('A valid WhatsApp socket is required');
    }

    if (this.registered) {
      throw new Error('Events are already registered');
    }

    this.registered = true;

    sock.ev.on('connection.update', async update => {
      await this.emit('connection.update', update);

      if (update.connection === 'open') {
        console.log('[ALPHA-MD] WhatsApp connected');
        await this.emit('connected', sock);
      }

      if (update.connection === 'close') {
        console.log('[ALPHA-MD] WhatsApp connection closed');
        await this.emit('disconnected', update);
      }

      if (update.qr) {
        await this.emit('qr', update.qr);
      }
    });

    sock.ev.on('creds.update', async creds => {
      await this.emit('credentials.update', creds);
    });

    sock.ev.on('group-participants.update', async update => {
      metadata.clear(update.id);

      await this.emit('group.participants', update);

      const group = await metadata.getGroup(sock, update.id)
        .catch(() => null);

      const groupName = group?.subject || 'Group';

      for (const participant of update.participants || []) {
        const jid = participant;

        if (update.action === 'add') {
          await this.emit('member.added', {
            group: update.id,
            groupName,
            participant: jid
          });
        }

        if (update.action === 'remove') {
          await this.emit('member.removed', {
            group: update.id,
            groupName,
            participant: jid
          });
        }

        if (update.action === 'promote') {
          await this.emit('member.promoted', {
            group: update.id,
            participant: jid
          });
        }

        if (update.action === 'demote') {
          await this.emit('member.demoted', {
            group: update.id,
            participant: jid
          });
        }
      }
    });

    sock.ev.on('groups.update', async updates => {
      for (const update of updates || []) {
        metadata.clear(update.id);
        await this.emit('group.updated', update);
      }
    });

    sock.ev.on('messages.update', async updates => {
      await this.emit('messages.updated', updates);
    });

    sock.ev.on('messages.delete', async update => {
      await this.emit('messages.deleted', update);
    });

    sock.ev.on('group.join-request', async update => {
      await this.emit('group.join-request', update);
    });

    return this;
  }

  unregister() {
    this.handlers.clear();
    this.registered = false;
  }

  getEvents() {
    return Array.from(this.handlers.keys());
  }

  remove(event) {
    return this.handlers.delete(event);
  }
}

const events = new AlphaEvents();

module.exports = {
  AlphaEvents,
  events
};
