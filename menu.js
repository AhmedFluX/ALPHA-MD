
const config = require('../config/settings');

const CATEGORIES = {
  GENERAL: 'General',
  GROUP: 'Group Management',
  ADMIN: 'Admin Tools',
  OWNER: 'Owner',
  DOWNLOAD: 'Downloader',
  SEARCH: 'Search',
  MEDIA: 'Media & Stickers',
  AI: 'Artificial Intelligence',
  FUN: 'Fun & Games',
  UTILITY: 'Utilities',
  CONVERT: 'Converters',
  AUTOMATION: 'Automation',
  SECURITY: 'Security',
  INFORMATION: 'Information',
  ECONOMY: 'Economy'
};

function getCommands() {
  const commands = global.commands;

  if (!commands || typeof commands.values !== 'function') {
    return [];
  }

  return [...commands.values()].filter(Boolean);
}

function getPrefix() {
  return global.alpha?.prefix || config.command?.prefix || '.';
}

function getUptime() {
  let seconds = Math.floor(process.uptime());

  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function getDateTime() {
  const timezone = config.bot?.timezone || 'Asia/Karachi';

  const date = new Date();

  return {
    date: new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date),

    time: new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date)
  };
}

function getCategory(command) {
  const category = String(
    command.category || command.type || 'GENERAL'
  ).toUpperCase();

  return CATEGORIES[category] || category;
}

function getCommandName(command) {
  return String(
    command.command || command.name || 'unknown'
  ).toLowerCase();
}

function getOwner() {
  const owners = config.owner?.numbers || [];
  const firstOwner = owners[0];

  return firstOwner
    ? `@${String(firstOwner).replace(/\D/g, '')}`
    : config.owner?.name || 'Ahmed';
}

function buildCategoryMenu(commands) {
  const categories = {};

  for (const command of commands) {
    const category = getCategory(command);

    if (!categories[category]) {
      categories[category] = [];
    }

    const name = getCommandName(command);
    const prefix = getPrefix();

    categories[category].push(`${prefix}${name}`);
  }

  return Object.entries(categories)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => {
      const uniqueItems = [...new Set(items)].sort();

      return [
        `╭━━〔 ${category.toUpperCase()} 〕`,
        ...uniqueItems.map(item => `┃ ◦ ${item}`),
        `╰━━━━━━━━━━━━━━`
      ].join('\n');
    })
    .join('\n\n');
}

function getMenu(options = {}) {
  const commands = getCommands();
  const { date, time } = getDateTime();

  const botName = config.bot?.name || 'ALPHA-MD';
  const version = config.bot?.version || '1.0.0';
  const author = config.bot?.author || 'Ahmed';
  const prefix = getPrefix();

  const categoryMenu = buildCategoryMenu(commands);

  const header = [
    '╭━━━━━━━━━━━━━━━━━━╮',
    `┃      ✦ ${botName} ✦`,
    '┃  NEXT GENERATION BOT',
    '╰━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');

  const information = [
    '╭━━〔 BOT INFORMATION 〕',
    `┃ ◦ Version: ${version}`,
    `┃ ◦ Prefix: ${prefix}`,
    `┃ ◦ Owner: ${getOwner()}`,
    `┃ ◦ Commands: ${commands.length}`,
    `┃ ◦ Uptime: ${getUptime()}`,
    `┃ ◦ Date: ${date}`,
    `┃ ◦ Time: ${time}`,
    '╰━━━━━━━━━━━━━━━━━━'
  ].join('\n');

  const footer = [
    '',
    '╭━━━━━━━━━━━━━━━━━━╮',
    '┃     POWERED BY AHMED',
    '╰━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');

  const menu = [
    header,
    '',
    options.greeting || 'Welcome to ALPHA-MD!',
    '',
    information,
    '',
    categoryMenu || 'No commands loaded yet.',
    footer
  ].join('\n');

  return {
    text: menu,
    commands,
    total: commands.length,
    categories: CATEGORIES,
    uptime: getUptime(),
    date,
    time
  };
}

function getSimpleMenu() {
  return getMenu().text;
}

function getHelp(commandName) {
  const prefix = getPrefix();
  const commands = getCommands();

  const command = commands.find(item => {
    const name = getCommandName(item);
    const aliases = Array.isArray(item.alias) ? item.alias : [];

    return name === String(commandName).toLowerCase() ||
      aliases.includes(String(commandName).toLowerCase());
  });

  if (!command) {
    return `Command "${commandName}" was not found.`;
  }

  return [
    '╭━━〔 COMMAND HELP 〕',
    `┃ Name: ${getCommandName(command)}`,
    `┃ Category: ${getCategory(command)}`,
    `┃ Description: ${command.description || command.desc || 'No description'}`,
    `┃ Usage: ${command.usage || `${prefix}${getCommandName(command)}`}`,
    `┃ Aliases: ${(command.alias || []).join(', ') || 'None'}`,
    '╰━━━━━━━━━━━━━━━━━━',
    '',
    'POWERED BY AHMED'
  ].join('\n');
}

module.exports = {
  CATEGORIES,
  getMenu,
  getSimpleMenu,
  getHelp,
  getCommands,
  getCategory,
  getUptime
};
