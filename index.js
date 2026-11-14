
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');
const pino = require('pino');

const autoReply = require('./lib/auto-reply');
const settings = require('./config/settings');
const startPairingServer = require('./pairing/server');

const CONFIG = {
  name: 'ALPHA-MD',
  version: '1.0.0',
  author: 'AHMED',
  prefix: settings?.command?.prefix || '.',
  mode: settings?.command?.mode || 'public',
  owner: settings?.owner?.numbers || [],
  session: './session',
  plugins: './plugins'
};

global.alpha = CONFIG;
global.commands = new Map();
global.startTime = Date.now();

let sock;
let starting = false;
let retryTimer = null;
let pairingServer = null;

function makeFolders() {
  [
    CONFIG.session,
    CONFIG.plugins,
    './database',
    './temp',
    './logs'
  ].forEach(folder => {
    fs.mkdirSync(folder, { recursive: true });
  });
}

function getMessageText(message) {
  const msg = message.message || {};

  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.buttonsResponseMessage?.selectedButtonId ||
    msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.templateButtonReplyMessage?.selectedId ||
    ''
  ).trim();
}

function getPluginFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  let files = [];

  for (const item of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      files.push(...getPluginFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function loadPlugins() {
  global.commands.clear();

  let loaded = 0;

  for (const file of getPluginFiles(CONFIG.plugins)) {
    try {
      const resolved = require.resolve(path.resolve(file));
      delete require.cache[resolved];

      const plugin = require(resolved);

      if (
        !plugin ||
        !plugin.command ||
        typeof plugin.execute !== 'function'
      ) continue;

      const names = [
        plugin.command,
        ...(Array.isArray(plugin.alias) ? plugin.alias : [])
      ];

      for (const name of names) {
        global.commands.set(String(name).toLowerCase(), plugin);
      }

      loaded++;
      console.log(`[PLUGIN] ${plugin.command}`);

    } catch (error) {
      console.error(`[PLUGIN ERROR] ${file}:`, error.message);
    }
  }

  console.log(`[ALPHA-MD] ${loaded} plugins loaded.`);
}

function isOwner(message) {
  const key = message.key || {};

  const jids = [
    key.participant,
    key.participantAlt,
    key.remoteJid,
    key.remoteJidAlt
  ].filter(Boolean);

  const numbers = jids.map(jid =>
    String(jid)
      .split('@')[0]
      .split(':')[0]
      .replace(/\D/g, '')
  );

  return CONFIG.owner.some(number => {
    const clean = String(number).replace(/\D/g, '');
    return clean && numbers.includes(clean);
  });
}

async function handleMessage(message) {
  try {
    if (!message.message || message.key.fromMe) return;

    const chat = message.key.remoteJid;

    if (!chat || chat === 'status@broadcast') return;

    const text = getMessageText(message);
    if (!text) return;

    const owner = isOwner(message);

    if (CONFIG.mode === 'private' && !owner) return;

    // AUTO REPLY
    if (!text.startsWith(CONFIG.prefix)) {
      if (
        settings?.automation?.autoReply === true &&
        typeof autoReply.getReply === 'function'
      ) {
        const reply = autoReply.getReply(text);

        if (reply) {
          await sock.sendMessage(
            chat,
            { text: String(reply) },
            { quoted: message }
          );
        }
      }

      return;
    }

    // COMMAND PARSER
    const body = text.slice(CONFIG.prefix.length).trim();
    if (!body) return;

    const args = body.split(/\s+/);
    const command = args.shift().toLowerCase();

    const plugin = global.commands.get(command);
    if (!plugin) return;

    if (plugin.ownerOnly && !owner) {
      return sock.sendMessage(
        chat,
        { text: 'This command is only for the bot owner.' },
        { quoted: message }
      );
    }

    const isGroup = chat.endsWith('@g.us');

    if (plugin.groupOnly && !isGroup) {
      return sock.sendMessage(
        chat,
        { text: 'This command can only be used in groups.' },
        { quoted: message }
      );
    }

    await plugin.execute({
      message,
      sock,
      args,
      command,
      plugin,
      isOwner: owner,
      chat,
      sender: message.key.participant || chat,
      isGroup
    });

    console.log(`[COMMAND] ${command}`);

  } catch (error) {
    console.error('[MESSAGE ERROR]', error);
  }
}

function scheduleReconnect() {
  if (retryTimer) return;

  retryTimer = setTimeout(() => {
    retryTimer = null;
    startBot();
  }, 5000);
}

async function startBot() {
  if (starting) return;

  starting = true;

  try {
    makeFolders();

    const { state, saveCreds } =
      await useMultiFileAuthState(CONFIG.session);

    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['ALPHA-MD', 'Chrome', CONFIG.version],
      printQRInTerminal: true,
      markOnlineOnConnect: true,
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const message of messages) {
        await handleMessage(message);
      }
    });

    sock.ev.on('connection.update', update => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log('');
        console.log('╔════════════════════════════════╗');
        console.log('║          ALPHA-MD ONLINE       ║');
        console.log('║        POWERED BY AHMED        ║');
        console.log('╚════════════════════════════════╝');
        console.log('');
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;

        if (code === DisconnectReason.loggedOut) {
          console.log('Session logged out. A new QR scan is required.');
          return;
        }

        console.log('Connection lost. Reconnecting...');
        scheduleReconnect();
      }
    });

    loadPlugins();

  } catch (error) {
    console.error('[START ERROR]', error);
    scheduleReconnect();

  } finally {
    starting = false;
  }
}

// START PAIRING WEBSITE
function startWebsite() {
  if (pairingServer) return;

  pairingServer = startPairingServer(() => sock);
}

startWebsite();
startBot();

process.on('uncaughtException', error => {
  console.error('[FATAL ERROR]', error);
});

process.on('unhandledRejection', error => {
  console.error('[PROMISE ERROR]', error);
});
