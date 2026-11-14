
const DEFAULT_SETTINGS = {
  enabled: false,
  action: 'warn',
  allowAdmins: true,
  allowOwner: true,
  maxWarnings: 3,
  blockedWords: [],
  allowedWords: []
};

class AntiBadword {
  constructor() {
    this.groups = new Map();
    this.warnings = new Map();
  }

  getSettings(group) {
    if (!this.groups.has(group)) {
      this.groups.set(group, {
        ...DEFAULT_SETTINGS,
        blockedWords: [],
        allowedWords: []
      });
    }

    return this.groups.get(group);
  }

  setSettings(group, options = {}) {
    if (!group) {
      throw new Error('Group ID is required.');
    }

    const current = this.getSettings(group);

    this.groups.set(group, {
      ...current,
      ...options
    });

    return this.getSettings(group);
  }

  enable(group) {
    return this.setSettings(group, { enabled: true });
  }

  disable(group) {
    return this.setSettings(group, { enabled: false });
  }

  normalize(word = '') {
    return String(word)
      .toLowerCase()
      .normalize('NFKC')
      .trim();
  }

  addWord(group, word) {
    const settings = this.getSettings(group);
    const normalized = this.normalize(word);

    if (!normalized || normalized.length > 100) {
      return false;
    }

    if (!settings.blockedWords.includes(normalized)) {
      settings.blockedWords.push(normalized);
    }

    return true;
  }

  removeWord(group, word) {
    const settings = this.getSettings(group);
    const normalized = this.normalize(word);

    settings.blockedWords = settings.blockedWords.filter(
      item => item !== normalized
    );

    return true;
  }

  addAllowedWord(group, word) {
    const settings = this.getSettings(group);
    const normalized = this.normalize(word);

    if (!normalized || normalized.length > 100) {
      return false;
    }

    if (!settings.allowedWords.includes(normalized)) {
      settings.allowedWords.push(normalized);
    }

    return true;
  }

  removeAllowedWord(group, word) {
    const settings = this.getSettings(group);
    const normalized = this.normalize(word);

    settings.allowedWords = settings.allowedWords.filter(
      item => item !== normalized
    );

    return true;
  }

  containsWord(text, word) {
    const escaped = word.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const expression = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
      'iu'
    );

    return expression.test(text);
  }

  check({
    group,
    sender,
    text = '',
    isOwner = false,
    isAdmin = false
  }) {
    const settings = this.getSettings(group);

    if (!settings.enabled) {
      return {
        blocked: false,
        reason: 'disabled',
        matchedWords: []
      };
    }

    if (settings.allowOwner && isOwner) {
      return {
        blocked: false,
        reason: 'owner_exempt',
        matchedWords: []
      };
    }

    if (settings.allowAdmins && isAdmin) {
      return {
        blocked: false,
        reason: 'admin_exempt',
        matchedWords: []
      };
    }

    const normalizedText = this.normalize(text);

    if (!normalizedText) {
      return {
        blocked: false,
        reason: null,
        matchedWords: []
      };
    }

    const matchedWords = settings.blockedWords.filter(word => {
      const isAllowed = settings.allowedWords.includes(word);

      return !isAllowed &&
        this.containsWord(normalizedText, word);
    });

    if (!matchedWords.length) {
      return {
        blocked: false,
        reason: null,
        matchedWords: []
      };
    }

    const key = `${group}:${sender}`;
    const warnings = (this.warnings.get(key) || 0) + 1;

    this.warnings.set(key, warnings);

    return {
      blocked: true,
      reason: 'blocked_word',
      matchedWords,
      warnings,
      maxWarnings: settings.maxWarnings,
      action: settings.action,
      reachedLimit: warnings >= settings.maxWarnings
    };
  }

  resetWarnings(group, sender) {
    this.warnings.delete(`${group}:${sender}`);
    return true;
  }

  getWarnings(group, sender) {
    return this.warnings.get(`${group}:${sender}`) || 0;
  }

  getGroupSettings(group) {
    return { ...this.getSettings(group) };
  }

  removeGroup(group) {
    this.groups.delete(group);

    for (const key of this.warnings.keys()) {
      if (key.startsWith(`${group}:`)) {
        this.warnings.delete(key);
      }
    }

    return true;
  }
}

const antiBadword = new AntiBadword();

module.exports = {
  AntiBadword,
  antiBadword,
  DEFAULT_SETTINGS
};
