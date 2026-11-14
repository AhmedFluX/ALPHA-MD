
/*
╔══════════════════════════════════════════════╗
║             ALPHA-MD FUNCTIONS               ║
║                POWERED BY AHMED              ║
╚══════════════════════════════════════════════╝
*/

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');

// ============================================
// BASIC UTILITIES
// ============================================

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

const random = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pickRandom = array =>
  array[Math.floor(Math.random() * array.length)];

const isUrl = text => {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
};

const isNumber = value =>
  !isNaN(value) && value !== '';

const formatBytes = bytes => {
  if (!bytes) return '0 Bytes';

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
};

const formatDuration = seconds => {
  seconds = Math.floor(seconds);

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    days ? `${days}d` : '',
    hours ? `${hours}h` : '',
    minutes ? `${minutes}m` : '',
    `${secs}s`
  ].filter(Boolean).join(' ');
};

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Karachi',
    hour12: true
  });

const formatDate = (date = new Date()) =>
  date.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Karachi'
  });

// ============================================
// TEXT UTILITIES
// ============================================

const capitalize = text =>
  String(text).charAt(0).toUpperCase() +
  String(text).slice(1);

const reverseText = text =>
  [...String(text)].reverse().join('');

const removeSpaces = text =>
  String(text).replace(/\s+/g, '');

const cleanText = text =>
  String(text).replace(/[^\p{L}\p{N}\s]/gu, '');

const countWords = text =>
  String(text).trim().split(/\s+/).filter(Boolean).length;

const truncate = (text, length = 100) =>
  String(text).length > length
    ? String(text).slice(0, length) + '...'
    : String(text);

const escapeRegex = text =>
  String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const randomString = (length = 12) =>
  crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

// ============================================
// FILE SYSTEM UTILITIES
// ============================================

const exists = file =>
  fs.existsSync(file);

const readJSON = (file, fallback = {}) => {
  try {
    if (!exists(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const writeJSON = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    'utf8'
  );

  return true;
};

const deleteFile = file => {
  if (!exists(file)) return false;

  fs.unlinkSync(file);
  return true;
};

const createDirectory = dir => {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const listFiles = (dir, extension = null) => {
  if (!exists(dir)) return [];

  return fs.readdirSync(dir)
    .filter(file => {
      const fullPath = path.join(dir, file);

      if (!fs.statSync(fullPath).isFile()) return false;

      return extension
        ? file.endsWith(extension)
        : true;
    });
};

const fileSize = file => {
  if (!exists(file)) return 0;
  return fs.statSync(file).size;
};

// ============================================
// RANDOM GENERATORS
// ============================================

const randomID = (length = 8) =>
  crypto.randomBytes(length).toString('hex');

const randomNumber = (length = 6) =>
  Array.from(
    { length },
    () => random(0, 9)
  ).join('');

const randomEmoji = () =>
  pickRandom([
    '🔥', '⚡', '🐺', '👑',
    '💎', '🚀', '✨', '🖤',
    '🎯', '🌟'
  ]);

// ============================================
// ARRAY UTILITIES
// ============================================

const unique = array =>
  [...new Set(array)];

const shuffle = array =>
  [...array].sort(() => Math.random() - 0.5);

const chunk = (array, size = 10) => {
  const result = [];

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
};

const sample = (array, count = 1) =>
  shuffle(array).slice(0, count);

// ============================================
// VALIDATION UTILITIES
// ============================================

const isJid = jid =>
  typeof jid === 'string' &&
  /^[0-9]+@(s\.whatsapp\.net|g\.us)$/.test(jid);

const isGroupJid = jid =>
  typeof jid === 'string' &&
  jid.endsWith('@g.us');

const isPrivateJid = jid =>
  typeof jid === 'string' &&
  jid.endsWith('@s.whatsapp.net');

const isValidPhone = number =>
  /^\+?[1-9]\d{7,14}$/.test(String(number));

const isValidPrefix = prefix =>
  typeof prefix === 'string' &&
  prefix.length > 0 &&
  prefix.length <= 5;

// ============================================
// SYSTEM INFORMATION
// ============================================

const getSystemInfo = () => ({
  platform: os.platform(),
  architecture: os.arch(),
  hostname: os.hostname(),
  nodeVersion: process.version,
  uptime: formatDuration(process.uptime()),
  totalMemory: formatBytes(os.totalmem()),
  freeMemory: formatBytes(os.freemem()),
  cpuCount: os.cpus().length,
  processMemory: formatBytes(
    process.memoryUsage().rss
  )
});

// ============================================
// HTTP UTILITIES
// ============================================

const fetchJSON = async (url, options = {}) => {
  if (!isUrl(url)) {
    throw new Error('Invalid URL');
  }

  const response = await axios.get(url, {
    timeout: 15000,
    ...options
  });

  return response.data;
};

const downloadBuffer = async (url, options = {}) => {
  if (!isUrl(url)) {
    throw new Error('Invalid URL');
  }

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    ...options
  });

  return Buffer.from(response.data);
};

// ============================================
// SECURITY UTILITIES
// ============================================

const hashText = text =>
  crypto.createHash('sha256')
    .update(String(text))
    .digest('hex');

const safeEqual = (a, b) => {
  const first = Buffer.from(String(a));
  const second = Buffer.from(String(b));

  return first.length === second.length &&
    crypto.timingSafeEqual(first, second);
};

const safeJSONParse = (text, fallback = null) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

module.exports = {
  sleep,
  random,
  pickRandom,
  isUrl,
  isNumber,
  formatBytes,
  formatDuration,
  formatTime,
  formatDate,

  capitalize,
  reverseText,
  removeSpaces,
  cleanText,
  countWords,
  truncate,
  escapeRegex,
  randomString,

  exists,
  readJSON,
  writeJSON,
  deleteFile,
  createDirectory,
  listFiles,
  fileSize,

  randomID,
  randomNumber,
  randomEmoji,

  unique,
  shuffle,
  chunk,
  sample,

  isJid,
  isGroupJid,
  isPrivateJid,
  isValidPhone,
  isValidPrefix,

  getSystemInfo,

  fetchJSON,
  downloadBuffer,

  hashText,
  safeEqual,
  safeJSONParse
};
