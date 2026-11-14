
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

const CONFIG = {
  name: 'ALPHA-MD',
  version: '1.0.0',
  author: 'Ahmed',
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
let reconnecting = false;

function makeFolders() {
  [
    CONFIG.session,
    CONFIG.plugins,
    './database',
    './temp',
    './logs'
  ].forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
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
      files = files.concat(getPluginFiles(fullPath));
    } else if (
      item.isFile() &&
      item.name.endsWith('.js')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function loadPlugins() {
  global.commands.clear();

  const files = getPluginFiles(CONFIG.plugins);
  let loaded = 0;

  for (const file of files) {
    try {
      delete require.cache[require.resolve(file)];

      const plugin = require(path.resolve(file));

      if (
        !plugin ||
        !plugin.command ||
        typeof plugin.execute !== 'function'
      ) continue;

      const commands = [
        plugin.command,
        ...(Array.isArray(plugin.alias) ? plugin.alias : [])
      ];

      for (const command of commands) {
        global.commands.set(
          String(command).toLowerCase(),
          plugin
        );
      }

      loaded++;
      console.log('[PLUGIN]', plugin.command);
    } catch (error) {
      console.error('[PLUGIN ERROR]', file, error.message);
    }
  }

  console.log(`[ALPHA-MD] ${loaded} plugins loaded.`);
}

async function handleMessage(message) {
  try {
    if (!message.message || message.key.fromMe) return;
    if (message.key.remoteJid === 'status@broadcast') return;

    const chat = message.key.remoteJid;
    const sender = message.key.participant || chat;
    const text = getMessageText(message);

    if (!text) return;

    const isOwner = CONFIG.owner.some(number => {
      const clean = String(number).replace(/\D/g, '');
      return clean && sender.split('@')[0].split(':')[0] === clean;
    });

    // PRIVATE MODE
    if (CONFIG.mode === 'private' && !isOwner) return;

    // AUTO REPLY
    if (!text.startsWith(CONFIG.prefix)) {
      const reply = autoReply.getReply(text);

      if (reply) {
        await sock.sendMessage(
          chat,
          { text: reply },
          { quoted: message }
        );
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

    // OWNER ONLY
    if (plugin.ownerOnly && !isOwner) {
      return sock.sendMessage(
        chat,
        { text: 'This command is only for the bot owner.' },
        { quoted: message }
      );
    }

    // GROUP ONLY
    if (plugin.groupOnly && !chat.endsWith('@g.us')) {
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
      plugin
    });

    console.log(`[COMMAND] ${command} | ${sender}`);

  } catch (error) {
    console.error('[MESSAGE ERROR]', error);
  }
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
      browser: ['ALPHA-MD', 'Chrome', '1.0.0'],
      printQRInTerminal: true,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const message of messages) {
        await handleMessage(message);
      }
    });

    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        reconnecting = false;
        console.log('╔════════════════════════════╗');
        console.log('║       ALPHA-MD ONLINE      ║');
        console.log('║       POWERED BY AHMED     ║');
        console.log('╚════════════════════════════╝');
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;

        if (code === DisconnectReason.loggedOut) {
          console.log('Session logged out. Scan a new QR code.');
          return;
        }

        if (!reconnecting) {
          reconnecting = true;
          console.log('Connection lost. Reconnecting...');

          setTimeout(() => {
            reconnecting = false;
            starting = false;
            startBot();
          }, 5000);
        }
      }
    });

    loadPlugins();

  } catch (error) {
    console.error('[START ERROR]', error);
    starting = false;

    setTimeout(() => {
      startBot();
    }, 10000);
  }

  starting = false;
}

process.on('uncaughtException', error => {
  console.error('[FATAL]', error);
});

process.on('unhandledRejection', error => {
  console.error('[PROMISE ERROR]', error);
});

startBot();
