/**
 * LD GIVEAWAYS | Ultra Efsane Edition v4.0.1
 * My Owner: Unitey
 * My Developer: Dream
 * 
 * KURULUM: Bu dosyayı GitHub'a index.js olarak yükleyin. Render'da otomatik olarak güncellenecektir.
 * Gerekli Environment Değişkenleri: DISCORD_TOKEN, CLIENT_ID, GUILD_ID, DATA_DIR=./data
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
  EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder
} = require('discord.js');

const VERSION = '4.0.1';
const SELF_TEST = process.argv.includes('--self-test');
const STORAGE_TEST = process.argv.includes('--storage-test');
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

function initializeStore() {
  if (SELF_TEST) return new Database(':memory:');
  if (!['ephemeral','persistent'].includes(STORAGE_MODE)) {
    console.error('Invalid STORAGE_MODE. Use ephemeral (default, no disk required) or persistent.');
    process.exit(1);
  }
  if (STORAGE_MODE==='persistent' && !process.env.DATA_DIR) {
    console.error('Persistent mode needs an explicit DATA_DIR inside your persistent storage. For free local storage instead, use STORAGE_MODE=ephemeral and DATA_DIR=./data.');
    process.exit(1);
  }
  try {
    const transcripts = path.join(DATA_DIR, 'transcripts');
    fs.mkdirSync(transcripts, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    fs.accessSync(transcripts, fs.constants.W_OK);
    const store=new Database(path.join(DATA_DIR, 'bot.sqlite'));
    console.log(`Storage mode: ${STORAGE_MODE}. Data directory: ${path.resolve(DATA_DIR)}.`);
    if(STORAGE_MODE==='ephemeral')
      console.warn('Temporary storage: ticket, giveaway and role panel records may be lost on restart or redeploy. HTTP monitoring does not make files persistent.');
    return store;
  } catch (error) {
    console.error(`Storage startup failed (${error.code || 'STORE_ERROR'}): unable to open writable storage at ${DATA_DIR}.`);
    if(STORAGE_MODE==='ephemeral')
      console.error('For free Render hosting, set DATA_DIR=./data (or remove DATA_DIR). Remove an old /var/data/ld-bot setting if no disk is attached.');
    else console.error('In persistent mode, check the disk mount and DATA_DIR. For free temporary storage, choose STORAGE_MODE=ephemeral and DATA_DIR=./data instead.');
    console.error('Use node index.js as the Start Command, not the Build Command.');
    console.error('No fallback directory was used, to avoid silently losing records on redeploy.');
    process.exit(1);
  }
}

const db = initializeStore();
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = FULL');
db.exec(`
 CREATE TABLE IF NOT EXISTS objects (
   kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
   PRIMARY KEY(kind,id)
 );
 CREATE TABLE IF NOT EXISTS entries (
   giveaway TEXT NOT NULL, user TEXT NOT NULL, joined INTEGER NOT NULL,
   PRIMARY KEY(giveaway,user)
 );
 CREATE TABLE IF NOT EXISTS cooldowns (
   panel TEXT NOT NULL, user TEXT NOT NULL, role TEXT NOT NULL, until INTEGER NOT NULL,
   PRIMARY KEY(panel,user,role)
 );
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
function cfg(guild) {
  return get('config', guild) || {
    color: 0x29b866, logChannel: null, ticketCategories: {}, retentionDays: 30,
  };
}
function updateCfg(guild, fn) {
  const x = cfg(guild); fn(x); return put('config', guild, x);
}
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
function button(id, label, style = 2, extra = {}) {
  return { type: 2, custom_id: id, label: clean(label,80), style, ...extra };
}
function select(id, placeholder, options) {
  return row({ type: 3, custom_id: id, placeholder: clean(placeholder,150), min_values: 1, max_values: 1, options });
}
function card(guild, body, rows = [], ephemeral = false, color) {
  return {
    flags: V2 | (ephemeral ? EPH : 0), allowedMentions: NO_MENTIONS,
    components: [{ type: 17, accent_color: color ?? cfg(guild).color,
      components: [text(body), ...rows] }],
  };
}
function modal(id, title, fields) {
  return new ModalBuilder().setCustomId(id).setTitle(clean(title,45)).addComponents(
    fields.map(f => new ActionRowBuilder().addComponents(new TextInputBuilder()
      .setCustomId(f.id).setLabel(clean(f.label,45))
      .setStyle(f.short ? TextInputStyle.Short : TextInputStyle.Paragraph)
      .setRequired(f.required !== false).setMaxLength(f.max || 2000)
      .setMinLength(f.min || 0)
      .setValue(clean(f.value || '', f.max || 2000))
      .setPlaceholder(clean(f.placeholder || '',100)))));
}
async function tell(i, message) {
  const payload = typeof message === 'string' ? { content: clean(message,1900), allowedMentions: NO_MENTIONS } : message;
  if (i.deferred || i.replied) return i.editReply({...payload,...(payload.flags?{flags:payload.flags&~EPH}:{})});
  return i.reply({ ...payload, flags: (payload.flags || 0) | EPH });
}
function requirePerm(i, permission = P.Administrator) {
  if (!i.memberPermissions?.has(permission)) throw Error('You do not have permission to use this action.');
}
function botPerm(channel, permission) {
  if (!channel.permissionsFor(channel.guild.members.me)?.has(permission))
    throw Error(`The bot is missing the required channel permission: ${String(permission)}.`);
}
async function channelBy(guild, id) {
  const c = await guild.channels.fetch(id).catch(() => null);
  if (!c) throw Error('The channel no longer exists.');
  return c;
}
async function sendChannel(guild, id) {
  const c = await channelBy(guild,id);
  if (c.type !== ChannelType.GuildText) throw Error('Choose a server text channel.');
  botPerm(c,[P.ViewChannel,P.SendMessages]);
  return c;
}
function safeLog(error, context = '') {
  const msg = String(error?.message || error).replaceAll(process.env.DISCORD_TOKEN || '<unset-token>', '[REDACTED]');
  console.error(`[${new Date().toISOString()}] ${context}: ${msg}`);
}
const locks = new Set();
async function locked(key, fn) {
  if (locks.has(key)) throw Error('This action is already in progress. Please try again shortly.');
  locks.add(key); try { return await fn(); } finally { locks.delete(key); }
}
const drafts = new Map();
function draft(i, type, data) {
  const id = uid(); drafts.set(id,{id,type,user:i.user.id,guild:i.guildId,expires:Date.now()+900000,...data}); return id;
}
function readDraft(i, id, type) {
  const d = drafts.get(id);
  if (!d || d.user !== i.user.id || d.guild !== i.guildId || d.expires < Date.now() || (type && d.type !== type))
    throw Error('This preview expired or belongs to another user. Run the command again.');
  return d;
}
async function confirm(i, action, data, body) {
  const id = draft(i,'confirm',{action,data});
  return tell(i,card(i.guildId,body,[
    row(button(`confirm:${id}`,'Confirm',4),button(`dismiss:${id}`,'Cancel')),
  ],true));
}
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
  const approved=protectedRoles(guild.id);
  if(config.logRole)approved.add(config.logRole);
  for(const id of guild.members.me.roles.cache.keys())if(id!==guild.id)approved.add(id);
  for(const role of guild.roles.cache.values()) {
    if(role.id===guild.id||!channel.permissionsFor(role)?.has(P.ViewChannel))continue;
    if(!approved.has(role.id)&&!role.permissions.has(P.Administrator)&&!role.permissions.has(P.ModerateMembers))
      throw Error(`The log channel is visible to an unapproved role: ${role.name}. Use log_role or fix the channel permissions.`);
  }
  for(const overwrite of channel.permissionOverwrites.cache.values()) {
    if(overwrite.type!==1||!overwrite.allow.has(P.ViewChannel)||overwrite.id===client.user.id)continue;
    const member=await guild.members.fetch(overwrite.id).catch(()=>null);
    if(member&&!member.permissions.has(P.Administrator)&&!member.permissions.has(P.ModerateMembers)&&
      !member.roles.cache.some(role=>approved.has(role.id)))
      throw Error('The log channel has an unapproved member visibility override.');
  }
}
async function logEvent(guild, title, body, files = []) {
  const id = cfg(guild.id).logChannel;
  if (!id) return false;
  try {
    const c = await sendChannel(guild,id);
    await privateLogChannel(c);
    const embed = new EmbedBuilder()
      .setTitle(`📝 ${clean(title, 256)}`)
      .setDescription(clean(body, 3900))
      .setColor(cfg(guild.id).color)
      .setTimestamp();
    await c.send({ embeds: [embed], files, allowedMentions: NO_MENTIONS });
    return true;
  } catch(e) { safeLog(e,'audit delivery'); return false; }
}
function recordCase(i, action, target, reason, extra = {}) {
  const id = uid();
  const data = {id,guild:i.guildId,action,target,reason,actor:i.user.id,at:Date.now(),...extra};
  put('case',id,data);
  const list = all('case').filter(c=>c.guild===i.guildId).sort((a,b)=>b.at-a.at);
  for (const old of list.slice(2000)) sql.del.run('case',old.id);
  return data;
}
async function auditCase(i, c) {
  await logEvent(i.guild,'Moderation Action',`**Case:** \`${c.id}\`\n**Action:** ${c.action}\n**Target:** ${c.target}\n**Moderator:** <@${i.user.id}>\n**Reason:** ${display(c.reason)}`);
}
function reasonOf(i) { return i.options.getString('reason') || 'No reason provided.'; }
function auditReason(i, reason) { return clean(`${i.user.tag} (${i.user.id}): ${reason}`,500); }

// Raw slash-command schema
const S = 3, I = 4, B = 5, U = 6, C = 7, R = 8;
function opt(type,name,description,required=false,extra={}) {
  return {type,name,description,required,...extra};
}
const str=(n,d,req=false,max=1000)=>opt(S,n,d,req,{max_length:max});
const num=(n,d,min,max,req=false)=>opt(I,n,d,req,{min_value:min,max_value:max});
const usr=(n='user',req=true)=>opt(U,n,'Server member',req);
const ch=(n='channel',req=true,category=false)=>opt(C,n,category?'Category channel':'Server text channel',req,{channel_types:[category?4:0]});
const rol=(n,req=false)=>opt(R,n,'Server role',req);
const bool=(n,d)=>opt(B,n,d);
const idopt=()=>str('id','Giveaway message ID',true,20);
const rsn=()=>str('reason','Reason for this action',false,400);
function sub(name,description,options=[]) {return {type:1,name,description,options};}
function command(name,description,options=[],admin=false) {
  return {name,description,options,dm_permission:false,...(admin?{default_member_permissions:P.Administrator.toString()}:{})};
}
const COMMANDS = [
  command('help','View bot information and command help'),
  command('about','View bot information'),
  command('stats','View advanced server, ticket, and giveaway statistics'),
  command('userinfo','View information about a user',[usr('user',false)]),
  command('serverinfo','View information about the server'),
  command('embed','Build and send a custom embed',[
    ch('channel',false),str('title','Embed Title',false,256),str('description','Embed Description',true,4000),
    str('color','Hex color, e.g., #FF0000',false,7),str('footer','Embed Footer',false,2048),str('image_url','Image URL',false,2000)
  ],true),
  command('announcement','Send your exact announcement text',[
    str('text','Text to send',true,2000),ch('channel',false),bool('ping','Allow user and role notifications (never everyone)'),bool('embed','Send as a stylish Embed'),bool('markdown','Auto-format text using Markdown')],true),
  command('say','Send your exact text',[
    str('text','Text to send',true,2000),ch('channel',false),bool('ping','Allow user and role notifications (never everyone)'),bool('embed','Send as a stylish Embed'),bool('markdown','Auto-format text using Markdown')],true),
  command('dm','Send a private message to a member',[usr(),str('text','Exact message text',true,2000),bool('embed','Send as a stylish Embed'),bool('markdown','Auto-format text using Markdown')],true),
  command('status','Set the bot activity and presence',[
    str('text','Activity text or Custom Status Note',true,128),
    opt(S,'activity','Activity type',false,{choices:['Playing','Watching','Listening','Competing','Custom'].map(name=>({name,value:name}))}),
    opt(S,'presence','Online status',false,{choices:['online','idle','dnd','invisible'].map(name=>({name,value:name}))}),
  ],true),
  command('config','Configure logs, appearance and data export',[
    ch('log_channel',false),rol('log_role'),str('color','Hex color, for example #29B866',false,7),
    num('retention_days','Closed ticket data retention in days',1,365),
    bool('backup','Export stored records privately'),
  ],true),
  command('ticket','Configure and manage tickets',[
    sub('category','Create or edit a configurable ticket category',[
      str('key','Lowercase key, such as support',true,24),ch('parent',true,true),rol('support_role',true),ch('archive',false,true),
    ]),
    sub('settings','Set category limits and owner close access',[
      str('key','Ticket category key',true,24),num('max_open','Maximum open tickets per member',1,5),
      num('max_total','Maximum total open tickets across all categories',1,10),
      bool('allow_owner_close','Allow the ticket owner to close their ticket'),
    ]),
    sub('appearance','Customize ticket buttons and channel names',[str('key','Ticket category key',true,24)]),
    sub('messages','Customize ticket response messages',[str('key','Ticket category key',true,24)]),
    sub('remove-category','Remove a category from future panels',[str('key','Category key',true,24)]),
    sub('panel','Publish a category selection panel',[ch(),str('title','Exact panel title',true,150),str('text','Exact panel text',true,2000),str('placeholder','Menu placeholder',true,100)]),
    sub('edit','Edit an existing ticket panel',[ch(),str('message_id','Panel message ID',true,20),str('title','Exact panel title',true,150),str('text','Exact panel text',true,2000)]),
    sub('add','Add a member to the current ticket',[usr()]),
    sub('remove','Remove a member from the current ticket',[usr()]),
    sub('rename','Rename the current ticket',[str('name','Channel name',true,90)]),
    sub('claim','Assign the current ticket to yourself'),
    sub('unclaim','Remove the current ticket assignment'),
    sub('reopen','Reopen the current closed ticket'),
    sub('transcript','Export the current ticket transcript'),
    sub('forget','Delete the closed ticket record and local transcript'),
  ]),
  command('giveaway','Create and manage giveaways',[
    sub('create','Create a giveaway with a duration picker',[
      ch(),rol('required_role'),num('min_age_days','Minimum account age in days',0,3650),num('min_join_days','Minimum server membership in days',0,3650),
      opt(R,'bonus_role','Role that gives bonus entries',false),num('bonus_amount','Amount of extra entries for bonus role',1,10)
    ]),
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
    sub('create','Create a role panel',[ch(),str('title','Exact panel title',true,150),str('text','Exact panel text',true,2000)]),
    sub('edit','Edit a role panel',[ch(),str('message_id','Role panel message ID',true,20),str('title','Exact panel title',true,150),str('text','Exact panel text',true,2000)]),
    sub('remove','Remove buttons from a role panel',[ch(),str('message_id','Role panel message ID',true,20)]),
  ],true),
  command('setup','Preview 30 additive server templates',[],true),
  {...command('mod','Moderation tools',[
    sub('warn','Record a warning',[usr(),rsn()]),
    sub('warnings','View member warnings',[usr()]),
    sub('clearwarnings','Clear member warnings',[usr(),rsn()]),
    sub('kick','Kick a member after confirmation',[usr(),rsn()]),
    sub('ban','Ban a member after confirmation',[usr(),rsn(),num('delete_days','Delete recent message history in days',0,7)]),
    sub('unban','Unban a user by ID',[str('user_id','Banned user ID',true,20),rsn()]),
    sub('timeout','Timeout a member',[usr(),str('duration','For example 30m, 2h or 1d; maximum 28d',true,40),rsn()]),
    sub('untimeout','Remove a timeout',[usr(),rsn()]),
    sub('purge','Delete recent messages after confirmation',[num('amount','Number of recent messages',1,100,true),rsn()]),
    sub('slowmode','Set the current channel slowmode',[num('seconds','0 disables slowmode',0,21600,true),rsn()]),
    sub('lock','Restrict everyone from sending messages in this channel',[rsn()]),
    sub('unlock','Restore the send permission saved by lock',[rsn()]),
    sub('case','View a stored moderation case',[str('case_id','Case ID',true,24)]),
  ]),default_member_permissions:P.ModerateMembers.toString()},
];

// Templates
const cat = (name,channels,mode='public')=>({name,channels:channels.split(','),mode});
const TEMPLATE_DATA = [
 ['ld','LD Giveaways',[cat('Information','rules,announcements,how-to-enter','readonly'),cat('LD Events','giveaways,drops,winners,prize-claims'),cat('Community','general,questions,media'),cat('Staff','staff-chat,event-planning','private')]],
 ['gaming','Gaming Community',[cat('Information','rules,announcements,game-updates','readonly'),cat('Players','general,looking-for-group,clips,game-help'),cat('Staff','staff-chat,reports','private')]],
 ['esports','Esports Team',[cat('Information','rules,roster,schedule','readonly'),cat('Competition','match-chat,scrims,results,vod-review'),cat('Team Staff','coaching,tactics','private')]],
 ['streamer','Streamer Community',[cat('Information','rules,announcements,stream-schedule','readonly'),cat('Community','general,stream-chat,clips,fan-art'),cat('Stream Staff','moderation,content-planning','private')]],
 ['creator','Content Creator',[cat('Information','rules,announcements,new-content','readonly'),cat('Community','general,ideas,feedback,showcase'),cat('Production','planning,collaborations','private')]],
 ['music','Music Community',[cat('Information','rules,announcements,releases','readonly'),cat('Music','general,recommendations,original-music,feedback'),cat('Staff','staff-chat,events','private')]],
 ['study','Study Group',[cat('Information','rules,announcements,resources','readonly'),cat('Study','general,questions,study-plans,accountability'),cat('Staff','staff-chat,planning','private')]],
 ['school','School Club',[cat('Information','rules,announcements,calendar','readonly'),cat('Club','general,homework-help,projects,resources'),cat('Committee','committee-chat,planning','private')]],
 ['university','University Society',[cat('Information','rules,announcements,events','readonly'),cat('Society','general,introductions,academic-help,opportunities'),cat('Committee','committee-chat,meeting-notes','private')]],
 ['coding','Programming Community',[cat('Information','rules,announcements,resources','readonly'),cat('Development','general,help,code-review,showcase'),cat('Staff','staff-chat,planning','private')]],
 ['opensource','Open Source Project',[cat('Information','rules,announcements,releases','readonly'),cat('Contributors','general,contributing,bug-reports,feature-requests'),cat('Maintainers','maintainer-chat,security-triage','private')]],
 ['startup','Startup Community',[cat('Information','rules,announcements,updates','readonly'),cat('Community','general,introductions,feedback,collaboration'),cat('Team','team-chat,roadmap','private')]],
 ['support','Product Support',[cat('Information','rules,announcements,known-issues','readonly'),cat('Support','general,questions,bug-reports,feature-requests'),cat('Support Team','staff-chat,triage','private')]],
 ['art','Art Community',[cat('Information','rules,announcements,resources','readonly'),cat('Studio','general,artwork,work-in-progress,critique'),cat('Staff','staff-chat,exhibitions','private')]],
 ['photography','Photography Club',[cat('Information','rules,announcements,resources','readonly'),cat('Photography','general,photo-gallery,critique,gear-talk'),cat('Staff','staff-chat,photo-walks','private')]],
 ['anime','Anime Community',[cat('Information','rules,announcements,watch-schedule','readonly'),cat('Community','general,recommendations,spoilers,fan-art'),cat('Staff','staff-chat,watch-parties','private')]],
 ['books','Book Club',[cat('Information','rules,announcements,reading-list','readonly'),cat('Readers','general,current-book,spoilers,recommendations'),cat('Staff','staff-chat,reading-plans','private')]],
 ['fitness','Fitness Community',[cat('Information','rules,announcements,resources','readonly'),cat('Fitness','general,training,nutrition,progress'),cat('Staff','staff-chat,events','private')]],
 ['language','Language Exchange',[cat('Information','rules,announcements,resources','readonly'),cat('Practice','general,introductions,writing,conversation-partners'),cat('Staff','staff-chat,sessions','private')]],
 ['local','Local Community',[cat('Information','rules,announcements,local-resources','readonly'),cat('Neighbours','general,introductions,events,recommendations'),cat('Staff','staff-chat,event-planning','private')]],
 ['roleplay','Roleplay Community',[cat('Information','rules,announcements,lore','readonly'),cat('Roleplay','out-of-character,characters,story-planning,roleplay'),cat('Staff','staff-chat,story-review','private')]],
 ['minecraft','Minecraft Server',[cat('Information','rules,announcements,server-status','readonly'),cat('Players','general,builds,looking-for-group,help'),cat('Staff','staff-chat,reports','private')]],
 ['roblox','Roblox Community',[cat('Information','rules,announcements,game-updates','readonly'),cat('Players','general,looking-for-group,creations,help'),cat('Staff','staff-chat,reports','private')]],
 ['clan','Gaming Clan',[cat('Information','rules,announcements,roster','readonly'),cat('Clan','general,recruitment,match-planning,highlights'),cat('Leadership','leader-chat,strategy','private')]],
 ['tournament','Tournament Hub',[cat('Information','rules,announcements,brackets','readonly'),cat('Tournament','general,registration,match-check-in,results'),cat('Organizers','staff-chat,disputes','private')]],
 ['events','Event Community',[cat('Information','rules,announcements,event-calendar','readonly'),cat('Events','general,sign-ups,event-chat,feedback'),cat('Organizers','staff-chat,planning','private')]],
 ['technology','Technology Community',[cat('Information','rules,announcements,resources','readonly'),cat('Technology','general,hardware,software,projects'),cat('Staff','staff-chat,planning','private')]],
 ['science','Science Club',[cat('Information','rules,announcements,resources','readonly'),cat('Science','general,questions,experiments,research-discussion'),cat('Staff','staff-chat,events','private')]],
 ['tabletop','Tabletop Community',[cat('Information','rules,announcements,campaign-schedule','readonly'),cat('Tabletop','general,looking-for-group,characters,session-notes'),cat('Game Masters','gm-chat,campaign-planning','private')]],
 ['friends','Friends Community',[cat('Information','rules,announcements,plans','readonly'),cat('Friends','general,photos,recommendations,gaming'),cat('Staff','staff-chat,planning','private')]],
];
const TEMPLATE_VOICE = {
  ld:['event-lounge','giveaway-stage'],gaming:['lobby','squad-one','squad-two'],
  esports:['team-lobby','scrim-room'],streamer:['community-lounge','watch-party'],
  creator:['community-lounge','collaboration'],music:['listening-room','jam-room'],
  study:['quiet-study','group-study'],school:['club-lounge','project-room'],
  university:['society-lounge','study-room'],coding:['dev-lounge','pair-programming'],
  opensource:['contributors','project-meeting'],startup:['community-lounge','meetup'],
  support:['support-waiting-room','community-lounge'],art:['studio-lounge','live-drawing'],
  photography:['photo-lounge','critique-room'],anime:['anime-lounge','watch-party'],
  books:['reading-lounge','book-discussion'],fitness:['fitness-lounge','group-session'],
  language:['conversation-one','conversation-two'],local:['community-lounge','meetup'],
  roleplay:['out-of-character','roleplay-room'],minecraft:['survival','creative'],
  roblox:['lobby','party-room'],clan:['clan-lobby','match-room'],
  tournament:['team-one','team-two','spectators'],events:['event-lounge','event-room'],
  technology:['tech-lounge','project-room'],science:['science-lounge','discussion-room'],
  tabletop:['table-one','table-two'],friends:['lounge','gaming-room'],
};
const TEMPLATES = TEMPLATE_DATA.map(([id,title,categories])=>({
  id,title,categories:[...categories,{name:'Voice',channels:TEMPLATE_VOICE[id],mode:'public',voice:true}],
}));

const client = SELF_TEST ? {
  user:{id:'test-bot'},
  users:{fetch:async()=>({send:async()=>({id:'test-dm'})})},
} : new Client({
  intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,...(process.env.ENABLE_MESSAGE_CONTENT==='true'?[GatewayIntentBits.MessageContent]:[])],
  allowedMentions:NO_MENTIONS,
});

const HELP = {
  Overview: '# LD GIVEAWAYS Ultra\nMy Owner: Unitey\nMy Developer: Dream\n\nI manage giveaways, tickets, role panels and server moderation.\nSelect a section below to view its commands.',
  Messaging: '## Messaging\n`/announcement` - Send your exact announcement after preview. (Embed & Markdown supported)\n`/say` - Send your exact text after preview. (Embed & Markdown supported)\n`/dm` - Preview and send a private message. (Embed & Markdown supported)\n`/embed` - Build and send a fully custom embed.\n`/status` - Set the bot activity and presence.\n\nThese commands require Administrator permission.',
  Info: '## Information\n`/userinfo` - View detailed info about a user.\n`/serverinfo` - View detailed info about the server.\n`/stats` - View bot statistics.',
  Tickets: '## Tickets\n`/ticket category` - Configure a category, staff role, messages and questions.\n`/ticket settings` - Set limits and owner close access.\n`/ticket appearance`, `/ticket messages` - Customize buttons and responses.\n`/ticket panel` - Publish a category picker.\n`/ticket edit` - Edit a published panel.\n`/ticket add`, `/ticket remove`, `/ticket rename` - Manage a ticket.\n`/ticket claim`, `/ticket unclaim` - Manage assignment.\n`/ticket reopen`, `/ticket transcript`, `/ticket forget` - Manage closed records.\n`/ticket remove-category` - Remove a future panel option.\n\nUse a panel to open a ticket. Staff can claim and close tickets. Transcript access is limited to ticket participants and staff.',
  Giveaways: '## Giveaways\n`/giveaway create` - Configure a prize and choose a duration.\n`/giveaway list`, `/giveaway info` - View giveaways.\n`/giveaway edit` - Edit an active giveaway.\n`/giveaway pause`, `/giveaway resume` - Pause or resume an active giveaway.\n`/giveaway end`, `/giveaway cancel` - Confirm an early ending or cancellation.\n`/giveaway reroll` - Select new winners excluding previous winners.\n`/giveaway retry` - Retry pending result notifications.\n\nUse 🎉 Join / 🚫 Leave on a giveaway to manage your entry. Winners are selected randomly from eligible entrants and notified by DM where possible. LD delivery is handled by server staff, not by this bot.',
  Moderation: '## Moderation\n`/mod warn`, `/mod warnings`, `/mod clearwarnings`\n`/mod kick`, `/mod ban`, `/mod unban`\n`/mod timeout`, `/mod untimeout`\n`/mod purge`, `/mod slowmode`\n`/mod lock`, `/mod unlock`, `/mod case`\n\nEach action checks the required permission and role hierarchy. Destructive actions require confirmation. Warnings do not automatically trigger punishments.',
  Roles: '## Role panels\n`/rolepanel create` - Publish emoji role buttons.\n`/rolepanel edit` - Edit text and role mappings.\n`/rolepanel remove` - Remove a panel’s buttons.\n\nClick a button to get its role. Wait 20 seconds after receiving it before removing it. Staff and administrative roles cannot be distributed.',
  Setup: '## Server setup\n`/setup` - Preview 30 server templates.\n\nOnly the server owner can apply a template. Setup adds channels and two unprivileged roles without deleting existing resources. Private staff categories are restricted. Interrupted setup can be resumed by applying the same template.',
  Configuration: '## Configuration\n`/config log_channel` - Set a private audit channel.\n`/config color` - Set the default card accent color.\n`/config retention_days` - Set closed ticket retention.\n`/config backup:true` - Export stored records privately.\n\nConfigure messages in the relevant panel commands. Announcement, say and DM text is sent exactly as supplied; mentions are suppressed by default.',
};
function helpPayload(guild, section='Overview') {
  return card(guild,HELP[section]||HELP.Overview,[
    select('help','Select a section',Object.keys(HELP).map(x=>({label:x,value:x}))),
  ],true);
}

// -------------------------- COLOR HELPERS --------------------------
function getEmbedColor(d) {
  if (d.customHex) return parseInt(d.customHex.replace('#', ''), 16);
  if (d.colorKey && PRESET_COLORS[d.colorKey]) return PRESET_COLORS[d.colorKey].value;
  return cfg(d.guild).color;
}
function colorSelectMenu(id, current) {
  const options = Object.entries(PRESET_COLORS).map(([k, v]) => ({ label: v.name, value: k, default: current === k }));
  options.push({ label: 'Custom Hex', value: 'custom_hex', default: current === 'custom_hex' });
  return row({ type: 3, custom_id: `color-select:${id}`, placeholder: 'Choose a color', options });
}

// -------------------------- TICKETS --------------------------
function questions(raw) {
  let a; try { a=JSON.parse(raw); } catch {throw Error('Questions must be a valid JSON array.');}
  if (!Array.isArray(a)||a.length<1||a.length>5) throw Error('Use between 1 and 5 questions.');
  return a.map((q,index)=>{
    if (!q.label || String(q.label).length>45) throw Error('Each question needs a label of 1–45 characters.');
    if (q.style && !['short','paragraph'].includes(q.style)) throw Error('Question style must be short or paragraph.');
    return {id:`q${index}`,label:String(q.label),short:q.style==='short',required:q.required!==false,
      max:integer(q.max??1500,1,2000,'Question maximum'),placeholder:clean(q.placeholder||'',100)};
  });
}
function ticketConfigModal(i,key,base) {
  const old=cfg(i.guildId).ticketCategories[key];
  const id=draft(i,'ticket-config',{key,base});
  return i.showModal(modal(`ticket-config:${id}`,'Ticket category',[
    {id:'title',label:'Category name',short:true,max:80,value:old?.title||''},
    {id:'description',label:'Category menu description',short:true,max:100,value:old?.description||''},
    {id:'welcome',label:'Message inside the ticket',max:2000,value:old?.welcome||'',placeholder:'Use {user}, {category}, {id} if needed.'},
    {id:'questions',label:'Questions (JSON array)',max:3500,value:old?.questionsRaw||'[{"label":"How can we help?","style":"paragraph","required":true,"max":1500}]'},
  ]));
}
function ticketPanelPayload(guild,panel) {
  const cats=Object.entries(cfg(guild).ticketCategories);
  if (!cats.length) throw Error('Create a ticket category first.');
  return card(guild,`## ${panel.title}\n${panel.text}`,[
    select('ticket-open',panel.placeholder,cats.map(([key,c])=>({
      label:clean(c.title,100),value:key,description:clean(c.description,100),
    }))),
  ]);
}
function currentTicket(i) {
  const t=get('ticket',i.channelId);
  if (!t||t.guild!==i.guildId) throw Error('Use this action inside a ticket channel.');
  return t;
}
function staff(i,t) {
  return i.memberPermissions?.has(P.Administrator) || i.member?.roles?.cache?.has(t.supportRole);
}
function ticketAccess(i,t) {
  return staff(i,t) || (t.state==='open'&&(t.owner===i.user.id||t.participants.includes(i.user.id)));
}
function ticketStaff(i,t) {if (!staff(i,t)) throw Error('Only ticket staff can use this action.');}
function ticketRows(t) {
  return [
    row(
      button('ticket-claim',t.claimed?(t.labels?.claimed||'Claimed'):(t.labels?.claim||'Claim'),2,{disabled:!!t.claimed||t.state!=='open'}),
      button('ticket-close',t.labels?.close||'Close',4,{disabled:t.state!=='open'}),
      button('ticket-transcript',t.labels?.transcript||'Transcript')
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
function ticketText(raw,t,user=t.owner) {
  return String(raw).replaceAll('{channel}',`<#${t.id}>`).replaceAll('{user}',`<@${user}>`)
    .replaceAll('{category}',t.title).replaceAll('{id}',t.id);
}
function ticketBody(t) {
  const intro=ticketText(t.welcome,t);
  return `${intro}\n\n${t.answers.map(a=>`**${display(a.label)}**\n${display(a.value||'Not provided.')}`).join('\n\n')}`.slice(0,3900);
}
async function refreshTicket(guild,t) {
  if (!t.message) return;
  const c=await channelBy(guild,t.id);
  const m=await c.messages.fetch(t.message);
  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket - ${t.title}`)
    .setDescription(ticketBody(t))
    .setColor(t.priorityColor || cfg(t.guild).color)
    .addFields({ name: 'Priority', value: t.priority || 'Not Set', inline: true }, { name: 'Status', value: t.claimed ? `Claimed by <@${t.claimed}>` : 'Unclaimed', inline: true });
  await m.edit({ embeds: [embed], components: ticketRows(t) });
}
async function openTicket(i,key) {
  const c=cfg(i.guildId).ticketCategories[key];
  if (!c) throw Error('This category is no longer available.');
  const id=draft(i,'ticket-open',{key,category:c});
  await i.showModal(modal(`ticket-submit:${id}`,c.title,c.questions));
}
async function createTicket(i,d) {
  await i.deferReply({flags:EPH});
  await locked(`ticket-open:${i.guildId}:${i.user.id}`,async()=>{
    const c=cfg(i.guildId).ticketCategories[d.key];
    if (!c) throw Error('This category is no longer available.');
    const existing=all('ticket').filter(t=>t.guild===i.guildId&&t.owner===i.user.id&&t.key===d.key&&t.state==='open');
    if (existing.length>=(c.maxOpen||1)) throw Error(`You already have the maximum number of open tickets in this category: ${c.maxOpen||1}.`);
    const total=all('ticket').filter(t=>t.guild===i.guildId&&t.owner===i.user.id&&['open','closing'].includes(t.state)).length;
    if(total>=(c.maxTotal||3))throw Error(`You already have the maximum total number of open tickets: ${c.maxTotal||3}.`);
    const parent=await channelBy(i.guild,c.parent);
    if (parent.type!==ChannelType.GuildCategory) throw Error('The ticket category channel is unavailable.');
    const support=await i.guild.roles.fetch(c.supportRole);
    if (!support||support.id===i.guildId) throw Error('The support role is unavailable.');
    botPerm(parent,[P.ManageChannels,P.ManageRoles]);
    const answers=d.category.questions.map(q=>({label:q.label,value:i.fields.getTextInputValue(q.id)}));
    const marker=uid();
    const pending={id:marker,guild:i.guildId,owner:i.user.id,key:d.key,title:c.title,supportRole:c.supportRole,
      parent:c.parent,archive:c.archive||null,welcome:c.welcome,answers,participants:[],state:'creating',
      allowOwnerClose:c.allowOwnerClose!==false,labels:c.labels||{},messages:c.messages||{},created:Date.now(),marker,
      priority: 'Not Set', priorityColor: cfg(i.guildId).color};
    put('ticket-pending',marker,pending);
    const channel=await i.guild.channels.create({
      name:`${c.channelPrefix||'ticket'}-${i.user.id.slice(-6)}-${marker.slice(0,4)}`,type:ChannelType.GuildText,parent:c.parent,
      topic:`LD ticket ${marker}; owner ${i.user.id}`,
      permissionOverwrites:ticketPermissionOverwrites(i.guild,pending),
      reason:`Ticket requested by ${i.user.id}`,
    });
    const t={...pending,id:channel.id,state:'open'};
    put('ticket',t.id,t); sql.del.run('ticket-pending',marker);
    try {
      const embed = new EmbedBuilder()
        .setTitle(`🎫 Ticket - ${t.title}`)
        .setDescription(ticketBody(t))
        .setColor(t.priorityColor)
        .addFields({ name: 'Priority', value: t.priority, inline: true }, { name: 'Status', value: 'Unclaimed', inline: true });
      const msg=await channel.send({ embeds: [embed], components: ticketRows(t) });
      change('ticket',t.id,x=>{x.message=msg.id;});
    } catch(e) {safeLog(e,'ticket introduction');}
    drafts.delete(d.id);
    await tell(i,ticketText(t.messages?.opened||'Your ticket is ready: {channel}',t));
    await logEvent(i.guild,'Ticket opened',`**Channel:** <#${channel.id}>\n**Owner:** <@${i.user.id}>\n**Category:** ${display(c.title)}`);
  });
}
async function transcript(guild,t) {
  const c=await channelBy(guild,t.id); botPerm(c,[P.ViewChannel,P.ReadMessageHistory]);
  let before, messages=[], hasMore=false;
  while (messages.length<MAX_TRANSCRIPT) {
    const batch=await c.messages.fetch({limit:100,...(before?{before}:{})});
    if (!batch.size) break;
    messages.push(...batch.values()); before=batch.last().id;
    if (batch.size<100) break;
    if (messages.length===MAX_TRANSCRIPT) hasMore=(await c.messages.fetch({limit:1,before})).size>0;
  }
  messages.sort((a,b)=>a.createdTimestamp-b.createdTimestamp);
  const output=[
    'LD GIVEAWAYS - Ticket transcript',
    `Channel: ${t.id} | Owner: ${t.owner} | Exported: ${new Date().toISOString()}`,
    `Content intent enabled: ${process.env.ENABLE_MESSAGE_CONTENT==='true'}`,
    hasMore?`TRUNCATED: only the most recent ${MAX_TRANSCRIPT} messages are included.`:'All currently accessible messages included.',
    'Deleted messages, previous edits and attachment file contents are not included.',
    'Some content may be unavailable due to Discord message-content restrictions.',
    'Original ticket form responses:',
    ...t.answers.map(a=>`${a.label}\n${a.value||'Not provided.'}`),
    '',
    ...messages.map(m=>[
      `[${new Date(m.createdTimestamp).toISOString()}] ${m.author?.tag||'Unknown'} (${m.author?.id||'Unknown'}) [${m.id}]`,
      m.content||'[No text content returned by Discord]',
      ...m.attachments.map(a=>`Attachment URL: ${a.url}`),
      ...m.embeds.map(e=>`Embed: ${e.title||''}\n${e.description||''}`),
      ...m.components.map(c=>`Components: ${JSON.stringify(c.toJSON())}`),
    ].join('\n')),
  ].join('\n\n');
  return Buffer.from(output,'utf8');
}
async function ticketTranscriptReply(i,t) {
  if (!ticketAccess(i,t)) throw Error('You do not have access to this ticket transcript.');
  await i.deferReply({flags:EPH});
  const file=t.state==='closed'&&fs.existsSync(path.join(DATA_DIR,'transcripts',`${t.id}.txt`))
    ?fs.readFileSync(path.join(DATA_DIR,'transcripts',`${t.id}.txt`)):await transcript(i.guild,t);
  await tell(i,{content:'Ticket transcript. Attachment URLs may expire.',files:[new AttachmentBuilder(file,{name:`ticket-${t.id}.txt`})]});
}
async function closeTicket(i,t,reason) {
  if (!staff(i,t)&&!(i.user.id===t.owner&&t.allowOwnerClose)) throw Error('Only ticket staff can close this ticket.');
  await i.deferReply({flags:EPH});
  await locked(`ticket:${t.id}`,async()=>{
    t=get('ticket',t.id);
    if (t.state!=='open') throw Error('This ticket is not open.');
    const file=await transcript(i.guild,t);
    fs.writeFileSync(path.join(DATA_DIR,'transcripts',`${t.id}.txt`),file,{mode:0o600});
    change('ticket',t.id,x=>{x.state='closing';x.closed=Date.now();x.closeReason=reason;x.closedBy=i.user.id;});
    await finishTicketClose(i.guild,get('ticket',t.id));
    await tell(i,ticketText(t.messages?.closed||'The ticket was closed and its transcript was saved.',t));
  });
}
async function finishTicketClose(guild,t) {
  const c=await channelBy(guild,t.id);
  await c.permissionOverwrites.set(ticketPermissionOverwrites(guild,t,true),'Ticket closed');
  if (t.archive&&c.parentId!==t.archive) {
    const archive=await guild.channels.fetch(t.archive).catch(()=>null);
    if (archive?.type===ChannelType.GuildCategory) await c.setParent(t.archive,{lockPermissions:false});
  }
  change('ticket',t.id,x=>{x.state='closed';});
  t=get('ticket',t.id);
  await refreshTicket(guild,t).catch(e=>safeLog(e,'closed ticket message'));
  const filePath=path.join(DATA_DIR,'transcripts',`${t.id}.txt`);
  const delivered=await logEvent(guild,'Ticket closed',
    `**Channel:** <#${t.id}>\n**Closed by:** <@${t.closedBy}>\n**Reason:** ${display(t.closeReason)}`,
    fs.existsSync(filePath)?[new AttachmentBuilder(filePath,{name:`ticket-${t.id}.txt`})]:[]);
  change('ticket',t.id,x=>{x.transcriptLogged=delivered;});
}

// ------------------------- GIVEAWAYS -------------------------
function getGiveaway(i,id) {
  const g=get('giveaway',id);
  if (!g||g.guild!==i.guildId) throw Error('Giveaway not found. Use its message ID.');
  return g;
}
function giveawayPayload(g) {
  const count=sql.count.get(g.id).n;
  const status={active:'🟢 Open',paused:'🟡 Paused',drawing:'🎲 Drawing winners...',ended:'🔴 Ended',cancelled:'⚫ Cancelled'}[g.state]||g.state;
  const conditions=[
    g.requiredRole?`• <@&${g.requiredRole}>`:null,
    g.minAge?`• Account Age: **${g.minAge} Days**`:null,
    g.minJoin?`• Server Age: **${g.minJoin} Days**`:null,
    g.bonusRole?`• Bonus Role: <@&${g.bonusRole}> (+${g.bonusAmount} entries)`:null,
  ].filter(Boolean);
  
  const embed = new EmbedBuilder()
    .setTitle(`🎉 GIVEAWAY: ${g.prize}`)
    .setColor(g.color || 0x29b866)
    .setTimestamp(g.ends)
    .setFooter({ text: `Hosted by ${g.hostTag} | Ends at` });

  if (g.description) embed.setDescription(g.description);
  
  embed.addFields(
    { name: 'Winners', value: `🏆 \`${g.winnerCount}\``, inline: true },
    { name: 'Entries', value: `👥 \`${count}\``, inline: true },
    { name: 'Status', value: status, inline: true }
  );

  if (conditions.length) {
    embed.addFields({ name: '📋 Requirements', value: conditions.join('\n'), inline: false });
  }

  const result=g.rounds?.at(-1);
  if (result) {
    embed.addFields({ name: '🏅 Selected Winners', value: result.winners.length?result.winners.map(x=>`<@${x}>`).join(', '):'*No eligible entrants.*' });
  }

  const buttons = row(
    button(`giveaway-join:${g.id}`, '🎉 Join', ButtonStyle.Success, { disabled: g.state !== 'active' }),
    button(`giveaway-leave:${g.id}`, '🚫 Leave', ButtonStyle.Danger, { disabled: g.state !== 'active' })
  );

  return { embeds: [embed], components: [buttons], allowedMentions: NO_MENTIONS };
}
async function refreshGiveaway(guild,g) {
  const c=await sendChannel(guild,g.channel);
  const m=await c.messages.fetch(g.id); 
  await m.edit(giveawayPayload(g));
}
function giveawayPicker(i,id) {
  return tell(i,card(i.guildId,'Choose a giveaway duration.',[
    select(`giveaway-duration:${id}`,'Select duration',[
      ...['5m','1h','6h','1d','3d','7d'].map(x=>({label:x,value:x})),
      {label:'Custom duration',value:'custom'},
    ]),
  ],true));
}
function giveawayColorPicker(i,id) {
  return tell(i,card(i.guildId,'Choose a color for the giveaway embed.',[
    select(`giveaway-color:${id}`,'Select color',[
      ...Object.entries(PRESET_COLORS).map(([k,v])=>({label:v.name, value:k})),
      {label:'Custom Hex Code', value:'custom_hex'}
    ]),
  ],true));
}
function giveawayPreview(i,d) {
  const c = getEmbedColor(d);
  const mockG = { id: '123', guild: i.guildId, prize: d.prize, description: d.description, winnerCount: d.winnerCount, state: 'active', ends: Date.now() + d.duration, hostTag: i.user.tag, requiredRole: d.requiredRole, minAge: d.minAge, minJoin: d.minJoin, bonusRole: d.bonusRole, bonusAmount: d.bonusAmount, color: c };
  
  const embed = new EmbedBuilder()
    .setTitle(`🎉 GIVEAWAY: ${d.prize}`)
    .setColor(c)
    .setTimestamp(mockG.ends)
    .setFooter({ text: `Hosted by ${mockG.hostTag} | Ends at` })
    .addFields(
      { name: 'Winners', value: `🏆 \`${d.winnerCount}\``, inline: true },
      { name: 'Entries', value: `👥 \`0\``, inline: true },
      { name: 'Status', value: '🟢 Open', inline: true }
    );
  if (d.description) embed.setDescription(d.description);

  return tell(i, {
    content: `**Preview:**\nChannel: <#${d.channel}>\nDuration: ${d.durationText}`,
    embeds: [embed],
    components: [row(button(`giveaway-publish:${d.id}`,'Publish',3),button(`dismiss:${d.id}`,'Cancel'))],
    flags: EPH
  });
}
function eligible(g,m) {
  if (!m||m.user.bot) return false;
  if (g.requiredRole&&!m.roles.cache.has(g.requiredRole)) return false;
  if (g.minAge&&Date.now()-m.user.createdTimestamp<g.minAge*86400000) return false;
  if (g.minJoin&&(!m.joinedTimestamp||Date.now()-m.joinedTimestamp<g.minJoin*86400000)) return false;
  return true;
}
function sample(pool,count,random=crypto.randomInt) {
  const a=[...pool],out=[];
  for (let n=0;n<count&&a.length;n++) {const idx=random(a.length);out.push(a[idx]);a[idx]=a.at(-1);a.pop();}
  return out;
}
async function publishGiveaway(i,d) {
  requirePerm(i);
  if (!d.duration) throw Error('Select a duration first.');
  await i.deferReply({flags:EPH});
  await locked(`publish:${d.id}`,async()=>{
    readDraft(i,d.id,'giveaway');
    const c=await sendChannel(i.guild,d.channel);
    const finalColor = getEmbedColor(d);
    const g={id:'pending',guild:i.guildId,channel:c.id,host:i.user.id,hostTag:i.user.tag,prize:d.prize,description:d.description,
      winnerCount:d.winnerCount,requiredRole:d.requiredRole,minAge:d.minAge,minJoin:d.minJoin, bonusRole:d.bonusRole, bonusAmount:d.bonusAmount, color: finalColor,
      created:Date.now(),ends:Date.now()+d.duration,state:'active',rounds:[]};
    
    const m=await c.send({ embeds: [new EmbedBuilder().setTitle(`🎉 ${g.prize}`).setDescription('Preparing giveaway...').setColor(finalColor)] });
    g.id=m.id; put('giveaway',g.id,g);
    await m.edit(giveawayPayload(g));
    drafts.delete(d.id);
    await tell(i,`Giveaway published: ${m.url}\nID: \`${g.id}\``);
  });
}
async function drawGiveaway(guild,id,reroll=false) {
  return locked(`giveaway:${id}`,async()=>{
    let g=get('giveaway',id);
    if (!g) throw Error('Giveaway not found.');
    if (g.state!=='drawing'&&(reroll?g.state!=='ended':g.state!=='active'))
      throw Error(reroll?'Only ended giveaways can be rerolled.':'This giveaway is not open.');
    if(g.state!=='drawing')g=change('giveaway',id,x=>{x.state='drawing';x.drawMode=reroll?'reroll':'end';});
    const excluded=new Set((g.rounds||[]).flatMap(r=>r.winners));
    const entrants=sql.entries.all(id).map(e=>e.user).filter(x=>!excluded.has(x));
    const members=await guild.members.fetch();
    const pool=entrants.filter(x=>eligible(g,members.get(x)));
    const winners=sample(pool,g.winnerCount);
    const result={id:uid(),at:Date.now(),winners,eligibleCount:pool.length,notified:[],failedDM:[],dmAttempted:[],announcement:null};
    g=change('giveaway',id,x=>{
      x.state='ended';x.rounds.push(result);x.ended=Date.now();delete x.lastError;delete x.drawMode;
    });
    await deliverGiveaway(guild,g);
    return get('giveaway',id);
  });
}
async function deliverGiveaway(guild,g,retryDM=false) {
  const result=g.rounds?.at(-1); if (!result) return;
  let r=result;
  if (!r.announcement) {
    try {
      const c=await sendChannel(guild,g.channel);
      const marker=`Round ${r.id}`;
      const recent=await c.messages.fetch({limit:100});
      let msg=recent.find(m=>m.author.id===client.user.id&&m.embeds.some(e=>e.footer?.text===marker));
      if (!msg) {
        const embed = new EmbedBuilder()
          .setTitle(`🎉 Giveaway Ended: ${g.prize}`)
          .setColor(g.color || 0x29b866)
          .setDescription(`${r.winners.length?`**Winners:** ${r.winners.map(x=>`<@${x}>`).join(', ')}`:'No eligible entrants.'}\n**Eligible entrants:** ${r.eligibleCount}\n**Giveaway ID:** ${g.id}`)
          .setFooter({ text: marker })
          .setTimestamp();
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
      const dmEmbed = new EmbedBuilder()
        .setTitle('🎉 Congratulations! You Won!')
        .setColor(g.color || 0x29b866)
        .setDescription(`You won **${clean(g.prize,500)}** in **${display(guild.name)}**.\n\n[Click Here to view the Giveaway](https://discord.com/channels/${g.guild}/${g.channel}/${g.id})\n\nServer staff will arrange prize delivery.`)
        .setTimestamp();
      await user.send({ embeds: [dmEmbed], allowedMentions: NO_MENTIONS });
      change('giveaway',g.id,x=>{const a=x.rounds.find(a=>a.id===r.id);a.notified.push(userId);a.failedDM=a.failedDM.filter(u=>u!==userId);});
    } catch(e) {
      change('giveaway',g.id,x=>{const a=x.rounds.find(a=>a.id===r.id);if(!a.failedDM.includes(userId))a.failedDM.push(userId);});
      safeLog(e,'winner DM');
    }
  }
  await refreshGiveaway(guild,get('giveaway',g.id)).catch(e=>safeLog(e,'giveaway card refresh'));
}
async function joinGiveaway(i,id) {
  await i.deferReply({flags:EPH});
  await locked(`entry:${id}:${i.user.id}`,async()=>{
    let g=getGiveaway(i,id);
    if (g.state!=='active'||g.ends<=Date.now()) throw Error('This giveaway is no longer accepting entries.');
    const alreadyEntered=!!sql.hasEntry.get(id,i.user.id);
    if(alreadyEntered) throw Error('You have already joined this giveaway!');
    
    const member=await i.guild.members.fetch(i.user.id);
    if (!eligible(g,member)) throw Error('You do not meet this giveaway’s entry requirements.');

    g=getGiveaway(i,id);
    if (g.state!=='active'||g.ends<=Date.now()) throw Error('This giveaway has ended.');
    
    // Bonus entries logic
    let entriesToAdd = 1;
    if (g.bonusRole && member.roles.cache.has(g.bonusRole)) {
      entriesToAdd += (g.bonusAmount || 1);
    }

    const tx = db.transaction(() => {
      for(let e=0; e<entriesToAdd; e++){
        sql.join.run(id, `${i.user.id}_${e}`, Date.now()); // Use index to allow multiple entries
      }
      // Main entry for tracking
      sql.join.run(id, i.user.id, Date.now());
    });
    tx();

    await tell(i,`🎉 **Success!** Your entry has been recorded. (Bonus: +${entriesToAdd - 1} extra chances)`);
    queueGiveawayRefresh(i.guild,id);
  });
}
async function leaveGiveaway(i,id) {
  await i.deferReply({flags:EPH});
  await locked(`entry:${id}:${i.user.id}`,async()=>{
    let g=getGiveaway(i,id);
    if (g.state!=='active'||g.ends<=Date.now()) throw Error('This giveaway is no longer accepting entries.');
    const alreadyEntered=!!sql.hasEntry.get(id,i.user.id);
    if(!alreadyEntered) throw Error('You are not in this giveaway.');

    db.prepare('DELETE FROM entries WHERE giveaway=? AND user LIKE ?').run(id, `${i.user.id}%`);
    await tell(i,'🚫 Your entry has been removed.');
    queueGiveawayRefresh(i.guild,id);
  });
}
const refreshTimers=new Map();
function queueGiveawayRefresh(guild,id) {
  if(refreshTimers.has(id))return;
  refreshTimers.set(id,setTimeout(async()=>{
    refreshTimers.delete(id);
    const g=get('giveaway',id);if(g)await refreshGiveaway(guild,g).catch(e=>safeLog(e,'entry count refresh'));
  },2500));
}

// -------------------------- ROLE PANELS --------------------------
function assertRoleSafe(guild,role) {
  if (!role||role.id===guild.id||role.managed) throw Error('Choose a normal, assignable server role.');
  if (DANGEROUS.some(p=>role.permissions.has(p))) throw Error('Administrative or moderation roles cannot be used in a role panel.');
  if (protectedRoles(guild.id).has(role.id)||cfg(guild.id).logRole===role.id)
    throw Error('Ticket staff, template staff and log-access roles cannot be distributed in a role panel.');
  if (role.position>=guild.members.me.roles.highest.position) throw Error('Move the bot role above every panel role.');
}
async function parseRoleMappings(guild,raw) {
  const lines=raw.split('\n').map(x=>x.trim()).filter(Boolean);
  if(!lines.length||lines.length>20)throw Error('Use 1–20 role mappings.');
  const mappings=[];
  for(const line of lines) {
    const p=line.split('|').map(x=>x.trim());
    if(p.length!==3||!snowflake(p[1])||!p[2]||p[2].length>80)throw Error('Each line must be: emoji | ROLE_ID | button label');
    const role=await guild.roles.fetch(p[1]);assertRoleSafe(guild,role);
    if(mappings.some(x=>x.role===role.id))throw Error('Each role can appear only once.');
    const custom=p[0].match(/^<a?:([A-Za-z0-9_]+):(\d{17,20})>$/);
    let emoji;
    if(custom) {
      const e=guild.emojis.cache.get(custom[2]);
      if(!e||!e.available)throw Error('Custom emojis must be available in this server.');
      emoji={id:e.id,name:e.name,animated:e.animated};
    } else {
      if(!/\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u.test(p[0])||p[0].length>20)
        throw Error('Use a valid Unicode emoji or a server custom emoji.');
      emoji={name:p[0]};
    }
    mappings.push({role:role.id,label:p[2],emoji});
  }
  return mappings;
}
function rolePanelPayload(p) {
  const rows=[];
  for(let n=0;n<p.mappings.length;n+=5)
    rows.push(row(...p.mappings.slice(n,n+5).map((m,j)=>button(`role:${p.id}:${n+j}:${p.revision||'0'}`,m.label,2,{emoji:m.emoji}))));
  return card(p.guild,`## ${p.title}\n${p.text}`,rows);
}
async function roleClick(i,id,index,revision) {
  await i.deferReply({flags:EPH});
  await locked(`role:${i.guildId}:${i.user.id}`,async()=>{
    const p=get('rolepanel',id);
    if(!p||p.guild!==i.guildId||p.message!==i.message.id||p.channel!==i.channelId)throw Error('This role panel is no longer active.');
    if((p.revision||'0')!==revision)throw Error('This panel was updated. Refresh the message and select the role again.');
    const mapping=p.mappings[Number(index)];if(!mapping)throw Error('This role option is no longer available.');
    const role=await i.guild.roles.fetch(mapping.role);assertRoleSafe(i.guild,role);
    const member=await i.guild.members.fetch(i.user.id);
    if(member.roles.cache.has(role.id)) {
      const until=sql.roleCooldown.get(i.user.id,role.id)?.until||0;
      if(until>Date.now())throw Error(`You can remove this role ${ts(until)}.`);
      await member.roles.remove(role,'Self-service role panel');
      await tell(i,`Removed <@&${role.id}>.`);
    } else {
      sql.coolSet.run(id,i.user.id,role.id,Date.now()+20000);
      await member.roles.add(role,'Self-service role panel');
      await tell(i,`Added <@&${role.id}>. You can remove it ${ts(Date.now()+20000)}.`);
    }
  });
}

// -------------------------- SERVER SETUP --------------------------
function setupPicker(i,page=0) {
  return tell(i,card(i.guildId,'Select a server template to preview. Existing channels and roles will not be deleted.',[
    select('setup-select','Select a template',TEMPLATES.slice(page*25,page*25+25).map(t=>({label:t.title,value:t.id}))),
    row(button('setup-page:0','Templates 1–25',2,{disabled:page===0}),button('setup-page:1','Templates 26–30',2,{disabled:page===1})),
  ],true));
}
function setupPreview(i,id) {
  const t=TEMPLATES.find(x=>x.id===id);if(!t)throw Error('Template not found.');
  const d=draft(i,'setup',{template:id});
  return tell(i,card(i.guildId,
    `## ${t.title}\n${t.categories.map(c=>`**${c.name} (${c.mode}${c.voice?', voice':''})**\n${c.channels.map(x=>c.voice?x:`#${x}`).join(', ')}`).join('\n\n')}\n\n**Roles:** ${t.title} Member, ${t.title} Staff.\nNeither role receives server management permissions. Staff can view private categories and write in information channels.\nExisting resources will not be deleted. Only the server owner can apply this template.`,
    [row(button(`setup-apply:${d}`,'Apply template',4),button(`dismiss:${d}`,'Cancel'))],true));
}
function setupOverwrites(guild,staffRole,mode) {
  const list=[
    {id:guild.id,...(mode==='private'?{deny:[P.ViewChannel,P.Connect]}:mode==='readonly'?{allow:[P.ViewChannel],deny:[P.SendMessages,P.AddReactions,P.CreatePublicThreads,P.CreatePrivateThreads,P.SendMessagesInThreads]}:{allow:[P.ViewChannel,P.SendMessages,P.Connect,P.Speak,P.Stream,P.UseVAD]})},
    {id:client.user.id,allow:[...ALL_CHANNEL_PERMS,P.ManageChannels,P.ManageRoles,P.Connect,P.Speak,P.Stream,P.UseVAD]},
    {id:staffRole,allow:[...ALL_CHANNEL_PERMS,P.Connect,P.Speak,P.Stream,P.UseVAD]},
  ];
  return list;
}
async function applySetup(i,d,typed) {
  if(i.guild.ownerId!==i.user.id)throw Error('Only the server owner can apply a server template.');
  requirePerm(i);
  const t=TEMPLATES.find(x=>x.id===d.template);
  if(typed!==t.title)throw Error('The template name did not match. Nothing was changed.');
  await i.deferReply({flags:EPH});
  await locked(`setup:${i.guildId}`,async()=>{
    botPerm(i.channel,[P.ManageChannels,P.ManageRoles]);
    const key=`${i.guildId}:${t.id}`;
    let job=get('setup',key)||{id:key,guild:i.guildId,template:t.id,roles:{},categories:{},channels:{},created:Date.now()};
    const save=()=>put('setup',key,job);
    save();
    await i.guild.channels.fetch();await i.guild.roles.fetch();
    const needed=t.categories.reduce((n,c)=>n+1+c.channels.length,0);
    if(i.guild.channels.cache.size+needed>500&&!Object.keys(job.channels).length)throw Error('This template may exceed the server channel limit.');
    for(const kind of ['Member','Staff']) {
      let role=job.roles[kind]?await i.guild.roles.fetch(job.roles[kind]).catch(()=>null):null;
      const name=`${t.title} ${kind}`;
      if(!role&&job.startedRoles?.includes(kind))role=i.guild.roles.cache.find(r=>r.name===name&&!r.managed&&r.permissions.bitfield===0n);
      if(!role) {
        job.startedRoles=[...new Set([...(job.startedRoles||[]),kind])];save();
        role=await i.guild.roles.create({name,permissions:[],reason:`Server template ${t.title}`});
      }
      job.roles[kind]=role.id;save();
    }
    for(let a=0;a<t.categories.length;a++) {
      const plan=t.categories[a],ck=String(a);
      let category=job.categories[ck]?i.guild.channels.cache.get(job.categories[ck]):null;
      if(!category&&job.pendingCategory===ck)
        category=i.guild.channels.cache.find(c=>c.type===4&&c.name===plan.name&&c.permissionOverwrites.cache.has(job.roles.Staff));
      if(!category) {
        job.pendingCategory=ck;save();
        category=await i.guild.channels.create({name:plan.name,type:ChannelType.GuildCategory,
          permissionOverwrites:setupOverwrites(i.guild,job.roles.Staff,plan.mode),reason:`Server template ${t.title}`});
      }
      job.categories[ck]=category.id;delete job.pendingCategory;save();
      for(let b=0;b<plan.channels.length;b++) {
        const name=plan.channels[b],keyChannel=`${a}:${b}`;
        const channelType=plan.voice?ChannelType.GuildVoice:ChannelType.GuildText;
        let channel=job.channels[keyChannel]?i.guild.channels.cache.get(job.channels[keyChannel]):null;
        if(!channel)channel=i.guild.channels.cache.find(c=>c.parentId===category.id&&c.name===name&&c.type===channelType);
        if(!channel)channel=await i.guild.channels.create({name,type:channelType,parent:category.id,
          permissionOverwrites:setupOverwrites(i.guild,job.roles.Staff,plan.mode),reason:`Server template ${t.title}`});
        job.channels[keyChannel]=channel.id;save();
      }
    }
    job.completed=Date.now();save();drafts.delete(d.id);
    await tell(i,`${t.title} is ready. ${Object.keys(job.categories).length} categories and ${Object.keys(job.channels).length} channels are recorded. Existing resources were not deleted. Assign the new roles manually when appropriate.`);
    await logEvent(i.guild,'Server template applied',`**Template:** ${t.title}\n**Applied by:** <@${i.user.id}>`);
  });
}

// -------------------------- MODERATION --------------------------
const MOD_PERMS={warn:P.ModerateMembers,warnings:P.ModerateMembers,clearwarnings:P.ModerateMembers,
  kick:P.KickMembers,ban:P.BanMembers,unban:P.BanMembers,timeout:P.ModerateMembers,untimeout:P.ModerateMembers,
  purge:P.ManageMessages,slowmode:P.ManageChannels,lock:P.ManageChannels,unlock:P.ManageChannels,case:P.ModerateMembers};
async function targetMember(i,userId,action) {
  const member=await i.guild.members.fetch(userId).catch(()=>null);
  if(!member)throw Error('This user is not a server member.');
  if(userId===i.user.id||userId===client.user.id||userId===i.guild.ownerId)throw Error('You cannot use this action on yourself, this bot or the server owner.');
  const actor=await i.guild.members.fetch(i.user.id);
  if(i.user.id!==i.guild.ownerId&&actor.roles.highest.comparePositionTo(member.roles.highest)<=0)
    throw Error('Your highest role must be above the target member.');
  if(i.guild.members.me.roles.highest.comparePositionTo(member.roles.highest)<=0)
    throw Error('The bot’s highest role must be above the target member.');
  if(['timeout','untimeout'].includes(action)&&!member.moderatable)throw Error('This member cannot be timed out by the bot.');
  if(action==='kick'&&!member.kickable)throw Error('This member cannot be kicked by the bot.');
  if(action==='ban'&&!member.bannable)throw Error('This member cannot be banned by the bot.');
  return member;
}
async function runMod(i,action,data) {
  requirePerm(i,MOD_PERMS[action]);botPerm(i.channel,MOD_PERMS[action]);
  const reason=data.reason||'No reason provided.',apiReason=auditReason(i,reason);
  let target=data.user||i.channelId;
  if(['warn','clearwarnings','kick','ban','timeout','untimeout'].includes(action)) {
    const member=await targetMember(i,data.user,action);
    if(action==='warn') {
      const key=`${i.guildId}:${member.id}`,w=get('warnings',key)||{guild:i.guildId,user:member.id,items:[]};
      w.items.push({id:uid(),at:Date.now(),actor:i.user.id,reason});w.items=w.items.slice(-100);put('warnings',key,w);
      await member.send({content:`You received a warning in **${display(i.guild.name)}**.\nReason: ${reason}`,allowedMentions:NO_MENTIONS}).catch(()=>null);
    } else if(action==='clearwarnings')sql.del.run('warnings',`${i.guildId}:${member.id}`);
    else if(action==='kick')await member.kick(apiReason);
    else if(action==='ban')await member.ban({deleteMessageSeconds:(data.deleteDays||0)*86400,reason:apiReason});
    else if(action==='timeout')await member.timeout(data.duration,apiReason);
    else if(action==='untimeout')await member.timeout(null,apiReason);
  } else if(action==='unban') {
    if(!snowflake(data.user))throw Error('Provide a valid user ID.');
    await i.guild.bans.remove(data.user,apiReason);
  } else if(action==='purge') {
    if(i.channel.type!==ChannelType.GuildText)throw Error('Use this command in a server text channel.');
    botPerm(i.channel,P.ReadMessageHistory);
    const messages=await i.channel.messages.fetch({limit:data.amount});
    const recent=messages.filter(m=>Date.now()-m.createdTimestamp<14*86400000-10000);
    const deleted=recent.size?await i.channel.bulkDelete(recent,true):{size:0};
    data.deleted=deleted.size;
  } else if(action==='slowmode')await i.channel.setRateLimitPerUser(data.seconds,apiReason);
  else if(action==='lock'||action==='unlock') {
    botPerm(i.channel,P.ManageRoles);
    const key=`${i.guildId}:${i.channelId}`;
    if(action==='lock') {
      if(get('channel-lock',key))throw Error('This channel already has a saved lock.');
      const overwrite=i.channel.permissionOverwrites.cache.get(i.guildId);
      const previous=overwrite?.allow.has(P.SendMessages)?true:overwrite?.deny.has(P.SendMessages)?false:null;
      put('channel-lock',key,{guild:i.guildId,channel:i.channelId,previous,at:Date.now()});
      try {await i.channel.permissionOverwrites.edit(i.guildId,{SendMessages:false},{reason:apiReason});}
      catch(e){sql.del.run('channel-lock',key);throw e;}
    } else {
      const saved=get('channel-lock',key);if(!saved)throw Error('No saved lock exists for this channel.');
      await i.channel.permissionOverwrites.edit(i.guildId,{SendMessages:saved.previous},{reason:apiReason});
      sql.del.run('channel-lock',key);
    }
  }
  const c=recordCase(i,action,target,reason,action==='purge'?{deleted:data.deleted}:{});
  
  const embed = new EmbedBuilder()
    .setTitle(`🛡️ Moderation: ${action.toUpperCase()}`)
    .setColor(0xED4245)
    .setDescription(`${action==='purge'?`**${data.deleted}** messages deleted.`:'Action completed successfully.'}\n**Case ID:** \`${c.id}\``);
  await tell(i, { embeds: [embed] });
  await auditCase(i,c);
}
async function moderation(i) {
  const action=i.options.getSubcommand();requirePerm(i,MOD_PERMS[action]);
  if(action==='case') {
    const c=get('case',i.options.getString('case_id'));
    if(!c||c.guild!==i.guildId)throw Error('Case not found.');
    return tell(i,card(i.guildId,`**Case:** \`${c.id}\`\n**Action:** ${c.action}\n**Target:** ${c.target}\n**Moderator:** <@${c.actor}>\n**Reason:** ${display(c.reason)}\n**Date:** ${ts(c.at,'F')}`,[],true));
  }
  if(action==='warnings') {
    const user=i.options.getUser('user',true),w=get('warnings',`${i.guildId}:${user.id}`);
    const lines=(w?.items||[]).slice(-15).map(x=>`\`${x.id}\` ${ts(x.at,'d')} - ${display(x.reason)}`);
    return tell(i,card(i.guildId,`**Warnings for <@${user.id}>:** ${w?.items.length||0}\n${lines.join('\n').slice(0,3400)||'No warnings recorded.'}`,[],true));
  }
  const data={user:i.options.getUser('user')?.id||i.options.getString('user_id'),
    reason:reasonOf(i),amount:i.options.getInteger('amount'),seconds:i.options.getInteger('seconds'),
    deleteDays:i.options.getInteger('delete_days')||0};
  if(action==='timeout')data.duration=duration(i.options.getString('duration'),28*86400000);
  if(['ban','kick','purge','clearwarnings'].includes(action))
    return confirm(i,'mod',{action,...data},
      `Confirm **${action}** ${data.user?`for <@${data.user}>`:`in <#${i.channelId}>`}.${action==='purge'?`\nRecent messages to inspect: ${data.amount}. Messages older than 14 days will be skipped.`:''}${action==='ban'?`\nMessage history deletion: ${data.deleteDays} days.`:''}\n**Reason:** ${display(data.reason)}`);
  await i.deferReply({flags:EPH});await runMod(i,action,data);
}

// -------------------------- SLASH ROUTER --------------------------
async function slash(i) {
  const name=i.commandName;
  if(name==='help'||name==='about')return i.reply(helpPayload(i.guildId));
  if(name==='userinfo') {
    await i.deferReply();
    const user = i.options.getUser('user') || i.user;
    const member = await i.guild.members.fetch(user.id).catch(() => null);
    const embed = new EmbedBuilder()
      .setTitle(`👤 User Info: ${user.tag}`)
      .setColor(cfg(i.guildId).color)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false }
      );
    if (member) {
      embed.addFields(
        { name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
        { name: 'Roles', value: member.roles.cache.filter(r => r.id !== i.guildId).map(r => `<@&${r.id}>`).join(', ').slice(0, 1024) || 'None' }
      );
    }
    return tell(i, { embeds: [embed] });
  }
  if(name==='serverinfo') {
    await i.deferReply();
    const embed = new EmbedBuilder()
      .setTitle(`🏰 Server Info: ${i.guild.name}`)
      .setColor(cfg(i.guildId).color)
      .setThumbnail(i.guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'Owner', value: `<@${i.guild.ownerId}>`, inline: true },
        { name: 'Members', value: `${i.guild.memberCount}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(i.guild.createdTimestamp / 1000)}:F>`, inline: false }
      );
    return tell(i, { embeds: [embed] });
  }
  if(name==='embed') {
    requirePerm(i);
    await i.deferReply({flags:EPH});
    const ch = i.options.getChannel('channel') || i.channel;
    const embed = new EmbedBuilder()
      .setDescription(i.options.getString('description', true))
      .setColor(i.options.getString('color') ? parseInt(i.options.getString('color').replace('#',''), 16) : cfg(i.guildId).color);
    if(i.options.getString('title')) embed.setTitle(i.options.getString('title'));
    if(i.options.getString('footer')) embed.setFooter({ text: i.options.getString('footer') });
    if(i.options.getString('image_url')) embed.setImage(i.options.getString('image_url'));
    
    const c = await sendChannel(i.guild, ch.id);
    await c.send({ embeds: [embed] });
    return tell(i, 'Embed sent successfully!');
  }
  if(['announcement','say','dm'].includes(name)) {
    requirePerm(i);
    await i.deferReply({flags:EPH});
    const rawText=i.options.getString('text',true);
    const markdown = i.options.getBoolean('markdown') === true;
    const asEmbed = i.options.getBoolean('embed') === true;
    const finalText = markdown ? autoMarkdown(rawText) : rawText;
    
    const user=i.options.getUser('user');
    if(user?.bot)throw Error('Choose a human server member.');
    if(user)await i.guild.members.fetch(user.id);
    const channel=i.options.getChannel('channel')||i.channel;
    if(!user)await sendChannel(i.guild,channel.id);
    
    const id = draft(i, 'message-preview', {kind:name, text:finalText, user:user?.id, channel:channel.id, ping:i.options.getBoolean('ping')===true, asEmbed, colorKey: null, customHex: null});
    return messagePreview(i, id);
  }
  if(name==='status') {
    requirePerm(i);
    const state={text:i.options.getString('text',true),activity:i.options.getString('activity')||'Playing',presence:i.options.getString('presence')||'online'};
    put('presence','bot',state);applyPresence(state);return tell(i,'Bot status updated.');
  }
  if(name==='stats') {
    const giveaways = all('giveaway').filter(g=>g.guild===i.guildId);
    const tickets = all('ticket').filter(t=>t.guild===i.guildId);
    const embed = new EmbedBuilder()
      .setTitle('📊 Bot Statistics')
      .setColor(cfg(i.guildId).color)
      .addFields(
        { name: 'Giveaways', value: `Total: **${giveaways.length}**\nActive: **${giveaways.filter(g=>g.state==='active').length}**`, inline: true },
        { name: 'Tickets', value: `Total: **${tickets.length}**\nOpen: **${tickets.filter(t=>t.state==='open').length}**`, inline: true },
        { name: 'Version', value: `v${VERSION}`, inline: true }
      );
    return tell(i, { embeds: [embed] });
  }
  if(name==='config') {
    requirePerm(i);
    await i.deferReply({flags:EPH});
    const channel=i.options.getChannel('log_channel'),color=i.options.getString('color'),days=i.options.getInteger('retention_days'),
      logRole=i.options.getRole('log_role');
    if(logRole&&(logRole.id===i.guildId||all('rolepanel').some(p=>p.guild===i.guildId&&p.mappings.some(m=>m.role===logRole.id))))
      throw Error('Choose a dedicated log role that is not @everyone or distributed by a role panel.');
    const proposed={...cfg(i.guildId),...(logRole?{logRole:logRole.id}:{})};
    if(channel) {
      botPerm(channel,[P.ViewChannel,P.SendMessages,P.AttachFiles]);
      await privateLogChannel(channel,proposed);
    }
    if(color&&!/^#[0-9a-f]{6}$/i.test(color))throw Error('Use a hex color such as #29B866.');
    const c=updateCfg(i.guildId,c=>{if(channel)c.logChannel=channel.id;if(logRole)c.logRole=logRole.id;if(color)c.color=parseInt(color.slice(1),16);if(days)c.retentionDays=days;});
    if(i.options.getBoolean('backup')) {
      const objects=db.prepare('SELECT kind,id,data FROM objects').all();
      const payload={version:VERSION,exported:new Date().toISOString(),objects:objects.map(o=>({...o,data:JSON.parse(o.data)})),
        entries:db.prepare('SELECT * FROM entries').all(),cooldowns:db.prepare('SELECT * FROM cooldowns').all()};
      return tell(i,{content:'Private data export. This contains member records; store it securely. Transcript files are not included.',
        files:[new AttachmentBuilder(Buffer.from(JSON.stringify(payload,null,2)),{name:`ld-backup-${Date.now()}.json`})]});
    }
    return tell(i,`Configuration saved.\nLog channel: ${c.logChannel?`<#${c.logChannel}>`:'Not configured'}\nClosed ticket retention: ${c.retentionDays} days.`);
  }
  if(name==='ticket')return ticketCommand(i);
  if(name==='giveaway')return giveawayCommand(i);
  if(name==='rolepanel')return rolePanelCommand(i);
  if(name==='setup'){requirePerm(i);return setupPicker(i);}
  if(name==='mod')return moderation(i);
}

function messagePreview(i, id) {
  const d = readDraft(i, id, 'message-preview');
  const payload = {
    content: `**Preview:**\nTarget: ${d.user ? `<@${d.user}>` : `<#${d.channel}>`}\nFormat: ${d.asEmbed ? 'Embed' : 'Plain Text'}`,
    components: [
      row(button(`message-send:${id}`, 'Send Message', 3), button(`dismiss:${id}`, 'Cancel')),
    ]
  };
  if (d.asEmbed) {
    const embed = new EmbedBuilder().setDescription(d.text).setColor(getEmbedColor(d));
    payload.embeds = [embed];
    payload.components.unshift(colorSelectMenu(id, d.colorKey || (d.customHex ? 'custom_hex' : null)));
  } else {
    payload.content = `**Preview:**\nTarget: ${d.user ? `<@${d.user}>` : `<#${d.channel}>`}\n\n${d.text}`;
  }
  return i.editReply({ ...payload, flags: EPH });
}

async function ticketCommand(i) {
  const action=i.options.getSubcommand();
  if(['category','settings','appearance','messages','remove-category','panel','edit'].includes(action))requirePerm(i);
  if(action==='appearance'||action==='messages') {
    const key=i.options.getString('key',true),c=cfg(i.guildId).ticketCategories[key];
    if(!c)throw Error('Category not found.');
    const id=draft(i,`ticket-${action}`,{key});
    if(action==='appearance')return i.showModal(modal(`ticket-appearance:${id}`,'Ticket appearance',[
      {id:'claim',label:'Claim button',short:true,max:80,value:c.labels?.claim||'Claim'},
      {id:'claimed',label:'Claimed button',short:true,max:80,value:c.labels?.claimed||'Claimed'},
      {id:'close',label:'Close button',short:true,max:80,value:c.labels?.close||'Close'},
      {id:'transcript',label:'Transcript button',short:true,max:80,value:c.labels?.transcript||'Transcript'},
      {id:'prefix',label:'Channel name prefix',short:true,max:30,value:c.channelPrefix||'ticket'},
    ]));
    return i.showModal(modal(`ticket-messages:${id}`,'Ticket messages',[
      {id:'opened',label:'Response after opening',max:600,value:c.messages?.opened||'Your ticket is ready: {channel}'},
      {id:'closed',label:'Response after closing',max:600,value:c.messages?.closed||'The ticket was closed and its transcript was saved.'},
      {id:'claimed',label:'Response after claiming',max:600,value:c.messages?.claimed||'Ticket claimed by {user}.'},
      {id:'closeTitle',label:'Close form title',short:true,max:45,value:c.messages?.closeTitle||'Close ticket'},
      {id:'closeReason',label:'Close reason field label',short:true,max:45,value:c.messages?.closeReason||'Reason for closing'},
    ]));
  }
  if(action==='category') {
    const key=i.options.getString('key',true);
    if(!/^[a-z0-9-]{1,24}$/.test(key))throw Error('Use a lowercase category key with letters, numbers and hyphens.');
    const cats=cfg(i.guildId).ticketCategories;
    if(!cats[key]&&Object.keys(cats).length>=25)throw Error('A maximum of 25 ticket categories is supported.');
    const support=i.options.getRole('support_role',true);
    if(support.id===i.guildId||support.managed)throw Error('Choose a dedicated, non-managed support role.');
    if(all('rolepanel').some(p=>p.guild===i.guildId&&p.mappings.some(m=>m.role===support.id)))
      throw Error('Remove this role from self-service panels before using it as a support role.');
    return ticketConfigModal(i,key,{parent:i.options.getChannel('parent',true).id,supportRole:support.id,archive:i.options.getChannel('archive')?.id||null});
  }
  if(action==='settings'||action==='remove-category') {
    const key=i.options.getString('key',true);
    if(!cfg(i.guildId).ticketCategories[key])throw Error('Category not found.');
    updateCfg(i.guildId,c=>{
      if(action==='remove-category')delete c.ticketCategories[key];
      else {
        const max=i.options.getInteger('max_open'),total=i.options.getInteger('max_total'),allow=i.options.getBoolean('allow_owner_close');
        if(max)c.ticketCategories[key].maxOpen=max;
        if(total)c.ticketCategories[key].maxTotal=total;
        if(allow!==null)c.ticketCategories[key].allowOwnerClose=allow;
      }
    });return tell(i,'Ticket category updated. Existing tickets keep their original settings.');
  }
  if(action==='panel'||action==='edit') {
    await i.deferReply({flags:EPH});
    const c=await sendChannel(i.guild,i.options.getChannel('channel',true).id);
    const p={guild:i.guildId,channel:c.id,title:i.options.getString('title',true),text:i.options.getString('text',true),
      placeholder:i.options.getString('placeholder')||'Select a ticket category'};
    let m;
    if(action==='edit') {
      const mid=i.options.getString('message_id',true),old=get('ticketpanel',mid);
      if(!old||old.guild!==i.guildId||old.channel!==c.id)throw Error('Ticket panel not found.');
      p.placeholder=old.placeholder;
      m=await c.messages.fetch(mid);await m.edit(ticketPanelPayload(i.guildId,p));
    } else m=await c.send(ticketPanelPayload(i.guildId,p));
    p.id=m.id;put('ticketpanel',m.id,p);return tell(i,`Ticket panel saved: ${m.url}`);
  }
  let t=currentTicket(i);
  if(action==='transcript')return ticketTranscriptReply(i,t);
  ticketStaff(i,t);
  if(action==='forget') {
    requirePerm(i);
    if(t.state!=='closed')throw Error('Only a closed ticket record can be deleted.');
    return confirm(i,'ticket-forget',{ticket:t.id},'Delete this closed ticket record and its local transcript? The Discord channel and any uploaded log copies will remain.');
  }
  await i.deferReply({flags:EPH});
  await locked(`ticket:${t.id}`,async()=>{
    t=currentTicket(i);
    if(action==='add'||action==='remove') {
      if(t.state!=='open')throw Error('Reopen this ticket first.');
      const user=i.options.getUser('user',true);
      if(user.id===t.owner||user.id===client.user.id)throw Error('The ticket owner and bot access cannot be changed this way.');
      const member=await i.guild.members.fetch(user.id);
      if(member.roles.cache.has(t.supportRole)||member.permissions.has(P.Administrator))throw Error('This member already has staff access.');
      if(action==='add') {
        if(t.participants.length>=20&&!t.participants.includes(user.id))throw Error('This ticket already has 20 additional participants.');
        await i.channel.permissionOverwrites.edit(user.id,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true,AttachFiles:true,EmbedLinks:true});
        change('ticket',t.id,x=>{if(!x.participants.includes(user.id))x.participants.push(user.id);});
      } else {
        await i.channel.permissionOverwrites.delete(user.id);
        change('ticket',t.id,x=>{x.participants=x.participants.filter(x=>x!==user.id);});
      }
    } else if(action==='rename') {
      const name=i.options.getString('name',true).toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-');
      if(!/[a-z0-9]/.test(name))throw Error('Use a channel name containing letters or numbers.');
      await i.channel.setName(name);
    } else if(action==='reopen') {
      if(t.state!=='closed')throw Error('This ticket is not closed.');
      await i.channel.permissionOverwrites.set(ticketPermissionOverwrites(i.guild,t));
      if(t.parent)await i.channel.setParent(t.parent,{lockPermissions:false}).catch(()=>null);
      t=change('ticket',t.id,x=>{x.state='open';x.claimed=null;delete x.closed;});
      await refreshTicket(i.guild,t).catch(e=>safeLog(e,'reopen refresh'));
    } else if(action==='claim'||action==='unclaim') {
      if(t.state!=='open')throw Error('This ticket is not open.');
      if(action==='claim'&&t.claimed)throw Error('This ticket has already been claimed.');
      t=change('ticket',t.id,x=>{x.claimed=action==='claim'?i.user.id:null;});
      await refreshTicket(i.guild,t);
    }
    await tell(i,action==='claim'?ticketText(t.messages?.claimed||'Ticket claimed by {user}.',t,i.user.id):'Ticket updated.');
  });
}
async function giveawayCommand(i) {
  const action=i.options.getSubcommand();
  if(action==='list') {
    const list=all('giveaway').filter(g=>g.guild===i.guildId).sort((a,b)=>b.created-a.created).slice(0,15);
    return tell(i,card(i.guildId,list.map(g=>`**${display(g.prize)}**\nID: \`${g.id}\` | ${g.state} | ${ts(g.ends)}`).join('\n\n').slice(0,3900)||'No giveaways recorded.',[],true));
  }
  if(action==='create') {
    requirePerm(i);
    const role=i.options.getRole('required_role');
    const bonusRole=i.options.getRole('bonus_role');
    const bonusAmount=i.options.getInteger('bonus_amount');
    const id=draft(i,'giveaway',{channel:i.options.getChannel('channel',true).id,requiredRole:role?.id||null,
      minAge:i.options.getInteger('min_age_days')||0,minJoin:i.options.getInteger('min_join_days')||0,
      bonusRole:bonusRole?.id||null, bonusAmount:bonusAmount||1});
    return i.showModal(modal(`giveaway-details:${id}`,'Create giveaway',[
      {id:'prize',label:'Prize',short:true,max:200},
      {id:'description',label:'Description',max:1500,required:false},
      {id:'winners',label:'Number of winners (1–20)',short:true,max:2,value:'1'},
    ]));
  }
  const g=getGiveaway(i,i.options.getString('id',true));
  if(action==='edit') {
    requirePerm(i);
    if(g.state!=='active'||g.ends<=Date.now())throw Error('Only active giveaways can be edited.');
    const id=draft(i,'giveaway-edit',{giveaway:g.id});
    return i.showModal(modal(`giveaway-edit:${id}`,'Edit giveaway',[
      {id:'prize',label:'Prize',short:true,max:200,value:g.prize},
      {id:'description',label:'Description',max:1500,required:false,value:g.description},
      {id:'winners',label:'Number of winners (1–20)',short:true,max:2,value:String(g.winnerCount)},
      {id:'duration',label:'New remaining duration (optional)',short:true,max:40,required:false,placeholder:'Leave empty to keep the current end time.'},
    ]));
  }
  if(action==='info') {
    const r=g.rounds.at(-1);
    return tell(i,card(i.guildId,`**Prize:** ${display(g.prize)}\n**ID:** \`${g.id}\`\n**Status:** ${g.state}\n**Entries:** ${sql.count.get(g.id).n}\n**End:** ${ts(g.ends,'F')}${r?`\n**Round:** ${r.id}\n**Eligible at draw:** ${r.eligibleCount}\n**Winner DMs accepted:** ${r.notified.length}/${r.winners.length}\n**Result announcement:** ${r.announcement?'Sent':'Pending'}`:''}`,[],true));
  }
  requirePerm(i);
  if(action==='pause') {
    await locked(`giveaway:${g.id}`, async () => {
      if(g.state !== 'active') throw Error('Only active giveaways can be paused.');
      g = change('giveaway', g.id, x => {
        x.state = 'paused';
        x.pausedAt = Date.now();
        x.remainingTime = x.ends - Date.now();
      });
      await refreshGiveaway(i.guild, g);
    });
    return tell(i, 'Giveaway paused.');
  }
  if(action==='resume') {
    await locked(`giveaway:${g.id}`, async () => {
      if(g.state !== 'paused') throw Error('Only paused giveaways can be resumed.');
      g = change('giveaway', g.id, x => {
        x.state = 'active';
        x.ends = Date.now() + x.remainingTime;
        delete x.pausedAt; delete x.remainingTime;
      });
      await refreshGiveaway(i.guild, g);
    });
    return tell(i, 'Giveaway resumed.');
  }
  if(action==='retry') {
    await i.deferReply({flags:EPH});
    await locked(`giveaway:${g.id}`,()=>deliverGiveaway(i.guild,g,true));
    return tell(i,'Pending notifications were retried. Use /giveaway info to review delivery status.');
  }
  return confirm(i,'giveaway',{action,id:g.id},`Confirm **${action}** for **${display(g.prize)}**?\nGiveaway ID: \`${g.id}\`${action==='reroll'?'\nAll previous winners will be excluded.':''}`);
}
async function rolePanelCommand(i) {
  requirePerm(i);const action=i.options.getSubcommand();
  const channel=i.options.getChannel('channel',true);
  if(action==='remove') {
    const p=get('rolepanel',i.options.getString('message_id',true));
    if(!p||p.guild!==i.guildId||p.channel!==channel.id)throw Error('Role panel not found.');
    return confirm(i,'rolepanel-remove',{id:p.id},'Remove this panel’s role buttons? Existing member roles will not be removed.');
  }
  let old=null;
  if(action==='edit') {
    old=get('rolepanel',i.options.getString('message_id',true));
    if(!old||old.guild!==i.guildId||old.channel!==channel.id)throw Error('Role panel not found.');
  }
  const id=draft(i,'rolepanel',{channel:channel.id,existing:old?.id||null,
    title:i.options.getString('title',true),text:i.options.getString('text',true)});
  return i.showModal(modal(`rolepanel-save:${id}`,'Role panel mappings',[
    {id:'mappings',label:'emoji | ROLE_ID | button label (one per line)',max:3500,
      value:old?.raw||'',placeholder:'Use your own emoji, role ID and button label.'},
  ]));
}
function applyPresence(state) {
  if (state.activity === 'Custom') {
    client.user.setPresence({ status: state.presence, activities: [{ name: state.text, type: ActivityType.Custom, state: state.text }] });
  } else {
    client.user.setPresence({ status: state.presence, activities: [{ name: state.text, type: ActivityType[state.activity] ?? ActivityType.Playing }] });
  }
}

// -------------------------- INTERACTIONS --------------------------
async function confirmation(i,id) {
  const d=readDraft(i,id,'confirm');
  drafts.delete(id);
  await i.deferReply({flags:EPH});
  if(d.action==='message') {
    requirePerm(i);const x=d.data;
    if(x.kind==='dm') {
      await i.guild.members.fetch(x.user);
      const user=await client.users.fetch(x.user);
      try {
        if (x.asEmbed) {
          const embed = new EmbedBuilder().setDescription(x.text).setColor(x.color);
          await user.send({embeds: [embed], allowedMentions:NO_MENTIONS});
        } else {
          await user.send({content:x.text,allowedMentions:NO_MENTIONS});
        }
      }
      catch {throw Error('The DM could not be sent. The member may have disabled DMs or blocked the bot.');}
      await tell(i,'Discord accepted the DM. This does not confirm that it was read.');
      await logEvent(i.guild,'DM sent',`**Administrator:** <@${i.user.id}>\n**Recipient:** <@${x.user}>\nMessage content is not included in this log.`);
    } else {
      const c=await sendChannel(i.guild,x.channel);
      let payload = {allowedMentions:x.ping?{parse:['users','roles'],repliedUser:false}:NO_MENTIONS};
      if (x.asEmbed) {
        const embed = new EmbedBuilder().setDescription(x.text).setColor(x.color).setTimestamp();
        payload.embeds = [embed];
      } else {
        payload.content = x.text;
      }
      const m=await c.send(payload);
      await tell(i,`Message sent: ${m.url}`);
    }
  } else if(d.action==='mod') {
    await runMod(i,d.data.action,d.data);
  } else if(d.action==='giveaway') {
    requirePerm(i);let g=getGiveaway(i,d.data.id);
    if(d.data.action==='cancel') {
      await locked(`giveaway:${g.id}`,async()=>{
        g=getGiveaway(i,g.id);
        if(g.state!=='active')throw Error('Only open giveaways can be cancelled.');
        g=change('giveaway',g.id,x=>{x.state='cancelled';x.cancelledBy=i.user.id;});
        await refreshGiveaway(i.guild,g);
      });
    } else g=await drawGiveaway(i.guild,g.id,d.data.action==='reroll');
    await tell(i,`Giveaway updated: ${g.state}. Use /giveaway info to review results and DM delivery.`);
    await logEvent(i.guild,'Giveaway updated',`**ID:** ${g.id}\n**Action:** ${d.data.action}\n**Administrator:** <@${i.user.id}>`);
  } else if(d.action==='ticket-forget') {
    requirePerm(i);const t=get('ticket',d.data.ticket);
    if(!t||t.guild!==i.guildId||t.state!=='closed')throw Error('Closed ticket record not found.');
    const p=path.join(DATA_DIR,'transcripts',`${t.id}.txt`);if(fs.existsSync(p))fs.unlinkSync(p);
    sql.del.run('ticket',t.id);
    await tell(i,'The local ticket record and transcript were deleted. Discord copies were not deleted.');
  } else if(d.action==='rolepanel-remove') {
    requirePerm(i);const p=get('rolepanel',d.data.id);
    if(!p||p.guild!==i.guildId)throw Error('Role panel not found.');
    const c=await sendChannel(i.guild,p.channel),m=await c.messages.fetch(p.message);
    await m.edit(card(i.guildId,`## ${p.title}\n${p.text}`));sql.del.run('rolepanel',p.id);
    await tell(i,'Role buttons removed. Existing member roles were not changed.');
  }
}
async function component(i) {
  const [kind,id,index,revision]=i.customId.split(':');
  if(kind==='help')return i.update({...helpPayload(i.guildId,i.values[0]),flags:V2});
  if(kind==='dismiss') {
    const d=readDraft(i,id);drafts.delete(id);
    return i.update(card(i.guildId,'Cancelled.'));
  }
  if(kind==='confirm')return confirmation(i,id);
  if(kind==='ticket-open') {
    const p=get('ticketpanel',i.message.id);
    if(!p||p.guild!==i.guildId||p.channel!==i.channelId)throw Error('This ticket panel is no longer active.');
    return openTicket(i,i.values[0]);
  }
  if(kind==='ticket-claim') {
    const t=currentTicket(i);ticketStaff(i,t);
    if(t.state!=='open')throw Error('This ticket is not open.');
    if(t.claimed)throw Error('This ticket has already been claimed.');
    change('ticket',t.id,x=>{x.claimed=i.user.id;});
    await i.deferReply({flags:EPH});
    await refreshTicket(i.guild,get('ticket',t.id));
    return tell(i,ticketText(t.messages?.claimed||'Ticket claimed by {user}.',t,i.user.id));
  }
  if(kind==='ticket-prio-low' || kind==='ticket-prio-med' || kind==='ticket-prio-high' || kind==='ticket-prio-urgent') {
    const t=currentTicket(i);ticketStaff(i,t);
    if(t.state!=='open')throw Error('This ticket is not open.');
    const prioMap = { 'ticket-prio-low': {name: 'Low', color: 0x57F287}, 'ticket-prio-med': {name: 'Medium', color: 0xFEE75C}, 'ticket-prio-high': {name: 'High', color: 0xED4245}, 'ticket-prio-urgent': {name: 'Urgent', color: 0x992D22} };
    const selected = prioMap[kind];
    change('ticket',t.id,x=>{x.priority = selected.name; x.priorityColor = selected.color;});
    await i.deferReply({flags:EPH});
    await refreshTicket(i.guild,get('ticket',t.id));
    return tell(i,`Ticket priority updated to **${selected.name}**.`);
  }
  if(kind==='ticket-close') {
    const t=currentTicket(i);
    if(!staff(i,t)&&!(t.owner===i.user.id&&t.allowOwnerClose))throw Error('Only ticket staff can close this ticket.');
    if(t.state!=='open')throw Error('This ticket is not open.');
    const d=draft(i,'ticket-close',{ticket:t.id});
    return i.showModal(modal(`ticket-close-submit:${d}`,t.messages?.closeTitle||'Close ticket',[
      {id:'reason',label:t.messages?.closeReason||'Reason for closing',max:500},
    ]));
  }
  if(kind==='ticket-transcript')return ticketTranscriptReply(i,currentTicket(i));
  if(kind==='giveaway-join')return joinGiveaway(i,id);
  if(kind==='giveaway-leave')return leaveGiveaway(i,id);
  if(kind==='giveaway-duration') {
    requirePerm(i);const d=readDraft(i,id,'giveaway'),value=i.values[0];
    if(value==='custom')return i.showModal(modal(`giveaway-custom:${id}`,'Giveaway duration',[
      {id:'duration',label:'Duration (for example 2h or 1d 2h)',short:true,max:40},
    ]));
    d.duration=duration(value);d.durationText=value;return giveawayColorPicker(i,id);
  }
  if(kind==='giveaway-color') {
    requirePerm(i);const d=readDraft(i,id,'giveaway'),value=i.values[0];
    if(value==='custom_hex')return i.showModal(modal(`giveaway-custom-hex:${id}`,'Custom Color',[
      {id:'hex',label:'Hex Code (e.g. #FF0000)',short:true,max:7},
    ]));
    d.colorKey=value;d.customHex=null;return giveawayPreview(i,d);
  }
  if(kind==='giveaway-publish')return publishGiveaway(i,readDraft(i,id,'giveaway'));
  if(kind==='role')return roleClick(i,id,index,revision);
  if(kind==='setup-page'){requirePerm(i);return setupPicker(i,Number(id)===1?1:0);}
  if(kind==='setup-select'){requirePerm(i);return setupPreview(i,i.values[0]);}
  if(kind==='setup-apply') {
    requirePerm(i);const d=readDraft(i,id,'setup');
    if(i.user.id!==i.guild.ownerId)throw Error('Only the server owner can apply a template.');
    const t=TEMPLATES.find(x=>x.id===d.template);
    return i.showModal(modal(`setup-confirm:${id}`,'Confirm server setup',[
      {id:'name',label:'Type the exact template name',short:true,max:100,placeholder:t.title},
    ]));
  }
  if(kind==='message-send') {
    const d=readDraft(i,id,'message-preview');
    const cid = draft(i,'confirm',{action:'message',data:{...d, color: getEmbedColor(d)}});
    drafts.delete(id);
    return confirmation(i, cid);
  }
  if(kind==='color-select') {
    const d=readDraft(i,id,'message-preview');
    if(i.values[0]==='custom_hex') {
      return i.showModal(modal(`message-custom-hex:${id}`,'Custom Color',[
        {id:'hex',label:'Hex Code (e.g. #FF0000)',short:true,max:7},
      ]));
    }
    d.colorKey=i.values[0]; d.customHex=null;
    return messagePreview(i, id);
  }
  throw Error('This action is no longer available.');
}
async function modalSubmit(i) {
  const [kind,id]=i.customId.split(':');
  if(kind==='ticket-appearance'||kind==='ticket-messages') {
    requirePerm(i);const d=readDraft(i,id,kind);
    if(!cfg(i.guildId).ticketCategories[d.key])throw Error('Category no longer exists.');
    if(kind==='ticket-appearance') {
      const prefix=i.fields.getTextInputValue('prefix');
      if(!/^[a-z0-9-]{1,30}$/.test(prefix))throw Error('Use a lowercase channel prefix with letters, numbers and hyphens.');
      const labels=Object.fromEntries(['claim','claimed','close','transcript'].map(x=>[x,i.fields.getTextInputValue(x)]));
      updateCfg(i.guildId,c=>{c.ticketCategories[d.key].labels=labels;c.ticketCategories[d.key].channelPrefix=prefix;});
    } else {
      const messages=Object.fromEntries(['opened','closed','claimed','closeTitle','closeReason'].map(x=>[x,i.fields.getTextInputValue(x)]));
      updateCfg(i.guildId,c=>{c.ticketCategories[d.key].messages=messages;});
    }
    drafts.delete(id);return tell(i,'Ticket category updated. New tickets will use these settings.');
  }
  if(kind==='giveaway-edit') {
    requirePerm(i);const d=readDraft(i,id,'giveaway-edit');
    const prize=i.fields.getTextInputValue('prize'),description=i.fields.getTextInputValue('description'),
      winnerCount=integer(i.fields.getTextInputValue('winners'),1,20,'Winners'),
      raw=i.fields.getTextInputValue('duration'),remaining=raw?duration(raw):null;
    if(remaining&&remaining<30000)throw Error('Giveaways must have at least 30 seconds remaining.');
    await i.deferReply({flags:EPH});
    await locked(`giveaway:${d.giveaway}`,async()=>{
      let g=getGiveaway(i,d.giveaway);
      if(g.state!=='active'||g.ends<=Date.now())throw Error('This giveaway is no longer active.');
      g=change('giveaway',g.id,x=>{
        x.prize=prize;x.description=description;x.winnerCount=winnerCount;
        if(remaining)x.ends=Date.now()+remaining;x.editedBy=i.user.id;x.edited=Date.now();
      });
      await refreshGiveaway(i.guild,g);drafts.delete(id);
      await tell(i,'Giveaway updated.');
      await logEvent(i.guild,'Giveaway edited',`**ID:** ${g.id}\n**Administrator:** <@${i.user.id}>`);
    });return;
  }
  if(kind==='ticket-config') {
    requirePerm(i);const d=readDraft(i,id,'ticket-config');
    const raw=i.fields.getTextInputValue('questions');
    const category={...d.base,title:i.fields.getTextInputValue('title'),description:i.fields.getTextInputValue('description'),
      welcome:i.fields.getTextInputValue('welcome'),questions:questions(raw),questionsRaw:raw};
    updateCfg(i.guildId,c=>{
      if(!c.ticketCategories[d.key]&&Object.keys(c.ticketCategories).length>=25)throw Error('The category limit has been reached.');
      c.ticketCategories[d.key]={maxOpen:1,maxTotal:3,allowOwnerClose:true,...c.ticketCategories[d.key],...category};
    });
    drafts.delete(id);return tell(i,`Ticket category \`${d.key}\` saved.`);
  }
  if(kind==='ticket-submit')return createTicket(i,readDraft(i,id,'ticket-open'));
  if(kind==='ticket-close-submit') {
    const d=readDraft(i,id,'ticket-close'),t=get('ticket',d.ticket);
    if(!t||t.guild!==i.guildId||t.id!==i.channelId)throw Error('Ticket not found.');
    drafts.delete(id);return closeTicket(i,t,i.fields.getTextInputValue('reason'));
  }
  if(kind==='giveaway-details') {
    requirePerm(i);const d=readDraft(i,id,'giveaway');
    d.prize=i.fields.getTextInputValue('prize');d.description=i.fields.getTextInputValue('description');
    d.winnerCount=integer(i.fields.getTextInputValue('winners'),1,20,'Winners');
    return giveawayPicker(i,id);
  }
  if(kind==='giveaway-custom') {
    requirePerm(i);const d=readDraft(i,id,'giveaway'),value=i.fields.getTextInputValue('duration');
    d.duration=duration(value);if(d.duration<30000)throw Error('Giveaways must last at least 30 seconds.');
    d.durationText=value;return giveawayColorPicker(i,id);
  }
  if(kind==='giveaway-custom-hex') {
    requirePerm(i);const d=readDraft(i,id,'giveaway'),hex=i.fields.getTextInputValue('hex');
    if(!/^#[0-9a-f]{6}$/i.test(hex))throw Error('Use a valid hex code like #FF0000.');
    d.customHex=hex;d.colorKey=null;
    return giveawayPreview(i,d);
  }
  if(kind==='message-custom-hex') {
    const d=readDraft(i,id,'message-preview'),hex=i.fields.getTextInputValue('hex');
    if(!/^#[0-9a-f]{6}$/i.test(hex))throw Error('Use a valid hex code like #FF0000.');
    d.customHex=hex;d.colorKey='custom_hex';
    return messagePreview(i,id);
  }
  if(kind==='rolepanel-save') {
    requirePerm(i);const d=readDraft(i,id,'rolepanel');
    await i.deferReply({flags:EPH});
    await locked(`rolepanel-save:${id}`,async()=>{
      const raw=i.fields.getTextInputValue('mappings'),mappings=await parseRoleMappings(i.guild,raw);
      const c=await sendChannel(i.guild,d.channel);
      botPerm(c,P.ManageRoles);
      const p={id:d.existing||uid(),guild:i.guildId,channel:c.id,title:d.title,text:d.text,mappings,raw,revision:uid().slice(0,8)};
      let m;
      if(d.existing) {
        const old=get('rolepanel',d.existing);if(!old)throw Error('Role panel no longer exists.');
        m=await c.messages.fetch(old.message);await m.edit(rolePanelPayload(p));
      } else m=await c.send(rolePanelPayload(p));
      p.message=m.id;put('rolepanel',p.id,p);
      if(p.id!==m.id) {
        sql.del.run('rolepanel',p.id);p.id=m.id;put('rolepanel',p.id,p);
        await m.edit(rolePanelPayload(p));
      }
      drafts.delete(id);await tell(i,`Role panel saved: ${m.url}`);
    });return;
  }
  if(kind==='setup-confirm')return applySetup(i,readDraft(i,id,'setup'),i.fields.getTextInputValue('name'));
  throw Error('This form is no longer available.');
}

// -------------------------- RECOVERY / RETENTION --------------------------
let schedulerBusy=false,lastRetention=0;
async function recoverPendingTickets(guild) {
  const pending=all('ticket-pending').filter(t=>t.guild===guild.id);
  if(!pending.length)return;
  const channels=await guild.channels.fetch();
  for(const t of pending) {
    if(locks.has(`ticket-open:${t.guild}:${t.owner}`))continue;
    const c=channels.find(c=>c?.type===0&&c.topic?.includes(`LD ticket ${t.marker};`));
    if(c) {
      const recovered={...t,id:c.id,state:'open'};
      if(!get('ticket',c.id))put('ticket',c.id,recovered);
      sql.del.run('ticket-pending',t.marker);
    } else if(Date.now()-t.created>300000)sql.del.run('ticket-pending',t.marker);
  }
}
async function scheduler() {
  if(schedulerBusy||!client.isReady())return;
  schedulerBusy=true;
  try {
    const guild=await client.guilds.fetch(process.env.GUILD_ID);
    for(const g of all('giveaway')) {
      if(g.guild!==guild.id)continue;
      if(((g.state==='active'&&g.ends<=Date.now())||g.state==='drawing')&&!locks.has(`giveaway:${g.id}`)) {
        try {await drawGiveaway(guild,g.id,g.drawMode==='reroll');}
        catch(e){safeLog(e,'scheduled giveaway');change('giveaway',g.id,x=>{x.lastError=String(e.message).slice(0,300);});}
      }
      if(g.state==='ended') {
        const r=g.rounds.at(-1);
        if(r&&!r.announcement&&!locks.has(`giveaway:${g.id}`))
          await locked(`giveaway:${g.id}`,()=>deliverGiveaway(guild,get('giveaway',g.id))).catch(e=>safeLog(e,'result recovery'));
      }
    }
    for(const t of all('ticket').filter(t=>t.guild===guild.id)) {
      if(t.state==='closing'&&!locks.has(`ticket:${t.id}`))
        await locked(`ticket:${t.id}`,()=>finishTicketClose(guild,t)).catch(e=>safeLog(e,'ticket close recovery'));
      else if(t.state==='open'&&!t.message&&!locks.has(`ticket-open:${t.guild}:${t.owner}`)) {
        try {
          const c=await channelBy(guild,t.id),m=await c.send(card(t.guild,ticketBody(t),ticketRows(t)));
          change('ticket',t.id,x=>{x.message=m.id;});
        } catch(e){safeLog(e,'ticket introduction recovery');}
      }
    }
    await recoverPendingTickets(guild);
    if(Date.now()-lastRetention>3600000) {
      lastRetention=Date.now();
      const cutoff=Date.now()-cfg(guild.id).retentionDays*86400000;
      for(const t of all('ticket').filter(t=>t.guild===guild.id&&t.state==='closed'&&t.closed<cutoff)) {
        const file=path.join(DATA_DIR,'transcripts',`${t.id}.txt`);
        if(fs.existsSync(file))fs.unlinkSync(file);sql.del.run('ticket',t.id);
      }
      db.prepare('DELETE FROM cooldowns WHERE until<?').run(Date.now()-86400000);
    }
    for(const [id,d]of drafts)if(d.expires<Date.now())drafts.delete(id);
  } catch(e){safeLog(e,'scheduler');}
  finally{schedulerBusy=false;}
}

// -------------------------- LOCAL SELF TEST --------------------------
async function selfTest() {
  let checks=0;
  const check=(name,fn)=>{fn();checks++;console.log(`PASS ${name}`);};
  check('30 unique templates',()=>{assert.equal(TEMPLATES.length,30);assert.equal(new Set(TEMPLATES.map(t=>t.id)).size,30);});
  check('template channel names and modes',()=>{
    for(const t of TEMPLATES)for(const c of t.categories) {
      assert(['public','readonly','private'].includes(c.mode));
      assert(c.channels.every(x=>/^[a-z0-9-]{1,100}$/.test(x)));
      assert.equal(new Set(c.channels).size,c.channels.length);
    }
    assert(TEMPLATES.every(t=>t.categories.some(c=>c.voice&&c.channels.length>=2)));
  });
  check('duration parsing',()=>{assert.equal(duration('1d 2h 30m'),95400000);assert.equal(duration('30s'),30000);});
  check('invalid durations rejected',()=>{for(const x of ['','-1h','1h garbage','0s','91d','1.5h'])assert.throws(()=>duration(x));});
  check('winner count and duplicates',()=>{
    for(let n=0;n<100;n++){const r=sample(['a','b','c'],5);assert.equal(r.length,3);assert.equal(new Set(r).size,3);}
  });
  check('empty and deterministic draws',()=>{assert.deepEqual(sample([],2),[]);assert.deepEqual(sample(['a','b','c'],2,()=>0),['a','c']);});
  check('ticket question validation',()=>{
    assert.equal(questions('[{"label":"Question"}]')[0].max,1500);
    assert.throws(()=>questions('[]'));assert.throws(()=>questions('broken'));assert.throws(()=>questions('[{"label":"Q","max":4001}]'));
  });
  check('SQLite persistence and atomic changes',()=>{
    put('test','x',{n:1});change('test','x',x=>x.n++);assert.equal(get('test','x').n,2);
    assert.throws(()=>change('test','x',x=>{x.n=99;throw Error('rollback');}));assert.equal(get('test','x').n,2);
  });
  check('entry uniqueness and leave',()=>{
    sql.join.run('test','u',1);sql.join.run('test','u',2);assert.equal(sql.count.get('test').n,1);
    sql.leave.run('test','u');assert.equal(sql.count.get('test').n,0);
  });
  check('20-second removal cooldown persisted',()=>{
    const now=Date.now();sql.coolSet.run('p','u','r',now+20000);
    assert.equal(sql.cooldown.get('p','u','r').until,now+20000);
    sql.coolSet.run('another-panel','u','r',now+5000);
    assert.equal(sql.roleCooldown.get('u','r').until,now+20000);
  });
  check('command schema limits',()=>{
    assert.equal(new Set(COMMANDS.map(c=>c.name)).size,COMMANDS.length);
    function validate(options){assert(options.length<=25);for(const o of options){assert(o.name.length<=32);assert(o.description.length<=100);if(o.options)validate(o.options);}}
    for(const c of COMMANDS){assert(c.name.length<=32);validate(c.options);}
  });
  check('Components V2 card structure',()=>{
    const p=card('test','Text',[row(button('test','Test'))],true);
    assert(p.flags&32768);assert(p.flags&EPH);assert.equal(p.components[0].type,17);assert.equal(p.components[0].components[0].content,'Text');
  });
  check('modal builder serialization',()=>assert.equal(modal('test','Test',[{id:'q',label:'Question'}]).toJSON().components.length,1));
  check('giveaway qualification rules',()=>{
    const m={user:{bot:false,createdTimestamp:Date.now()-10*86400000},joinedTimestamp:Date.now()-3*86400000,roles:{cache:new Map([['r',{}]])}};
    assert(eligible({minAge:7,minJoin:2,requiredRole:'r'},m));assert(!eligible({minAge:30},m));assert(!eligible({requiredRole:'x'},m));assert(!eligible({},null));
  });
  check('role panel rows and component IDs',()=>{
    const p=rolePanelPayload({id:'123',guild:'test',title:'T',text:'Body',mappings:Array.from({length:20},(_,n)=>({role:String(n),label:'Role',emoji:{name:'X'}}))});
    const rows=p.components[0].components.slice(1);assert.equal(rows.length,4);assert(rows.every(r=>r.components.length===5));
    assert.equal(rows[3].components[4].custom_id,'role:123:19:0');
  });
  check('role privilege guard',()=>{
    const guild={id:'g',members:{me:{roles:{highest:{position:10}}}}};
    assert.throws(()=>assertRoleSafe(guild,{id:'r',position:1,permissions:{has:()=>true}}));
    assert.doesNotThrow(()=>assertRoleSafe(guild,{id:'r',position:1,permissions:{has:()=>false}}));
  });
  check('confirmation owner binding and expiry',()=>{
    const i={user:{id:'u'},guildId:'g'},id=draft(i,'test',{});
    assert.equal(readDraft(i,id).user,'u');
    assert.throws(()=>readDraft({...i,user:{id:'other'}},id));
    drafts.get(id).expires=0;assert.throws(()=>readDraft(i,id));
  });
  check('integer validation',()=>{assert.equal(integer('2',1,20),2);assert.throws(()=>integer('2.5',1,20));assert.throws(()=>integer('a',1,20));});
  check('support roles cannot be self-assigned',()=>{
    updateCfg('protected-test',c=>{c.ticketCategories.support={supportRole:'support-role'};});
    const guild={id:'protected-test',members:{me:{roles:{highest:{position:10}}}}};
    assert.throws(()=>assertRoleSafe(guild,{id:'support-role',position:1,permissions:{has:()=>false}}));
  });
  check('template staff roles cannot be self-assigned',()=>{
    put('setup','protected-setup',{guild:'protected-test',roles:{Staff:'staff-role'}});
    const guild={id:'protected-test',members:{me:{roles:{highest:{position:10}}}}};
    assert.throws(()=>assertRoleSafe(guild,{id:'staff-role',position:1,permissions:{has:()=>false}}));
  });
  check('closed ticket revokes owner and every added participant',()=>{
    const overwrites=ticketPermissionOverwrites({id:'guild'},{
      owner:'owner',supportRole:'support',participants:['extra-one','extra-two'],
    },true);
    for(const id of ['guild','owner','extra-one','extra-two'])
      assert(overwrites.find(o=>o.id===id).deny.includes(P.ViewChannel));
    assert(overwrites.find(o=>o.id==='support').allow.includes(P.ViewChannel));
  });
  check('ticket text variable substitution',()=>{
    const result=ticketText('{user} {channel} {category} {id}',{owner:'user',id:'channel',title:'Support'});
    assert.equal(result,'<@user> <#channel> Support channel');
  });
  const asyncCheck=async(name,fn)=>{await fn();checks++;console.log(`PASS ${name}`);};
  await asyncCheck('concurrent action exclusion',async()=>{
    let release;
    const first=locked('test-concurrency',()=>new Promise(resolve=>{release=resolve;}));
    await assert.rejects(()=>locked('test-concurrency',async()=>{}),/already in progress/);
    release();await first;assert(!locks.has('test-concurrency'));
  });
  const fakeMembers=new Map(['entrant-1','entrant-2','entrant-3','entrant-4'].map(id=>[id,{
    id,user:{bot:false,createdTimestamp:0},joinedTimestamp:0,roles:{cache:new Map()},
  }]));
  let dmCalls=0;
  client.users.fetch=async()=>({send:async()=>{dmCalls++;}});
  const fakeGuild={id:'draw-test',name:'Test guild',members:{me:{},fetch:async()=>{
    assert.equal(get('giveaway','test-draw').state,'drawing');return fakeMembers;
  }}};
  const fakeChannel={id:'test-channel',type:ChannelType.GuildText,guild:fakeGuild,
    permissionsFor:()=>({has:()=>true}),messages:{fetch:async input=>
      typeof input==='string'?{edit:async()=>{}}:{find:()=>null}},
    send:async()=>({id:'result-message'}),
  };
  fakeGuild.channels={fetch:async()=>fakeChannel};
  put('giveaway','test-draw',{id:'test-draw',guild:'draw-test',channel:'test-channel',
    prize:'Test',description:'',winnerCount:2,created:Date.now(),ends:Date.now(),state:'active',rounds:[]});
  for(const id of fakeMembers.keys())sql.join.run('test-draw',id,Date.now());
  await asyncCheck('draw closes entries before member lookup and persists results',async()=>{
    const g=await drawGiveaway(fakeGuild,'test-draw');
    assert.equal(g.state,'ended');assert.equal(g.rounds[0].winners.length,2);
    assert.equal(g.rounds[0].eligibleCount,4);assert.equal(g.rounds[0].notified.length,2);
    assert.equal(g.rounds[0].announcement,'result-message');assert.equal(dmCalls,2);
  });
  await asyncCheck('reroll excludes every previous winner',async()=>{
    const g=await drawGiveaway(fakeGuild,'test-draw',true);
    const ids=g.rounds.flatMap(r=>r.winners);
    assert.equal(ids.length,4);assert.equal(new Set(ids).size,4);
    const empty=await drawGiveaway(fakeGuild,'test-draw',true);
    assert.equal(empty.rounds.at(-1).winners.length,0);
  });
  await asyncCheck('finished giveaway cannot be drawn again without reroll',async()=>{
    await assert.rejects(()=>drawGiveaway(fakeGuild,'test-draw'),/not open/);
  });
  await asyncCheck('interrupted draw resumes without losing draw mode',async()=>{
    change('giveaway','test-draw',g=>{g.state='drawing';g.drawMode='reroll';});
    const g=await drawGiveaway(fakeGuild,'test-draw',true);
    assert.equal(g.state,'ended');assert.equal(g.rounds.at(-1).winners.length,0);
  });
  await asyncCheck('notification retry does not automatically repeat attempted DMs',async()=>{
    change('giveaway','test-draw',g=>{g.rounds.push({
      id:'retry-round',at:Date.now(),winners:['entrant-1'],eligibleCount:1,
      notified:[],failedDM:['entrant-1'],dmAttempted:['entrant-1'],announcement:'existing',
    });});
    const before=dmCalls;
    await deliverGiveaway(fakeGuild,get('giveaway','test-draw'));
    assert.equal(dmCalls,before);
    await deliverGiveaway(fakeGuild,get('giveaway','test-draw'),true);
    assert.equal(dmCalls,before+1);
    await deliverGiveaway(fakeGuild,get('giveaway','test-draw'),true);
    assert.equal(dmCalls,before+1);
  });
  await asyncCheck('private log rejects unrelated visible role',async()=>{
    const everyone={id:'log-test',name:'everyone',permissions:{has:()=>false}};
    const outsider={id:'outsider',name:'Outsider',permissions:{has:()=>false}};
    const guild={id:'log-test',roles:{everyone,cache:new Map([[everyone.id,everyone],[outsider.id,outsider]])},
      members:{me:{roles:{cache:new Map()}}}};
    const c={guild,permissionsFor:role=>({has:()=>role.id==='outsider'}),
      permissionOverwrites:{cache:new Map()}};
    await assert.rejects(()=>privateLogChannel(c),/unapproved role/);
    await assert.doesNotReject(()=>privateLogChannel(c,{logRole:'outsider'}));
  });
  await asyncCheck('announcement confirmation sends exact text and suppresses mentions',async()=>{
    const original=fakeChannel.send,transmitted=[];
    fakeChannel.send=async payload=>{transmitted.push(payload);return {id:'message',url:'test-message'};};
    const i={user:{id:'admin'},guildId:fakeGuild.id,guild:fakeGuild,channelId:fakeChannel.id,
      memberPermissions:{has:()=>true},deferred:false,replied:false,
      deferReply:async()=>{i.deferred=true;},editReply:async()=>{}};
    const exact='Exact text\n**Markdown** @everyone <@123456789012345678>';
    const id=draft(i,'confirm',{action:'message',data:{kind:'announcement',channel:fakeChannel.id,text:exact,ping:false,asEmbed:false}});
    await confirmation(i,id);
    assert.equal(transmitted.length,1);assert.equal(transmitted[0].content,exact);
    assert.deepEqual(transmitted[0].allowedMentions.parse,[]);
    await assert.rejects(()=>confirmation(i,id),/expired/);
    fakeChannel.send=original;
  });
  console.log(`\n${checks} test groups passed. No Discord connection was made.`);
  db.close();
}

async function main() {
  if(SELF_TEST)return selfTest();
  if(STORAGE_TEST) {
    db.prepare('SELECT 1').get();
    console.log('Storage check passed. No Discord connection was made.');
    db.close();return;
  }
  for(const key of ['DISCORD_TOKEN','CLIENT_ID','GUILD_ID'])if(!process.env[key])throw Error(`Missing environment variable: ${key}`);
  for(const key of ['CLIENT_ID','GUILD_ID'])if(!snowflake(process.env[key]))throw Error(`Invalid ${key}`);
  let stopping=false;
  const server=http.createServer((req,res)=>{
    if(req.url!=='/'&&req.url!=='/healthz'){res.writeHead(404);res.end('Not found');return;}
    const ready=client.isReady()&&!stopping;
    res.writeHead(ready?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({ready}));
  });
  server.listen(Number(process.env.PORT)||10000,'0.0.0.0');
  client.on('interactionCreate',async i=>{
    if(!i.inGuild()||i.guildId!==process.env.GUILD_ID) {
      if(i.isRepliable())await i.reply({content:'This bot is configured for a different server.',flags:EPH}).catch(()=>null);
      return;
    }
    try {
      if(!i.guild.members.me)await i.guild.members.fetchMe();
      if(i.isChatInputCommand())await slash(i);
      else if(i.isModalSubmit())await modalSubmit(i);
      else if(i.isButton()||i.isStringSelectMenu())await component(i);
    } catch(e) {
      safeLog(e,`interaction ${i.commandName||i.customId}`);
      let message=String(e?.message||'The action could not be completed.');
      if(/SQLITE|readonly database|disk I\/O|database is locked/i.test(message))message='Store unavailable. Please ask an administrator to check persistent storage.';
      if(/Unknown Member|Unknown User/.test(message))message='That member is no longer available.';
      if(/Missing Permissions|Missing Access/.test(message))message='The bot is missing access or permissions. Ask an administrator to check channel permissions and role order.';
      if(/token|authorization/i.test(message))message='Authentication failed. Ask an administrator to check the bot configuration.';
      await tell(i,`Action not completed: ${clean(message,1600)}`).catch(err=>safeLog(err,'interaction error reply'));
    }
  });
  client.once('clientReady',async()=>{
    try {
      const guild=await client.guilds.fetch(process.env.GUILD_ID);
      await guild.members.fetchMe();
      const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID),{body:COMMANDS});
      const state=get('presence','bot');if(state)applyPresence(state);
      console.log(`Ready as ${client.user.tag}. Commands registered for ${guild.id}. Version ${VERSION}.`);
      await scheduler();setInterval(scheduler,15000).unref();
    } catch(e) {safeLog(e,'startup');stopping=true;client.destroy();server.close(()=>{db.close();process.exit(1);});}
  });
  client.on('error',e=>safeLog(e,'Discord client'));
  client.on('warn',s=>console.warn(clean(s,500)));
  function fatal(e) {
    safeLog(e,'fatal');stopping=true;client.destroy();
    server.close(()=>{try{db.close();}catch{}process.exit(1);});
    setTimeout(()=>process.exit(1),5000).unref();
  }
  process.on('unhandledRejection',fatal);process.on('uncaughtException',fatal);
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{
    stopping=true;client.destroy();
    server.close(()=>{db.close();process.exit(0);});
    setTimeout(()=>process.exit(0),8000).unref();
  });
  await client.login(process.env.DISCORD_TOKEN);
}
main().catch(e=>{safeLog(e,'boot');try{db.close();}catch{}process.exit(1);});