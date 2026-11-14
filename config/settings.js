
/*
╔══════════════════════════════════════════════╗
║              ALPHA-MD SETTINGS               ║
║                 POWERED BY AHMED             ║
╚══════════════════════════════════════════════╝
*/

module.exports = {
  // BOT INFORMATION
  bot: {
    name: 'ALPHA-MD',
    version: '1.0.0',
    author: 'AHMED',
    packname: 'ALPHA-MD',
    description: 'Next Generation WhatsApp Bot',
    footer: 'POWERED BY AHMED',
    language: 'en',
    timezone: 'Asia/Karachi'
  },

  // OWNER INFORMATION

owner: {
  name: 'AHMED',
  numbers: process.env.OWNER_NUMBER
    ? [process.env.OWNER_NUMBER.replace(/\D/g, '')]
    : [],
  sudo: [],
  developer: 'AHMED'
},


  // COMMAND SETTINGS
  command: {
    prefix: '.',
    mode: 'public',
    caseSensitive: false,
    selfReply: false,
    readMessages: false,
    reactMessages: false,
    errorReply: true
  },

  // CONNECTION SETTINGS
  connection: {
    browser: ['ALPHA-MD', 'Chrome', '1.0.0'],
    printQR: true,
    reconnect: true,
    reconnectDelay: 5000,
    syncFullHistory: false
  },

  // AUTOMATION SETTINGS
  automation: {
    autoRead: false,
    autoStatusView: false,
    autoStatusReact: false,
    autoReact: false,
    autoTyping: false,
    autoRecording: false,
    autoBio: false,
    autoReply: false,
    autoLike: false
  },

  // GROUP SETTINGS
  group: {
    welcome: false,
    goodbye: false,
    detectLink: false,
    antiLink: false,
    antiSpam: false,
    antiBadword: false,
    antiBot: false,
    antiTag: false,
    adminOnly: true,
    welcomeMessage: 'Welcome to the group!',
    goodbyeMessage: 'Goodbye! Take care.'
  },

  // PRIVATE CHAT SETTINGS
  private: {
    autoReply: false,
    antiSpam: false,
    blockUnknown: false,
    typingIndicator: false
  },

  // MENU SETTINGS
  menu: {
    style: 'hybrid',
    title: 'ALPHA-MD',
    subtitle: 'NEXT GENERATION WHATSAPP BOT',
    showImage: true,
    showTime: true,
    showDate: true,
    showOwner: true,
    showCommands: true,
    showCategories: true,
    footer: 'POWERED BY AHMED',
    thumbnail: './assets/images/menu.jpg'
  },

  // AI SETTINGS
  ai: {
    enabled: false,
    provider: '',
    apiKey: '',
    model: '',
    maxTokens: 2000,
    temperature: 0.7
  },

  // DOWNLOAD SETTINGS
  downloader: {
    youtube: true,
    instagram: true,
    facebook: true,
    tiktok: true,
    twitter: true,
    mediafire: true,
    pinterest: true
  },

  // DATABASE SETTINGS
  database: {
    enabled: true,
    type: 'json',
    path: './database',
    saveInterval: 30000,
    backup: true
  },

  // STICKER SETTINGS
  sticker: {
    packname: 'ALPHA-MD',
    author: 'AHMED',
    quality: 80
  },

  // LIMIT SETTINGS
  limits: {
    enabled: false,
    free: 50,
    premium: 500,
    owner: -1
  },

  // SECURITY SETTINGS
  security: {
    protectSession: true,
    hideErrors: true,
    preventCrash: true,
    validateCommands: true
  },

  // LOGGING SETTINGS
  logging: {
    enabled: true,
    level: 'silent',
    showCommands: true,
    showErrors: true
  },

  // TEMPORARY FILES
  temp: {
    path: './temp',
    autoClean: true,
    maxAge: 3600000
  }
};
