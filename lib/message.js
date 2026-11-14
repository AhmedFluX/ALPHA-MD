
/*
╔══════════════════════════════════════════════╗
║              ALPHA-MD MESSAGE ENGINE         ║
║                 POWERED BY AHMED             ║
╚══════════════════════════════════════════════╝
*/

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ============================================
// MESSAGE ENGINE
// ============================================

class AlphaMessageEngine {
  constructor(sock) {
    this.sock = sock;
  }

  // ==========================================
  // TEXT MESSAGE
  // ==========================================

  async text(jid, message, quoted = null) {
    return this.sock.sendMessage(
      jid,
      { text: String(message) },
      quoted ? { quoted } : {}
    );
  }

  // ==========================================
  // IMAGE MESSAGE
  // ==========================================

  async image(jid, media, caption = '', quoted = null) {
    return this.sock.sendMessage(
      jid,
      {
        image: media,
        caption: String(caption)
      },
      quoted ? { quoted } : {}
    );
  }

  // ==========================================
  // VIDEO MESSAGE
  // ==========================================

  async video(jid, media, caption = '', quoted = null) {
    return this.sock.sendMessage(
      jid,
      {
        video: media,
        caption: String(caption)
      },
      quoted ? { quoted } : {}
    );
  }

  // ==========================================
  // AUDIO MESSAGE
  // ==========================================

  async audio(jid, media, options = {}, quoted = null) {
    return this.sock.sendMessage(
      jid,
      {
        audio: media,
        mimetype: options.mimetype || 'audio/mpeg',
        ptt: Boolean(options.ptt)
      },
      quoted ? { quoted } : {}
    );
  }

  // ==========================================
  // DOCUMENT MESSAGE
  // ==========================================

  async document(jid, media, options = {}, quoted = null) {
    return this.sock.sendMessage(
      jid,
      {
        document: media,
        mimetype: options.mimetype || 'application/octet-stream',
        fileName: options.fileName || 'ALPHA-MD-File',
        caption: options.caption || ''
      },
      quoted ? { quoted } : {}
    );
  }

  // ==========================================
  // STICKER MESSAGE
  // ==========================================

  async sticker(jid, media, quoted = null) {
    return this.sock.sendMessage(
      jid,
      {
        sticker: media
      },
      quoted ? { quoted } : {}
    );
  }

  // ==========================================
  // LOCATION MESSAGE
  // ==========================================

  async location(jid, latitude, longitude, name = '') {
    return this.sock.sendMessage(jid, {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name
      }
    });
  }

  // ==========================================
  // CONTACT MESSAGE
  // ==========================================

  async contact(jid, name, number) {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      `TEL;TYPE=CELL;TYPE=VOICE:+${number}`,
      'END:VCARD'
    ].join('\n');

    return this.sock.sendMessage(jid, {
      contacts: {
        displayName: name,
        contacts: [{ vcard }]
      }
    });
  }

  // ==========================================
  // REACTION MESSAGE
  // ==========================================

  async react(jid, key, emoji) {
    return this.sock.sendMessage(jid, {
      react: {
        text: emoji,
        key
      }
    });
  }

  // ==========================================
  // FORWARD MESSAGE
  // ==========================================

  async forward(jid, message) {
    return this.sock.sendMessage(jid, {
      forward: message
    });
  }

  // ==========================================
  // DELETE MESSAGE
  // ==========================================

  async delete(jid, key) {
    return this.sock.sendMessage(jid, {
      delete: key
    });
  }

  // ==========================================
  // EDIT MESSAGE
  // ==========================================

  async edit(jid, key, text) {
    return this.sock.sendMessage(jid, {
      text: String(text),
      edit: key
    });
  }

  // ==========================================
  // REPLY MESSAGE
  // ==========================================

  async reply(jid, quoted, text) {
    return this.sock.sendMessage(
      jid,
      { text: String(text) },
      { quoted }
    );
  }

  // ==========================================
  // SEND REACTION TO MESSAGE
  // ==========================================

  async reactToMessage(jid, message, emoji) {
    return this.react(jid, message.key, emoji);
  }

  // ==========================================
  // GROUP MESSAGE
  // ==========================================

  async groupText(jid, text, mentions = []) {
    return this.sock.sendMessage(jid, {
      text: String(text),
      mentions
    });
  }

  // ==========================================
  // SEND IMAGE FROM URL
  // ==========================================

  async imageFromURL(jid, url, caption = '') {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20000
    });

    return this.image(
      jid,
      Buffer.from(response.data),
      caption
    );
  }

  // ==========================================
  // SEND VIDEO FROM URL
  // ==========================================

  async videoFromURL(jid, url, caption = '') {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    return this.video(
      jid,
      Buffer.from(response.data),
      caption
    );
  }

  // ==========================================
  // SEND FILE FROM LOCAL PATH
  // ==========================================

  async file(jid, filePath, options = {}) {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found.');
    }

    const buffer = fs.readFileSync(filePath);

    return this.document(
      jid,
      buffer,
      {
        fileName: options.fileName || path.basename(filePath),
        mimetype: options.mimetype,
        caption: options.caption
      }
    );
  }

  // ==========================================
  // PRESENCE UPDATE
  // ==========================================

  async presence(jid, type = 'composing') {
    const allowed = [
      'composing',
      'recording',
      'paused'
    ];

    if (!allowed.includes(type)) {
      throw new Error('Invalid presence type.');
    }

    return this.sock.sendPresenceUpdate(type, jid);
  }

  // ==========================================
  // MARK AS READ
  // ==========================================

  async read(keys) {
    return this.sock.readMessages(
      Array.isArray(keys) ? keys : [keys]
    );
  }

  // ==========================================
  // SEND STATUS
  // ==========================================

  async status(text) {
    return this.sock.sendMessage('status@broadcast', {
      text: String(text)
    });
  }

  // ==========================================
  // GROUP METADATA
  // ==========================================

  async groupInfo(jid) {
    return this.sock.groupMetadata(jid);
  }

  // ==========================================
  // USER PROFILE
  // ==========================================

  async profilePicture(jid) {
    return this.sock.profilePictureUrl(jid, 'image');
  }

  // ==========================================
  // CONNECTION INFO
  // ==========================================

  get user() {
    return this.sock.user;
  }

  get connection() {
    return this.sock.ws?.readyState;
  }
}

// ============================================
// EXPORT
// ============================================

module.exports = AlphaMessageEngine;
