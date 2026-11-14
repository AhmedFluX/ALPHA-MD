
/*
╔══════════════════════════════════════════════╗
║                  ALPHA-MD                    ║
║          NEXT GENERATION WHATSAPP BOT        ║
║                                              ║
║                POWERED BY AHMED              ║
╚══════════════════════════════════════════════╝
*/

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  name: 'ALPHA-MD',
  prefix: '.',
  owner: [],
  mode: 'public',
  version: '1.0.0',
  author: 'AHMED',
  session: './session',
  plugins: './plugins',
  database: './database',
  temp: './temp'
};

global.alpha = CONFIG;
global.commands = new Map();
global.startTime = Date.now();

// ============================================
// CREATE REQUIRED DIRECTORIES
// ============================================

[
  CONFIG.session,
  CONFIG.plugins,
  CONFIG.database,
  CONFIG.temp
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================
// LOGGER
// ============================================

const logger = pino({
  level: 'silent'
});

function log(message) {
  console.log(`[ALPHA-MD] ${message}`);
}

// ============================================
// COMMAND HANDLER
// ============================================

async function loadPlugins() {
  global.commands.clear();

  const folders = fs.readdirSync(CONFIG.plugins);

  for (const folder of folders) {
    const folderPath = path.join(CONFIG.plugins, folder);

    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.js'));

    for (const file of files) {
      const pluginPath = path.join(folderPath, file);

      try {
        delete require.cache[require.resolve(pluginPath)];

        const plugin = require(pluginPath);

        if (!plugin.command || typeof plugin.execute !== 'function') {
          log(`Invalid plugin: ${file}`);
          continue;
        }

        const aliases = Array.isArray(plugin.alias)
          ? plugin.alias
          : [];

        for (const command of [plugin.command, ...aliases]) {
          global.commands.set(command.toLowerCase(), plugin);
        }

      } catch (error) {
        console.error(`Plugin error [${file}]:`, error.message);
      }
    }
  }

  log(`${global.commands.size} command triggers loaded.`);
}

// ============================================
// MESSAGE HANDLER
// ============================================

async function handleMessage(sock, message) {
  try {
    if (!message.message || message.key.fromMe) return;

    const jid = message.key.remoteJid;
    if (!jid) return;

    const type = Object.keys(message.message)[0];

    const body =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      message.message.imageMessage?.caption ||
      message.message.videoMessage?.caption ||
      message.message.documentMessage?.caption ||
      '';

    if (!body) return;

    const prefix = CONFIG.prefix;

    if (!body.startsWith(prefix)) return;

    const args = body.slice(prefix.length).trim().split(/\s+/);

    const command = (args.shift() || '').toLowerCase();

    if (!command) return;

    const plugin = global.commands.get(command);

    if (!plugin) return;

    const sender = message.key.participant || jid;

    const isGroup = jid.endsWith('@g.us');

    const context = {
      sock,
      message,
      jid,
      sender,
      body,
      args,
      command,
      isGroup,
      type,
      config: CONFIG,
      reply: async text => {
        return sock.sendMessage(jid, { text }, {
          quoted: message
        });
      }
    };

    if (
      CONFIG.mode === 'private' &&
      !message.key.fromMe &&
      !CONFIG.owner.includes(sender)
    ) return;

    await plugin.execute(context);

  } catch (error) {
    console.error('Message Handler Error:', error);
  }
}

// ============================================
// CONNECTION
// ============================================

async function startAlpha() {
  try {
    log('Starting ALPHA-MD...');
    log('Loading plugins...');

    await loadPlugins();

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(CONFIG.session);

    const {
      version
    } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: true,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          logger
        )
      },
      browser: ['ALPHA-MD', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true,
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const message of messages) {
        await handleMessage(sock, message);
      }
    });

    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect } = update;

      if (connection === 'connecting') {
        log('Connecting to WhatsApp...');
      }

      if (connection === 'open') {
        log('ALPHA-MD connected successfully!');
        log(`Powered By ${CONFIG.author}`);
        log(`${global.commands.size} command triggers ready.`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error
          ?.output?.statusCode;

        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut;

        log(`Connection closed. Reconnect: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(() => {
            startAlpha().catch(console.error);
          }, 5000);
        } else {
          log('Session logged out. Pair again.');
        }
      }
    });

    return sock;

  } catch (error) {
    console.error('ALPHA-MD Startup Error:', error);

    setTimeout(() => {
      startAlpha().catch(console.error);
    }, 10000);
  }
}

// ============================================
// SYSTEM INFORMATION
// ============================================

global.alphaSystem = {
  platform: os.platform(),
  architecture: os.arch(),
  node: process.version,
  memory: () => ({
    total: os.totalmem(),
    free: os.freemem()
  }),
  uptime: () => process.uptime(),
  started: global.startTime
};

// ============================================
// START BOT
// ============================================

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled Rejection:', error);
});

startAlpha();

module.exports = {
  startAlpha,
  loadPlugins,
  handleMessage,
  CONFIG
};
