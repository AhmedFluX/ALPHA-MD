
/*
╔══════════════════════════════════════════════╗
║               ALPHA-MD HELPERS               ║
║                 POWERED BY AHMED             ║
╚══════════════════════════════════════════════╝
*/

const fs = require('fs');
const path = require('path');

// ============================================
// BASIC HELPERS
// ============================================

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

const random = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = array =>
  array[Math.floor(Math.random() * array.length)];

const isURL = value => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

// ============================================
// TEXT FORMATTERS
// ============================================

function formatTitle(text) {
  return String(text)
    .toUpperCase()
    .replace(/_/g, ' ');
}

function formatNumber(number) {
  return Number(number || 0).toLocaleString('en-US');
}

function formatTime(seconds) {
  seconds = Math.floor(seconds);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-PK', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

// ============================================
// JID HELPERS
// ============================================

function getNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0];
}

function isGroup(jid = '') {
  return jid.endsWith('@g.us');
}

function isPrivate(jid = '') {
  return jid.endsWith('@s.whatsapp.net');
}

function normalizeJid(jid = '') {
  return String(jid).trim();
}

// ============================================
// PERMISSION HELPERS
// ============================================

function isOwner(sender, owners = []) {
  if (!sender) return false;

  const number = getNumber(sender);

  return owners.some(owner =>
    getNumber(owner) === number
  );
}

function isAdmin(sender, participants = []) {
  const participant = participants.find(
    item => item.id === sender
  );

  return Boolean(
    participant &&
    (participant.admin === 'admin' ||
     participant.admin === 'superadmin')
  );
}

function isBotAdmin(botJid, participants = []) {
  return isAdmin(botJid, participants);
}

function getAdmins(participants = []) {
  return participants
    .filter(item =>
      item.admin === 'admin' ||
      item.admin === 'superadmin'
    )
    .map(item => item.id);
}

function getMembers(participants = []) {
  return participants.map(item => item.id);
}

function hasPermission(sender, allowed = []) {
  return allowed.includes(sender);
}

// ============================================
// GROUP HELPERS
// ============================================

async function getGroupInfo(sock, jid) {
  if (!isGroup(jid)) {
    throw new Error('This is not a group.');
  }

  return sock.groupMetadata(jid);
}

async function getParticipants(sock, jid) {
  const metadata = await getGroupInfo(sock, jid);

  return metadata.participants || [];
}

async function getBotJid(sock) {
  return sock.user?.id || '';
}

async function getGroupAdmins(sock, jid) {
  const participants = await getParticipants(sock, jid);

  return getAdmins(participants);
}

async function checkGroupPermissions(sock, jid, sender) {
  const participants = await getParticipants(sock, jid);

  const botJid = await getBotJid(sock);

  return {
    isSenderAdmin: isAdmin(sender, participants),
    isBotAdmin: isBotAdmin(botJid, participants),
    admins: getAdmins(participants),
    participants
  };
}

// ============================================
// MESSAGE HELPERS
// ============================================

function getMessageText(message = {}) {
  const content = message.message || {};

  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    ''
  );
}

function getMentions(message = {}) {
  const content = message.message || {};

  const type = Object.keys(content)[0];

  return (
    content[type]?.contextInfo?.mentionedJid ||
    []
  );
}

function getQuoted(message = {}) {
  const content = message.message || {};

  const type = Object.keys(content)[0];

  return content[type]?.contextInfo?.quotedMessage || null;
}

function getSender(message = {}) {
  return message.key?.participant ||
    message.key?.remoteJid ||
    '';
}

// ============================================
// COMMAND HELPERS
// ============================================

function parseArguments(text = '') {
  return String(text).trim().split(/\s+/).filter(Boolean);
}

function matchCommand(input, commands = []) {
  return commands.includes(
    String(input).toLowerCase()
  );
}

function getPrefix(text, prefixes = ['.']) {
  return prefixes.find(prefix =>
    String(text).startsWith(prefix)
  ) || null;
}

// ============================================
// FILE HELPERS
// ============================================

function ensureDirectory(directory) {
  fs.mkdirSync(directory, {
    recursive: true
  });

  return directory;
}

function fileExists(file) {
  return fs.existsSync(file);
}

function removeFile(file) {
  if (!fileExists(file)) return false;

  fs.unlinkSync(file);

  return true;
}

function readFile(file) {
  if (!fileExists(file)) return null;

  return fs.readFileSync(file);
}

function writeFile(file, data) {
  ensureDirectory(path.dirname(file));

  fs.writeFileSync(file, data);

  return true;
}

// ============================================
// ERROR HANDLER
// ============================================

function getErrorMessage(error) {
  if (!error) return 'Unknown error';

  return error.message ||
    String(error) ||
    'Unknown error';
}

function createError(message, code = 'ALPHA_ERROR') {
  const error = new Error(message);

  error.code = code;

  return error;
}

// ============================================
// RANDOM HELPERS
// ============================================

function randomID(length = 10) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  return Array.from(
    { length },
    () => chars[random(0, chars.length - 1)]
  ).join('');
}

function randomEmoji() {
  return pick([
    '🔥', '⚡', '🐺', '👑',
    '💎', '🚀', '✨', '🖤'
  ]);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  sleep,
  random,
  pick,
  isURL,

  formatTitle,
  formatNumber,
  formatTime,
  formatDate,
  formatUptime,
  formatBytes,

  getNumber,
  isGroup,
  isPrivate,
  normalizeJid,

  isOwner,
  isAdmin,
  isBotAdmin,
  getAdmins,
  getMembers,
  hasPermission,

  getGroupInfo,
  getParticipants,
  getBotJid,
  getGroupAdmins,
  checkGroupPermissions,

  getMessageText,
  getMentions,
  getQuoted,
  getSender,

  parseArguments,
  matchCommand,
  getPrefix,

  ensureDirectory,
  fileExists,
  removeFile,
  readFile,
  writeFile,

  getErrorMessage,
  createError,

  randomID,
  randomEmoji
};
