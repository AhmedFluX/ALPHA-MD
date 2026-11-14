
const config = require('../config/settings');

function normalizeJid(jid = '') {
  return String(jid).split(':')[0].trim().toLowerCase();
}

function getNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

function getOwnerNumbers() {
  const configured = config.owner?.numbers || [];
  const runtime = global.alpha?.owner || [];

  return [...configured, ...runtime]
    .map(number => getNumber(number))
    .filter(Boolean);
}

function isOwner(jid) {
  if (!jid) return false;

  const number = getNumber(jid);

  return getOwnerNumbers().includes(number);
}

function isSudo(jid) {
  if (!jid) return false;

  const sudo = config.owner?.sudo || [];
  const number = getNumber(jid);

  return sudo.some(item => getNumber(item) === number);
}

function isStaff(jid) {
  return isOwner(jid) || isSudo(jid);
}

function isGroup(jid = '') {
  return String(jid).endsWith('@g.us');
}

function isPrivate(jid = '') {
  return String(jid).endsWith('@s.whatsapp.net');
}

async function getGroupMetadata(sock, groupJid) {
  if (!sock || !isGroup(groupJid)) {
    throw new Error('A valid group chat is required.');
  }

  return await sock.groupMetadata(groupJid);
}

async function getParticipant(sock, groupJid, userJid) {
  const metadata = await getGroupMetadata(sock, groupJid);
  const target = normalizeJid(userJid);

  return metadata.participants.find(participant =>
    normalizeJid(participant.id) === target
  ) || null;
}

async function isAdmin(sock, groupJid, userJid) {
  try {
    const participant = await getParticipant(
      sock,
      groupJid,
      userJid
    );

    return Boolean(
      participant &&
      ['admin', 'superadmin'].includes(participant.admin)
    );
  } catch {
    return false;
  }
}

async function isBotAdmin(sock, groupJid) {
  try {
    const botJid = sock.user?.id;

    if (!botJid) return false;

    return await isAdmin(sock, groupJid, botJid);
  } catch {
    return false;
  }
}

async function isGroupMember(sock, groupJid, userJid) {
  try {
    return Boolean(
      await getParticipant(sock, groupJid, userJid)
    );
  } catch {
    return false;
  }
}

async function canUseCommand({
  sock,
  chat,
  sender,
  command = {}
}) {
  const permission = String(
    command.permission || 'all'
  ).toLowerCase();

  if (isStaff(sender)) return true;

  if (permission === 'owner') return false;

  if (permission === 'staff') return false;

  if (permission === 'admin') {
    if (!isGroup(chat)) return false;

    return await isAdmin(sock, chat, sender);
  }

  if (permission === 'group') {
    return isGroup(chat);
  }

  if (permission === 'private') {
    return isPrivate(chat);
  }

  if (permission === 'all' || permission === 'public') {
    return true;
  }

  return false;
}

async function canManageGroup(sock, groupJid, sender) {
  if (isStaff(sender)) return true;

  return await isAdmin(sock, groupJid, sender);
}

async function canManageTarget(sock, groupJid, sender, target) {
  if (isStaff(sender)) return true;

  const senderAdmin = await isAdmin(sock, groupJid, sender);
  if (!senderAdmin) return false;

  const targetAdmin = await isAdmin(sock, groupJid, target);

  return !targetAdmin;
}

function getPermission(command = {}) {
  return String(command.permission || 'all').toLowerCase();
}

module.exports = {
  normalizeJid,
  getNumber,
  getOwnerNumbers,
  isOwner,
  isSudo,
  isStaff,
  isGroup,
  isPrivate,
  getGroupMetadata,
  getParticipant,
  isAdmin,
  isBotAdmin,
  isGroupMember,
  canUseCommand,
  canManageGroup,
  canManageTarget,
  getPermission
};
