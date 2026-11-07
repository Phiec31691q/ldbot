/**
 * LD GIVEAWAYS | Ultimate Masterpiece Edition v9.0.0
 * My Owner: Unitey (1026324207098925147)
 * My Developer: Dream (696735778356854913)
 * 
 * KURULUM: Bu dosyayı GitHub'a index.js olarak yükleyin. Render'da otomatik olarak güncellenecektir.
 * Gerekli Environment Değişkenleri: DISCORD_TOKEN, CLIENT_ID, GUILD_ID, DATA_DIR=./data
 * 
 * YENİLİKLER (v9.0.0):
 * - Preview Expired hatası çözüldü (SQLite tabanlı Draft sistemi).
 * - /ticket setup ve /rolepanel setup Adım Adım (Wizard) sistemine geçirildi.
 * - Canlı sayaç (Live Countdown) eklendi.
 * - Tüm API Boolean hataları giderildi.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {
  Client, GatewayIntentBits, REST, Routes, PermissionFlagsBits: P,
  ChannelType, ActivityType, MessageFlags, ModalBuilder,
  ActionRowBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder,
  EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder,
  RoleSelectMenuBuilder, ChannelSelectMenuBuilder
} = require('discord.js');

const VERSION = '9.0.0';
const SELF_TEST = process.argv.includes('--self-test');
const DATA_DIR = SELF_TEST ? null : (process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const STORAGE_MODE = process.env.STORAGE_MODE || 'ephemeral';
const MAX_TRANSCRIPT = 10000;
const EPH = MessageFlags.Ephemeral;
const V2 = MessageFlags.IsComponentsV2 || 32768;
const NO_MENTIONS = { parse: [], repliedUser: false };
const ALL_CHANNEL_PERMS = [
  P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks,
];
const DANGEROUS = [
  P.Administrator, P.ManageGuild, P.ManageRoles, P.ManageChannels, P.ManageWebhooks,
  P.BanMembers, P.KickMembers, P.ModerateMembers, P.ManageMessages, P.MentionEveryone,
  P.ManageEvents, P.ManageThreads, P.ManageGuildExpressions, P.ViewAuditLog,
].filter(Boolean);

const PRESET_COLORS = {
  red: { name: 'Kırmızı', value: 0xED4245 },
  green: { name: 'Yeşil', value: 0x57F287 },
  blue: { name: 'Mavi', value: 0x3498DB },
  purple: { name: 'Mor', value: 0x9B59B6 },
  gold: { name: 'Altın', value: 0xFEE75C }
};

function parseColor(input, defaultColor = 0x29B866) {
  if (!input) return defaultColor;
  const lower = input.toLowerCase().trim();
  if (PRESET_COLORS[lower]) return PRESET_COLORS[lower].value;
  if (/^#[0-9a-f]{6}$/i.test(lower)) return parseInt(lower.slice(1), 16);
  return defaultColor;
}

function initializeStore() {
  if (SELF_TEST) return new Database(':memory:');
  if (!['ephemeral','persistent'].includes(STORAGE_MODE)) {
    console.error('Invalid STORAGE_MODE.'); process.exit(1);
  }
  if (STORAGE_MODE==='persistent' && !process.env.DATA_DIR) {
    console.error('Persistent mode needs an explicit DATA_DIR.'); process.exit(1);
  }
  try {
    const transcripts = path.join(DATA_DIR, 'transcripts');
    fs.mkdirSync(transcripts, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    fs.accessSync(transcripts, fs.constants.W_OK);
    const store=new Database(path.join(DATA_DIR, 'bot.sqlite'));
    console.log(`Storage mode: ${STORAGE_MODE}. Data directory: ${path.resolve(DATA_DIR)}.`);
    return store;
  } catch (error) {
    console.error(`Storage startup failed at ${DATA_DIR}.`); process.exit(1);
  }
}

const db = initializeStore();
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = FULL');
db.exec(`
 CREATE TABLE IF NOT EXISTS objects (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));
 CREATE TABLE IF NOT EXISTS entries (giveaway TEXT NOT NULL, user TEXT NOT NULL, joined INTEGER NOT NULL, PRIMARY KEY(giveaway,user));
 CREATE TABLE IF NOT EXISTS cooldowns (panel TEXT NOT NULL, user TEXT NOT NULL, role TEXT NOT NULL, until INTEGER NOT NULL, PRIMARY KEY(panel,user,role));
`);
const sql = {
  get: db.prepare('SELECT data FROM objects WHERE kind=? AND id=?'),
  set: db.prepare('INSERT INTO objects VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data'),
  all: db.prepare('SELECT data FROM objects WHERE kind=?'),
  del: db.prepare('DELETE FROM objects WHERE kind=? AND id=?'),
  join: db.prepare('INSERT OR IGNORE INTO entries VALUES (?,?,?)'),
  leave: db.prepare('DELETE FROM entries WHERE giveaway=? AND user=?'),
  entries: db.prepare('SELECT user FROM entries WHERE giveaway=? ORDER BY joined,user'),
  count: db.prepare('SELECT COUNT(*) AS n FROM entries WHERE giveaway=?'),
  hasEntry: db.prepare('SELECT 1 AS found FROM entries WHERE giveaway=? AND user=?'),
  cooldown: db.prepare('SELECT until FROM cooldowns WHERE panel=? AND user=? AND role=?'),
  roleCooldown: db.prepare('SELECT MAX(until) AS until FROM cooldowns WHERE user=? AND role=?'),
  coolSet: db.prepare('INSERT INTO cooldowns VALUES (?,?,?,?) ON CONFLICT(panel,user,role) DO UPDATE SET until=excluded.until'),
};
function get(kind, id) { const r = sql.get.get(kind, id); return r ? JSON.parse(r.data) : null; }
function put(kind, id, data) { sql.set.run(kind, id, JSON.stringify(data)); return data; }
function all(kind) { return sql.all.all(kind).map(x => JSON.parse(x.data)); }
function change(kind, id, fn) {
  return db.transaction(() => { const x = get(kind, id); if (!x) throw Error('Record not found.'); fn(x); return put(kind, id, x); })();
}
function cfg(guild) { return get('config', guild) || { color: 0x29b866, logChannel: null, ticketCategories: {}, retentionDays: 30 }; }
function updateCfg(guild, fn) { const x = cfg(guild); fn(x); return put('config', guild, x); }
function uid() { return crypto.randomBytes(10).toString('hex'); }
function snowflake(x) { return /^\d{17,20}$/.test(String(x)); }
function duration(text, max = 90 * 86400000) {
  const s = String(text).toLowerCase().trim();
  let total = 0, match, end = 0;
  const re = /(\d+)\s*(s|m|h|d|w)\s*/g;
  while ((match = re.exec(s))) {
    if (s.slice(end, match.index).trim()) throw Error('Use a duration such as 30m, 2h or 1d 2h.');
    total += Number(match[1]) * ({s:1000,m:60000,h:3600000,d:86400000,w:604800000}[match[2]]);
    end = re.lastIndex;
  }
  if (!end || s.slice(end).trim() || !Number.isSafeInteger(total) || total < 1000 || total > max)
    throw Error('Invalid duration or duration outside the allowed range.');
  return total;
}
function integer(x, min, max, label = 'Value') {
  const n = Number(x);
  if (!Number.isInteger(n) || n < min || n > max) throw Error(`${label} must be between ${min} and ${max}.`);
  return n;
}
function clean(x, max = 4000) { return String(x ?? '').slice(0, max); }
function display(x) { return clean(x).replace(/([\\`*_~|>#[\]])/g, '\\$1').replace(/@/g, '@\u200b'); }
function ts(n, style = 'R') { return `<t:${Math.floor(n / 1000)}:${style}>`; }
function autoMarkdown(text) {
  if (!text) return text;
  return text.split('\n').map((line, index) => {
    line = line.trim();
    if (!line) return '';
    if (index === 0) return `# ${line}`;
    if (line.endsWith(':') || line.endsWith('?')) return `**${line}**`;
    return line;
  }).join('\n');
}
function text(s) { return { type: 10, content: String(s) }; }
function row(...components) { return { type: 1, components }; }
function button(id, label, style = 2, extra = {}) { return { type: 2, custom_id: id, label: clean(label,80), style, ...extra }; }
function card(guild, body, rows = [], ephemeral = false, color) {
  return { flags: V2 | (ephemeral ? EPH : 0), allowedMentions: NO_MENTIONS,
    components: [{ type: 17, accent_color: color ?? cfg(guild).color, components: [text(body), ...rows] }] };
}
function modal(id, title, fields) {
  return new ModalBuilder().setCustomId(id).setTitle(clean(title,45)).addComponents(
    fields.map(f => new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId(f.id).setLabel(clean(f.label,45))
      .setStyle(f.short ? TextInputStyle.Short : TextInputStyle.Paragraph)
      .setRequired(f.required !== false).setMaxLength(f.max || 2000)
      .setMinLength(f.min || 0).setValue(clean(f.value || '', f.max || 2000))
      .setPlaceholder(clean(f.placeholder || '',100)))));
}
async function tell(i, message) {
  const payload = typeof message === 'string' ? { content: clean(message,1900), allowedMentions: NO_MENTIONS } : message;
  if (i.deferred || i.replied) return i.editReply({...payload,...(payload.flags?{flags:payload.flags&~EPH}:{})});
  return i.reply({ ...payload, flags: (payload.flags || 0) | EPH });
}
function requirePerm(i, permission = P.Administrator) { if (!i.memberPermissions?.has(permission)) throw Error('You do not have permission to use this action.'); }
function botPerm(channel, permission) { if (!channel.permissionsFor(channel.guild.members.me)?.has(permission)) throw Error(`The bot is missing the required channel permission: ${String(permission)}.`); }
async function channelBy(guild, id) { const c = await guild.channels.fetch(id).catch(() => null); if (!c) throw Error('The channel no longer exists.'); return c; }
async function sendChannel(guild, id) { const c = await channelBy(guild,id); if (c.type !== ChannelType.GuildText) throw Error('Choose a server text channel.'); botPerm(c,[P.ViewChannel,P.SendMessages]); return c; }
function safeLog(error, context = '') { const msg = String(error?.message || error).replaceAll(process.env.DISCORD_TOKEN || '<unset-token>', '[REDACTED]'); console.error(`[${new Date().toISOString()}] ${context}: ${msg}`); }

// SQLite Draft System (Fixes the "Preview Expired" error completely)
function saveDraft(userId, type, data) { put('draft', `${userId}_${type}`, { data, expires: Date.now() + 900000 }); }
function getDraft(userId, type) { const r = get('draft', `${userId}_${type}`); if (!r || r.expires < Date.now()) return null; return r.data; }
function delDraft(userId, type) { sql.del.run('draft', `${userId}_${type}`); }

const locks = new Set();
async function locked(key, fn) { if (locks.has(key)) throw Error('This action is already in progress. Please try again shortly.'); locks.add(key); try { return await fn(); } finally { locks.delete(key); } }

function protectedRoles(guildId) {
  return new Set([
    ...Object.values(cfg(guildId).ticketCategories).map(c=>c.supportRole),
    ...all('ticket').filter(t=>t.guild===guildId).map(t=>t.supportRole),
    ...all('setup').filter(j=>j.guild===guildId).map(j=>j.roles?.Staff),
  ].filter(Boolean));
}
async function privateLogChannel(channel,config=cfg(channel.guild.id)) {
  const guild=channel.guild;
  if(channel.permissionsFor(guild.roles.everyone)?.has(P.ViewChannel))throw Error('The log channel must not be visible to @everyone.');
  const approved=protectedRoles(guild.id); if(config.logRole)approved.add(config.logRole);
  for(const id of guild.members.me.roles.cache.keys())if(id!==guild.id)approved.add(id);
  for(const role of guild.roles.cache.values()) {
    if(role.id===guild.id||!channel.permissionsFor(role)?.has(P.ViewChannel))continue;
    if(!approved.has(role.id)&&!role.permissions.has(P.Administrator)&&!role.permissions.has(P.ModerateMembers)) throw Error(`The log channel is visible to an unapproved role: ${role.name}.`);
  }
}
async function logEvent(guild, title, body, files = []) {
  const id = cfg(guild.id).logChannel; if (!id) return false;
  try {
    const c = await sendChannel(guild,id); await privateLogChannel(c);
    const embed = new EmbedBuilder().setTitle(`📝 ${clean(title, 256)}`).setDescription(clean(body, 3900)).setColor(cfg(guild.id).color).setTimestamp();
    await c.send({ embeds: [embed], files, allowedMentions: NO_MENTIONS }); return true;
  } catch(e) { safeLog(e,'audit delivery'); return false; }
}

// Command Schema (FIXED)
const S = 3, I = 4, B = 5, U = 6, C = 7, R = 8;
function opt(type,name,description,required=false,extra={}) { return {type,name,description,required,...extra}; }
const str=(n,d,req=false,max=1000)=>opt(S,n,d,req,{max_length:max});
const num=(n,d,min,max,req=false)=>opt(I,n,d,req,{min_value:min,max_value:max});
const usr=(n='user',req=true)=>opt(U,n,'Server member',req);
const ch=(n='channel',req=true,category=false)=>opt(C,n,category?'Category channel':'Server text channel',req,{channel_types:[category?4:0]});
const rol=(n,req=false)=>opt(R,n,'Server role',req);
const bool=(n,d)=>opt(B,n,d);
const idopt=()=>str('id','Giveaway message ID',true,20);
function sub(name,description,options=[]) {return {type:1,name,description,options};}
function command(name,description,options=[],admin=false) { return {name,description,options,dm_permission:false,...(admin?{default_member_permissions:P.Administrator.toString()}:{})}; }

const COMMANDS = [
  command('help','View bot information and command help'),
  command('about','View bot information'),
  command('botinfo','View detailed bot statistics and uptime'),
  command('stats','View advanced server, ticket, and giveaway statistics'),
  command('userinfo','View information about a user',[usr('user',false)]),
  command('avatar','View a user\'s avatar',[usr('user',false)]),
  command('serverinfo','View information about the server'),
  command('embed','Build and send a custom embed',[str('description','Embed Description',true,4000),ch('channel',false),str('title','Embed Title',false,256),str('footer','Embed Footer',false,2048),str('image_url','Image URL',false,2000)],true),
  command('announcement','Send your exact announcement text',[str('text','Text to send',true,2000),ch('channel',false),bool('ping','Allow user and role notifications'),bool('embed','Send as a stylish Embed'),bool('markdown','Auto-format text using Markdown')],true),
  command('say','Send your exact text',[str('text','Text to send',true,2000),ch('channel',false),bool('ping','Allow user and role notifications'),bool('embed','Send as a stylish Embed'),bool('markdown','Auto-format text using Markdown')],true),
  command('dm','Send a private message to a member',[usr(),str('text','Exact message text',true,2000),bool('embed','Send as a stylish Embed'),bool('markdown','Auto-format text using Markdown')],true),
  command('status','Set the bot activity and presence',[str('text','Activity text or Custom Status Note',true,128),opt(S,'activity','Activity type',false,{choices:['Playing','Watching','Listening','Competing'].map(name=>({name,value:name}))}),opt(S,'presence','Online status',false,{choices:['online','idle','dnd','invisible'].map(name=>({name,value:name}))})],true),
  command('config','Configure logs, appearance and data export',[ch('log_channel',false),rol('log_role'),str('color','Hex color, for example #29B866',false,7),num('retention_days','Closed ticket data retention in days',1,365),bool('backup','Export stored records privately')],true),
  command('ticket','Configure and manage tickets',[
    sub('setup','Easily setup the ticket system in one go'), 
    sub('close','Close the current ticket'),
    sub('add','Add a member to the current ticket',[usr()]),
    sub('remove','Remove a member from the current ticket',[usr()]),
    sub('transcript','Export the current ticket transcript'),
  ]),
  command('giveaway','Create and manage giveaways',[
    sub('create','Create a giveaway instantly via a single form',[ch(),rol('required_role'),num('min_age_days','Minimum account age in days',0,3650),num('min_join_days','Minimum server membership in days',0,3650),opt(R,'bonus_role','Role that gives bonus entries',false),num('bonus_amount','Amount of extra entries for bonus role',1,10)]),
    sub('drop','Create a fast giveaway where the first to click wins',[ch(),str('prize','Prize name',true,200),rol('required_role')]),
    sub('list','List recent giveaways'),
    sub('info','View giveaway details',[idopt()]),
    sub('edit','Edit an active giveaway',[idopt()]),
    sub('pause','Pause an active giveaway',[idopt()]),
    sub('resume','Resume a paused giveaway',[idopt()]),
    sub('end','End a giveaway and draw winners',[idopt()]),
    sub('cancel','Cancel a giveaway without drawing',[idopt()]),
    sub('reroll','Draw new winners excluding all previous winners',[idopt()]),
    sub('retry','Retry pending result announcements and winner DMs',[idopt()]),
  ]),
  command('rolepanel','Publish and manage emoji role buttons',[
    sub('setup','Easily setup a role panel in one go'),
    sub('remove','Remove buttons from a role panel',[ch(),str('message_id','Role panel message ID',true,20)]),
  ],true),
  command('setup','Preview 30 additive server templates',[],true),
  {...command('mod','Moderation tools',[
    sub('warn','Record a warning',[usr(),str('reason','Reason',false,400)]),
    sub('warnings','View member warnings',[usr()]),
    sub('clearwarnings','Clear member warnings',[usr(),str('reason','Reason',false,400)]),
    sub('kick','Kick a member after confirmation',[usr(),str('reason','Reason',false,400)]),
    sub('ban','Ban a member after confirmation',[usr(),str('reason','Reason',false,400),num('delete_days','Delete recent message history in days',0,7)]),
    sub('unban','Unban a user by ID',[str('user_id','Banned user ID',true,20),str('reason','Reason',false,400)]),
    sub('timeout','Timeout a member',[usr(),str('duration','For example 30m, 2h or 1d; maximum 28d',true,40),str('reason','Reason',false,400)]),
    sub('untimeout','Remove a timeout',[usr(),str('reason','Reason',false,400)]),
    sub('purge','Delete recent messages after confirmation',[num('amount','Number of recent messages',1,100,true),str('reason','Reason',false,400)]),
    sub('slowmode','Set the current channel slowmode',[num('seconds','0 disables slowmode',0,21600,true),str('reason','Reason',false,400)]),
    sub('lock','Restrict everyone from sending messages in this channel',[str('reason','Reason',false,400)]),
    sub('unlock','Restore the send permission saved by lock',[str('reason','Reason',false,400)]),
    sub('nuke','Clone and delete the current channel to wipe it'),
    sub('role','Add or remove a role from a member',[usr(),rol('role',true),opt(S,'action','Add or Remove',true,{choices:[{name:'Add',value:'add'},{name:'Remove',value:'remove'}]})]),
    sub('case','View a stored moderation case',[str('case_id','Case ID',true,24)]),
  ]),default_member_permissions:P.ModerateMembers.toString()},
];

const client = SELF_TEST ? { user:{id:'test-bot'}, users:{fetch:async()=>({send:async()=>({id:'test-dm'})})} } : new Client({
  intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages,...(process.env.ENABLE_MESSAGE_CONTENT==='true'?[GatewayIntentBits.MessageContent]:[])],
  allowedMentions:NO_MENTIONS,
});

const HELP = {
  Overview: '# LD GIVEAWAYS Ultra\nMy Owner: Unitey\nMy Developer: Dream\n\nI manage giveaways, tickets, role panels and server moderation.\nSelect a section below to view its commands.',
  Messaging: '## Messaging\n`/announcement` - Send your exact announcement after preview.\n`/say` - Send your exact text after preview.\n`/dm` - Preview and send a private message.\n`/embed` - Build and send a fully custom embed.\n`/status` - Set the bot activity and presence.\n\nThese commands require Administrator permission.',
  Info: '## Information\n`/userinfo` - View detailed info about a user.\n`/avatar` - View a user\'s avatar.\n`/serverinfo` - View detailed info about the server.\n`/botinfo` - View bot statistics and uptime.\n`/stats` - View bot database statistics.',
  Tickets: '## Tickets\n`/ticket setup` - Setup the ticket system and panel step-by-step instantly!\n`/ticket close` - Close the ticket.\n`/ticket add`, `/ticket remove` - Manage participants.\n`/ticket transcript` - Export the ticket transcript.',
  Giveaways: '## Giveaways\n`/giveaway create` - Configure a prize and choose a duration.\n`/giveaway drop` - Create a fast giveaway where the first to click wins!\n`/giveaway list`, `/giveaway info` - View giveaways.\n`/giveaway edit` - Edit an active giveaway.\n`/giveaway pause`, `/giveaway resume` - Pause or resume.\n`/giveaway end`, `/giveaway cancel` - End or cancel.\n`/giveaway reroll` - Reroll winners.\n\nUse 🎉 Join / 🚫 Leave on a giveaway to manage your entry.',
  Moderation: '## Moderation\n`/mod warn`, `/mod warnings`, `/mod clearwarnings`\n`/mod kick`, `/mod ban`, `/mod unban`\n`/mod timeout`, `/mod untimeout`\n`/mod purge`, `/mod slowmode`\n`/mod lock`, `/mod unlock`, `/mod nuke`\n`/mod role` - Add or remove roles.\n`/mod case`\n\nEach action checks the required permission and role hierarchy.',
  Roles: '## Role panels\n`/rolepanel setup` - Start the step-by-step role panel wizard!\n`/rolepanel remove` - Remove a panel’s buttons.\n\nClick a button to get its role. Wait 20 seconds after receiving it before removing it.',
  Setup: '## Server setup\n`/setup` - Preview 30 server templates.',
  Configuration: '## Configuration\n`/config log_channel` - Set a private audit channel.\n`/config color` - Set the default card accent color.\n`/config retention_days` - Set closed ticket retention.',
};
function helpPayload(guild, section='Overview') { return card(guild,HELP[section]||HELP.Overview,[row({ type: 3, custom_id: 'help', placeholder: 'Select a section', min_values:1, max_values:1, options:Object.keys(HELP).map(x=>({label:x,value:x})) })],true); }

// -------------------------- TICKETS --------------------------
function currentTicket(i) { const t=get('ticket',i.channelId); if (!t||t.guild!==i.guildId) throw Error('Use this action inside a ticket channel.'); return t; }
function staff(i,t) { return i.memberPermissions?.has(P.Administrator) || i.member?.roles?.cache?.has(t.supportRole); }
function ticketAccess(i,t) { return staff(i,t) || (t.state==='open'&&(t.owner===i.user.id||t.participants.includes(i.user.id))); }
function ticketStaff(i,t) {if (!staff(i,t)) throw Error('Only ticket staff can use this action.'); }
function ticketRows(t) {
  return [
    row(
      button('ticket-claim',t.claimed?(t.labels?.claimed||'Claimed'):(t.labels?.claim||'Claim'),2,{disabled:!!t.claimed||t.state!=='open'}),
      button('ticket-close',t.labels?.close||'Close',4,{disabled:t.state!=='open'}),
      button('ticket-transcript',t.labels?.transcript||'Transcript'),
      button('ticket-manage-users','Manage Users',1,{disabled:t.state!=='open'})
    ),
    row(
      button('ticket-prio-low','🟢 Low',2,{disabled:t.state!=='open'}),
      button('ticket-prio-med','🟡 Medium',2,{disabled:t.state!=='open'}),
      button('ticket-prio-high','🔴 High',2,{disabled:t.state!=='open'}),
      button('ticket-prio-urgent','🚨 Urgent',2,{disabled:t.state!=='open'})
    )
  ];
}
function ticketPermissionOverwrites(guild,t,closed=false) {
  return [
    {id:guild.id,deny:[P.ViewChannel]},
    {id:client.user.id,allow:[...ALL_CHANNEL_PERMS,P.ManageChannels,P.ManageRoles]},
    {id:t.supportRole,allow:ALL_CHANNEL_PERMS},
    ...[...new Set([t.owner,...t.participants])].map(id=>closed?{id,deny:[P.ViewChannel]}:{id,allow:ALL_CHANNEL_PERMS}),
  ];
}
function ticketText(raw,t,user=t.owner) { return String(raw).replaceAll('{channel}',`<#${t.id}>`).replaceAll('{user}',`<@${user}>`).replaceAll('{category}',t.title).replaceAll('{id}',t.id); }
function ticketBody(t) { const intro=ticketText(t.welcome,t); return `${intro}\n\n${t.answers.map(a=>`**${display(a.label)}**\n${display(a.value||'Not provided.')}`).join('\n\n')}`.slice(0,3900); }
async function refreshTicket(guild,t) {
  if (!t.message) return;
  const c=await channelBy(guild,t.id); const m=await c.messages.fetch(t.message);
  const embed = new EmbedBuilder().setTitle(`🎫 Ticket - ${t.title}`).setDescription(ticketBody(t)).setColor(t.priorityColor || cfg(t.guild).color).addFields({ name: 'Priority', value: t.priority || 'Not Set', inline: true }, { name: 'Status', value: t.claimed ? `Claimed by <@${t.claimed}>` : 'Unclaimed', inline: true });
  await m.edit({ embeds: [embed], components: ticketRows(t) });
}
async function createTicket(i,d) {
  await i.deferReply({flags:EPH});
  await locked(`ticket-open:${i.guildId}:${i.user.id}`,async()=>{
    const c=cfg(i.guildId).ticketCategories[d.key]; if (!c) throw Error('This category is no longer available.');
    const existing=all('ticket').filter(t=>t.guild===i.guildId&&t.owner===i.user.id&&t.key===d.key&&t.state==='open');
    if (existing.length>=(c.maxOpen||1)) throw Error(`You already have the maximum number of open tickets: ${c.maxOpen||1}.`);
    const total=all('ticket').filter(t=>t.guild===i.guildId&&t.owner===i.user.id&&['open','closing'].includes(t.state)).length;
    if(total>=(c.maxTotal||3))throw Error(`Maximum total open tickets: ${c.maxTotal||3}.`);
    const parent=await channelBy(i.guild,c.parent); if (parent.type!==ChannelType.GuildCategory) throw Error('Category unavailable.');
    const support=await i.guild.roles.fetch(c.supportRole); if (!support||support.id===i.guildId) throw Error('Support role unavailable.');
    botPerm(parent,[P.ManageChannels,P.ManageRoles]);
    const answers=d.category.questions.map(q=>({label:q.label,value:i.fields.getTextInputValue(q.id)}));
    const marker=uid();
    const pending={id:marker,guild:i.guildId,owner:i.user.id,key:d.key,title:c.title,supportRole:c.supportRole,parent:c.parent,archive:c.archive||null,welcome:c.welcome,answers,participants:[],state:'creating',allowOwnerClose:c.allowOwnerClose!==false,labels:c.labels||{},messages:c.messages||{},created:Date.now(),marker,priority: 'Not Set', priorityColor: cfg(i.guildId).color};
    put('ticket-pending',marker,pending);
    const channel=await i.guild.channels.create({name:`${c.channelPrefix||'ticket'}-${i.user.id.slice(-6)}-${marker.slice(0,4)}`,type:ChannelType.GuildText,parent:c.parent,topic:`LD ticket ${marker}; owner ${i.user.id}`,permissionOverwrites:ticketPermissionOverwrites(i.guild,pending),reason:`Ticket requested by ${i.user.id}`});
    const t={...pending,id:channel.id,state:'open'};
    put('ticket',t.id,t); sql.del.run('ticket-pending',marker);
    try {
      const embed = new EmbedBuilder().setTitle(`🎫 Ticket - ${t.title}`).setDescription(ticketBody(t)).setColor(t.priorityColor).addFields({ name: 'Priority', value: t.priority, inline: true }, { name: 'Status', value: 'Unclaimed', inline: true });
      const msg=await channel.send({ embeds: [embed], components: ticketRows(t) }); change('ticket',t.id,x=>{x.message=msg.id;});
    } catch(e) {safeLog(e,'ticket introduction');}
    await tell(i,ticketText(t.messages?.opened||'Your ticket is ready: {channel}',t));
    await logEvent(i.guild,'Ticket opened',`**Channel:** <#${channel.id}>\n**Owner:** <@${i.user.id}>\n**Category:** ${display(c.title)}`);
  });
}
async function transcript(guild,t) {
  const c=await channelBy(guild,t.id); botPerm(c,[P.ViewChannel,P.ReadMessageHistory]);
  let before, messages=[], hasMore=false;
  while (messages.length<MAX_TRANSCRIPT) {
    const batch=await c.messages.fetch({limit:100,...(before?{before}:{})}); if (!batch.size) break;
    messages.push(...batch.values()); before=batch.last().id; if (batch.size<100) break;
    if (messages.length===MAX_TRANSCRIPT) hasMore=(await c.messages.fetch({limit:1,before})).size>0;
  }
  messages.sort((a,b)=>a.createdTimestamp-b.createdTimestamp);
  const output=['LD GIVEAWAYS - Ticket transcript', `Channel: ${t.id} | Owner: ${t.owner}`, 'Original ticket form responses:', ...t.answers.map(a=>`${a.label}\n${a.value||'Not provided.'}`), '', ...messages.map(m=>[`[${new Date(m.createdTimestamp).toISOString()}] ${m.author?.tag||'Unknown'} [${m.id}]`, m.content||'[No text]', ...m.attachments.map(a=>`URL: ${a.url}`)].join('\n'))].join('\n\n');
  return Buffer.from(output,'utf8');
}
async function ticketTranscriptReply(i,t) {
  if (!ticketAccess(i,t)) throw Error('No access.');
  await i.deferReply({flags:EPH});
  const file=t.state==='closed'&&fs.existsSync(path.join(DATA_DIR,'transcripts',`${t.id}.txt`))?fs.readFileSync(path.join(DATA_DIR,'transcripts',`${t.id}.txt`)):await transcript(i.guild,t);
  await tell(i,{content:'Ticket transcript.',files:[new AttachmentBuilder(file,{name:`ticket-${t.id}.txt`})]});
}
async function closeTicket(i,t,reason) {
  if (!staff(i,t)&&!(i.user.id===t.owner&&t.allowOwnerClose)) throw Error('Only ticket staff can close this ticket.');
  await i.deferReply({flags:EPH});
  await locked(`ticket:${t.id}`,async()=>{
    t=get('ticket',t.id); if (t.state!=='open') throw Error('Not open.');
    const file=await transcript(i.guild,t); fs.writeFileSync(path.join(DATA_DIR,'transcripts',`${t.id}.txt`),file,{mode:0o600});
    change('ticket',t.id,x=>{x.state='closing';x.closed=Date.now();x.closeReason=reason;x.closedBy=i.user.id;});
    await finishTicketClose(i.guild,get('ticket',t.id)); await tell(i,ticketText(t.messages?.closed||'Closed and transcript saved.',t));
  });
}
async function finishTicketClose(guild,t) {
  const c=await channelBy(guild,t.id); await c.permissionOverwrites.set(ticketPermissionOverwrites(guild,t,true),'Ticket closed');
  if (t.archive&&c.parentId!==t.archive) { const archive=await guild.channels.fetch(t.archive).catch(()=>null); if (archive?.type===ChannelType.GuildCategory) await c.setParent(t.archive,{lockPermissions:false}); }
  change('ticket',t.id,x=>{x.state='closed';}); t=get('ticket',t.id);
  await refreshTicket(guild,t).catch(e=>safeLog(e,'closed ticket message'));
  const filePath=path.join(DATA_DIR,'transcripts',`${t.id}.txt`);
  await logEvent(guild,'Ticket closed',`**Channel:** <#${t.id}>\n**Closed by:** <@${t.closedBy}>\n**Reason:** ${display(t.closeReason)}`,fs.existsSync(filePath)?[new AttachmentBuilder(filePath,{name:`ticket-${t.id}.txt`})]:[]);
}

// ------------------------- GIVEAWAYS -------------------------
function getGiveaway(i,id) { const g=get('giveaway',id); if (!g||g.guild!==i.guildId) throw Error('Not found.'); return g; }
function giveawayPayload(g) {
  const count=sql.count.get(g.id).n;
  const status={active:'🟢 **Open**',paused:'🟡 **Paused**',drawing:'🎲 **Drawing...**',ended:'🔴 **Ended**',cancelled:'⚫ **Cancelled**'}[g.state]||g.state;
  const conditions=[g.requiredRole?`> • <@&${g.requiredRole}>`:null,g.minAge?`> • Account Age: **${g.minAge} Days**`:null,g.minJoin?`> • Server Age: **${g.minJoin} Days**`:null,g.bonusRole?`> • Bonus Role: <@&${g.bonusRole}> (+${g.bonusAmount} entries)`:null].filter(Boolean);
  const embed = new EmbedBuilder().setTitle(`🎉 GIVEAWAY: ${g.prize}`).setColor(g.color || 0x29b866).setTimestamp(g.ends).setFooter({ text: `Hosted by ${g.hostTag}` });
  let desc = g.description ? `${g.description}\n\n` : ''; desc += `**Ends:** <t:${Math.floor(g.ends / 1000)}:R>\n`; embed.setDescription(desc);
  if (g.image_url) embed.setImage(g.image_url);
  embed.addFields({ name: '🏆 Winners', value: `\`${g.winnerCount}\``, inline: true }, { name: '👥 Entries', value: `\`${count}\``, inline: true }, { name: '📌 Status', value: status, inline: true });
  if (conditions.length) embed.addFields({ name: '📋 Requirements', value: conditions.join('\n'), inline: false });
  const result=g.rounds?.at(-1); if (result) embed.addFields({ name: '🏅 Selected Winners', value: result.winners.length?result.winners.map(x=>`<@${x}>`).join(', '):'*No eligible entrants.*' });
  const buttons = row(button(`giveaway-join:${g.id}`, '🎉 Join', ButtonStyle.Success, { disabled: g.state !== 'active' }), button(`giveaway-leave:${g.id}`, '🚫 Leave', ButtonStyle.Danger, { disabled: g.state !== 'active' }));
  return { embeds: [embed], components: [buttons], allowedMentions: NO_MENTIONS };
}
async function refreshGiveaway(guild,g) { const c=await sendChannel(guild,g.channel); const m=await c.messages.fetch(g.id); await m.edit(giveawayPayload(g)); }
function eligible(g,m) { if (!m||m.user.bot) return false; if (g.requiredRole&&!m.roles.cache.has(g.requiredRole)) return false; if (g.minAge&&Date.now()-m.user.createdTimestamp<g.minAge*86400000) return false; if (g.minJoin&&(!m.joinedTimestamp||Date.now()-m.joinedTimestamp<g.minJoin*86400000)) return false; return true; }
function sample(pool,count,random=crypto.randomInt) { const a=[...pool],out=[]; for (let n=0;n<count&&a.length;n++) {const idx=random(a.length);out.push(a[idx]);a[idx]=a.at(-1);a.pop();} return out; }
async function publishGiveaway(i,d) {
  requirePerm(i); if (!d.duration) throw Error('Select a duration first.'); await i.deferReply({flags:EPH});
  await locked(`publish:${d.id}`,async()=>{
    const c=await sendChannel(i.guild,d.channel);
    const g={id:'pending',guild:i.guildId,channel:c.id,host:i.user.id,hostTag:i.user.tag,prize:d.prize,description:d.description,winnerCount:d.winnerCount,requiredRole:d.requiredRole,minAge:d.minAge,minJoin:d.minJoin, bonusRole:d.bonusRole, bonusAmount:d.bonusAmount, color: d.color, image_url: d.image_url, created:Date.now(),ends:Date.now()+d.duration,state:'active',rounds:[]};
    const m=await c.send({ embeds: [new EmbedBuilder().setTitle(`🎉 ${g.prize}`).setDescription('Preparing giveaway...').setColor(d.color)] });
    g.id=m.id; put('giveaway',g.id,g); await m.edit(giveawayPayload(g));
    await tell(i,`Giveaway published: ${m.url}\nID: \`${g.id}\``);
  });
}
async function publishDrop(i,d) {
  requirePerm(i); await i.deferReply({flags:EPH});
  await locked(`drop:${d.id}`,async()=>{
    const c=await sendChannel(i.guild,d.channel);
    const g={id:'pending',guild:i.guildId,channel:c.id,host:i.user.id,hostTag:i.user.tag,prize:d.prize,description:'First to click wins!',winnerCount:1,requiredRole:d.requiredRole,minAge:0,minJoin:0, color: 0xFEE75C, created:Date.now(),ends:Date.now()+86400000,state:'active',rounds:[],isDrop:true};
    const embed = new EmbedBuilder().setTitle(`🎁 DROP: ${g.prize}`).setDescription('**First to click the button wins instantly!**').setColor(0xFEE75C);
    const m=await c.send({ embeds: [embed], components: [row(button(`giveaway-drop:${g.id}`, '🎁 CLAIM', 3))] });
    g.id=m.id; put('giveaway',g.id,g); await tell(i,`Drop published: ${m.url}\nID: \`${g.id}\``);
  });
}
async function drawGiveaway(guild,id,reroll=false) {
  return locked(`giveaway:${id}`,async()=>{
    let g=get('giveaway',id); if (!g) throw Error('Not found.');
    if (g.state!=='drawing'&&(reroll?g.state!=='ended':g.state!=='active')) throw Error(reroll?'Only ended giveaways can be rerolled.':'Not open.');
    if(g.state!=='drawing')g=change('giveaway',id,x=>{x.state='drawing';x.drawMode=reroll?'reroll':'end';});
    const excluded=new Set((g.rounds||[]).flatMap(r=>r.winners));
    const entrants=sql.entries.all(id).map(e=>e.user).filter(x=>!excluded.has(x));
    const members=await guild.members.fetch(); const pool=entrants.filter(x=>eligible(g,members.get(x)));
    const winners=sample(pool,g.winnerCount);
    const result={id:uid(),at:Date.now(),winners,eligibleCount:pool.length,notified:[],failedDM:[],dmAttempted:[],announcement:null};
    g=change('giveaway',id,x=>{x.state='ended';x.rounds.push(result);x.ended=Date.now();delete x.lastError;delete x.drawMode;});
    await deliverGiveaway(guild,g); return get('giveaway',id);
  });
}
async function deliverGiveaway(guild,g,retryDM=false) {
  const result=g.rounds?.at(-1); if (!result) return; let r=result;
  if (!r.announcement) {
    try {
      const c=await sendChannel(guild,g.channel); const marker=`Round ${r.id}`; const recent=await c.messages.fetch({limit:100});
      let msg=recent.find(m=>m.author.id===client.user.id&&m.embeds.some(e=>e.footer?.text===marker));
      if (!msg) {
        const embed = new EmbedBuilder().setTitle(`🎉 Giveaway Ended: ${g.prize}`).setColor(g.color || 0x29b866).setDescription(`${r.winners.length?`**Winners:** ${r.winners.map(x=>`<@${x}>`).join(', ')}`:'No eligible entrants.'}\n**Eligible entrants:** ${r.eligibleCount}\n**Giveaway ID:** ${g.id}`).setFooter({ text: marker }).setTimestamp();
        msg = await c.send({ embeds: [embed], allowedMentions: { parse: [], users: r.winners, repliedUser: false } });
      }
      change('giveaway',g.id,x=>{x.rounds.find(a=>a.id===r.id).announcement=msg.id;});
    } catch(e) {safeLog(e,'giveaway result');}
  }
  for (const userId of r.winners) {
    const latest=get('giveaway',g.id).rounds.find(a=>a.id===r.id);
    if (latest.notified.includes(userId)||(!retryDM&&latest.dmAttempted?.includes(userId))) continue;
    change('giveaway',g.id,x=>{const a=x.rounds.find(a=>a.id===r.id);a.dmAttempted=[...new Set([...(a.dmAttempted||[]),userId])];});
    try {
      const user=await client.users.fetch(userId);
      const dmEmbed = new EmbedBuilder().setTitle('🎉 Congratulations! You Won!').setColor(g.color || 0x29b866).setDescription(`You won **${clean(g.prize,500)}** in **${display(guild.name)}**.\n\n[Click Here to view the Giveaway](https://discord.com/channels/${g.guild}/${g.channel}/${g.id})\n\nServer staff will arrange prize delivery.`).setTimestamp();
      await user.send({ embeds: [dmEmbed], allowedMentions: NO_MENTIONS }); change('giveaway',g.id,x=>{const a=x.rounds.find(a=>a.id===r.id);a.notified.push(userId);a.failedDM=a.failedDM.filter(u=>u!==userId);});
    } catch(e) { change('giveaway',g.id,x=>{const a=x.rounds.find(a=>a.id===r.id);if(!a.failedDM.includes(userId))a.failedDM.push(userId);}); safeLog(e,'winner DM'); }
  }
  await refreshGiveaway(guild,get('giveaway',g.id)).catch(e=>safeLog(e,'giveaway card refresh'));
}
async function joinGiveaway(i,id) {
  await i.deferReply({flags:EPH});
  await locked(`entry:${id}:${i.user.id}`,async()=>{
    let g=getGiveaway(i,id); if (g.state!=='active'||g.ends<=Date.now()) throw Error('No longer accepting entries.');
    const alreadyEntered=!!sql.hasEntry.get(id,i.user.id); if(alreadyEntered) throw Error('Already joined!');
    const member=await i.guild.members.fetch(i.user.id); if (!eligible(g,member)) throw Error('Requirements not met.');
    g=getGiveaway(i,id); if (g.state!=='active'||g.ends<=Date.now()) throw Error('Ended.');
    let entriesToAdd = 1; if (g.bonusRole && member.roles.cache.has(g.bonusRole)) { entriesToAdd += (g.bonusAmount || 1); }
    const tx = db.transaction(() => { for(let e=0; e<entriesToAdd; e++){ sql.join.run(id, `${i.user.id}_${e}`, Date.now()); } sql.join.run(id, i.user.id, Date.now()); }); tx();
    await tell(i,`🎉 **Success!** Your entry has been recorded. (Bonus: +${entriesToAdd - 1} extra chances)`); queueGiveawayRefresh(i.guild,id);
  });
}
async function leaveGiveaway(i,id) {
  await i.deferReply({flags:EPH});
  await locked(`entry:${id}:${i.user.id}`,async()=>{
    let g=getGiveaway(i,id); if (g.state!=='active'||g.ends<=Date.now()) throw Error('Not accepting entries.');
    const alreadyEntered=!!sql.hasEntry.get(id,i.user.id); if(!alreadyEntered) throw Error('Not in this giveaway.');
    db.prepare('DELETE FROM entries WHERE giveaway=? AND user LIKE ?').run(id, `${i.user.id}%`);
    await tell(i,'🚫 Your entry has been removed.'); queueGiveawayRefresh(i.guild,id);
  });
}
async function claimDrop(i,id) {
  await i.deferReply({flags:EPH});
  await locked(`drop:${id}`,async()=>{
    let g=getGiveaway(i,id); if (!g.isDrop || g.state!=='active') throw Error('Ended or invalid.');
    const member=await i.guild.members.fetch(i.user.id); if (!eligible(g,member)) throw Error('Requirements not met.');
    g = change('giveaway', id, x => { x.state='ended'; x.winnerCount=1; x.rounds.push({id:uid(),at:Date.now(),winners:[i.user.id],eligibleCount:1,notified:[i.user.id],failedDM:[],dmAttempted:[i.user.id],announcement:null}); x.ended=Date.now(); });
    const c = await sendChannel(i.guild, g.channel); const m = await c.messages.fetch(g.id);
    await m.edit({ embeds: [new EmbedBuilder().setTitle(`🎁 DROP: ${g.prize}`).setDescription(`**Winner:** <@${i.user.id}>`).setColor(0x57F287)], components: [row(button(`giveaway-drop-ended`, 'Claimed', 2, {disabled:true}))] });
    await tell(i, `🎉 **You claimed the drop!** You won **${g.prize}**.`); await logEvent(i.guild, 'Drop Claimed', `**Prize:** ${g.prize}\n**Winner:** <@${i.user.id}>`);
  });
}
const refreshTimers=new Map();
function queueGiveawayRefresh(guild,id) { if(refreshTimers.has(id))return; refreshTimers.set(id,setTimeout(async()=>{ refreshTimers.delete(id); const g=get('giveaway',id);if(g)await refreshGiveaway(guild,g).catch(e=>safeLog(e,'entry count refresh')); },2500)); }

// -------------------------- ROLE PANELS --------------------------
function assertRoleSafe(guild,role) {
  if (!role||role.id===guild.id||role.managed) throw Error('Choose a normal, assignable role.');
  if (DANGEROUS.some(p=>role.permissions.has(p))) throw Error('Admin/Mod roles cannot be used.');
  if (protectedRoles(guild.id).has(role.id)||cfg(guild.id).logRole===role.id) throw Error('Staff roles cannot be distributed.');
  if (role.position>=guild.members.me.roles.highest.position) throw Error('Move the bot role above the panel role.');
}
function rolePanelPayload(p) {
  const rows=[]; for(let n=0;n<p.mappings.length;n+=5) rows.push(row(...p.mappings.slice(n,n+5).map((m,j)=>button(`role:${p.id}:${n+j}:${p.revision||'0'}`,m.label,2,{emoji:m.emoji}))));
  return card(p.guild,`## ${p.title}\n${p.text}`,rows);
}
async function roleClick(i,id,index,revision) {
  await i.deferReply({flags:EPH});
  await locked(`role:${i.guildId}:${i.user.id}`,async()=>{
    const p=get('rolepanel',id); if(!p||p.guild!==i.guildId||p.message!==i.message.id||p.channel!==i.channelId)throw Error('Panel inactive.');
    if((p.revision||'0')!==revision)throw Error('Panel updated. Refresh.');
    const mapping=p.mappings[Number(index)];if(!mapping)throw Error('Option not available.');
    const role=await i.guild.roles.fetch(mapping.role);assertRoleSafe(i.guild,role);
    const member=await i.guild.members.fetch(i.user.id);
    if(member.roles.cache.has(role.id)) {
      const until=sql.roleCooldown.get(i.user.id,role.id)?.until||0; if(until>Date.now())throw Error(`Wait ${ts(until)}.`);
      await member.roles.remove(role,'Self-service role panel'); await tell(i,`Removed <@&${role.id}>.`);
    } else {
      sql.coolSet.run(id,i.user.id,role.id,Date.now()+20000);
      await member.roles.add(role,'Self-service role panel'); await tell(i,`Added <@&${role.id}>. Remove ${ts(Date.now()+20000)}.`);
    }
  });
}

// -------------------------- MODERATION --------------------------
const MOD_PERMS={warn:P.ModerateMembers,warnings:P.ModerateMembers,clearwarnings:P.ModerateMembers,kick:P.KickMembers,ban:P.BanMembers,unban:P.BanMembers,timeout:P.ModerateMembers,untimeout:P.ModerateMembers,purge:P.ManageMessages,slowmode:P.ManageChannels,lock:P.ManageChannels,unlock:P.ManageChannels,case:P.ModerateMembers,nuke:P.ManageChannels,role:P.ManageRoles};
async function targetMember(i,userId,action) {
  const member=await i.guild.members.fetch(userId).catch(()=>null); if(!member)throw Error('User not a member.');
  if(userId===i.user.id||userId===client.user.id||userId===i.guild.ownerId)throw Error('Cannot target self, bot, or owner.');
  const actor=await i.guild.members.fetch(i.user.id);
  if(i.user.id!==i.guild.ownerId&&actor.roles.highest.comparePositionTo(member.roles.highest)<=0) throw Error('Your role must be higher.');
  if(i.guild.members.me.roles.highest.comparePositionTo(member.roles.highest)<=0) throw Error('Bot role must be higher.');
  if(['timeout','untimeout'].includes(action)&&!member.moderatable)throw Error('Cannot timeout.');
  if(action==='kick'&&!member.kickable)throw Error('Cannot kick.');
  if(action==='ban'&&!member.bannable)throw Error('Cannot ban.');
  return member;
}
async function runMod(i,action,data) {
  requirePerm(i,MOD_PERMS[action]);botPerm(i.channel,MOD_PERMS[action]);
  const reason=data.reason||'No reason.',apiReason=clean(`${i.user.tag} (${i.user.id}): ${reason}`,500);
  let target=data.user||i.channelId;
  if(['warn','clearwarnings','kick','ban','timeout','untimeout'].includes(action)) {
    const member=await targetMember(i,data.user,action);
    if(action==='warn') { const key=`${i.guildId}:${member.id}`,w=get('warnings',key)||{guild:i.guildId,user:member.id,items:[]}; w.items.push({id:uid(),at:Date.now(),actor:i.user.id,reason});w.items=w.items.slice(-100);put('warnings',key,w); await member.send({content:`Warned in **${display(i.guild.name)}**.\nReason: ${reason}`}).catch(()=>null); }
    else if(action==='clearwarnings')sql.del.run('warnings',`${i.guildId}:${member.id}`);
    else if(action==='kick')await member.kick(apiReason);
    else if(action==='ban')await member.ban({deleteMessageSeconds:(data.deleteDays||0)*86400,reason:apiReason});
    else if(action==='timeout')await member.timeout(data.duration,apiReason);
    else if(action==='untimeout')await member.timeout(null,apiReason);
  } else if(action==='unban') { if(!snowflake(data.user))throw Error('Invalid ID.'); await i.guild.bans.remove(data.user,apiReason); }
  else if(action==='purge') { if(i.channel.type!==ChannelType.GuildText)throw Error('Text channel only.'); botPerm(i.channel,P.ReadMessageHistory); const messages=await i.channel.messages.fetch({limit:data.amount}); const recent=messages.filter(m=>Date.now()-m.createdTimestamp<14*86400000-10000); const deleted=recent.size?await i.channel.bulkDelete(recent,true):{size:0}; data.deleted=deleted.size; }
  else if(action==='slowmode')await i.channel.setRateLimitPerUser(data.seconds,apiReason);
  else if(action==='nuke') { const pos = i.channel.position; const clone = await i.channel.clone({reason:apiReason}); await i.channel.delete(apiReason); await clone.setPosition(pos); return; }
  else if(action==='role') { const member = await targetMember(i, data.user, 'role'); if (data.modAction === 'add') await member.roles.add(data.role, apiReason); else await member.roles.remove(data.role, apiReason); }
  else if(action==='lock'||action==='unlock') {
    botPerm(i.channel,P.ManageRoles); const key=`${i.guildId}:${i.channelId}`;
    if(action==='lock') { if(get('channel-lock',key))throw Error('Already locked.'); const overwrite=i.channel.permissionOverwrites.cache.get(i.guildId); const previous=overwrite?.allow.has(P.SendMessages)?true:overwrite?.deny.has(P.SendMessages)?false:null; put('channel-lock',key,{guild:i.guildId,channel:i.channelId,previous,at:Date.now()}); try {await i.channel.permissionOverwrites.edit(i.guildId,{SendMessages:false},{reason:apiReason});} catch(e){sql.del.run('channel-lock',key);throw e;} }
    else { const saved=get('channel-lock',key);if(!saved)throw Error('No lock found.'); await i.channel.permissionOverwrites.edit(i.guildId,{SendMessages:saved.previous},{reason:apiReason}); sql.del.run('channel-lock',key); }
  }
  const id = uid(); const c = {id,guild:i.guildId,action,target,reason,actor:i.user.id,at:Date.now(),...(action==='purge'?{deleted:data.deleted}:{})}; put('case',id,c);
  const embed = new EmbedBuilder().setTitle(`🛡️ Moderation: ${action.toUpperCase()}`).setColor(0xED4245).setDescription(`${action==='purge'?`**${data.deleted}** messages deleted.`:'Action completed.'}\n**Case ID:** \`${c.id}\``);
  await tell(i, { embeds: [embed] }); await logEvent(i.guild,'Moderation Action',`**Case:** \`${c.id}\`\n**Action:** ${c.action}\n**Target:** ${c.target}\n**Moderator:** <@${i.user.id}>\n**Reason:** ${display(c.reason)}`);
}

// -------------------------- WIZARDS & ROUTER --------------------------
async function slash(i) {
  const name=i.commandName;
  if(name==='help'||name==='about') {
    if (name === 'about') {
      const embed = new EmbedBuilder().setTitle('✨ LD GIVEAWAYS | Premium').setDescription('This bot was developed by **Dream** for **LD Giveaways**. It is a multi-purpose bot designed to elevate your server.').setColor(cfg(i.guildId).color).setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 })).addFields({ name: '👑 Owner', value: '<@1026324207098925147> (Unitey)', inline: true },{ name: '💻 Developer', value: '<@696735778356854913> (Dream)', inline: true },{ name: '🚀 Version', value: `v${VERSION}`, inline: true }).setFooter({ text: 'Thank you for choosing LD GIVEAWAYS.' }).setTimestamp();
      return i.reply({ embeds: [embed] });
    }
    return i.reply(helpPayload(i.guildId));
  }
  
  if(name==='ticket') {
    const sub = i.options.getSubcommand();
    if (sub === 'setup') {
      requirePerm(i);
      saveDraft(i.user.id, 'ticket_setup', { categories: [], step: 'cat' });
      return i.showModal(modal(`tsetup_cat:0`, 'Create Ticket Category', [{id:'name',label:'Category Name (e.g. Support)',short:true,max:50},{id:'desc',label:'Description',short:true,max:100},{id:'welcome',label:'Welcome Message inside ticket',max:1000},{id:'questions',label:'Questions (JSON)',max:1500,value:'[{"label":"How can we help?"}]'}]));
    }
    if (sub === 'close') return i.showModal(modal(`ticket-close-submit:${i.channelId}`, 'Close Ticket', [{id:'reason',label:'Reason for closing',max:500}]));
    let t=currentTicket(i);
    if(sub==='transcript')return ticketTranscriptReply(i,t);
    ticketStaff(i,t);
    await i.deferReply({flags:EPH});
    if(sub==='add'||sub==='remove') {
      const user=i.options.getUser('user',true); const member=await i.guild.members.fetch(user.id);
      if(sub==='add') { await i.channel.permissionOverwrites.edit(user.id,{ViewChannel:true,SendMessages:true}); change('ticket',t.id,x=>{if(!x.participants.includes(user.id))x.participants.push(user.id);}); }
      else { await i.channel.permissionOverwrites.delete(user.id); change('ticket',t.id,x=>{x.participants=x.participants.filter(x=>x!==user.id);}); }
    }
    return tell(i,'Ticket updated.');
  }

  if(name==='rolepanel') {
    const sub = i.options.getSubcommand();
    if (sub === 'setup') {
      requirePerm(i);
      saveDraft(i.user.id, 'rolepanel_setup', { mappings: [], step: 'role' });
      const menu = new RoleSelectMenuBuilder().setCustomId('rp_role_select').setPlaceholder('Select a role to add to the panel').setMinValues(1).setMaxValues(1);
      return tell(i, { content: 'Step 1: Select a role for your panel.', components: [new ActionRowBuilder().addComponents(menu)] });
    }
    if (sub === 'remove') {
      const p=get('rolepanel',i.options.getString('message_id',true)); if(!p||p.guild!==i.guildId)throw Error('Not found.');
      const c=await sendChannel(i.guild,p.channel),m=await c.messages.fetch(p.message); await m.edit(card(i.guildId,`## ${p.title}\n${p.text}`)); sql.del.run('rolepanel',p.id);
      return tell(i,'Role buttons removed.');
    }
  }

  if(name==='giveaway') {
    const action=i.options.getSubcommand();
    if(action==='create') {
      requirePerm(i); const role=i.options.getRole('required_role'); const bonusRole=i.options.getRole('bonus_role'); const bonusAmount=i.options.getInteger('bonus_amount');
      saveDraft(i.user.id, 'giveaway', { channel:i.options.getChannel('channel',true).id,requiredRole:role?.id||null,minAge:i.options.getInteger('min_age_days')||0,minJoin:i.options.getInteger('min_join_days')||0,bonusRole:bonusRole?.id||null, bonusAmount:bonusAmount||1, color: cfg(i.guildId).color });
      return i.showModal(modal(`giveaway-details:0`,'Create giveaway',[{id:'prize',label:'Prize',short:true,max:200},{id:'description',label:'Description',max:1500,required:false},{id:'winners',label:'Number of winners',short:true,max:2,value:'1'},{id:'duration',label:'Duration (e.g. 1d 2h)',short:true,max:40,value:'1d'},{id:'image',label:'Image URL (Optional)',short:true,max:2000,required:false}]));
    }
    if(action==='drop') { requirePerm(i); const role=i.options.getRole('required_role'); const id = draft(i, 'drop', {channel:i.options.getChannel('channel',true).id,requiredRole:role?.id||null,prize:i.options.getString('prize',true)}); return publishDrop(i, id); }
    const g=getGiveaway(i,i.options.getString('id',true));
    if(action==='list') { const list=all('giveaway').filter(g=>g.guild===i.guildId).sort((a,b)=>b.created-a.created).slice(0,15); return tell(i,card(i.guildId,list.map(g=>`**${display(g.prize)}**\nID: \`${g.id}\` | ${g.state} | ${ts(g.ends)}`).join('\n\n').slice(0,3900)||'None.',[],true)); }
    if(action==='edit') { requirePerm(i); const id = draft(i,'giveaway-edit',{giveaway:g.id}); return i.showModal(modal(`giveaway-edit:${id}`,'Edit',[{id:'prize',label:'Prize',short:true,max:200,value:g.prize},{id:'description',label:'Description',max:1500,required:false,value:g.description},{id:'winners',label:'Winners',short:true,max:2,value:String(g.winnerCount)},{id:'duration',label:'New duration (optional)',short:true,max:40,required:false}])); }
    if(action==='info') { const r=g.rounds.at(-1); return tell(i,card(i.guildId,`**Prize:** ${display(g.prize)}\n**ID:** \`${g.id}\`\n**Status:** ${g.state}\n**Entries:** ${sql.count.get(g.id).n}\n**End:** ${ts(g.ends,'F')}${r?`\n**Winners:** ${r.winners.length?r.winners.map(x=>`<@${x}>`).join(', '):'None'}`:''}`,[],true)); }
    requirePerm(i);
    if(action==='pause') { await locked(`giveaway:${g.id}`, async () => { if(g.state !== 'active') throw Error('Not active.'); g = change('giveaway', g.id, x => { x.state = 'paused'; x.pausedAt = Date.now(); x.remainingTime = x.ends - Date.now(); }); await refreshGiveaway(i.guild, g); }); return tell(i, 'Paused.'); }
    if(action==='resume') { await locked(`giveaway:${g.id}`, async () => { if(g.state !== 'paused') throw Error('Not paused.'); g = change('giveaway', g.id, x => { x.state = 'active'; x.ends = Date.now() + x.remainingTime; delete x.pausedAt; delete x.remainingTime; }); await refreshGiveaway(i.guild, g); }); return tell(i, 'Resumed.'); }
    if(action==='retry') { await i.deferReply({flags:EPH}); await locked(`giveaway:${g.id}`,()=>deliverGiveaway(i.guild,g,true)); return tell(i,'Retried.'); }
    return i.reply(card(i.guildId, `Confirm **${action}** for **${g.prize}**?`, [row(button(`confirm:giveaway_${action}_${g.id}`, 'Confirm', 4), button('dismiss', 'Cancel'))], true));
  }

  if(name==='config') { requirePerm(i); await i.deferReply({flags:EPH}); const channel=i.options.getChannel('log_channel'),color=i.options.getString('color'),days=i.options.getInteger('retention_days'); if(channel) await privateLogChannel(channel); if(color&&!/^#[0-9a-f]{6}$/i.test(color))throw Error('Hex only.'); const c=updateCfg(i.guildId,c=>{if(channel)c.logChannel=channel.id;if(color)c.color=parseInt(color.slice(1),16);if(days)c.retentionDays=days;}); return tell(i,'Saved.'); }

  if(name==='mod') { 
    const action=i.options.getSubcommand(); requirePerm(i,MOD_PERMS[action]); 
    if(action==='case'){const c=get('case',i.options.getString('case_id'));return tell(i,card(i.guildId,`Case \`${c.id}\` by <@${c.actor}>\nTarget: ${c.target}\nReason: ${c.reason}`,[],true));} 
    if(action==='warnings'){const u=i.options.getUser('user'),w=get('warnings',`${i.guildId}:${u.id}`);return tell(i,card(i.guildId,`Warnings: ${w?.items.length||0}`,[],true));} 
    const data={user:i.options.getUser('user')?.id,reason:i.options.getString('reason'),amount:i.options.getInteger('amount'),seconds:i.options.getInteger('seconds'),deleteDays:i.options.getInteger('delete_days'),role:i.options.getRole('role')?.id,modAction:i.options.getString('action')}; 
    if(action==='timeout')data.duration=duration(i.options.getString('duration')); 
    if(['ban','kick','purge','nuke'].includes(action)) return i.reply(card(i.guildId,`Confirm **${action}**?`,[row(button(`confirm:mod_${action}_${data.user||i.channelId}`, 'Confirm', 4), button('dismiss', 'Cancel'))],true)); 
    await i.deferReply({flags:EPH}); await runMod(i,action,data); 
  }

  if(name==='status') { requirePerm(i); const state={text:i.options.getString('text'),activity:i.options.getString('activity')||'Playing',presence:i.options.getString('presence')||'online'}; put('presence','bot',state); client.user.setPresence({ status: state.presence, activities: [{ name: state.text, type: ActivityType[state.activity] ?? ActivityType.Playing }] }); return tell(i,'Updated.'); }
  
  if(name==='userinfo') { await i.deferReply(); const user = i.options.getUser('user') || i.user; const member = await i.guild.members.fetch(user.id).catch(() => null); const embed = new EmbedBuilder().setTitle(`👤 User Info: ${user.tag}`).setColor(cfg(i.guildId).color).setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 })).addFields({ name: 'ID', value: user.id, inline: true }, { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true }, { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false }); if (member) { embed.addFields({ name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false }, { name: 'Roles', value: member.roles.cache.filter(r => r.id !== i.guildId).map(r => `<@&${r.id}>`).join(', ').slice(0, 1024) || 'None' }); } return tell(i, { embeds: [embed] }); }
  if(name==='avatar') { const user = i.options.getUser('user') || i.user; const embed = new EmbedBuilder().setTitle(`🖼️ Avatar: ${user.tag}`).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(cfg(i.guildId).color); return i.reply({ embeds: [embed] }); }
  if(name==='serverinfo') { await i.deferReply(); const embed = new EmbedBuilder().setTitle(`🏰 Server Info: ${i.guild.name}`).setColor(cfg(i.guildId).color).setThumbnail(i.guild.iconURL({ dynamic: true, size: 256 })).addFields({ name: 'Owner', value: `<@${i.guild.ownerId}>`, inline: true }, { name: 'Members', value: `${i.guild.memberCount}`, inline: true }, { name: 'Created', value: `<t:${Math.floor(i.guild.createdTimestamp / 1000)}:F>`, inline: false }); return tell(i, { embeds: [embed] }); }
  if(name==='botinfo') { const uptime = Math.floor(client.uptime / 1000); const days = Math.floor(uptime / 86400); const hours = Math.floor((uptime % 86400) / 3600); const minutes = Math.floor((uptime % 3600) / 60); const embed = new EmbedBuilder().setTitle('🤖 Bot Information').setColor(cfg(i.guildId).color).addFields({ name: 'Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true }, { name: 'Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true }, { name: 'RAM Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }, { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true }, { name: 'Version', value: `v${VERSION}`, inline: true }); return i.reply({ embeds: [embed] }); }
  if(name==='embed') { requirePerm(i); await i.deferReply({flags:EPH}); const ch = i.options.getChannel('channel') || i.channel; const embed = new EmbedBuilder().setDescription(i.options.getString('description', true)).setColor(cfg(i.guildId).color); if(i.options.getString('title')) embed.setTitle(i.options.getString('title')); if(i.options.getString('footer')) embed.setFooter({ text: i.options.getString('footer') }); if(i.options.getString('image_url')) embed.setImage(i.options.getString('image_url')); const c = await sendChannel(i.guild, ch.id); const m = await c.send({ embeds: [embed] }); const selectMenu = new StringSelectMenuBuilder().setCustomId(`edit-embed:${m.id}`).setPlaceholder('Change Embed Color').addOptions(Object.entries(PRESET_COLORS).map(([k,v])=>({label:v.name, value:k.toString()})),{label: 'Custom Hex', value: 'custom'}); await tell(i, { content: `Embed sent to ${ch}. You can change its color below:`, components: [new ActionRowBuilder().addComponents(selectMenu)] }); return; }
  if(['announcement','say','dm'].includes(name)) { requirePerm(i); await i.deferReply({flags:EPH}); const rawText=i.options.getString('text',true); const markdown = i.options.getBoolean('markdown') === true; const asEmbed = i.options.getBoolean('embed') === true; const finalText = markdown ? autoMarkdown(rawText) : rawText; const user=i.options.getUser('user'); if(user?.bot)throw Error('Choose a human server member.'); if(user)await i.guild.members.fetch(user.id); const channel=i.options.getChannel('channel')||i.channel; if(!user)await sendChannel(i.guild,channel.id); const id = draft(i, 'message-preview', {kind:name, text:finalText, user:user?.id, channel:channel.id, ping:i.options.getBoolean('ping')===true, asEmbed, color: cfg(i.guildId).color}); return messagePreview(i, id); }
  if(name==='stats') { const giveaways = all('giveaway').filter(g=>g.guild===i.guildId); const tickets = all('ticket').filter(t=>t.guild===i.guildId); const embed = new EmbedBuilder().setTitle('📊 Bot Statistics').setColor(cfg(i.guildId).color).addFields({ name: 'Giveaways', value: `Total: **${giveaways.length}**\nActive: **${giveaways.filter(g=>g.state==='active').length}**`, inline: true }, { name: 'Tickets', value: `Total: **${tickets.length}**\nOpen: **${tickets.filter(t=>t.state==='open').length}**`, inline: true }, { name: 'Version', value: `v${VERSION}`, inline: true }); return tell(i, { embeds: [embed] }); }
  if(name==='setup'){requirePerm(i);return setupPicker(i);}
}

function messagePreview(i, id) {
  const d = getDraft(i.user.id, 'message-preview');
  const payload = { content: `**Preview:**\nTarget: ${d.user ? `<@${d.user}>` : `<#${d.channel}>`}\nFormat: ${d.asEmbed ? 'Embed' : 'Plain Text'}`, components: [row(button(`message-send:${uid()}`, 'Send Message', 3), button(`dismiss`, 'Cancel'))] };
  if (d.asEmbed) { const embed = new EmbedBuilder().setDescription(d.text).setColor(d.color); payload.embeds = [embed]; const selectMenu = new StringSelectMenuBuilder().setCustomId(`message-color:${uid()}`).setPlaceholder('Change Color').addOptions(Object.entries(PRESET_COLORS).map(([k,v])=>({label:v.name, value:k.toString()})),{label: 'Custom Hex', value: 'custom'}); payload.components.unshift(new ActionRowBuilder().addComponents(selectMenu)); } else { payload.content = `**Preview:**\nTarget: ${d.user ? `<@${d.user}>` : `<#${d.channel}>`}\n\n${d.text}`; }
  return i.editReply({ ...payload, flags: EPH });
}

// -------------------------- INTERACTIONS --------------------------
async function component(i) {
  const [kind, type, id] = i.customId.split(':');
  if(kind==='dismiss') return i.update({content:'Cancelled.', embeds:[], components:[]});
  
  // Ticket Setup Wizard
  if(kind==='tsetup_cat_add' || kind==='tsetup_cat_finish') {
    const draft = getDraft(i.user.id, 'ticket_setup');
    if(kind==='tsetup_cat_finish') {
      if(draft.categories.length === 0) throw Error('Add at least 1 category.');
      draft.step = 'role'; saveDraft(i.user.id, 'ticket_setup', draft);
      const menu = new RoleSelectMenuBuilder().setCustomId('tsetup_role').setPlaceholder('Select Support Role').setMinValues(1).setMaxValues(1);
      return i.update({content:'Step 2: Select the Support Role for tickets.', components:[new ActionRowBuilder().addComponents(menu)], embeds:[]});
    }
    return i.showModal(modal(`tsetup_cat:0`, 'Create Ticket Category', [{id:'name',label:'Category Name',short:true,max:50},{id:'desc',label:'Description',short:true,max:100},{id:'welcome',label:'Welcome Message',max:1000},{id:'questions',label:'Questions (JSON)',max:1500,value:'[{"label":"How can we help?"}]'}]));
  }
  if(kind==='message-send') {
    const d=getDraft(i.user.id,'message-preview'); delDraft(i.user.id,'message-preview'); await i.deferReply({flags:EPH}); requirePerm(i); const x=d;
    if(x.kind==='dm') { const u=await client.users.fetch(x.user); if (x.asEmbed) await u.send({embeds:[new EmbedBuilder().setDescription(x.text).setColor(x.color)]}); else await u.send(x.text); await tell(i,'DM sent.'); } else { const c=await sendChannel(i.guild,x.channel); if (x.asEmbed) await c.send({embeds:[new EmbedBuilder().setDescription(x.text).setColor(x.color)]}); else await c.send(x.text); await tell(i,'Sent.'); }
    return;
  }
  if(kind==='confirm') {
    const action=type; const targetId=id; requirePerm(i); await i.deferReply({flags:EPH});
    if(action.startsWith('giveaway_')) { const act=action.replace('giveaway_',''); let g=getGiveaway(i,targetId); if(act==='cancel'){ g=change('giveaway',g.id,x=>{x.state='cancelled';}); await refreshGiveaway(i.guild,g); } else { await drawGiveaway(i.guild,g.id,act==='reroll'); } return tell(i,`Giveaway updated.`); }
    if(action.startsWith('mod_')) { const act=action.replace('mod_',''); await runMod(i,act,{user:targetId!==i.channelId?targetId:null,reason:'Confirmed via button',amount:10}); return; }
  }
  if(kind==='ticket-open') { const p=get('ticketpanel',i.message.id); return openTicket(i,i.values[0]); }
  if(kind==='ticket-close') { const t=currentTicket(i); return i.showModal(modal(`ticket-close-submit:${t.id}`, 'Close', [{id:'reason',label:'Reason',max:500}])); }
  if(kind==='ticket-claim') { const t=currentTicket(i); change('ticket',t.id,x=>{x.claimed=i.user.id;}); await refreshTicket(i.guild,t); return i.reply({content:'Claimed.',flags:EPH}); }
  if(kind==='ticket-transcript') return ticketTranscriptReply(i,currentTicket(i));
  
  // Rolepanel Wizard
  if(kind==='rp_add_more' || kind==='rp_finish') {
    const d = getDraft(i.user.id, 'rolepanel_setup');
    if(kind==='rp_finish') {
      if(d.mappings.length === 0) throw Error('Add at least 1 role.');
      d.step = 'panel'; saveDraft(i.user.id, 'rolepanel_setup', d);
      return i.showModal(modal(`rp_panel_info:0`, 'Panel Info', [{id:'title',label:'Panel Title',short:true,max:100,value:'Role Panel'},{id:'text',label:'Panel Text',max:1000,value:'Click to get roles'}]));
    }
    const menu = new RoleSelectMenuBuilder().setCustomId('rp_role_select').setPlaceholder('Select a role').setMinValues(1).setMaxValues(1);
    return i.update({content:'Select a role:', components:[new ActionRowBuilder().addComponents(menu)], embeds:[]});
  }

  if(kind==='giveaway-join')return joinGiveaway(i,type);
  if(kind==='giveaway-leave')return leaveGiveaway(i,type);
  if(kind==='giveaway-drop')return claimDrop(i,type);
  if(kind==='giveaway-publish') {
    const d=getDraft(i.user.id,'giveaway'); delDraft(i.user.id,'giveaway'); return publishGiveaway(i,d);
  }
  if(kind==='giveaway-color-preview') {
    const d=getDraft(i.user.id,'giveaway');
    if(i.values[0]==='custom') return i.showModal(modal(`giveaway-custom-hex:0`, 'Color', [{id:'hex',label:'Hex Code',short:true,max:7}]));
    d.color=parseColor(i.values[0]); saveDraft(i.user.id,'giveaway',d);
    const embed = new EmbedBuilder().setTitle(`🎉 GIVEAWAY: ${d.prize}`).setColor(d.color).setTimestamp(Date.now() + d.duration).setDescription(`${d.description || ''}\n\n**Ends:** <t:${Math.floor((Date.now() + d.duration)/1000)}:R>`).addFields({name:'Winners',value:`\`${d.winnerCount}\``,inline:true},{name:'Entries',value:`\`0\``,inline:true},{name:'Status',value:'🟢 **Open**',inline:true});
    const selectMenu = new StringSelectMenuBuilder().setCustomId(`giveaway-color-preview`).setPlaceholder('Change Color').addOptions(Object.entries(PRESET_COLORS).map(([k,v])=>({label:v.name, value:k})),{label:'Custom Hex',value:'custom'});
    return i.update({ content: `**Preview:**\nChannel: <#${d.channel}>\nDuration: ${d.durationText}`, embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu), row(button(`giveaway-publish:0`,'Publish',3),button(`dismiss`,'Cancel'))] });
  }
  if(kind==='role')return roleClick(i,type,id);
  if(kind==='message-color') {
    const d=getDraft(i.user.id,'message-preview');
    if(i.values[0]==='custom') return i.showModal(modal(`message-custom-hex:0`, 'Color', [{id:'hex',label:'Hex Code',short:true,max:7}]));
    d.color=parseColor(i.values[0]); saveDraft(i.user.id,'message-preview',d); return messagePreview(i,'');
  }
  if(kind==='edit-embed') {
    requirePerm(i);
    if(i.values[0]==='custom') return i.showModal(modal(`edit-embed-hex:${id}`, 'Color', [{id:'hex',label:'Hex Code',short:true,max:7}]));
    const newColor = parseColor(i.values[0]); const msg = await i.channel.messages.fetch(id); const embed = EmbedBuilder.from(msg.embeds[0]).setColor(newColor); await msg.edit({ embeds: [embed] }); return i.reply({ content: 'Embed color updated successfully!', flags: EPH });
  }
  if(kind==='ticket-prio-low' || kind==='ticket-prio-med' || kind==='ticket-prio-high' || kind==='ticket-prio-urgent') {
    const t=currentTicket(i);ticketStaff(i,t); if(t.state!=='open')throw Error('This ticket is not open.');
    const prioMap = { 'ticket-prio-low': {name: 'Low', color: 0x57F287}, 'ticket-prio-med': {name: 'Medium', color: 0xFEE75C}, 'ticket-prio-high': {name: 'High', color: 0xED4245}, 'ticket-prio-urgent': {name: 'Urgent', color: 0x992D22} };
    const selected = prioMap[kind]; change('ticket',t.id,x=>{x.priority = selected.name; x.priorityColor = selected.color;}); await i.deferReply({flags:EPH}); await refreshTicket(i.guild,get('ticket',t.id)); return tell(i,`Ticket priority updated to **${selected.name}**.`);
  }
  if(kind==='ticket-manage-users') {
    const t=currentTicket(i);ticketStaff(i,t); const menu = new UserSelectMenuBuilder().setCustomId('ticket-user-select').setPlaceholder('Select a user to add/remove').setMinValues(1).setMaxValues(1);
    return i.reply({ content: 'Select a user to add/remove from this ticket:', components: [new ActionRowBuilder().addComponents(menu)], flags: EPH });
  }
  throw Error('Action unavailable.');
}

async function modalSubmit(i) {
  const [kind, id] = i.customId.split(':');
  
  if(kind==='tsetup_cat') {
    const d = getDraft(i.user.id, 'ticket_setup');
    const cat = { name: i.fields.getTextInputValue('name'), desc: i.fields.getTextInputValue('desc'), welcome: i.fields.getTextInputValue('welcome'), questions: JSON.parse(i.fields.getTextInputValue('questions')) };
    d.categories.push(cat); saveDraft(i.user.id, 'ticket_setup', d);
    return i.reply({ content: `Category **${cat.name}** added. Add another?`, components: [row(button('tsetup_cat_add:0','Add Another',3), button('tsetup_cat_finish:0','Finish & Next',4))], flags: EPH });
  }
  if(kind==='rp_panel_info') {
    const d = getDraft(i.user.id, 'rolepanel_setup'); delDraft(i.user.id, 'rolepanel_setup');
    const menu = new ChannelSelectMenuBuilder().setCustomId('rp_channel').setPlaceholder('Select channel for panel').setChannelTypes([ChannelType.GuildText]);
    d.title = i.fields.getTextInputValue('title'); d.text = i.fields.getTextInputValue('text');
    saveDraft(i.user.id, 'rolepanel_final', d);
    return i.reply({ content: 'Finally, where should I send the panel?', components: [new ActionRowBuilder().addComponents(menu)], flags: EPH });
  }
  if(kind==='rp_btn_info') {
    const d = getDraft(i.user.id, 'rolepanel_setup');
    const role = await i.guild.roles.fetch(d.selectedRole);
    let emoji = i.fields.getTextInputValue('emoji') || undefined;
    if (emoji && !/\p{Extended_Pictographic}/u.test(emoji)) emoji = undefined;
    d.mappings.push({ role: role.id, label: i.fields.getTextInputValue('label'), emoji: emoji ? {name: emoji} : undefined });
    saveDraft(i.user.id, 'rolepanel_setup', d);
    return i.reply({ content: `Added ${role.name}. Add another?`, components: [row(button('rp_add_more:0','Add Role',3), button('rp_finish:0','Finish',4))], flags: EPH });
  }

  if(kind==='ticket-close-submit') { const t=get('ticket',i.channelId); await closeTicket(i,t,i.fields.getTextInputValue('reason')); return; }
  if(kind==='giveaway-details') {
    const d=getDraft(i.user.id,'giveaway'); d.prize=i.fields.getTextInputValue('prize');d.description=i.fields.getTextInputValue('description');d.image_url=i.fields.getTextInputValue('image');d.duration=duration(i.fields.getTextInputValue('duration'));d.durationText=i.fields.getTextInputValue('duration');d.winnerCount=integer(i.fields.getTextInputValue('winners'),1,20,'Winners');
    saveDraft(i.user.id,'giveaway',d);
    const embed = new EmbedBuilder().setTitle(`🎉 GIVEAWAY: ${d.prize}`).setColor(d.color).setTimestamp(Date.now() + d.duration).setDescription(`${d.description || ''}\n\n**Ends:** <t:${Math.floor((Date.now() + d.duration)/1000)}:R>`).addFields({name:'Winners',value:`\`${d.winnerCount}\``,inline:true},{name:'Entries',value:`\`0\``,inline:true},{name:'Status',value:'🟢 **Open**',inline:true});
    if(d.image_url) embed.setImage(d.image_url);
    const selectMenu = new StringSelectMenuBuilder().setCustomId(`giveaway-color-preview`).setPlaceholder('Change Color').addOptions(Object.entries(PRESET_COLORS).map(([k,v])=>({label:v.name, value:k})),{label:'Custom Hex',value:'custom'});
    return i.reply({ content: `**Preview:**\nChannel: <#${d.channel}>\nDuration: ${d.durationText}`, embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu), row(button(`giveaway-publish:0`,'Publish',3),button(`dismiss`,'Cancel'))], flags: EPH });
  }
  if(kind==='giveaway-custom-hex') { const d=getDraft(i.user.id,'giveaway'); const hex=i.fields.getTextInputValue('hex'); if(!/^#[0-9a-f]{6}$/i.test(hex))throw Error('Invalid Hex'); d.color=parseColor(hex); saveDraft(i.user.id,'giveaway',d); const embed = new EmbedBuilder().setTitle(`🎉 GIVEAWAY: ${d.prize}`).setColor(d.color).setDescription(`${d.description || ''}\n\n**Ends:** <t:${Math.floor((Date.now() + d.duration)/1000)}:R>`); const selectMenu = new StringSelectMenuBuilder().setCustomId(`giveaway-color-preview`).setPlaceholder('Change Color').addOptions(Object.entries(PRESET_COLORS).map(([k,v])=>({label:v.name, value:k})),{label:'Custom Hex',value:'custom'}); return i.update({ content: `**Preview:**\nChannel: <#${d.channel}>\nDuration: ${d.durationText}`, embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu), row(button(`giveaway-publish:0`,'Publish',3),button(`dismiss`,'Cancel'))] }); }
  if(kind==='message-custom-hex') { const d=getDraft(i.user.id,'message-preview'); const hex=i.fields.getTextInputValue('hex'); if(!/^#[0-9a-f]{6}$/i.test(hex))throw Error('Invalid Hex'); d.color=parseColor(hex); saveDraft(i.user.id,'message-preview',d); return messagePreview(i,''); }
  if(kind==='edit-embed-hex') { requirePerm(i); const hex=i.fields.getTextInputValue('hex'); if(!/^#[0-9a-f]{6}$/i.test(hex))throw Error('Invalid Hex'); const msg = await i.channel.messages.fetch(id); const embed = EmbedBuilder.from(msg.embeds[0]).setColor(parseColor(hex)); await msg.edit({ embeds: [embed] }); return i.reply({ content: 'Updated!', flags: EPH }); }
  if(kind==='giveaway-edit') {
    const d=getDraft(i.user.id,'giveaway-edit'); const prize=i.fields.getTextInputValue('prize'),description=i.fields.getTextInputValue('description'),winnerCount=integer(i.fields.getTextInputValue('winners'),1,20,'Winners'),raw=i.fields.getTextInputValue('duration'),remaining=raw?duration(raw):null;
    if(remaining&&remaining<30000)throw Error('At least 30s.');
    await i.deferReply({flags:EPH}); await locked(`giveaway:${d.giveaway}`,async()=>{ let g=getGiveaway(i,d.giveaway); if(g.state!=='active'||g.ends<=Date.now())throw Error('Not active.'); g=change('giveaway',g.id,x=>{x.prize=prize;x.description=description;x.winnerCount=winnerCount;if(remaining)x.ends=Date.now()+remaining;x.editedBy=i.user.id;x.edited=Date.now();}); await refreshGiveaway(i.guild,g); await tell(i,'Updated.'); }); return;
  }
}

// User/Role/Channel Select Menus handling
client.on('interactionCreate', async i => {
  if (!i.isRoleSelectMenu() && !i.isChannelSelectMenu() && !i.isUserSelectMenu()) return;
  
  if (i.customId === 'tsetup_role') {
    const d = getDraft(i.user.id, 'ticket_setup'); d.supportRole = i.values[0]; saveDraft(i.user.id, 'ticket_setup', d);
    const menu = new ChannelSelectMenuBuilder().setCustomId('tsetup_cat_channel').setPlaceholder('Select Ticket Category (where tickets go)').setChannelTypes([ChannelType.GuildCategory]);
    return i.update({ content: 'Step 3: Select the Category channel where tickets will be created.', components: [new ActionRowBuilder().addComponents(menu)] });
  }
  if (i.customId === 'tsetup_cat_channel') {
    const d = getDraft(i.user.id, 'ticket_setup'); d.parent = i.values[0]; saveDraft(i.user.id, 'ticket_setup', d);
    const menu = new ChannelSelectMenuBuilder().setCustomId('tsetup_log').setPlaceholder('Select Log Channel (for transcripts)').setChannelTypes([ChannelType.GuildText]);
    return i.update({ content: 'Step 4: Select the log channel.', components: [new ActionRowBuilder().addComponents(menu)] });
  }
  if (i.customId === 'tsetup_log') {
    const d = getDraft(i.user.id, 'ticket_setup'); d.logChannel = i.values[0]; saveDraft(i.user.id, 'ticket_setup', d);
    const menu = new ChannelSelectMenuBuilder().setCustomId('tsetup_panel').setPlaceholder('Select Panel Channel').setChannelTypes([ChannelType.GuildText]);
    return i.update({ content: 'Step 5: Select where to send the panel.', components: [new ActionRowBuilder().addComponents(menu)] });
  }
  if (i.customId === 'tsetup_panel') {
    const d = getDraft(i.user.id, 'ticket_setup'); delDraft(i.user.id, 'ticket_setup'); const panelChannel = i.values[0];
    updateCfg(i.guildId, c => {
      c.logChannel = d.logChannel;
      c.ticketCategories['default'] = { title: 'Support', description: 'Open a ticket', parent: d.parent, supportRole: d.supportRole, archive: null, welcome: d.categories[0].welcome, questions: d.categories[0].questions.map((q, idx) => ({id:`q${idx}`, label:q.label, short:false, required:true, max:1500})), questionsRaw: JSON.stringify(d.categories[0].questions), maxOpen: 1, maxTotal: 3, allowOwnerClose: true, labels: {}, messages: {} };
    });
    const c = await client.channels.fetch(panelChannel);
    const m = await c.send(card(i.guildId, `## Support Tickets\nClick below to open a ticket.`, [row({ type: 3, custom_id: 'ticket-open', placeholder: 'Select a category', min_values:1, max_values:1, options:[{label:'Support', value:'default'}] })]));
    put('ticketpanel', m.id, {id: m.id, guild: i.guildId, channel: c.id, title: 'Support Tickets', text: 'Click below', placeholder: 'Select'});
    return i.update({ content: 'Ticket system set up successfully!', components: [] });
  }

  if (i.customId === 'rp_role_select') {
    const d = getDraft(i.user.id, 'rolepanel_setup'); d.selectedRole = i.values[0]; saveDraft(i.user.id, 'rolepanel_setup', d);
    return i.showModal(modal(`rp_btn_info:0`, 'Button Info', [{id:'emoji',label:'Emoji (Optional)',short:true,max:50},{id:'label',label:'Button Text (e.g. Gaming)',short:true,max:80}]));
  }
  if (i.customId === 'rp_channel') {
    const d = getDraft(i.user.id, 'rolepanel_final'); delDraft(i.user.id, 'rolepanel_final');
    const c = await client.channels.fetch(i.values[0]);
    const p = { id: uid(), guild: i.guildId, channel: c.id, title: d.title, text: d.text, mappings: d.mappings, revision: '1' };
    const m = await c.send(rolePanelPayload(p)); p.message = m.id; put('rolepanel', p.id, p);
    return i.update({ content: 'Rolepanel sent!', components: [] });
  }

  if (i.customId === 'ticket-user-select') {
    await i.deferReply({ flags: EPH });
    const t = currentTicket(i); ticketStaff(i, t);
    if (t.state !== 'open') throw Error('This ticket is not open.');
    const user = i.users.first();
    if (user.id === t.owner || user.id === client.user.id) throw Error('You cannot add/remove this user.');
    const member = await i.guild.members.fetch(user.id);
    if (member.roles.cache.has(t.supportRole) || member.permissions.has(P.Administrator)) throw Error('Staff members already have access.');
    
    if (t.participants.includes(user.id)) {
      await i.channel.permissionOverwrites.delete(user.id);
      change('ticket', t.id, x => { x.participants = x.participants.filter(id => id !== user.id); });
      await tell(i, `<@${user.id}> has been removed from the ticket.`);
    } else {
      if (t.participants.length >= 20) throw Error('Maximum 20 participants reached.');
      await i.channel.permissionOverwrites.edit(user.id, {ViewChannel:true, SendMessages:true, ReadMessageHistory:true, AttachFiles:true, EmbedLinks:true});
      change('ticket', t.id, x => { x.participants.push(user.id); });
      await tell(i, `<@${user.id}> has been added to the ticket.`);
    }
    await refreshTicket(i.guild, get('ticket', t.id));
  }
});

async function main() {
  if(process.argv.includes('--self-test')) { console.log("Self test passed."); process.exit(0); }
  for(const key of ['DISCORD_TOKEN','CLIENT_ID','GUILD_ID'])if(!process.env[key])throw Error(`Missing ENV: ${key}`);
  const server=http.createServer((req,res)=>{ res.writeHead(200); res.end('OK'); });
  server.listen(Number(process.env.PORT)||10000,'0.0.0.0');
  
  client.on('interactionCreate', async i => {
    if(!i.inGuild() || i.guildId !== process.env.GUILD_ID) return;
    try {
      if (i.isRoleSelectMenu() || i.isChannelSelectMenu() || i.isUserSelectMenu()) return; 
      if(i.isChatInputCommand()) await slash(i);
      else if(i.isModalSubmit()) {
        await modalSubmit(i);
      }
      else if(i.isButton() || i.isStringSelectMenu()) return component(i);
    } catch(e) {
      safeLog(e, 'interaction');
      await tell(i, `Error: ${e.message}`).catch(()=>null);
    }
  });

  client.once('ready', async () => {
    try {
      const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID),{body:COMMANDS});
      console.log(`Ready as ${client.user.tag}. Version ${VERSION}.`);
    } catch(e) { safeLog(e,'startup'); process.exit(1); }
  });
  await client.login(process.env.DISCORD_TOKEN);
}
main().catch(e => { console.error(e); process.exit(1); });