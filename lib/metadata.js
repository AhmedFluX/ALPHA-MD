
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

class AlphaMetadata {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 60000;
    this.maxCache = options.maxCache || 500;
  }

  normalizeJid(jid) {
    if (!jid || typeof jid !== 'string') return '';
    return jidNormalizedUser(jid);
  }

  getCached(key) {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  setCache(key, data) {
    if (this.cache.size >= this.maxCache) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttl
    });

    return data;
  }

  async getGroup(sock, jid, force = false) {
    if (!sock || !jid || !jid.endsWith('@g.us')) {
      throw new Error('A valid group JID is required');
    }

    const key = `group:${jid}`;

    if (!force) {
      const cached = this.getCached(key);
      if (cached) return cached;
    }

    const metadata = await sock.groupMetadata(jid);

    const result = {
      id: metadata.id,
      subject: metadata.subject || '',
      owner: metadata.owner || null,
      subjectOwner: metadata.subjectOwner || null,
      subjectTime: metadata.subjectTime || null,
      creation: metadata.creation || null,
      description: metadata.desc || '',
      participants: (metadata.participants || []).map(p => ({
        id: this.normalizeJid(p.id),
        admin: p.admin || null,
        isAdmin: Boolean(p.admin),
        isSuperAdmin: p.admin === 'superadmin'
      })),
      size: (metadata.participants || []).length
    };

    return this.setCache(key, result);
  }

  async getParticipants(sock, jid, force = false) {
    const group = await this.getGroup(sock, jid, force);
    return group.participants;
  }

  async getAdmins(sock, jid, force = false) {
    const participants = await this.getParticipants(sock, jid, force);

    return participants.filter(p => p.isAdmin);
  }

  async getMembers(sock, jid, force = false) {
    const participants = await this.getParticipants(sock, jid, force);

    return participants.filter(p => !p.isAdmin);
  }

  async isAdmin(sock, groupJid, userJid) {
    const user = this.normalizeJid(userJid);
    const admins = await this.getAdmins(sock, groupJid);

    return admins.some(p => p.id === user);
  }

  async isBotAdmin(sock, groupJid) {
    const botJid = this.normalizeJid(sock.user?.id);

    if (!botJid) return false;

    return this.isAdmin(sock, groupJid, botJid);
  }

  async getParticipant(sock, groupJid, userJid) {
    const user = this.normalizeJid(userJid);
    const participants = await this.getParticipants(sock, groupJid);

    return participants.find(p => p.id === user) || null;
  }

  async getUser(sock, jid) {
    const normalized = this.normalizeJid(jid);

    if (!normalized) {
      throw new Error('A valid user JID is required');
    }

    return {
      id: normalized,
      number: normalized.split('@')[0].split(':')[0],
      isBot: normalized === this.normalizeJid(sock.user?.id)
    };
  }

  async getGroupCount(sock, jid) {
    const group = await this.getGroup(sock, jid);
    return group.size;
  }

  async getGroupAdminsCount(sock, jid) {
    const admins = await this.getAdmins(sock, jid);
    return admins.length;
  }

  clear(jid) {
    if (jid) {
      this.cache.delete(`group:${jid}`);
      return true;
    }

    this.cache.clear();
    return true;
  }

  cleanup() {
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }

    return this.cache.size;
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      maxCache: this.maxCache,
      ttl: this.ttl
    };
  }
}

const metadata = new AlphaMetadata();

module.exports = {
  AlphaMetadata,
  metadata
};
