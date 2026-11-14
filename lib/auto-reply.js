
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../database/auto-reply.json');

const DEFAULTS = {
  enabled: false,
  defaultReply: '',
  replies: [
    {
      keyword: 'hello',
      response: 'Hello! Welcome to ALPHA-MD.',
      match: 'contains'
    },
    {
      keyword: 'assalamualaikum',
      response: 'Wa Alaikum Assalam!',
      match: 'contains'
    },
    {
      keyword: 'good morning',
      response: 'Good Morning! Have a great day.',
      match: 'contains'
    }
  ]
};

class AutoReply {
  constructor() {
    this.data = {
      ...DEFAULTS,
      replies: [...DEFAULTS.replies]
    };
    this.init();
  }

  init() {
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });

      if (fs.existsSync(FILE)) {
        const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));

        this.data = {
          ...DEFAULTS,
          ...saved,
          replies: Array.isArray(saved.replies)
            ? saved.replies
            : [...DEFAULTS.replies]
        };
      } else {
        this.save();
      }
    } catch (error) {
      console.error('[AUTO-REPLY]', error.message);
    }
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(this.data, null, 2));
      return true;
    } catch (error) {
      console.error('[AUTO-REPLY]', error.message);
      return false;
    }
  }

  enable() {
    this.data.enabled = true;
    return this.save();
  }

  disable() {
    this.data.enabled = false;
    return this.save();
  }

  add(keyword, response, match = 'contains') {
    keyword = String(keyword || '').trim().toLowerCase();
    response = String(response || '').trim();

    if (!keyword || !response) return false;
    if (!['contains', 'exact', 'starts'].includes(match)) {
      match = 'contains';
    }

    this.data.replies = this.data.replies.filter(
      item => item.keyword !== keyword
    );

    this.data.replies.push({ keyword, response, match });
    return this.save();
  }

  remove(keyword) {
    keyword = String(keyword || '').trim().toLowerCase();

    const before = this.data.replies.length;

    this.data.replies = this.data.replies.filter(
      item => item.keyword !== keyword
    );

    if (before === this.data.replies.length) return false;
    return this.save();
  }

  setDefault(response) {
    this.data.defaultReply = String(response || '').trim();
    return this.save();
  }

  clear() {
    this.data.replies = [];
    this.data.defaultReply = '';
    return this.save();
  }

  getReply(message) {
    if (!this.data.enabled) return null;

    const text = String(message || '').trim().toLowerCase();
    if (!text) return null;

    const found = this.data.replies.find(item => {
      const keyword = item.keyword.toLowerCase();

      if (item.match === 'exact') return text === keyword;
      if (item.match === 'starts') return text.startsWith(keyword);

      return text.includes(keyword);
    });

    return found
      ? found.response
      : this.data.defaultReply || null;
  }

  getAll() {
    return {
      enabled: this.data.enabled,
      defaultReply: this.data.defaultReply,
      replies: this.data.replies
    };
  }
}

module.exports = new AutoReply();
