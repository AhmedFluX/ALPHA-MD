
/*
╔══════════════════════════════════════════════╗
║              ALPHA-MD DATABASE               ║
║                POWERED BY AHMED              ║
╚══════════════════════════════════════════════╝
*/

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(process.cwd(), 'database');

const DB_FILES = {
  users: 'users.json',
  groups: 'groups.json',
  chats: 'chats.json',
  premium: 'premium.json',
  banned: 'banned.json',
  warnings: 'warnings.json',
  afk: 'afk.json',
  economy: 'economy.json',
  settings: 'settings.json',
  stats: 'stats.json'
};

const defaults = {
  users: {},
  groups: {},
  chats: {},
  premium: [],
  banned: [],
  warnings: {},
  afk: {},
  economy: {},
  settings: {},
  stats: {
    messages: 0,
    commands: 0,
    users: 0,
    groups: 0,
    started: Date.now()
  }
};

class AlphaDatabase {
  constructor() {
    this.data = {};
    this.timers = new Map();
    this.initialized = false;
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    for (const [key, filename] of Object.entries(DB_FILES)) {
      const file = path.join(DB_DIR, filename);

      try {
        if (!fs.existsSync(file)) {
          this.data[key] = structuredClone(defaults[key]);
          this.save(key);
        } else {
          const content = fs.readFileSync(file, 'utf8');
          this.data[key] = JSON.parse(content);

          if (
            !this.data[key] ||
            typeof this.data[key] !== 'object'
          ) {
            throw new Error('Invalid database structure');
          }
        }
      } catch (error) {
        console.error(`Database error [${key}]:`, error.message);
        this.data[key] = structuredClone(defaults[key]);
      }
    }

    this.initialized = true;
    console.log('[ALPHA-MD] Database initialized.');

    return this;
  }

  // ========================================
  // SAVE DATABASE
  // ========================================

  save(name) {
    if (!DB_FILES[name]) {
      throw new Error(`Unknown database: ${name}`);
    }

    if (!this.initialized && !this.data[name]) {
      this.data[name] = structuredClone(defaults[name]);
    }

    const file = path.join(DB_DIR, DB_FILES[name]);
    const temporary = `${file}.tmp`;

    fs.mkdirSync(DB_DIR, { recursive: true });

    fs.writeFileSync(
      temporary,
      JSON.stringify(this.data[name], null, 2),
      'utf8'
    );

    fs.renameSync(temporary, file);

    return true;
  }

  saveAll() {
    for (const name of Object.keys(DB_FILES)) {
      this.save(name);
    }

    return true;
  }

  // ========================================
  // GENERAL DATABASE METHODS
  // ========================================

  get(database, key) {
    if (!DB_FILES[database]) {
      throw new Error('Invalid database');
    }

    return this.data[database][key];
  }

  set(database, key, value) {
    if (!DB_FILES[database]) {
      throw new Error('Invalid database');
    }

    this.data[database][key] = value;
    return this.save(database);
  }

  has(database, key) {
    if (!DB_FILES[database]) return false;

    return Object.prototype.hasOwnProperty.call(
      this.data[database],
      key
    );
  }

  delete(database, key) {
    if (!this.has(database, key)) return false;

    if (Array.isArray(this.data[database])) {
      this.data[database] = this.data[database]
        .filter(item => item !== key);
    } else {
      delete this.data[database][key];
    }

    this.save(database);
    return true;
  }

  all(database) {
    if (!DB_FILES[database]) return null;

    return structuredClone(this.data[database]);
  }

  // ========================================
  // USER MANAGEMENT
  // ========================================

  getUser(jid) {
    if (!this.data.users[jid]) {
      this.data.users[jid] = {
        jid,
        name: '',
        registered: Date.now(),
        premium: false,
        banned: false,
        warnings: 0,
        level: 1,
        experience: 0,
        balance: 0,
        messages: 0,
        commands: 0
      };

      this.save('users');
    }

    return this.data.users[jid];
  }

  updateUser(jid, updates) {
    const user = this.getUser(jid);

    this.data.users[jid] = {
      ...user,
      ...updates,
      jid
    };

    this.save('users');
    return this.data.users[jid];
  }

  removeUser(jid) {
    return this.delete('users', jid);
  }

  // ========================================
  // GROUP MANAGEMENT
  // ========================================

  getGroup(jid) {
    if (!this.data.groups[jid]) {
      this.data.groups[jid] = {
        jid,
        welcome: false,
        goodbye: false,
        antilink: false,
        antispam: false,
        antibadword: false,
        mute: false,
        warnings: {},
        created: Date.now()
      };

      this.save('groups');
    }

    return this.data.groups[jid];
  }

  updateGroup(jid, updates) {
    this.data.groups[jid] = {
      ...this.getGroup(jid),
      ...updates,
      jid
    };

    this.save('groups');
    return this.data.groups[jid];
  }

  // ========================================
  // PREMIUM MANAGEMENT
  // ========================================

  isPremium(jid) {
    return this.data.premium.some(
      item => item.jid === jid &&
        item.expiry > Date.now()
    );
  }

  addPremium(jid, days = 30) {
    this.removePremium(jid);

    const expiry = Date.now() +
      days * 24 * 60 * 60 * 1000;

    this.data.premium.push({
      jid,
      expiry,
      added: Date.now()
    });

    this.save('premium');
    return expiry;
  }

  removePremium(jid) {
    this.data.premium = this.data.premium.filter(
      item => item.jid !== jid
    );

    this.save('premium');
    return true;
  }

  // ========================================
  // BAN MANAGEMENT
  // ========================================

  isBanned(jid) {
    return this.data.banned.includes(jid);
  }

  ban(jid) {
    if (!this.isBanned(jid)) {
      this.data.banned.push(jid);
      this.save('banned');
    }

    return true;
  }

  unban(jid) {
    this.data.banned = this.data.banned.filter(
      item => item !== jid
    );

    this.save('banned');
    return true;
  }

  // ========================================
  // WARNINGS SYSTEM
  // ========================================

  addWarning(jid, reason = 'No reason provided') {
    if (!this.data.warnings[jid]) {
      this.data.warnings[jid] = [];
    }

    this.data.warnings[jid].push({
      reason,
      date: Date.now()
    });

    this.save('warnings');

    return this.getWarnings(jid);
  }

  getWarnings(jid) {
    return (this.data.warnings[jid] || []).length;
  }

  clearWarnings(jid) {
    delete this.data.warnings[jid];
    this.save('warnings');
    return true;
  }

  // ========================================
  // AFK SYSTEM
  // ========================================

  setAFK(jid, reason = 'AFK') {
    this.data.afk[jid] = {
      reason,
      since: Date.now()
    };

    this.save('afk');
    return true;
  }

  getAFK(jid) {
    return this.data.afk[jid] || null;
  }

  removeAFK(jid) {
    delete this.data.afk[jid];
    this.save('afk');
    return true;
  }

  // ========================================
  // ECONOMY SYSTEM
  // ========================================

  getEconomy(jid) {
    if (!this.data.economy[jid]) {
      this.data.economy[jid] = {
        balance: 0,
        bank: 0,
        experience: 0,
        level: 1,
        daily: 0,
        weekly: 0,
        monthly: 0
      };

      this.save('economy');
    }

    return this.data.economy[jid];
  }

  updateEconomy(jid, updates) {
    this.data.economy[jid] = {
      ...this.getEconomy(jid),
      ...updates
    };

    this.save('economy');
    return this.data.economy[jid];
  }

  // ========================================
  // STATISTICS
  // ========================================

  incrementStat(name, amount = 1) {
    if (typeof this.data.stats[name] !== 'number') {
      this.data.stats[name] = 0;
    }

    this.data.stats[name] += amount;
    this.save('stats');

    return this.data.stats[name];
  }

  getStats() {
    return this.all('stats');
  }

  // ========================================
  // AUTO SAVE
  // ========================================

  startAutoSave(interval = 30000) {
    if (this.timers.has('autosave')) return;

    const timer = setInterval(() => {
      try {
        this.saveAll();
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }, interval);

    this.timers.set('autosave', timer);
  }

  stopAutoSave() {
    const timer = this.timers.get('autosave');

    if (timer) {
      clearInterval(timer);
      this.timers.delete('autosave');
    }
  }

  close() {
    this.stopAutoSave();
    this.saveAll();
    console.log('[ALPHA-MD] Database closed.');
  }
}

// ========================================
// EXPORT
// ========================================

const database = new AlphaDatabase();

module.exports = database;
