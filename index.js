const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const pino = require('pino');

const autoReply = require('./lib/auto-reply');
const settings = require('./config/settings');

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

const PORT = Number(process.env.PORT) || 3000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

let sock = null;
let authState = null;
let starting = false;
let retryTimer = null;
let webServer = null;
let pairingInProgress = false;

const attempts = new Map();

/* =====================================
   ALPHA-MD PAIRING WEBSITE
===================================== */

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#101014">
<title>ALPHA-MD | Pairing</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at 50% 0%, #351014, #151216 42%, #09090c);
  color: #f5f5f5;
  font-family: Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

nav {
  height: 68px;
  padding: 0 7%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ffffff18;
}

.brand {
  font-size: 22px;
  font-weight: 900;
}

.brand span,
h1 span {
  color: #ff3448;
}

.system {
  font-size: 11px;
  color: #aaa;
  letter-spacing: 2px;
}

main {
  width: min(92%, 440px);
  margin: auto;
  padding: 42px 0;
}

.logo {
  width: 66px;
  height: 66px;
  margin: 0 auto 17px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #ff4354, #8e0719);
  font-size: 36px;
  font-weight: 900;
  box-shadow: 0 10px 40px #ff263333;
}

h1 {
  text-align: center;
  font-size: 34px;
  letter-spacing: 2px;
  margin: 0;
}

.sub {
  text-align: center;
  color: #999;
  font-size: 11px;
  letter-spacing: 3px;
  margin: 10px 0 30px;
}

.card {
  background: #15151b;
  border: 1px solid #ffffff18;
  border-radius: 20px;
  padding: 27px;
  box-shadow: 0 20px 70px #0008;
}

.card h2 {
  text-align: center;
  font-size: 17px;
  letter-spacing: 1.5px;
}

.desc {
  text-align: center;
  color: #aaa;
  font-size: 13px;
  line-height: 1.6;
}

label.field {
  display: block;
  font-size: 10px;
  letter-spacing: 1.5px;
  color: #bbb;
  margin: 16px 0 8px;
}

input[type="tel"],
input[type="password"] {
  width: 100%;
  height: 48px;
  border: 1px solid #ffffff20;
  border-radius: 10px;
  background: #0c0c11;
  color: white;
  padding: 0 14px;
  font-size: 14px;
  outline: none;
}

input:focus {
  border-color: #ff3448;
}

.consent {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  color: #aaa;
  font-size: 11px;
  line-height: 1.5;
  margin: 17px 0;
}

.consent input {
  accent-color: #ff3448;
  margin-top: 2px;
}

button {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(100deg, #ff3448, #a80d22);
  color: white;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.result {
  margin-top: 22px;
  padding: 17px;
  border: 1px solid #ff344855;
  border-radius: 12px;
  background: #ff34480c;
  text-align: center;
}

.result p {
  font-size: 10px;
  color: #aaa;
  letter-spacing: 2px;
}

#pairCode {
  font-size: 27px;
  letter-spacing: 5px;
  color: #ff5364;
  margin: 12px 0 16px;
}

#status {
  min-height: 18px;
  text-align: center;
  color: #ff9aa5;
  font-size: 12px;
  line-height: 1.5;
  margin-top: 16px;
  overflow-wrap: anywhere;
}

footer {
  text-align: center;
  color: #777;
  font-size: 11px;
  letter-spacing: 1px;
  margin-top: 26px;
  line-height: 1.8;
}

@media(max-width: 380px) {
  .card {
    padding: 21px;
  }

  h1 {
    font-size: 29px;
  }
}
</style>
</head>

<body>

<nav>
  <div class="brand">ALPHA<span>-MD</span></div>
  <div class="system">● SYSTEM</div>
</nav>

<main>

<div class="logo">A</div>

<h1>ALPHA<span>-MD</span></h1>

<p class="sub">NEXT GENERATION WHATSAPP BOT</p>

<section class="card">

<h2>CONNECT WHATSAPP</h2>

<p class="desc">
Generate a pairing code for your own WhatsApp number.
</p>

<form id="pairForm">

<label class="field" for="phone">
PHONE NUMBER WITH COUNTRY CODE
</label>

<input
  id="phone"
  type="tel"
  inputmode="numeric"
  autocomplete="tel"
  placeholder="923001234567"
  required
>

<label class="field" for="accessKey">
PRIVATE ACCESS KEY
</label>

<input
  id="accessKey"
  type="password"
  autocomplete="off"
  placeholder="Enter private access key"
  required
>

<label class="consent">
<input id="consent" type="checkbox" required>
<span>
I own this WhatsApp number and authorize linking my own device.
</span>
</label>

<button id="pairBtn" type="submit">
GET PAIRING CODE
</button>

</form>

<div id="result" class="result" hidden>

<p>YOUR PAIRING CODE</p>

<h2 id="pairCode"></h2>

<button id="copyBtn" type="button">
COPY CODE
</button>

</div>

<p id="status" role="status" aria-live="polite"></p>

</section>

<footer>
© ALPHA-MD<br>
POWERED BY AHMED
</footer>

</main>

<script>
const form = document.getElementById('pairForm');
const phone = document.getElementById('phone');
const accessKey = document.getElementById('accessKey');
const consent = document.getElementById('consent');
const btn = document.getElementById('pairBtn');
const statusText = document.getElementById('status');
const result = document.getElementById('result');
const codeText = document.getElementById('pairCode');
const copyBtn = document.getElementById('copyBtn');

form.addEventListener('submit', async event => {
  event.preventDefault();

  const number = phone.value.replace(/\\D/g, '');
  const key = accessKey.value;

  result.hidden = true;
  codeText.textContent = '';

  if (number.length < 10 || number.length > 15) {
    statusText.textContent =
      'Enter a valid number with country code.';
    return;
  }

  if (!consent.checked) {
    statusText.textContent =
      'Confirm that this is your own number.';
    return;
  }

  if (!key.trim()) {
    statusText.textContent =
      'Enter your private access key.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'PLEASE WAIT...';
  statusText.textContent = 'Requesting pairing code...';

  try {
    const response = await fetch('/pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        phone: number
      })
    });

    const data = await response.json();

    if (!response.ok || !data.code) {
      throw new Error(
        data.error || 'Pairing request failed.'
      );
    }

    codeText.textContent = data.code;
    result.hidden = false;

    statusText.textContent =
      'Enter this code in WhatsApp on your own device.';

  } catch (error) {
    statusText.textContent = error.message;

  } finally {
    btn.disabled = false;
    btn.textContent = 'GET PAIRING CODE';
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(
      codeText.textContent
    );

    copyBtn.textContent = 'COPIED!';

    setTimeout(() => {
      copyBtn.textContent = 'COPY CODE';
    }, 1800);

  } catch {
    statusText.textContent =
      'Copy unavailable. Copy the code manually.';
  }
});
</script>

</body>
</html>`;

/* =====================================
   WEBSITE SECURITY
===================================== */

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });

  res.end(JSON.stringify(data));
}

function safeKeyCheck(req) {
  const expectedKey = process.env.PAIRING_ACCESS_KEY || '';
  const header = req.headers.authorization || '';

  if (!expectedKey || !header.startsWith('Bearer ')) {
    return false;
  }

  const received = Buffer.from(header.slice(7));
  const expected = Buffer.from(expectedKey);

  return received.length === expected.length &&
    crypto.timingSafeEqual(received, expected);
}

function allowAttempt(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now - entry.start >= WINDOW_MS) {
    attempts.set(ip, {
      start: now,
      count: 1
    });

    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();

      if (body.length > 2048) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}

/* =====================================
   START PAIRING WEBSITE
===================================== */

function startWebsite() {
  if (webServer) return;

  webServer = http.createServer(async (req, res) => {
    const pathname = new URL(
      req.url,
      'http://localhost'
    ).pathname;

    if (
      req.method === 'GET' &&
      (pathname === '/' || pathname === '/index.html')
    ) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });

      return res.end(PAGE);
    }

    if (req.method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, {
        app: 'ALPHA-MD',
        website: 'online',
        bot: sock ? 'starting-or-connected' : 'starting'
      });
    }

    if (req.method !== 'POST' || pathname !== '/pair') {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ip = req.socket.remoteAddress || 'unknown';

    if (!allowAttempt(ip)) {
      return sendJson(res, 429, {
        error: 'Too many requests. Try again later.'
      });
    }

    if (!safeKeyCheck(req)) {
      return sendJson(res, 401, {
        error: 'Invalid access key.'
      });
    }

    if (
      !String(req.headers['content-type'] || '')
        .includes('application/json')
    ) {
      return sendJson(res, 415, {
        error: 'JSON content type required.'
      });
    }

    try {
      const body = await readJsonBody(req);

      const phone = String(body.phone || '')
        .replace(/\\D/g, '');

      const ownerNumber = String(
        process.env.OWNER_NUMBER || ''
      ).replace(/\\D/g, '');

      if (
        !process.env.PAIRING_ACCESS_KEY ||
        !ownerNumber
      ) {
        return sendJson(res, 503, {
          error: 'Pairing environment variables are not configured.'
        });
      }

      if (
        phone.length < 10 ||
        phone.length > 15 ||
        phone !== ownerNumber
      ) {
        return sendJson(res, 403, {
          error: 'Only the configured owner number is allowed.'
        });
      }

      if (
        !sock ||
        typeof sock.requestPairingCode !== 'function' ||
        !authState
      ) {
        return sendJson(res, 503, {
          error: 'Bot is not ready. Try again shortly.'
        });
      }

      if (authState.creds.registered) {
        return sendJson(res, 409, {
          error: 'WhatsApp is already linked. Do not request another pairing code.'
        });
      }

      if (pairingInProgress) {
        return sendJson(res, 429, {
          error: 'A pairing request is already processing.'
        });
      }

      pairingInProgress = true;

      const code = await sock.requestPairingCode(phone);

      return sendJson(res, 200, {
        code
      });

    } catch (error) {
      console.error('[PAIRING ERROR]', error.message);

      return sendJson(res, 500, {
        error: 'Pairing request failed. Check bot connection and try again.'
      });

    } finally {
      pairingInProgress = false;
    }
  });

  webServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[ALPHA-MD] Pairing website listening on port ${PORT}`
    );
  });
}

/* =====================================
   BOT FOLDER SETUP
===================================== */

function makeFolders() {
  [
    CONFIG.session,
    CONFIG.plugins,
    './database',
    './temp',
    './logs'
  ].forEach(folder => {
    fs.mkdirSync(folder, {
      recursive: true
    });
  });
}

/* =====================================
   MESSAGE TEXT
===================================== */

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

/* =====================================
   PLUGIN FILE FINDER
===================================== */

function getPluginFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  let files = [];

  for (const item of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      files.push(...getPluginFiles(fullPath));

    } else if (
      item.isFile() &&
      item.name.endsWith('.js')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

/* =====================================
   LOAD PLUGINS
===================================== */

function loadPlugins() {
  global.commands.clear();

  let loaded = 0;

  for (const file of getPluginFiles(CONFIG.plugins)) {
    try {
      const resolved = require.resolve(
        path.resolve(file)
      );

      delete require.cache[resolved];

      const plugin = require(resolved);

      if (
        !plugin ||
        !plugin.command ||
        typeof plugin.execute !== 'function'
      ) {
        continue;
      }

      const names = [
        plugin.command,
        ...(Array.isArray(plugin.alias)
          ? plugin.alias
          : [])
      ];

      for (const name of names) {
        global.commands.set(
          String(name).toLowerCase(),
          plugin
        );
      }

      loaded++;

      console.log(`[PLUGIN] ${plugin.command}`);

    } catch (error) {
      console.error(
        `[PLUGIN ERROR] ${file}:`,
        error.message
      );
    }
  }

  console.log(
    `[ALPHA-MD] ${loaded} plugins loaded.`
  );
}

/* =====================================
   OWNER CHECK
===================================== */

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
    const clean = String(number)
      .replace(/\D/g, '');

    return clean && numbers.includes(clean);
  });
}

/* =====================================
   MESSAGE HANDLER
===================================== */

async function handleMessage(message) {
  try {
    if (!message.message || message.key.fromMe) {
      return;
    }

    const chat = message.key.remoteJid;

    if (!chat || chat === 'status@broadcast') {
      return;
    }

    const text = getMessageText(message);

    if (!text) return;

    const owner = isOwner(message);

    if (CONFIG.mode === 'private' && !owner) {
      return;
    }

    if (!text.startsWith(CONFIG.prefix)) {
      if (
        settings?.automation?.autoReply === true &&
        typeof autoReply.getReply === 'function'
      ) {
        const reply = autoReply.getReply(text);

        if (reply) {
          await sock.sendMessage(
            chat,
            {
              text: String(reply)
            },
            {
              quoted: message
            }
          );
        }
      }

      return;
    }

    const body = text
      .slice(CONFIG.prefix.length)
      .trim();

    if (!body) return;

    const args = body.split(/\s+/);
    const command = args.shift().toLowerCase();

    const plugin = global.commands.get(command);

    if (!plugin) return;

    if (plugin.ownerOnly && !owner) {
      return sock.sendMessage(
        chat,
        {
          text: 'This command is only for the bot owner.'
        },
        {
          quoted: message
        }
      );
    }

    const isGroup = chat.endsWith('@g.us');

    if (plugin.groupOnly && !isGroup) {
      return sock.sendMessage(
        chat,
        {
          text: 'This command can only be used in groups.'
        },
        {
          quoted: message
        }
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

/* =====================================
   RECONNECT SYSTEM
===================================== */

function scheduleReconnect() {
  if (retryTimer) return;

  retryTimer = setTimeout(() => {
    retryTimer = null;
    startBot();
  }, 5000);
}

/* =====================================
   START ALPHA-MD
===================================== */

async function startBot() {
  if (starting) return;

  starting = true;

  try {
    makeFolders();

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(CONFIG.session);

    authState = state;

    const { version } =
      await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({
        level: 'silent'
      }),
      browser: [
        'ALPHA-MD',
        'Chrome',
        CONFIG.version
      ],
      printQRInTerminal: true,
      markOnlineOnConnect: true,
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on(
      'messages.upsert',
      async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const message of messages) {
          await handleMessage(message);
        }
      }
    );

    sock.ev.on(
      'connection.update',
      update => {
        const {
          connection,
          lastDisconnect
        } = update;

        if (connection === 'open') {
          console.log('');
          console.log('╔════════════════════════════════╗');
          console.log('║          ALPHA-MD ONLINE       ║');
          console.log('║        POWERED BY AHMED        ║');
          console.log('╚════════════════════════════════╝');
          console.log('');
        }

        if (connection === 'close') {
          const code =
            lastDisconnect?.error?.output?.statusCode;

          if (code === DisconnectReason.loggedOut) {
            console.log(
              'Session logged out. A new pairing process is required.'
            );
            return;
          }

          console.log(
            'Connection lost. Reconnecting...'
          );

          scheduleReconnect();
        }
      }
    );

    loadPlugins();

  } catch (error) {
    console.error('[START ERROR]', error);
    scheduleReconnect();

  } finally {
    starting = false;
  }
}

/* =====================================
   START WEBSITE + BOT
===================================== */

startWebsite();
startBot();

/* =====================================
   GLOBAL ERROR HANDLING
===================================== */

process.on('uncaughtException', error => {
  console.error('[FATAL ERROR]', error);
});

process.on('unhandledRejection', error => {
  console.error('[PROMISE ERROR]', error);
});
