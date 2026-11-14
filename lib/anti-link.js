
const DEFAULT_SETTINGS = {
  enabled: true,
  action: 'warn',
  allowAdmins: true,
  allowOwner: true,
  allowWhatsAppLinks: false,
  blockedDomains: [],
  allowedDomains: [],
  maxWarnings: 3
};

class AntiLink {
  constructor() {
    this.groups = new Map();
    this.warnings = new Map();

    this.defaultSettings = { ...DEFAULT_SETTINGS };
  }

  getSettings(group) {
    if (!this.groups.has(group)) {
      this.groups.set(group, {
        ...this.defaultSettings
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

  addBlockedDomain(group, domain) {
    const settings = this.getSettings(group);
    const normalized = this.normalizeDomain(domain);

    if (!normalized) return false;

    if (!settings.blockedDomains.includes(normalized)) {
      settings.blockedDomains.push(normalized);
    }

    return true;
  }

  removeBlockedDomain(group, domain) {
    const settings = this.getSettings(group);
    const normalized = this.normalizeDomain(domain);

    settings.blockedDomains =
      settings.blockedDomains.filter(item => item !== normalized);

    return true;
  }

  addAllowedDomain(group, domain) {
    const settings = this.getSettings(group);
    const normalized = this.normalizeDomain(domain);

    if (!normalized) return false;

    if (!settings.allowedDomains.includes(normalized)) {
      settings.allowedDomains.push(normalized);
    }

    return true;
  }

  normalizeDomain(domain = '') {
    try {
      const value = String(domain).trim();

      if (!value) return null;

      const url = new URL(
        value.includes('://') ? value : `https://${value}`
      );

      return url.hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  extractLinks(text = '') {
    const matches = String(text).match(
      /(?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/gi
    ) || [];

    return [...new Set(matches.map(link => {
      return link.replace(/[),.!?;]+$/, '');
    }))];
  }

  getDomain(link) {
    try {
      const value = link.startsWith('www.')
        ? `https://${link}`
        : link.includes('://')
          ? link
          : `https://${link}`;

      return new URL(value).hostname
        .toLowerCase()
        .replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  isWhatsAppLink(domain) {
    return [
      'chat.whatsapp.com',
      'whatsapp.com',
      'wa.me'
    ].some(item => domain === item || domain.endsWith(`.${item}`));
  }

  isBlockedDomain(domain, settings) {
    if (!domain) return false;

    const customBlocked = settings.blockedDomains.some(item =>
      domain === item || domain.endsWith(`.${item}`)
    );

    const explicitlyAllowed = settings.allowedDomains.some(item =>
      domain === item || domain.endsWith(`.${item}`)
    );

    if (explicitlyAllowed) return false;

    if (customBlocked) return true;

    if (
      !settings.allowWhatsAppLinks &&
      this.isWhatsAppLink(domain)
    ) {
      return true;
    }

    return false;
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
        links: []
      };
    }

    if (settings.allowOwner && isOwner) {
      return {
        blocked: false,
        reason: 'owner_exempt',
        links: []
      };
    }

    if (settings.allowAdmins && isAdmin) {
      return {
        blocked: false,
        reason: 'admin_exempt',
        links: []
      };
    }

    const links = this.extractLinks(text);

    const blockedLinks = links.filter(link => {
      const domain = this.getDomain(link);

      return this.isBlockedDomain(domain, settings);
    });

    if (!blockedLinks.length) {
      return {
        blocked: false,
        reason: null,
        links: []
      };
    }

    const key = `${group}:${sender}`;
    const warnings = (this.warnings.get(key) || 0) + 1;

    this.warnings.set(key, warnings);

    return {
      blocked: true,
      reason: 'blocked_link',
      links: blockedLinks,
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

const antiLink = new AntiLink();

module.exports = {
  AntiLink,
  antiLink,
  DEFAULT_SETTINGS
};
