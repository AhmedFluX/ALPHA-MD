
const os = require('os');

module.exports = {
  command: 'menu',
  alias: ['help', 'commands', 'list'],

  description: 'Show all ALPHA-MD commands',
  category: 'GENERAL',

  execute: async ({ message, sock }) => {
    const prefix = global.alpha?.prefix || '.';
    const commands = global.commands || new Map();

    const categories = {};

    for (const [name, plugin] of commands) {
      const category = plugin.category || 'GENERAL';

      if (!categories[category]) {
        categories[category] = new Set();
      }

      categories[category].add(name);
    }

    let menu = `
╭━━〔 𝐀𝐋𝐏𝐇𝐀-𝐌𝐃 〕━━╮
┃
┃  ◈ 𝐖𝐄𝐋𝐂𝐎𝐌𝐄
┃  ◈ 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐀𝐇𝐌𝐄𝐃
┃
┣━━━━━━━━━━━━━━━━
┃ ◈ Version: ${global.alpha?.version || '1.0.0'}
┃ ◈ Prefix: ${prefix}
┃ ◈ Mode: ${global.alpha?.mode || 'public'}
┃ ◈ Platform: ${os.platform()}
┃ ◈ Commands: ${commands.size}
┣━━━━━━━━━━━━━━━━
`;

    for (const category of Object.keys(categories).sort()) {
      menu += `\n┃ ◈ ${category.toUpperCase()}\n`;

      for (const command of categories[category]) {
        menu += `┃  ${prefix}${command}\n`;
      }

      menu += '┣━━━━━━━━━━━━━━━━\n';
    }

    menu += `
┃
┃  © ALPHA-MD
┃  POWERED BY AHMED
╰━━━━━━━━━━━━━━━━╯
`;

    await sock.sendMessage(
      message.key.remoteJid,
      { text: menu.trim() },
      { quoted: message }
    );
  }
};
