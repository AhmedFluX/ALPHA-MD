
const autoReply = require('../../lib/auto-reply');

module.exports = {
  command: 'autoreply',
  alias: ['ar'],
  description: 'Manage automatic replies',
  category: 'OWNER',
  ownerOnly: true,

  execute: async ({ message, sock }) => {
    const chat = message.key.remoteJid;
    const raw =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      '';

    const input = raw.trim().split(/\s+/).slice(1).join(' ');
    const [action, ...rest] = input.split(/\s+/);
    const value = rest.join(' ').trim();

    const send = text =>
      sock.sendMessage(chat, { text }, { quoted: message });

    switch ((action || '').toLowerCase()) {
      case 'on':
        autoReply.enable();
        return send('✅ Auto-reply enabled.');

      case 'off':
        autoReply.disable();
        return send('❌ Auto-reply disabled.');

      case 'add': {
        const parts = value.split('|');
        const keyword = parts[0]?.trim();
        const response = parts.slice(1).join('|').trim();

        if (!keyword || !response) {
          return send('Usage: .autoreply add hello | Welcome!');
        }

        autoReply.add(keyword, response);
        return send(`✅ Reply added for: ${keyword}`);
      }

      case 'remove':
        if (!value) return send('Usage: .autoreply remove hello');

        return send(
          autoReply.remove(value)
            ? '✅ Reply removed.'
            : '❌ Keyword not found.'
        );

      case 'default': {
        const response = value.replace(/^\|/, '').trim();

        if (!response) {
          return send('Usage: .autoreply default | Your message');
        }

        autoReply.setDefault(response);
        return send('✅ Default reply updated.');
      }

      case 'list': {
        const data = autoReply.getAll();

        let output = `AUTO-REPLY: ${data.enabled ? 'ON' : 'OFF'}\n\n`;

        data.replies.forEach((item, index) => {
          output += `${index + 1}. ${item.keyword} → ${item.response}\n`;
        });

        output += `\nDefault: ${data.defaultReply || 'Not set'}`;

        return send(output);
      }

      case 'clear':
        autoReply.clear();
        return send('✅ All custom replies cleared.');

      default:
        return send(
          'ALPHA-MD AUTO-REPLY\n\n' +
          '.autoreply on\n' +
          '.autoreply off\n' +
          '.autoreply add hello | Welcome!\n' +
          '.autoreply remove hello\n' +
          '.autoreply default | Message\n' +
          '.autoreply list\n' +
          '.autoreply clear'
        );
    }
  }
};
