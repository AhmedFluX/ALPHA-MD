
/*
╔══════════════════════════════════════════════╗
║             ALPHA-MD SERIALIZER              ║
║                POWERED BY AHMED              ║
╚══════════════════════════════════════════════╝
*/

const {
  getContentType,
  downloadContentFromMessage
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');

const CONFIG = global.alpha || {
  prefix: '.',
  owner: []
};

// ============================================
// MESSAGE SERIALIZER
// ============================================

class AlphaMessage {
  constructor(sock, message) {
    this.sock = sock;
    this.raw = message;

    this.key = message.key || {};
    this.chat = this.key.remoteJid || '';
    this.sender = this.key.participant || this.chat;

    this.isGroup = this.chat.endsWith('@g.us');
    this.isPrivate = !this.isGroup;

    this.fromMe = Boolean(this.key.fromMe);

    this.pushName = message.pushName || 'Unknown';

    this.message = message.message || {};

    this.type = getContentType(this.message);

    this.content = this.type
      ? this.message[this.type]
      : {};

    this.text = this.getText();

    this.body = this.text;

    this.prefix = CONFIG.prefix || '.';

    this.isOwner =
      this.fromMe ||
      (CONFIG.owner || []).includes(this.sender);

    this.isCommand = this.text.startsWith(this.prefix);

    this.args = [];
    this.command = '';

    this.parseCommand();

    this.mentionedJid = this.getMentions();

    this.quoted = this.getQuotedMessage();

    this.timestamp = message.messageTimestamp
      ? Number(message.messageTimestamp)
      : Math.floor(Date.now() / 1000);
  }

  // ==========================================
  // TEXT EXTRACTION
  // ==========================================

  getText() {
    const message = this.message;

    return (
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.videoMessage?.caption ||
      message.documentMessage?.caption ||
      message.buttonsResponseMessage?.selectedDisplayText ||
      message.listResponseMessage?.title ||
      message.templateButtonReplyMessage?.selectedDisplayText ||
      message.interactiveResponseMessage?.body?.text ||
      ''
    );
  }

  // ==========================================
  // COMMAND PARSER
  // ==========================================

  parseCommand() {
    if (!this.isCommand) return;

    const input = this.text
      .slice(this.prefix.length)
      .trim();

    if (!input) return;

    const parts = input.split(/\s+/);

    this.command = parts.shift().toLowerCase();

    this.args = parts;

    this.query = parts.join(' ');
  }

  // ==========================================
  // MENTION SYSTEM
  // ==========================================

  getMentions() {
    const context =
      this.content?.contextInfo ||
      this.message.extendedTextMessage?.contextInfo ||
      {};

    return context.mentionedJid || [];
  }

  // ==========================================
  // QUOTED MESSAGE
  // ==========================================

  getQuotedMessage() {
    const context =
      this.content?.contextInfo ||
      this.message.extendedTextMessage?.contextInfo ||
      {};

    if (!context.quotedMessage) return null;

    return {
      message: context.quotedMessage,
      participant: context.participant || '',
      stanzaId: context.stanzaId || '',
      type: getContentType(context.quotedMessage),
      isGroup: this.isGroup
    };
  }

  // ==========================================
  // MESSAGE TYPE CHECKS
  // ==========================================

  get isImage() {
    return Boolean(this.message.imageMessage);
  }

  get isVideo() {
    return Boolean(this.message.videoMessage);
  }

  get isAudio() {
    return Boolean(this.message.audioMessage);
  }

  get isSticker() {
    return Boolean(this.message.stickerMessage);
  }

  get isDocument() {
    return Boolean(this.message.documentMessage);
  }

  get isText() {
    return Boolean(
      this.message.conversation ||
      this.message.extendedTextMessage
    );
  }

  get isMedia() {
    return (
      this.isImage ||
      this.isVideo ||
      this.isAudio ||
      this.isSticker ||
      this.isDocument
    );
  }

  // ==========================================
  // REPLY
  // ==========================================

  async reply(text, options = {}) {
    return this.sock.sendMessage(
      this.chat,
      {
        text: String(text),
        ...options
      },
      {
        quoted: this.raw
      }
    );
  }

  // ==========================================
  // REACT
  // ==========================================

  async react(emoji) {
    return this.sock.sendMessage(
      this.chat,
      {
        react: {
          text: emoji,
          key: this.key
        }
      }
    );
  }

  // ==========================================
  // DELETE MESSAGE
  // ==========================================

  async delete() {
    return this.sock.sendMessage(
      this.chat,
      {
        delete: this.key
      }
    );
  }

  // ==========================================
  // FORWARD MESSAGE
  // ==========================================

  async forward(jid = this.chat) {
    return this.sock.sendMessage(
      jid,
      {
        forward: this.raw
      }
    );
  }

  // ==========================================
  // DOWNLOAD MEDIA
  // ==========================================

  async download() {
    if (!this.isMedia || !this.type) {
      throw new Error('This message has no downloadable media.');
    }

    const mediaType = this.type.replace('Message', '');

    const stream = await downloadContentFromMessage(
      this.content,
      mediaType
    );

    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  // ==========================================
  // GROUP METADATA
  // ==========================================

  async getGroupMetadata() {
    if (!this.isGroup) return null;

    return this.sock.groupMetadata(this.chat);
  }

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  async send(text, jid = this.chat) {
    return this.sock.sendMessage(
      jid,
      {
        text: String(text)
      }
    );
  }

  // ==========================================
  // CONTACT INFORMATION
  // ==========================================

  get senderNumber() {
    return this.sender.split('@')[0];
  }

  get chatNumber() {
    return this.chat.split('@')[0];
  }

  get messageId() {
    return this.key.id || '';
  }
}

// ============================================
// SERIALIZER FUNCTION
// ============================================

function serialize(sock, message) {
  if (!message || !message.key) return null;

  return new AlphaMessage(sock, message);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  AlphaMessage,
  serialize
};
