
module.exports = {
  command: 'groupinfo',
  alias: ['admins', 'mute', 'unmute', 'lock', 'unlock'],
  description: 'Group management commands',
  category: 'GROUP',
  groupOnly: true,

  execute: async ({ message, sock, command }) => {
    const chat = message.key.remoteJid;
    const sender = message.key.participant;

    const send = text =>
      sock.sendMessage(chat, { text }, { quoted: message });

    const metadata = await sock.groupMetadata(chat);
    const participants = metadata.participants || [];

    const findUser = jid =>
      participants.find(p => p.id === jid || p.jid === jid);

    const actor = findUser(sender);
    const bot = findUser(sock.user.id);

    const isAdmin = actor?.admin === 'admin' ||
                    actor?.admin === 'superadmin';

    const isBotAdmin = bot?.admin === 'admin' ||
                       bot?.admin === 'superadmin';

    if (command === 'groupinfo') {
      return send(
        `╭━━〔 ALPHA-MD GROUP 〕━━╮\n` +
        `┃ Name: ${metadata.subject}\n` +
        `┃ Members: ${participants.length}\n` +
        `┃ Admins: ${participants.filter(p => p.admin).length}\n` +
        `┃ Owner: ${metadata.owner || 'Unknown'}\n` +
        `╰━━━━━━━━━━━━━━━━╯`
      );
    }

    if (command === 'admins') {
      const admins = participants.filter(p => p.admin);

      const mentions = admins.map(p => p.id);

      return sock.sendMessage(chat, {
        text: `👑 GROUP ADMINS\n\n${admins.map((p, i) =>
          `${i + 1}. @${p.id.split('@')[0]}`
        ).join('\n')}`,
        mentions
      }, { quoted: message });
    }

    if (!isAdmin) {
      return send('❌ Only group admins can use this command.');
    }

    if (!isBotAdmin) {
      return send('❌ ALPHA-MD must be a group admin.');
    }

    const actions = {
      mute: 'announcement',
      unmute: 'not_announcement',
      lock: 'locked',
      unlock: 'unlocked'
    };

    if (actions[command]) {
      await sock.groupSettingUpdate(chat, actions[command]);

      return send(`✅ Group ${command} command completed.`);
    }

    return send('Unknown group command.');
  }
};
