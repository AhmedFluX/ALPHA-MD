
module.exports = {
  command: 'ping',
  alias: ['speed', 'pong'],
  description: 'Check bot response speed',
  category: 'GENERAL',

  execute: async ({ message, sock }) => {
    const start = Date.now();

    await sock.sendMessage(
      message.key.remoteJid,
      { text: '🏓 Pinging...' },
      { quoted: message }
    );

    const speed = Date.now() - start;

    await sock.sendMessage(
      message.key.remoteJid,
      {
        text: `
╭━━〔 𝐀𝐋𝐏𝐇𝐀-𝐌𝐃 〕━━╮
┃
┃  🏓 𝐏𝐎𝐍𝐆!
┃
┃  ◈ Response: ${speed} ms
┃  ◈ Status: Online
┃  ◈ POWERED BY AHMED
┃
╰━━━━━━━━━━━━━━━━╯
`
      },
      { quoted: message }
    );
  }
};
