
class AlphaFormatter {
  constructor() {
    this.botName = 'ALPHA-MD';
    this.footer = 'POWERED BY AHMED';
  }

  bold(text) {
    return `*${text}*`;
  }

  italic(text) {
    return `_${text}_`;
  }

  strike(text) {
    return `~${text}~`;
  }

  monospace(text) {
    return '```' + text + '```';
  }

  quote(text) {
    return `> ${text}`;
  }

  line(length = 25) {
    return '─'.repeat(Math.max(1, Math.min(length, 80)));
  }

  header(title) {
    return [
      `╭${this.line(30)}`,
      `│  ${title}`,
      `╰${this.line(30)}`
    ].join('\n');
  }

  footerText() {
    return `\n\n${this.line(25)}\n${this.footer}`;
  }

  success(text) {
    return `✓ ${text}`;
  }

  error(text) {
    return `✗ ${text}`;
  }

  warning(text) {
    return `⚠ ${text}`;
  }

  info(text) {
    return `ℹ ${text}`;
  }

  loading(text = 'Please wait...') {
    return `⏳ ${text}`;
  }

  mention(jid) {
    if (!jid || typeof jid !== 'string') return '';
    return `@${jid.split('@')[0].split(':')[0]}`;
  }

  mentions(jids = []) {
    return jids
      .filter(jid => typeof jid === 'string')
      .map(jid => this.mention(jid))
      .join(' ');
  }

  welcome(name, group) {
    return [
      `╭───〔 WELCOME 〕`,
      `│`,
      `│ Hello ${name}!`,
      `│ Welcome to ${group}`,
      `│ Enjoy your stay!`,
      `│`,
      `╰── ${this.footer}`
    ].join('\n');
  }

  goodbye(name, group) {
    return [
      `╭───〔 GOODBYE 〕`,
      `│`,
      `│ ${name} has left`,
      `│ Group: ${group}`,
      `│`,
      `╰── ${this.footer}`
    ].join('\n');
  }

  command(name, description, usage = '') {
    return [
      `╭──〔 ${name.toUpperCase()} 〕`,
      `│`,
      `│ ${description}`,
      usage ? `│ Usage: ${usage}` : '',
      `│`,
      `╰── ${this.footer}`
    ].filter(Boolean).join('\n');
  }

  help(title, commands = []) {
    const list = commands.map((cmd, index) =>
      `│ ${index + 1}. ${cmd}`
    );

    return [
      `╭──〔 ${title} 〕`,
      `│`,
      ...list,
      `│`,
      `╰── ${this.footer}`
    ].join('\n');
  }

  errorMessage(command, reason) {
    return [
      `╭──〔 COMMAND ERROR 〕`,
      `│ Command: ${command}`,
      `│ Reason: ${reason}`,
      `╰── ${this.footer}`
    ].join('\n');
  }

  profile(name, number, status = 'User') {
    return [
      `╭──〔 USER PROFILE 〕`,
      `│ Name: ${name}`,
      `│ Number: ${number}`,
      `│ Status: ${status}`,
      `╰── ${this.footer}`
    ].join('\n');
  }

  formatDate(date = new Date()) {
    return new Intl.DateTimeFormat('en-PK', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'full'
    }).format(date);
  }

  formatTime(date = new Date()) {
    return new Intl.DateTimeFormat('en-PK', {
      timeZone: 'Asia/Karachi',
      timeStyle: 'medium'
    }).format(date);
  }

  formatNumber(number) {
    return Number(number || 0).toLocaleString('en-US');
  }

  progress(percent, size = 10) {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    const total = Math.max(1, Math.min(50, size));
    const filled = Math.round((value / 100) * total);

    return `[${'█'.repeat(filled)}${'░'.repeat(total - filled)}] ${Math.round(value)}%`;
  }

  template(title, content, extra = '') {
    return [
      `╭──〔 ${title} 〕`,
      `│`,
      content,
      extra ? `│ ${extra}` : '',
      `│`,
      `╰── ${this.footer}`
    ].filter(Boolean).join('\n');
  }

  clean(text) {
    return String(text ?? '')
      .replace(/\r/g, '')
      .trim();
  }
}

const formatter = new AlphaFormatter();

module.exports = {
  AlphaFormatter,
  formatter
};
