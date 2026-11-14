
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;

const attempts = new Map();
const WINDOW = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

function getClientIp(req) {
  // Use the direct connection address; do not trust forwarded IP headers.
  return req.socket.remoteAddress || 'unknown';
}

function allowed(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now - entry.start > WINDOW) {
    attempts.set(ip, { start: now, count: 1 });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) return false;

  entry.count++;
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;

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

function startPairingServer(getSocket) {
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(
      req.url,
      'http://localhost'
    ).pathname;

    if (req.method === 'GET') {
      const files = {
        '/': 'index.html',
        '/index.html': 'index.html',
        '/style.css': 'style.css',
        '/script.js': 'script.js'
      };

      const file = files[pathname];

      if (!file) {
        res.writeHead(404);
        return res.end('Not found');
      }

      const ext = path.extname(file);

      const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8'
      };

      const filePath = path.join(PUBLIC_DIR, file);

      return fs.readFile(filePath, (error, content) => {
        if (error) {
          res.writeHead(500);
          return res.end('Website file unavailable');
        }

        res.writeHead(200, {
          'Content-Type': types[ext],
          'X-Content-Type-Options': 'nosniff'
        });

        res.end(content);
      });
    }

    if (req.method !== 'POST' || pathname !== '/pair') {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ip = getClientIp(req);

    if (!allowed(ip)) {
      return send(res, 429, {
        error: 'Too many requests. Try again later.'
      });
    }

    try {
      const { phone } = await readBody(req);

      const cleanPhone = String(phone || '').replace(/\D/g, '');
      const ownerNumber = String(
        process.env.OWNER_NUMBER || ''
      ).replace(/\D/g, '');

      if (!ownerNumber || cleanPhone !== ownerNumber) {
        return send(res, 403, {
          error: 'This number is not authorized.'
        });
      }

      const socket = getSocket();

      if (!socket || !socket.requestPairingCode) {
        return send(res, 503, {
          error: 'Bot is not ready. Try again later.'
        });
      }

      if (socket.authState?.creds?.registered) {
        return send(res, 409, {
          error: 'WhatsApp is already connected.'
        });
      }

      const code = await socket.requestPairingCode(cleanPhone);

      return send(res, 200, { code });

    } catch (error) {
      console.error('[PAIRING]', error.message);

      return send(res, 500, {
        error: 'Pairing request failed. Check bot connection.'
      });
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ALPHA-MD] Pairing website running on port ${PORT}`);
  });

  return server;
}

module.exports = startPairingServer;
