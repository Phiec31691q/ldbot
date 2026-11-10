/*
 * Ld Bank v3
 * My Owner: Unity
 * My Developer: Dream
 *
 * KURULUM
 * - Ortam değişkenleri: DISCORD_TOKEN, CLIENT_ID (zorunlu)
 *   GUILD_ID (isteğe bağlı, komutlar tek sunucuya anında yüklenir)
 *   DB_PATH (isteğe bağlı, veri dosyası yolu, varsayılan ./data.json)
 *   GEMINI_API_KEY (AI sohbeti için)
 *   AI_MODEL (isteğe bağlı, varsayılan gemini-2.5-flash)
 *   AI_DAILY_LIMIT (isteğe bağlı, sunucu başına günlük AI cevap sınırı, varsayılan 200)
 *   PORT (Render kendisi verir)
 * - Developer Portal > Bot > Privileged Gateway Intents:
 *   SERVER MEMBERS INTENT ve MESSAGE CONTENT INTENT açık olmalı.
 * - Build: npm install     Start: node index.js
 * - package.json içinde "discord.js": "^14.16.3" bulunmalı.
 * - Özel emojiler: Bot, sunucuda bulunan emojileri İSMİYLE bulur. Yüklediğin emojilerin
 *   isimleri aşağıdaki listedeki isimlerle aynıysa otomatik kullanılır; yoksa Unicode yedek emoji çıkar.
 * - Veriler yerel dosyaya yazılır. Ücretsiz Render'da yeniden deploy sonrası
 *   silinebilir; kalıcı disk varsa DB_PATH ile oraya yönlendir.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder,
  ActivityType,
  MessageFlags,
  AttachmentBuilder,
} = require("discord.js");

// ============================================================
//  CONFIG
// ============================================================
const CONFIG = {
  OWNER: "Unity",
  DEVELOPER: "Dream",
  DB_FILE: process.env.DB_PATH || "./data.json",
  ROLE_COOLDOWN: 20 * 1000,
  SESSION_TTL: 30 * 60 * 1000,
  PENDING_TTL: 5 * 60 * 1000,
  MAX_QUESTIONS: 20,
  MAX_TICKET_CATEGORIES: 25,
  AI_DAILY_LIMIT: Number(process.env.AI_DAILY_LIMIT) || 200,
  TIMEZONE: "Europe/Istanbul",
  PORT: Number(process.env.PORT) || 3000,
};

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || null;
if (!TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID environment variable.");
  process.exit(1);
}

// 15 embed colors offered before any embed is sent.
const COLORS = [
  { name: "Crimson", value: 0x8b0000 },
  { name: "Red", value: 0xe74c3c },
  { name: "Orange", value: 0xe67e22 },
  { name: "Gold", value: 0xf1c40f },
  { name: "Lime", value: 0x2ecc71 },
  { name: "Green", value: 0x27ae60 },
  { name: "Teal", value: 0x1abc9c },
  { name: "Cyan", value: 0x00bcd4 },
  { name: "Blue", value: 0x3498db },
  { name: "Navy", value: 0x1f3a93 },
  { name: "Blurple", value: 0x5865f2 },
  { name: "Purple", value: 0x9b59b6 },
  { name: "Magenta", value: 0xe91e63 },
  { name: "Pink", value: 0xff79c6 },
  { name: "Slate", value: 0x64748b },
];
const DEFAULT_COLOR = 0x9ed8f0; // winter frost blue
const WINTER_GOLD = 0xffd966;

process.on("unhandledRejection", err => console.error("Unhandled rejection:", err));

// ============================================================
//  EMOJIS
//  e("name") -> sunucudaki özel emoji (aynı isimli) varsa onu, yoksa Unicode yedeği.
//  Özel emoji yüklemen yeterli: isimleri aşağıdakilerle aynı olmalı.
// ============================================================
const FALLBACK_EMOJI = {
  help: "❓", about: "🤖", ai: "🧠", ticket: "🎫", claim: "🙋", close: "🔒",
  apply: "📝", application: "📋", edit: "✏️", add: "➕", remove: "➖", send: "📨",
  next: "➡️", color: "🎨", announce: "📢", warning: "⚠️", cross: "❌", check: "✅",
  party: "🎉", gift: "🎁", finish: "🏁", trophy: "🏆", timer: "⏱️", refresh: "🔁",
  map: "🗺️", maps: "🗺️", user: "👤", members: "👥", join: "🚪", recommend: "👍",
  size: "📦", version: "🔖", updated: "🔄", money: "💰", key: "🔑", ban: "🔨",
  kick: "👢", timeout: "⏳", voice: "🔊", text: "💬", categories: "📁", automod: "🛡️",
  slowmode: "🐌", clear: "🧹", server: "🖥️", boost: "🚀", created: "📅", roles: "🎭",
  role_list: "📜", top_role: "👑", id: "🆔", counting: "🔢", list: "📋", stats: "📊",
  setup: "⚙️", online: "🟢", blocked: "⛔", remind: "⏰", crown: "👑", lock: "🔒",
  unlock: "🔓", winter: "❄️", letter_a: "🇦", letter_b: "🇧", letter_c: "🇨", letter_d: "🇩",
  reply: "💬", sparkle: "✨", eye: "👀", clock: "🕒",
};

function e(name) {
  const found = client.emojis?.cache?.find(x => x.name === name);
  if (found) return `<${found.animated ? "a" : ""}:${found.name}:${found.id}>`;
  return FALLBACK_EMOJI[name] || "";
}
// Reaction target: custom emoji object if found, else Unicode.
function reactTarget(name) {
  return client.emojis?.cache?.find(x => x.name === name) ?? FALLBACK_EMOJI[name];
}

// ============================================================
//  DATABASE (JSON file, atomic writes)
// ============================================================
const EMPTY_DB = () => ({
  giveaways: {},
  tickets: {},
  ticketConfig: {},
  applicationConfig: {},
  applications: {},
  rolePanels: {},
  roleGrants: {},
  warnings: {},
  automod: {},
  logChannels: {},
  presence: null,
  mapTrackers: {},
  automodRules: {},
  ldStock: {},
  polls: {},
  reminders: {},
  aiChannels: {},
  aiUsage: {},
  aiLocked: {},
  aiNightLock: null,
});

fs.mkdirSync(path.dirname(path.resolve(CONFIG.DB_FILE)), { recursive: true });
let db = EMPTY_DB();
try {
  db = { ...EMPTY_DB(), ...JSON.parse(fs.readFileSync(CONFIG.DB_FILE, "utf8")) };
} catch (err) {
  if (err.code !== "ENOENT") {
    const backup = `${CONFIG.DB_FILE}.corrupt-${Date.now()}`;
    try { fs.copyFileSync(CONFIG.DB_FILE, backup); } catch {}
    console.error(`Database could not be read. Backup saved to ${backup}`, err.message);
  }
}

let saveTimer = null;
function flushDb() {
  saveTimer = null;
  try {
    const tmp = `${CONFIG.DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, CONFIG.DB_FILE);
  } catch (err) {
    console.error("Database save failed:", err.message);
  }
}
// Writes are batched: many changes within 800 ms become one disk write.
function save() {
  if (!saveTimer) saveTimer = setTimeout(flushDb, 800);
}
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    if (saveTimer) flushDb();
    process.exit(0);
  });
}

// ============================================================
//  CLIENT
// ============================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// ============================================================
//  HELPERS
// ============================================================
class UserError extends Error {}
const fail = text => { throw new UserError(text); };
const now = () => Date.now();
const cut = (value, max) => String(value ?? "").slice(0, max);
const stamp = t => `<t:${Math.floor(t / 1000)}:f>`;
const rel = t => `<t:${Math.floor(t / 1000)}:R>`;
const noMentions = { parse: [] };
const DAY = 86400000;
const newId = (bytes = 4) => crypto.randomBytes(bytes).toString("hex");

const embed = (title, description, color = DEFAULT_COLOR) =>
  new EmbedBuilder()
    .setColor(color)
    .setTitle(cut(title, 256))
    .setDescription(cut(description || " ", 4096))
    .setFooter({ text: "Ld Bank • Winter Edition" })
    .setTimestamp();

// Custom emoji tags (<:name:id> / <a:name:id>) -> discord.js emoji object
function parseEmoji(value) {
  const m = /^<(a?):(\w+):(\d+)>$/.exec(value);
  return m ? { animated: m[1] === "a", name: m[2], id: m[3] } : value;
}

const btn = (customId, label, style = ButtonStyle.Secondary, emoji) => {
  const b = new ButtonBuilder().setCustomId(customId).setLabel(cut(label, 80)).setStyle(style);
  if (emoji) b.setEmoji(parseEmoji(emoji));
  return b;
};
const row = (...components) => new ActionRowBuilder().addComponents(components);

const isAdmin = i => i.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
function requireAdmin(i) {
  if (!isAdmin(i)) fail("Only server administrators can use this.");
}

async function defer(i, ephemeral = true) {
  if (!i.deferred && !i.replied) {
    await i.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
  }
}

// Works whether or not the interaction was already deferred.
async function say(i, payload) {
  const data = typeof payload === "string" ? { content: payload } : { ...payload };
  data.allowedMentions = data.allowedMentions ?? noMentions;
  if (i.deferred) return i.editReply(data);
  if (i.replied) return i.followUp({ ...data, flags: MessageFlags.Ephemeral });
  return i.reply({ ...data, flags: MessageFlags.Ephemeral });
}

async function botCan(guild, permission, label) {
  const me = guild.members.me ?? (await guild.members.fetchMe());
  if (!me.permissions.has(permission)) fail(`I need the **${label}** permission for this action.`);
  return me;
}

function assertHierarchy(i, target, me) {
  if (target.id === i.guild.ownerId) fail("I cannot moderate the server owner.");
  if (target.id === i.user.id) fail("You cannot moderate yourself.");
  if (me && target.roles.highest.position >= me.roles.highest.position) {
    fail("My highest role must be above the target member's highest role.");
  }
  if (i.user.id !== i.guild.ownerId && i.member && target.roles.highest.position >= i.member.roles.highest.position) {
    fail("You cannot moderate a member with an equal or higher role than yours.");
  }
}

function textTarget(channel) {
  if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
    fail("Choose a server text channel.");
  }
  return channel;
}

function addWarning(guildId, userId, reason, moderatorId) {
  db.warnings[guildId] ??= {};
  db.warnings[guildId][userId] ??= [];
  db.warnings[guildId][userId].push({ reason: cut(reason, 500), moderatorId, at: now() });
  save();
  return db.warnings[guildId][userId].length;
}

async function audit(guild, action, actor, targetId, reason) {
  const logId = db.logChannels[guild.id];
  if (!logId) return;
  const channel = await guild.channels.fetch(logId).catch(() => null);
  if (!channel) return;
  await channel.send({
    embeds: [embed(action, `**Moderator:** <@${actor.id}>\n**Target:** ${targetId ? `<@${targetId}>` : "Not applicable"}\n**Reason:** ${cut(reason || "Not provided", 1000)}\n**Time:** ${stamp(now())}`)],
    allowedMentions: noMentions,
  }).catch(() => {});
}

function shuffle(list) {
  const out = [...list];
  for (let k = out.length - 1; k > 0; k--) {
    const j = crypto.randomInt(k + 1);
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}

function isHttpsUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && value.length <= 500;
  } catch {
    return false;
  }
}

// Istanbul time helpers
const istanbulDay = (t = now()) => new Date(t).toLocaleDateString("en-CA", { timeZone: CONFIG.TIMEZONE });
const istanbulHM = () => new Date().toLocaleTimeString("en-GB", { timeZone: CONFIG.TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });

// ============================================================
//  PRESENCE
// ============================================================
const ACTIVITY = {
  playing: ActivityType.Playing,
  watching: ActivityType.Watching,
  listening: ActivityType.Listening,
  competing: ActivityType.Competing,
};

function applyPresence() {
  const p = db.presence ?? { type: "watching", text: "Ld Bank" };
  client.user?.setPresence({
    status: "online",
    activities: [{ name: p.text, type: ACTIVITY[p.type] ?? ActivityType.Watching }],
  });
}

// ============================================================
//  SLASH COMMANDS
// ============================================================
const adminCmd = (name, description) =>
  new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDMPermission(false);

const textOpt = (name, description, required = false) => o =>
  o.setName(name).setDescription(description).setRequired(required)
    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

const COMMANDS = [
  new SlashCommandBuilder().setName("help").setDescription("Show the command list"),
  new SlashCommandBuilder().setName("about").setDescription("Show information about this bot"),

  adminCmd("announcement", "Send an announcement (pick a color next)")
    .addStringOption(o => o.setName("text").setDescription("Announcement text").setRequired(true).setMaxLength(4000))
    .addStringOption(o => o.setName("title").setDescription("Optional title").setMaxLength(256))
    .addStringOption(o => o.setName("image").setDescription("Optional https image link").setMaxLength(500))
    .addRoleOption(o => o.setName("ping_role").setDescription("Optional role to mention"))
    .addChannelOption(textOpt("channel", "Channel to post in")),

  adminCmd("say", "Make the bot say something (plain text)")
    .addStringOption(o => o.setName("text").setDescription("Text to send").setRequired(true).setMaxLength(2000))
    .addChannelOption(textOpt("channel", "Channel to post in")),

  adminCmd("status", "Set the bot status")
    .addStringOption(o => o.setName("type").setDescription("Activity type").setRequired(true)
      .addChoices(
        { name: "Playing", value: "playing" },
        { name: "Watching", value: "watching" },
        { name: "Listening", value: "listening" },
        { name: "Competing", value: "competing" },
      ))
    .addStringOption(o => o.setName("text").setDescription("Status text").setRequired(true).setMaxLength(128)),

  adminCmd("dm", "Send a direct message to a user")
    .addUserOption(o => o.setName("user").setDescription("Target user").setRequired(true))
    .addStringOption(o => o.setName("text").setDescription("Message").setRequired(true).setMaxLength(2000)),

  adminCmd("ticket-setup", "Set the ticket log channel")
    .addChannelOption(textOpt("log_channel", "Channel that receives transcripts")),

  adminCmd("ticket-category-add", "Add a ticket category")
    .addStringOption(o => o.setName("name").setDescription("Category name (shown in the menu)").setRequired(true).setMaxLength(40))
    .addStringOption(o => o.setName("description").setDescription("Short description").setMaxLength(100))
    .addStringOption(o => o.setName("welcome").setDescription("Welcome text. Use {user} and {category}").setMaxLength(1000))
    .addRoleOption(o => o.setName("support_role").setDescription("Staff role for this category"))
    .addChannelOption(o => o.setName("parent_category").setDescription("Discord category for these tickets").addChannelTypes(ChannelType.GuildCategory)),

  adminCmd("ticket-category-remove", "Remove a ticket category")
    .addStringOption(o => o.setName("name").setDescription("Category name").setRequired(true).setMaxLength(40)),

  adminCmd("ticket-categories", "List ticket categories"),

  adminCmd("ticket-panel", "Post the ticket panel (pick a color next)")
    .addStringOption(o => o.setName("title").setDescription("Panel title").setRequired(true).setMaxLength(256))
    .addStringOption(o => o.setName("description").setDescription("Panel description").setRequired(true).setMaxLength(2000))
    .addChannelOption(textOpt("channel", "Channel to post in")),

  adminCmd("giveaway", "Start a giveaway (pick a color, then a duration)")
    .addStringOption(o => o.setName("prize").setDescription("What is the prize").setRequired(true).setMaxLength(200))
    .addIntegerOption(o => o.setName("winners").setDescription("Number of winners").setRequired(true).setMinValue(1).setMaxValue(20))
    .addChannelOption(textOpt("channel", "Channel for the giveaway"))
    .addRoleOption(o => o.setName("required_role").setDescription("Role members need to join"))
    .addRoleOption(o => o.setName("winner_role").setDescription("Role given to the winners"))
    .addIntegerOption(o => o.setName("min_account_days").setDescription("Minimum account age in days").setMinValue(0).setMaxValue(365)),

  adminCmd("giveaway-end", "End an active giveaway now")
    .addStringOption(o => o.setName("message_id").setDescription("Giveaway message ID").setRequired(true)),

  adminCmd("giveaway-reroll", "Pick new winners for an ended giveaway")
    .addStringOption(o => o.setName("message_id").setDescription("Giveaway message ID").setRequired(true)),

  adminCmd("giveaway-cancel", "Cancel an active giveaway without winners")
    .addStringOption(o => o.setName("message_id").setDescription("Giveaway message ID").setRequired(true)),

  adminCmd("application-setup", "Open the application panel builder")
    .addChannelOption(textOpt("review_channel", "Channel where applications are reviewed", true))
    .addChannelOption(textOpt("panel_channel", "Channel where the Apply panel is posted", true))
    .addRoleOption(o => o.setName("accepted_role").setDescription("Role given when an application is accepted")),

  adminCmd("rolepanel-create", "Create a button role panel (pick a color next)")
    .addStringOption(o => o.setName("title").setDescription("Panel title").setRequired(true).setMaxLength(256))
    .addStringOption(o => o.setName("description").setDescription("Panel description").setRequired(true).setMaxLength(2000))
    .addChannelOption(textOpt("channel", "Channel to post in")),

  adminCmd("rolepanel-add", "Add a role button to a role panel")
    .addStringOption(o => o.setName("message_id").setDescription("Role panel message ID").setRequired(true))
    .addStringOption(o => o.setName("label").setDescription("Button label").setRequired(true).setMaxLength(80))
    .addRoleOption(o => o.setName("role").setDescription("Role to give").setRequired(true))
    .addStringOption(o => o.setName("emoji").setDescription("Button emoji (optional)").setMaxLength(64)),

  adminCmd("setup-server", "Build a server layout from a template"),

  adminCmd("add-emoji", "Add up to 10 emojis to this server at once")
    .addStringOption(o => o.setName("emojis").setDescription("Custom emojis from any server and/or https image links, separated by spaces (max 10)").setMaxLength(1000))
    .addStringOption(o => o.setName("name").setDescription("Name for a single emoji (optional, only when adding one)").setMaxLength(32))
    .addAttachmentOption(o => o.setName("image").setDescription("Image file (PNG, JPG, GIF or WEBP, max 256 KB)")),

  new SlashCommandBuilder().setName("mywarn").setDescription("See your own warnings"),
  new SlashCommandBuilder().setName("publicwarn").setDescription("Public list of warned members in this server"),
  new SlashCommandBuilder().setName("official-map").setDescription("Show the GoreBox 27 official map cards"),

  new SlashCommandBuilder().setName("ld-stock").setDescription("Show the LD stock board for this server"),
  adminCmd("set-ld-stock", "Set the LD stock board (administrators only)")
    .addIntegerOption(o => o.setName("stock").setDescription("Total LD stock").setRequired(true).setMinValue(0).setMaxValue(1000000000))
    .addIntegerOption(o => o.setName("reserved").setDescription("LD reserved for giveaways or events").setMinValue(0).setMaxValue(1000000000))
    .addStringOption(o => o.setName("note").setDescription("Optional note shown on the board").setMaxLength(300)),
  new SlashCommandBuilder().setName("poll").setDescription("Create a poll with up to 4 options")
    .addStringOption(o => o.setName("question").setDescription("Poll question").setRequired(true).setMaxLength(256))
    .addStringOption(o => o.setName("option1").setDescription("Option 1").setRequired(true).setMaxLength(80))
    .addStringOption(o => o.setName("option2").setDescription("Option 2").setRequired(true).setMaxLength(80))
    .addStringOption(o => o.setName("option3").setDescription("Option 3").setMaxLength(80))
    .addStringOption(o => o.setName("option4").setDescription("Option 4").setMaxLength(80))
    .addIntegerOption(o => o.setName("minutes").setDescription("Auto-close after this many minutes (optional)").setMinValue(1).setMaxValue(10080)),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Show information about this server"),
  new SlashCommandBuilder().setName("userinfo").setDescription("Show information about a member")
    .addUserOption(o => o.setName("user").setDescription("Member (defaults to you)")),
  new SlashCommandBuilder().setName("remind").setDescription("Get a reminder in this channel")
    .addIntegerOption(o => o.setName("minutes").setDescription("Minutes from now (1-10080)").setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption(o => o.setName("text").setDescription("What should I remind you?").setRequired(true).setMaxLength(300)),
  adminCmd("giveaway-list", "List active giveaways in this server"),

  adminCmd("talk-to-bot", "Let Ld Bank chat with members in a channel (AI)")
    .addChannelOption(textOpt("channel", "Channel for AI chat (defaults to this channel)")),

  adminCmd("talk-to-bot-off", "Stop AI chat in this server"),

  adminCmd("counting-setup", "Set the channel for the counting game")
    .addChannelOption(textOpt("channel", "Counting channel", true)),

  new SlashCommandBuilder().setName("counting-stats").setDescription("Counting game status and leaderboard"),

  adminCmd("ban", "Ban a member")
    .addUserOption(o => o.setName("user").setDescription("Member to ban").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setMaxLength(500)),

  adminCmd("kick", "Kick a member")
    .addUserOption(o => o.setName("user").setDescription("Member to kick").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setMaxLength(500)),

  adminCmd("timeout", "Timeout a member")
    .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Minutes (1-40320)").setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setMaxLength(500)),

  adminCmd("untimeout", "Remove a member's timeout")
    .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true)),

  adminCmd("warn", "Warn a member")
    .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true).setMaxLength(500)),

  adminCmd("warnings", "Show a member's warnings")
    .addUserOption(o => o.setName("user").setDescription("Member").setRequired(true)),

  adminCmd("clear", "Delete recent messages in this channel")
    .addIntegerOption(o => o.setName("amount").setDescription("1-100").setRequired(true).setMinValue(1).setMaxValue(100)),

  adminCmd("lock", "Stop everyone from sending messages in this channel"),
  adminCmd("unlock", "Allow everyone to send messages in this channel again"),

  adminCmd("slowmode", "Set slowmode for this channel")
    .addIntegerOption(o => o.setName("seconds").setDescription("0-21600, 0 turns it off").setRequired(true).setMinValue(0).setMaxValue(21600)),

  adminCmd("automod", "Turn auto moderation on or off")
    .addBooleanOption(o => o.setName("enabled").setDescription("On or off").setRequired(true)),

  adminCmd("automod-stats", "Count the AutoMod rules this bot created on Discord"),

  adminCmd("moderation-log", "Choose the channel for moderation logs")
    .addChannelOption(textOpt("channel", "Log channel", true)),
];

const PUBLIC_COMMANDS = new Set(["help", "about", "mywarn", "publicwarn", "official-map", "ld-stock", "poll", "serverinfo", "userinfo", "remind", "counting-stats"]);
const ADMIN_COMMANDS = new Set(COMMANDS.map(c => c.name).filter(n => !PUBLIC_COMMANDS.has(n)));

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  const body = COMMANDS.map(c => c.toJSON());
  // Global commands: every server sees them (may take up to ~1 hour the first time).
  // put() replaces the whole global list, so old commands like /mod ban disappear.
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
  // Clear guild-scoped copies so commands are not shown twice in the test server.
  if (GUILD_ID) await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
  console.log(`Registered ${body.length} global slash commands.`);
}

// ============================================================
//  HELP / ABOUT
// ============================================================
const INTRO = "I am **Ld Bank**: giveaways, categorized tickets, applications, button roles, server templates and moderation in one bot.";
const OWNER_LINES = `**My Owner:** ${CONFIG.OWNER}\n**My Developer:** ${CONFIG.DEVELOPER}`;

const helpEmbed = () => embed(`${e("help")} Ld Bank | Help`, [
  INTRO, "", OWNER_LINES, "",
  `${e("sparkle")} **Public:** \`/help\` \`/about\` \`/mywarn\` \`/publicwarn\` \`/official-map\` \`/ld-stock\` \`/poll\` \`/serverinfo\` \`/userinfo\` \`/remind\` \`/counting-stats\``,
  `${e("ai")} **Ld Bank AI and games (admin):** \`/talk-to-bot\` \`/talk-to-bot-off\` \`/counting-setup\``,
  `${e("announce")} **Messaging (admin):** \`/announcement\` \`/say\` \`/status\` \`/dm\``,
  `${e("ticket")} **Tickets (admin):** \`/ticket-setup\` \`/ticket-category-add\` \`/ticket-category-remove\` \`/ticket-categories\` \`/ticket-panel\``,
  `${e("party")} **Giveaways (admin):** \`/giveaway\` \`/giveaway-end\` \`/giveaway-reroll\` \`/giveaway-cancel\``,
  `${e("application")} **Applications (admin):** \`/application-setup\` (opens the panel builder)`,
  `${e("roles")} **Button roles (admin):** \`/rolepanel-create\` \`/rolepanel-add\``,
  `${e("setup")} **Server (admin):** \`/setup-server\` \`/add-emoji\``,
  `${e("automod")} **Moderation (admin):** \`/ban\` \`/kick\` \`/timeout\` \`/untimeout\` \`/warn\` \`/warnings\` \`/clear\` \`/lock\` \`/unlock\` \`/slowmode\` \`/automod\` \`/moderation-log\``,
].join("\n"));

const aboutEmbed = () => embed(`${e("about")} About Ld Bank`, [
  INTRO, "",
  `${e("party")} Giveaways with required roles, account age checks and winner DMs`,
  `${e("ticket")} Categorized tickets with claim, close and transcripts`,
  `${e("apply")} Applications with up to 20 custom questions and accept or reject review`,
  `${e("roles")} Button role panels with a 20 second removal cooldown`,
  `${e("color")} Embed color picker with 15 colors on every embed command`,
  `${e("automod")} One-click server templates and moderation tools`,
  "", OWNER_LINES,
].join("\n"));

// ============================================================
//  EMBED COLOR PICKER
// ============================================================
// pendingEmbeds: after a command, the user picks a color. The original command's data is kept until then.
const pendingEmbeds = new Map();

function colorRow(kind) {
  return row(new StringSelectMenuBuilder()
    .setCustomId(`color:${kind}`)
    .setPlaceholder("Pick an embed color")
    .addOptions(COLORS.map((c, idx) => ({
      label: c.name,
      value: String(idx),
      description: `#${c.value.toString(16).padStart(6, "0").toUpperCase()}`,
    }))));
}

async function askColor(i, kind, data) {
  pendingEmbeds.set(i.user.id, { kind, data, expires: now() + CONFIG.PENDING_TTL });
  return say(i, { content: `${e("color")} Pick a color for the embed. It will be posted right after you choose.`, components: [colorRow(kind)] });
}

// ============================================================
//  TICKETS (categorized)
// ============================================================
function ticketConfigOf(guildId) {
  db.ticketConfig[guildId] ??= { logChannelId: null, categories: [] };
  return db.ticketConfig[guildId];
}

function ticketPanelRow(cfg) {
  return row(new StringSelectMenuBuilder()
    .setCustomId("ticket:open")
    .setPlaceholder("Choose a ticket category")
    .addOptions(cfg.categories.map(c => ({
      label: cut(c.name, 100),
      value: c.id,
      description: c.description ? cut(c.description, 100) : undefined,
    }))));
}

async function openTicket(i, category) {
  const existing = Object.entries(db.tickets).find(([, t]) =>
    t.guildId === i.guildId && t.userId === i.user.id && t.state === "open");
  if (existing) fail(`You already have an open ticket: <#${existing[0]}>`);

  await botCan(i.guild, PermissionFlagsBits.ManageChannels, "Manage Channels");

  const overwrites = [
    { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: i.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
    },
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory],
    },
  ];
  if (category.supportRoleId) {
    overwrites.push({
      id: category.supportRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const slug = s => s.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const name = cut(`${slug(category.name) || "ticket"}-${slug(i.user.username) || i.user.id}`, 90);
  const channel = await i.guild.channels.create({
    name: `ticket-${name}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: category.parentId || undefined,
    permissionOverwrites: overwrites,
    topic: `Ticket of ${i.user.id} | ${category.name}`,
    reason: "Ticket opened",
  });

  db.tickets[channel.id] = {
    guildId: i.guildId,
    userId: i.user.id,
    categoryName: category.name,
    supportRoleId: category.supportRoleId || null,
    claimedBy: null,
    state: "open",
    createdAt: now(),
  };
  save();

  const welcome = cut(category.welcome || "Welcome {user}! Describe your issue and our staff will help you shortly.", 2000)
    .replaceAll("{user}", `<@${i.user.id}>`)
    .replaceAll("{category}", category.name);
  await channel.send({
    content: `<@${i.user.id}>${category.supportRoleId ? ` <@&${category.supportRoleId}>` : ""}`,
    embeds: [embed(`${e("ticket")} ${category.name}`, welcome).setFooter({ text: `Ticket opened • ${category.name}` })],
    components: [row(
      btn("ticket:claim", "Claim", ButtonStyle.Primary, e("claim")),
      btn("ticket:close", "Close", ButtonStyle.Danger, e("lock")),
    )],
    allowedMentions: { users: [i.user.id], roles: category.supportRoleId ? [category.supportRoleId] : [] },
  });
  return say(i, `${e("check")} Your ticket is ready: <#${channel.id}>`);
}

function isTicketStaff(i, t) {
  if (isAdmin(i)) return true;
  return Boolean(t.supportRoleId && i.member?.roles?.cache?.has(t.supportRoleId));
}

async function claimTicket(i) {
  const t = db.tickets[i.channelId];
  if (!t || t.state !== "open") fail("This is not an open ticket channel.");
  if (!isTicketStaff(i, t)) fail("Only staff for this category can claim tickets.");
  if (t.claimedBy) fail(`This ticket is already claimed by <@${t.claimedBy}>.`);
  t.claimedBy = i.user.id;
  save();
  return i.reply({ content: `${e("claim")} <@${i.user.id}> claimed this ticket.`, allowedMentions: noMentions });
}

async function buildTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return "No transcript available.";
  const lines = [...messages.values()].reverse().map(m => {
    const files = m.attachments.size ? ` [attachments: ${[...m.attachments.values()].map(a => a.url).join(" ")}]` : "";
    return `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}${files}`;
  });
  if (messages.size >= 100) lines.unshift("Note: only the latest 100 messages are included.");
  return lines.join("\n") || "The ticket has no messages.";
}

async function closeTicket(i) {
  const t = db.tickets[i.channelId];
  if (!t || t.state !== "open") fail("This is not an open ticket channel.");
  if (i.user.id !== t.userId && !isTicketStaff(i, t)) fail("Only the ticket owner or staff can close this ticket.");

  t.state = "closed";
  t.closedBy = i.user.id;
  t.closedAt = now();
  save();
  await defer(i, false);

  const transcript = await buildTranscript(i.channel);
  const makeFile = () => new AttachmentBuilder(Buffer.from(transcript, "utf8"), { name: `transcript-${i.channel.name}.txt` });

  const cfg = db.ticketConfig[i.guildId];
  if (cfg?.logChannelId) {
    const log = await i.guild.channels.fetch(cfg.logChannelId).catch(() => null);
    await log?.send({
      content: `Ticket **${i.channel.name}** (${t.categoryName}) closed by <@${i.user.id}>`,
      files: [makeFile()],
      allowedMentions: noMentions,
    }).catch(() => {});
  }
  const owner = await client.users.fetch(t.userId).catch(() => null);
  await owner?.send({ content: `Your ticket **${i.channel.name}** in **${i.guild.name}** was closed.`, files: [makeFile()] }).catch(() => {});

  await i.editReply({ content: `${e("lock")} This ticket is closed. The channel will be deleted in 5 seconds.`, allowedMentions: noMentions });
  setTimeout(() => {
    i.channel.delete("Ticket closed").catch(() => {});
    t.state = "deleted";
    save();
  }, 5000);
}

// ============================================================
//  GIVEAWAYS
// ============================================================
const DURATIONS = [
  ["1 minute", 60 * 1000],
  ["5 minutes", 5 * 60 * 1000],
  ["10 minutes", 10 * 60 * 1000],
  ["30 minutes", 30 * 60 * 1000],
  ["1 hour", 60 * 60 * 1000],
  ["6 hours", 6 * 60 * 60 * 1000],
  ["12 hours", 12 * 60 * 60 * 1000],
  ["1 day", DAY],
  ["3 days", 3 * DAY],
  ["7 days", 7 * DAY],
];
const pendingGiveaways = new Map();

function giveawayEmbed(g) {
  const status = g.state === "active"
    ? `**Ends:** ${rel(g.endsAt)}`
    : g.state === "cancelled"
      ? "**Status:** Cancelled"
      : `**Ended:** ${stamp(g.endedAt)}\n**Winners:** ${g.winnerIds?.length ? g.winnerIds.map(w => `<@${w}>`).join(", ") : "No valid entries"}`;
  const requirements = [
    g.requiredRoleId ? `Required role: <@&${g.requiredRoleId}>` : null,
    g.minAccountDays ? `Account age: at least ${g.minAccountDays} day(s)` : null,
    g.winnerRoleId ? `Winners role: <@&${g.winnerRoleId}>` : null,
  ].filter(Boolean).join("\n");
  return embed(
    g.state === "active" ? `${e("party")} ${cut(g.prize, 200)}` : `${e("finish")} ${cut(g.prize, 200)}`,
    `**Prize:** ${g.prize}\n**Winners:** ${g.winners}\n**Hosted by:** <@${g.hostId}>\n**Entries:** ${g.entries.length}\n${status}${requirements ? `\n\n${requirements}` : ""}`,
    g.color ?? DEFAULT_COLOR,
  ).setFooter({ text: g.state === "active" ? "Press the button to join. Press it again to leave." : "This giveaway is finished." });
}

function findGiveawayByMessage(messageId) {
  return Object.values(db.giveaways).find(g => g.messageId === messageId) || null;
}

function findGiveaway(i, messageId) {
  const g = db.giveaways[messageId] ?? findGiveawayByMessage(messageId);
  if (!g || g.guildId !== i.guildId) fail("Giveaway not found.");
  return g;
}

async function isGiveawayEligible(guild, userId, g) {
  const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;
  if (g.requiredRoleId && !member.roles.cache.has(g.requiredRoleId)) return false;
  if (g.minAccountDays && now() - member.user.createdTimestamp < g.minAccountDays * DAY) return false;
  return true;
}

async function pickWinners(guild, g, exclude, count) {
  const pool = shuffle(g.entries.filter(u => !exclude.includes(u)));
  const winners = [];
  for (const userId of pool) {
    if (winners.length >= count) break;
    if (await isGiveawayEligible(guild, userId, g)) winners.push(userId);
  }
  return winners;
}

async function publishGiveawayResult(guild, g, rerolled) {
  if (g.winnerRoleId) {
    for (const userId of g.winnerIds) {
      const member = await guild.members.fetch(userId).catch(() => null);
      await member?.roles.add(g.winnerRoleId).catch(() => {});
    }
  }
  const channel = await guild.channels.fetch(g.channelId).catch(() => null);
  const message = channel && g.messageId ? await channel.messages.fetch(g.messageId).catch(() => null) : null;
  await message?.edit({ embeds: [giveawayEmbed(g)], components: [] }).catch(() => {});

  if (channel) {
    const winnersText = g.winnerIds.map(w => `<@${w}>`).join(", ");
    await channel.send({
      content: g.winnerIds.length
        ? `${e("party")} ${rerolled ? "New winner" : "Congratulations"} ${winnersText}! You won **${g.prize}**!`
        : `No valid entries for **${g.prize}**, so there are no winners this time.`,
      allowedMentions: { users: g.winnerIds },
    }).catch(() => {});
  }
  for (const userId of g.winnerIds) {
    const user = await client.users.fetch(userId).catch(() => null);
    await user?.send(`${e("party")} You won **${g.prize}** in **${guild.name}**! Please contact the host <@${g.hostId}> to claim your prize.`).catch(() => {});
  }
}

async function concludeGiveaway(g) {
  if (g.state !== "active") return;
  g.state = "ended";
  g.endedAt = now();
  save();
  const guild = client.guilds.cache.get(g.guildId) ?? await client.guilds.fetch(g.guildId);
  g.winnerIds = await pickWinners(guild, g, [], g.winners);
  save();
  await publishGiveawayResult(guild, g, false);
}

async function tickGiveaways() {
  for (const g of Object.values(db.giveaways)) {
    if (g.state === "active" && g.endsAt <= now()) {
      try { await concludeGiveaway(g); }
      catch (err) { console.error(`Giveaway ${g.id} could not be concluded:`, err.message); }
    }
  }
}

async function toggleGiveawayEntry(i, giveawayId) {
  const g = db.giveaways[giveawayId];
  if (!g || g.state !== "active") fail("This giveaway is no longer active.");
  await defer(i);
  if (g.entries.includes(i.user.id)) {
    g.entries = g.entries.filter(u => u !== i.user.id);
    save();
    await i.message.edit({ embeds: [giveawayEmbed(g)] }).catch(() => {});
    return say(i, "You left the giveaway.");
  }
  if (g.requiredRoleId && !i.member.roles.cache.has(g.requiredRoleId)) {
    fail(`You need the <@&${g.requiredRoleId}> role to join this giveaway.`);
  }
  if (g.minAccountDays && now() - i.user.createdTimestamp < g.minAccountDays * DAY) {
    fail(`Your Discord account must be at least ${g.minAccountDays} day(s) old to join.`);
  }
  g.entries.push(i.user.id);
  save();
  await i.message.edit({ embeds: [giveawayEmbed(g)] }).catch(() => {});
  return say(i, `${e("party")} You joined **${g.prize}**! Press the button again to leave. Entries: ${g.entries.length}`);
}

// ============================================================
//  BUTTON ROLE PANELS
// ============================================================
function rolePanelRows(panel) {
  const rows = [];
  for (let k = 0; k < panel.buttons.length; k += 5) {
    rows.push(row(...panel.buttons.slice(k, k + 5).map(b =>
      btn(`rp:${b.roleId}`, b.label, ButtonStyle.Secondary, b.emoji || undefined))));
  }
  return rows;
}

async function toggleRole(i, roleId) {
  await defer(i);
  const role = i.guild.roles.cache.get(roleId) ?? await i.guild.roles.fetch(roleId).catch(() => null);
  if (!role) fail("This role no longer exists. Ask an administrator to recreate the panel.");
  const key = `${i.user.id}:${roleId}`;
  const member = i.member;

  if (!member.roles.cache.has(roleId)) {
    await member.roles.add(roleId).catch(() => fail("I could not give that role. Check my permissions and role position."));
    db.roleGrants[key] = now();
    save();
    return say(i, `${e("check")} You received **${role.name}**. Press the button again after 20 seconds to remove it.`);
  }

  const granted = db.roleGrants[key];
  if (granted) {
    const since = now() - granted;
    if (since < CONFIG.ROLE_COOLDOWN) {
      fail(`Please wait ${Math.ceil((CONFIG.ROLE_COOLDOWN - since) / 1000)} second(s) before removing **${role.name}**.`);
    }
  }
  await member.roles.remove(roleId).catch(() => fail("I could not remove that role. Check my permissions and role position."));
  delete db.roleGrants[key];
  save();
  return say(i, `${e("check")} **${role.name}** was removed.`);
}

// ============================================================
//  APPLICATIONS (up to 20 questions, pages of 5)
// ============================================================
const appSessions = new Map();
const sessionKey = i => `${i.guildId}:${i.user.id}`;

function hasPendingApplication(guildId, userId) {
  return Object.values(db.applications).some(a => a.guildId === guildId && a.userId === userId && a.state === "pending");
}

function currentSession(i) {
  const s = appSessions.get(sessionKey(i));
  if (!s || s.expires < now()) fail("Your application session expired. Press Apply again.");
  return s;
}

function applicationPageModal(n, session) {
  const start = n * 5;
  const pages = Math.ceil(session.questions.length / 5);
  const modal = new ModalBuilder()
    .setCustomId(`app:page:${n}`)
    .setTitle(cut(`Application (${n + 1}/${pages})`, 45));
  session.questions.slice(start, start + 5).forEach((question, k) => {
    const long = question.length > 45;
    const input = new TextInputBuilder()
      .setCustomId(`q${k}`)
      .setLabel(long ? `Question ${start + k + 1}` : question)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);
    if (long) input.setPlaceholder(cut(question, 100));
    if (session.answers[start + k]) input.setValue(cut(session.answers[start + k], 1000));
    modal.addComponents(row(input));
  });
  return modal;
}

async function startApplication(i) {
  const cfg = db.applicationConfig[i.guildId];
  if (!cfg) fail("Applications are not configured yet.");
  if (hasPendingApplication(i.guildId, i.user.id)) fail("You already have an application waiting for review.");
  appSessions.set(sessionKey(i), {
    questions: cfg.questions,
    answers: Array(cfg.questions.length).fill(""),
    expires: now() + CONFIG.SESSION_TTL,
  });
  return i.showModal(applicationPageModal(0, appSessions.get(sessionKey(i))));
}

function showApplicationPage(i, n) {
  const s = currentSession(i);
  if (n < 0 || n * 5 >= s.questions.length) fail("This page does not exist.");
  return i.showModal(applicationPageModal(n, s));
}

async function submitApplicationPage(i, n) {
  const s = currentSession(i);
  const start = n * 5;
  for (let k = 0; k < 5 && start + k < s.questions.length; k++) {
    s.answers[start + k] = i.fields.getTextInputValue(`q${k}`).trim();
  }
  s.expires = now() + CONFIG.SESSION_TTL;
  const pages = Math.ceil(s.questions.length / 5);
  const isLast = n + 1 >= pages;
  const controls = isLast
    ? [btn("app:submit", "Submit", ButtonStyle.Success, e("send")), btn("app:restart", "Start over", ButtonStyle.Secondary)]
    : [btn(`app:next:${n + 1}`, "Continue", ButtonStyle.Primary, e("next")), btn("app:restart", "Start over", ButtonStyle.Secondary)];
  return say(i, {
    content: isLast
      ? `${e("check")} All pages are saved. Press **Submit** to send your application.`
      : `${e("apply")} Page ${n + 1}/${pages} saved. Press **Continue** for the next page.`,
    components: [row(...controls)],
  });
}

async function postApplication(review, app) {
  await review.send({
    embeds: [embed(`${e("application")} New Application`, `**Applicant:** <@${app.userId}>\n**Reference:** \`${app.id}\`\n**Submitted:** ${stamp(app.createdAt)}`)],
    allowedMentions: noMentions,
  });
  for (let s = 0; s < app.questions.length; s += 5) {
    const em = new EmbedBuilder()
      .setColor(DEFAULT_COLOR)
      .setTitle(`Answers ${s + 1}-${Math.min(s + 5, app.questions.length)}`)
      .addFields(app.questions.slice(s, s + 5).map((q, k) => ({
        name: cut(q, 256) || "Question",
        value: cut(app.answers[s + k] || "-", 900) || "-",
      })));
    await review.send({ embeds: [em], allowedMentions: noMentions });
  }
  return review.send({
    content: `Decision for application \`${app.id}\``,
    components: [row(
      btn(`app:accept:${app.id}`, "Accept", ButtonStyle.Success, e("check")),
      btn(`app:reject:${app.id}`, "Reject", ButtonStyle.Danger, e("cross")),
    )],
    allowedMentions: noMentions,
  });
}

async function submitApplication(i) {
  const s = currentSession(i);
  await defer(i);
  if (s.answers.some(a => !a)) fail("Some answers are missing. Press Start over to complete the form.");
  if (hasPendingApplication(i.guildId, i.user.id)) fail("You already have an application waiting for review.");
  const cfg = db.applicationConfig[i.guildId];
  if (!cfg) fail("Applications are not configured anymore.");
  const review = await i.guild.channels.fetch(cfg.reviewChannelId).catch(() => null);
  if (!review) fail("The review channel no longer exists. Ask an administrator to run /application-setup again.");

  const app = {
    id: newId(4),
    guildId: i.guildId,
    userId: i.user.id,
    questions: [...s.questions],
    answers: [...s.answers],
    state: "pending",
    createdAt: now(),
    channelId: review.id,
    messageId: null,
    acceptedRoleId: cfg.acceptedRoleId,
  };
  const control = await postApplication(review, app);
  app.messageId = control.id;
  db.applications[app.id] = app;
  save();
  appSessions.delete(sessionKey(i));
  return say(i, `${e("check")} Application submitted. Reference: \`${app.id}\`. You will receive a DM with the result.`);
}

async function finishApplication(i, app, state, reason) {
  if (app.state !== "pending") fail("This application has already been reviewed.");
  app.state = state;
  app.reason = reason;
  app.reviewerId = i.user.id;
  app.decidedAt = now();
  save();

  let roleNote = "";
  if (state === "accepted" && app.acceptedRoleId) {
    const member = await i.guild.members.fetch(app.userId).catch(() => null);
    if (member) {
      await member.roles.add(app.acceptedRoleId).catch(() => {
        roleNote = `\n${e("warning")} The accepted role could not be assigned. Check my permissions and role position.`;
      });
    }
  }

  const accepted = state === "accepted";
  let dm = "user not found";
  const user = await client.users.fetch(app.userId).catch(() => null);
  if (user) {
    dm = await user.send({
      embeds: [embed(
        accepted ? `${e("check")} Application accepted` : `${e("cross")} Application rejected`,
        accepted
          ? `Your application to **${i.guild.name}** has been accepted. Welcome!`
          : `Your application to **${i.guild.name}** was not accepted.\n\n**Reason:** ${reason || "No reason provided"}`,
        accepted ? 0x2ecc71 : 0xe74c3c,
      )],
    }).then(() => "sent").catch(() => "failed (DMs are closed)");
  }
  app.dm = dm;
  save();

  const channel = await client.channels.fetch(app.channelId).catch(() => null);
  const control = channel ? await channel.messages.fetch(app.messageId).catch(() => null) : null;
  await control?.edit({
    content: `${accepted ? `${e("check")} **Accepted**` : `${e("cross")} **Rejected**`} by <@${i.user.id}>\n**Applicant:** <@${app.userId}>\n**Reference:** \`${app.id}\`\n**DM:** ${dm}${reason ? `\n**Reason:** ${cut(reason, 800)}` : ""}${roleNote}`,
    components: [],
    allowedMentions: noMentions,
  }).catch(() => {});

  await audit(i.guild, `Application ${state}`, i.user, app.userId, reason);
  return dm;
}

// ============================================================
//  SERVER TEMPLATES (30)  "Category>text1,text2;Category2>vc:Voice"
// ============================================================
const TEMPLATES = [
  ["Gaming Community", "Info>rules,announcements;General>chat,media;Gaming>lfg,clips;Voice>vc:Lounge,vc:Squad"],
  ["Streamer Hub", "Info>rules,schedule;Community>chat,clips,fanart;Stream>live-chat,polls;Voice>vc:Stream Lounge"],
  ["Support Server", "Info>rules,announcements;Support>open-a-ticket,faq;General>chat;Voice>vc:Support"],
  ["Shop and Trade", "Info>rules,announcements;Market>listings,trades,sold;Support>tickets,vouches;Voice>vc:Trade Room"],
  ["Anime Community", "Info>rules,news;Anime>chat,recommendations,memes;Art>fanart,cosplay;Voice>vc:Watch Party"],
  ["Music Community", "Info>rules,news;Music>chat,share-tracks,requests;Voice>vc:Listening Room,vc:Jam Session"],
  ["Art Studio", "Info>rules,announcements;Art>wip,finished,critique;Chat>general,feedback;Voice>vc:Studio"],
  ["Coding Hub", "Info>rules,announcements;Dev>general,help,showcase;Resources>links,snippets;Voice>vc:Pair Programming"],
  ["Study Group", "Info>rules,schedule;Study>general,homework-help,resources;Focus>study-room;Voice>vc:Quiet Study,vc:Group Call"],
  ["Roleplay Server", "Info>rules,lore,announcements;IC>roleplay-general,events;OOC>chat,character-sheets;Voice>vc:RP Hall"],
  ["Esports Team", "Info>rules,announcements;Team>scrims,strategy,roster;Chat>general,memes;Voice>vc:Scrim Room,vc:Callouts"],
  ["Clan Base", "Info>rules,announcements;Clan>general,recruitment,events;Matches>results,lfg;Voice>vc:Clan Lounge"],
  ["Crypto and Trading", "Info>rules,news;Markets>charts,analysis,signals;Chat>general,questions;Voice>vc:Market Talk"],
  ["Fitness Club", "Info>rules,announcements;Training>workouts,progress,nutrition;Chat>general,motivation;Voice>vc:Gym Floor"],
  ["Movie Night", "Info>rules,schedule;Movies>chat,recommendations,reviews;Voice>vc:Screening Room"],
  ["Bot Developers", "Info>rules,announcements;Dev>general,help,showcase;API>api-updates,bugs;Voice>vc:Dev Room"],
  ["Photography", "Info>rules,announcements;Photos>shares,critique,gear;Chat>general,tips;Voice>vc:Photo Walk"],
  ["Meme Factory", "Info>rules;Memes>memes,dank-memes,reactions;Chat>general,off-topic;Voice>vc:Meme Lounge"],
  ["Language Exchange", "Info>rules,roles;Practice>english,spanish,turkish;Chat>general,questions;Voice>vc:Speaking Room"],
  ["Tech Hub", "Info>rules,announcements;Tech>news,hardware,software;Help>support,builds;Voice>vc:Tech Talk"],
  ["Book Club", "Info>rules,schedule;Books>current-read,recommendations,quotes;Chat>general;Voice>vc:Reading Room"],
  ["Pet Lovers", "Info>rules,announcements;Pets>pet-pics,care-tips,adoption;Chat>general;Voice>vc:Pet Lounge"],
  ["Cooking Club", "Info>rules,announcements;Kitchen>recipes,food-pics,tips;Chat>general;Voice>vc:Kitchen"],
  ["Travel Community", "Info>rules,announcements;Travel>destinations,trip-reports,tips;Chat>general;Voice>vc:Travel Talk"],
  ["Car Enthusiasts", "Info>rules,announcements;Cars>builds,meets,news;Chat>general,memes;Voice>vc:Garage"],
  ["Business Network", "Info>rules,announcements;Network>introductions,jobs,resources;Chat>general;Voice>vc:Meeting Room"],
  ["Community Event Hub", "Info>rules,announcements;Events>schedule,signups,results;Chat>general;Voice>vc:Event Stage"],
  ["Simple Starter", "Info>rules,announcements;Chat>general,media;Voice>vc:General"],
  ["Creator Community", "Info>rules,announcements;Creators>showcase,feedback,collabs;Chat>general;Voice>vc:Creator Room"],
  ["Staff Base", "Info>rules,announcements;Staff>staff-chat,logs,reports;General>chat;Voice>vc:Staff Room"],
];

async function applyTemplate(guild, template) {
  let created = 0;
  for (const block of template[1].split(";")) {
    const [categoryName, list] = block.split(">");
    const category = await guild.channels.create({
      name: cut(categoryName, 100),
      type: ChannelType.GuildCategory,
      reason: `Template: ${template[0]}`,
    });
    for (const raw of list.split(",")) {
      const voice = raw.startsWith("vc:");
      const name = voice ? raw.slice(3) : raw;
      await guild.channels.create({
        name: voice ? cut(name, 100) : cut(name.toLowerCase().replace(/\s+/g, "-"), 100),
        type: voice ? ChannelType.GuildVoice : ChannelType.GuildText,
        parent: category.id,
        reason: `Template: ${template[0]}`,
      });
      created++;
    }
  }
  return created;
}

// ============================================================
//  APPLICATION PANEL BUILDER (menu-driven)
// ============================================================
const appDrafts = new Map();

function appDraft(i, id) {
  const d = appDrafts.get(id);
  if (!d || d.expires < now()) fail("This setup expired. Run /application-setup again.");
  if (d.userId !== i.user.id) fail("This setup belongs to another administrator.");
  d.expires = now() + CONFIG.SESSION_TTL;
  return d;
}

function appBuilderPayload(d) {
  const list = d.questions.length
    ? d.questions.map((q, k) => `**${k + 1}.** ${q}`).join("\n")
    : "No questions yet. Press **Add Question**.";
  const em = embed(`${e("application")} Application panel builder`, [
    `**Review channel:** <#${d.reviewChannelId}>`,
    `**Panel channel:** <#${d.panelChannelId}>`,
    `**Accepted role:** ${d.acceptedRoleId ? `<@&${d.acceptedRoleId}>` : "none"}`,
    `**Panel title:** ${d.title}`,
    `**Panel text:** ${cut(d.text, 300)}`,
    `**Button label:** ${d.button}`,
    "",
    `**Questions (${d.questions.length}/${CONFIG.MAX_QUESTIONS}):**`,
    list,
  ].join("\n"));
  return {
    embeds: [em],
    components: [
      row(
        btn(`appsetup:text:${d.id}`, "Edit Text", ButtonStyle.Primary, e("edit")),
        btn(`appsetup:add:${d.id}`, "Add Question", ButtonStyle.Primary, e("add")),
        btn(`appsetup:remove:${d.id}`, "Remove Question", ButtonStyle.Secondary, e("remove")),
      ),
      row(btn(`appsetup:send:${d.id}`, "Send Panel", ButtonStyle.Success, e("send"))),
    ],
  };
}

function appTextModal(d) {
  return new ModalBuilder()
    .setCustomId(`appsetup:textmodal:${d.id}`)
    .setTitle("Application panel text")
    .addComponents(
      row(new TextInputBuilder().setCustomId("title").setLabel("Panel title").setStyle(TextInputStyle.Short)
        .setRequired(true).setMaxLength(256).setValue(cut(d.title, 256))),
      row(new TextInputBuilder().setCustomId("text").setLabel("Panel description").setStyle(TextInputStyle.Paragraph)
        .setRequired(true).setMaxLength(1000).setValue(cut(d.text, 1000))),
      row(new TextInputBuilder().setCustomId("button").setLabel("Button label").setStyle(TextInputStyle.Short)
        .setRequired(true).setMaxLength(80).setValue(cut(d.button, 80))),
    );
}

function appAddModal(d) {
  return new ModalBuilder()
    .setCustomId(`appsetup:addmodal:${d.id}`)
    .setTitle("Add questions")
    .addComponents(row(new TextInputBuilder()
      .setCustomId("questions")
      .setLabel("One question per line")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000)
      .setPlaceholder("Why do you want to join?\nHow old are you?")));
}

async function onAppSetupButton(i, op, id) {
  const d = appDraft(i, id);
  if (op === "text") return i.showModal(appTextModal(d));
  if (op === "add") {
    if (d.questions.length >= CONFIG.MAX_QUESTIONS) fail(`You already have ${CONFIG.MAX_QUESTIONS} questions, the maximum.`);
    return i.showModal(appAddModal(d));
  }
  if (op === "remove") {
    if (!d.questions.length) fail("There are no questions to remove.");
    return say(i, {
      content: "Choose the question to remove:",
      components: [row(new StringSelectMenuBuilder()
        .setCustomId(`appsetup:removepick:${d.id}`)
        .setPlaceholder("Select a question")
        .addOptions(d.questions.map((q, k) => ({ label: cut(`${k + 1}. ${q}`, 100), value: String(k) }))))],
    });
  }
  if (op === "send") return sendApplicationPanel(i, d);
  fail("Unknown builder action.");
}

async function onAppSetupModal(i, op, id) {
  const d = appDraft(i, id);
  if (op === "textmodal") {
    d.title = cut(i.fields.getTextInputValue("title").trim(), 256) || "Staff Applications";
    d.text = i.fields.getTextInputValue("text").trim();
    d.button = cut(i.fields.getTextInputValue("button").trim(), 80) || "Apply";
    return say(i, appBuilderPayload(d));
  }
  if (op === "addmodal") {
    const lines = i.fields.getTextInputValue("questions").split("\n").map(q => q.trim()).filter(Boolean);
    if (!lines.length) fail("Enter at least one question.");
    if (lines.some(q => q.length > 100)) fail("Each question must be 100 characters or fewer.");
    if (d.questions.length + lines.length > CONFIG.MAX_QUESTIONS) {
      fail(`You can have at most ${CONFIG.MAX_QUESTIONS} questions. You have ${d.questions.length} and tried to add ${lines.length}.`);
    }
    d.questions.push(...lines);
    return say(i, appBuilderPayload(d));
  }
  fail("Unknown form.");
}

async function onAppSetupSelect(i) {
  const id = i.customId.split(":")[2];
  const d = appDraft(i, id);
  const idx = Number(i.values[0]);
  if (!d.questions[idx]) fail("That question no longer exists.");
  d.questions.splice(idx, 1);
  return i.update({ content: null, ...appBuilderPayload(d) });
}

async function sendApplicationPanel(i, d) {
  if (!d.questions.length) fail("Add at least one question with Add Question first.");
  const channel = textTarget(await i.guild.channels.fetch(d.panelChannelId).catch(() => null) ?? fail("The panel channel no longer exists."));
  const review = await i.guild.channels.fetch(d.reviewChannelId).catch(() => null);
  if (!review) fail("The review channel no longer exists. Run /application-setup again.");
  pendingEmbeds.set(i.user.id, {
    kind: "application-panel",
    data: { ...d, questions: [...d.questions], channelId: channel.id, draftId: d.id },
    expires: now() + CONFIG.PENDING_TTL,
  });
  return say(i, { content: `${e("color")} Pick a color for the application panel. It will be posted right after you choose.`, components: [colorRow("application-panel")] });
}

// ============================================================
//  WARNING LISTS (/mywarn, /publicwarn)
// ============================================================
const WARN_PAGE = 5;
const PUBLIC_PAGE = 10;

function pageControls(prefix, page, pages, extra = "") {
  return row(
    btn(`${prefix}:${extra}${page - 1}`, "◀ Prev", ButtonStyle.Secondary).setDisabled(page <= 0),
    btn(`${prefix}:page`, `${page + 1} / ${pages}`, ButtonStyle.Secondary).setDisabled(true),
    btn(`${prefix}:${extra}${page + 1}`, "Next ▶", ButtonStyle.Secondary).setDisabled(page >= pages - 1),
  );
}

function myWarnView(guildId, userId, page) {
  const list = db.warnings[guildId]?.[userId] ?? [];
  if (!list.length) {
    return { embeds: [embed(`${e("warning")} Your warnings`, `You have no warnings in this server. Keep it up! ${e("check")}`)], components: [] };
  }
  const pages = Math.ceil(list.length / WARN_PAGE);
  const p = Math.min(Math.max(page, 0), pages - 1);
  const body = list.slice(p * WARN_PAGE, p * WARN_PAGE + WARN_PAGE).map((w, k) =>
    `**#${p * WARN_PAGE + k + 1}** • ${stamp(w.at)}\n**Reason:** ${cut(w.reason, 300)}\n**By:** ${w.moderatorId ? `<@${w.moderatorId}>` : "Unknown"}`
  ).join("\n\n");
  const em = embed(`${e("warning")} Your warnings (${list.length} total)`, body).setFooter({ text: `Page ${p + 1} of ${pages}` });
  return { embeds: [em], components: pages > 1 ? [pageControls("mywarn", p, pages, `${userId}:`)] : [], allowedMentions: noMentions };
}

function publicWarnView(guild, page) {
  const entries = Object.entries(db.warnings[guild.id] ?? {})
    .filter(([, list]) => list.length)
    .sort((a, b) => b[1].length - a[1].length);
  if (!entries.length) {
    return { embeds: [embed(`${e("list")} Public warning list`, `Nobody in this server has a warning. ${e("party")}`)], components: [], allowedMentions: noMentions };
  }
  const pages = Math.ceil(entries.length / PUBLIC_PAGE);
  const p = Math.min(Math.max(page, 0), pages - 1);
  const lines = entries.slice(p * PUBLIC_PAGE, p * PUBLIC_PAGE + PUBLIC_PAGE).map(([uid, list], k) => {
    const last = list[list.length - 1];
    return `**${p * PUBLIC_PAGE + k + 1}.** <@${uid}> • **${list.length}** warning(s)\nLast: ${cut(last.reason, 120)} • ${rel(last.at)}`;
  }).join("\n\n");
  const em = embed(`${e("list")} Public warning list`, lines)
    .setFooter({ text: `Page ${p + 1} of ${pages} • ${entries.length} member(s) with warnings` });
  return { embeds: [em], components: pages > 1 ? [pageControls("publicwarn", p, pages)] : [], allowedMentions: noMentions };
}

async function onPublicCommand(i) {
  const name = i.commandName;
  if (name === "official-map") return showMapCard(i);
  if (!i.inGuild()) fail("Use this command inside a server.");

  switch (name) {
    case "mywarn":
      return i.reply({ ...myWarnView(i.guildId, i.user.id, 0), flags: MessageFlags.Ephemeral });
    case "publicwarn":
      return i.reply(publicWarnView(i.guild, 0));
    case "ld-stock":
      return i.reply({ ...ldBoardPayload(i.guildId), allowedMentions: noMentions });
    case "poll": {
      const options = ["option1", "option2", "option3", "option4"]
        .map(n => i.options.getString(n)?.trim())
        .filter(Boolean);
      if (new Set(options.map(o => o.toLowerCase())).size !== options.length) fail("Every poll option must be different.");
      const minutes = i.options.getInteger("minutes");
      const id = newId(4);
      const poll = {
        id,
        guildId: i.guildId,
        question: i.options.getString("question", true).trim(),
        options,
        votes: {},
        creatorId: i.user.id,
        creatorTag: i.user.tag,
        closesAt: minutes ? now() + minutes * 60 * 1000 : null,
        closed: false,
        messageId: null,
        channelId: null,
      };
      db.polls[id] = poll;
      await i.reply(pollPayload(poll));
      const msg = await i.fetchReply();
      poll.messageId = msg.id;
      poll.channelId = msg.channelId;
      save();
      return;
    }
    case "counting-stats": {
      const cfg = countingState(i.guildId);
      if (!cfg) return i.reply({ embeds: [embed(`${e("counting")} Counting`, "Counting is not set up on this server yet.")], flags: MessageFlags.Ephemeral });
      const board = countingLeaderboard(cfg).map(([uid, c], idx) => `**${idx + 1}.** <@${uid}> • ${fmt(c)}`).join("\n") || "Nobody has counted yet.";
      const em = embed(`${e("counting")} Counting game`, `**Channel:** <#${cfg.channelId}>\n**Current number:** ${fmt(cfg.current)}\n**Next number:** ${fmt(cfg.current + 1)}\n**Best ever:** ${fmt(cfg.best ?? 0)}\n**Resets:** ${fmt(cfg.resets ?? 0)}\n\n__Leaderboard__\n${board}`)
        .setFooter({ text: "Each member counts once in a row. Milestones at 50 and every 100." });
      return i.reply({ embeds: [em], allowedMentions: noMentions });
    }
    case "serverinfo":
      return i.reply(serverInfoPayload(i.guild));
    case "userinfo":
      return i.reply(await userInfoPayload(i));
    case "remind": {
      const minutes = i.options.getInteger("minutes", true);
      const text = i.options.getString("text", true).trim();
      const dueAt = now() + minutes * 60 * 1000;
      db.reminders ??= {};
      db.reminders[newId(4)] = { userId: i.user.id, channelId: i.channelId, text, dueAt };
      save();
      const em = embed(`${e("remind")} Reminder set`, `I will ping you ${rel(dueAt)}.\n\n> ${text}`);
      return i.reply({ embeds: [em], flags: MessageFlags.Ephemeral });
    }
  }
  fail("Unknown command.");
}

async function onWarnPage(i) {
  const parts = i.customId.split(":");
  if (parts[0] === "mywarn") {
    if (parts[1] !== i.user.id) fail("This list belongs to another member.");
    return i.update({ ...myWarnView(i.guildId, i.user.id, Number(parts[2])) });
  }
  return i.update(publicWarnView(i.guild, Number(parts[1])));
}

// ============================================================
//  GOREBOX 27 MAP CARDS (3 pages, refreshed every hour)
// ============================================================
const MAPS = [
  { code: "wyunflpbzwtxv", label: "Map 1", aliases: ["prison", "jail", "detention"], winter: true },
  { code: "w2v5mt18tkzq4", label: "Map 2", aliases: ["warzone", "active warzone", "neighborhood"] },
];
const MAP_PAGES = 3;
const MAP_REFRESH = 60 * 60 * 1000;
const mapUrl = code => `https://gb27-workshop.gb27.workers.dev/m/${code}`;
const mapCache = {}; // code -> { data, at }
const fmt = n => Number(n ?? 0).toLocaleString("en-US");
const toNum = v => {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const clampPage = p => Math.min(Math.max(p, 0), MAP_PAGES - 1);

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function metaContent(html, name) {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i");
  const m = html.match(a) || html.match(b);
  return m ? decodeHtml(m[1]) : null;
}

function parseWorkshopMap(html) {
  const rawTitle = metaContent(html, "og:title") || (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || "";
  const title = decodeHtml(rawTitle).replace(/\s*\|\s*GoreBox 27 Workshop\s*$/i, "").trim();
  if (!title) return null;

  const body = decodeHtml(html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n"));
  const lines = body.split("\n").map(l => l.trim()).filter(Boolean);
  const valueAfter = label => {
    const k = lines.findIndex(l => l.toLowerCase() === label.toLowerCase());
    return k >= 0 && lines[k + 1] ? lines[k + 1] : null;
  };

  const byLine = lines.find(l => /^by\s+/i.test(l));
  const rec = lines.join("\n").match(/(\d[\d,]*)\s+of\s+(\d[\d,]*)\s+recommend/i);
  const recommend = rec ? toNum(rec[1]) : null;
  const total = rec ? toNum(rec[2]) : null;
  const percent = recommend !== null && total ? Math.round((recommend / total) * 1000) / 10 : null;

  let description = null;
  const descIdx = lines.findIndex(l => l.toLowerCase() === "description");
  if (descIdx >= 0) {
    const parts = [];
    for (let k = descIdx + 1; k < lines.length && parts.length < 3; k++) {
      if (/^(or paste|installs|size|version|updated|price|open in)/i.test(lines[k])) break;
      parts.push(lines[k]);
    }
    description = parts.join(" ") || null;
  }

  return {
    title,
    author: byLine ? byLine.replace(/^by\s+/i, "") : null,
    description,
    installs: valueAfter("Installs"),
    installCount: toNum(valueAfter("Installs")),
    size: valueAfter("Size"),
    version: valueAfter("Version"),
    updated: valueAfter("Updated"),
    price: valueAfter("Price"),
    recommend,
    total,
    percent,
    image: metaContent(html, "og:image"),
  };
}

async function loadMap(code, force = false) {
  const c = mapCache[code];
  if (!force && c?.data && now() - c.at < MAP_REFRESH) return c;
  try {
    const res = await fetch(mapUrl(code), {
      headers: { "User-Agent": "Ld-Bank-Bot" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = parseWorkshopMap(await res.text());
    if (!data) throw new Error("Map page could not be read");
    mapCache[code] = { data, at: now() };
  } catch (err) {
    console.error(`Map ${code} fetch failed:`, err.message);
  }
  return mapCache[code] ?? { data: null, at: 0 };
}

async function loadAllMaps(force = false) {
  return Promise.all(MAPS.map(m => loadMap(m.code, force)));
}

function mapDetailEmbed(map, entry) {
  const d = entry.data;
  const url = mapUrl(map.code);
  if (!d) return embed(`${e("map")} ${map.label}`, `This map could not be loaded right now.\n**Link:** ${url}`);
  const or = v => cut(v || "Unknown", 1000);
  const card = new EmbedBuilder()
    .setColor(DEFAULT_COLOR)
    .setTitle(cut(`${e("map")} ${d.title}`, 256))
    .setURL(url)
    .setDescription(cut(
      (map.winter ? `${e("winter")} **Winter Update** • Thanks For 20K!\n\n` : "") +
      (d.description ? `> ${d.description}` : "The creator did not add a description."), 800))
    .addFields(
      { name: `${e("user")} Creator`, value: or(d.author), inline: true },
      { name: `${e("join")} Installs`, value: or(d.installs), inline: true },
      { name: `${e("recommend")} Recommended`, value: d.percent !== null ? `${d.percent}% (${fmt(d.recommend)} of ${fmt(d.total)})` : "Unknown", inline: true },
      { name: `${e("size")} Size`, value: or(d.size), inline: true },
      { name: `${e("version")} Version`, value: or(d.version), inline: true },
      { name: `${e("updated")} Last updated`, value: or(d.updated), inline: true },
      { name: `${e("money")} Price`, value: or(d.price), inline: true },
      { name: `${e("key")} Workshop code`, value: `\`${map.code}\``, inline: true },
    )
    .setFooter({ text: `${map.label} of ${MAPS.length} • stats refresh every hour` })
    .setTimestamp(entry.at || now());
  if (d.image) card.setImage(d.image);
  return card;
}

function overviewEmbeds(entries) {
  const [a, b] = entries;
  const ad = a.data;
  const bd = b.data;
  const installs = (ad?.installCount ?? 0) + (bd?.installCount ?? 0);
  const rec = (ad?.recommend ?? 0) + (bd?.recommend ?? 0);
  const tot = (ad?.total ?? 0) + (bd?.total ?? 0);
  const pct = tot ? Math.round((rec / tot) * 1000) / 10 : null;

  const head = new EmbedBuilder()
    .setColor(DEFAULT_COLOR)
    .setTitle(`${e("map")} GoreBox 27 Maps | Overview`)
    .setDescription(`${e("winter")} **Winter Edition** • Both maps were made by the same creator. Thanks For 20K!\nUse the buttons below to read the full details of each map.`)
    .addFields(
      { name: `${e("join")} Combined installs`, value: installs ? fmt(installs) : "Unknown", inline: true },
      { name: `${e("recommend")} Combined recommended`, value: pct !== null ? `${pct}% (${fmt(rec)} of ${fmt(tot)})` : "Unknown", inline: true },
      { name: `${e("maps")} Maps`, value: `${MAPS.length}`, inline: true },
    )
    .setFooter({ text: `Page 1 of ${MAP_PAGES} • stats refresh every hour` })
    .setTimestamp(now());

  const cards = MAPS.map((m, idx) => {
    const d = entries[idx].data;
    const em = new EmbedBuilder()
      .setColor(DEFAULT_COLOR)
      .setTitle(cut(`${m.label}: ${d?.title ?? "Unavailable"}`, 256))
      .setURL(mapUrl(m.code))
      .setDescription(cut(d
        ? `${d.description ?? "No description."}\n${e("join")} ${d.installs ?? "Unknown"} • ${e("recommend")} ${d.percent !== null ? `${d.percent}%` : "Unknown"}`
        : "Could not load this map right now.", 400));
    if (d?.image) em.setImage(d.image);
    return em;
  });
  return [head, ...cards];
}

function mapsPayload(entries, page) {
  const p = clampPage(page);
  const embeds = p === 0 ? overviewEmbeds(entries) : [mapDetailEmbed(MAPS[p - 1], entries[p - 1])];
  const nav = row(
    btn(`maps:${p - 1}`, "◀ Prev", ButtonStyle.Secondary).setDisabled(p <= 0),
    btn("maps:page", `${p + 1} / ${MAP_PAGES}`, ButtonStyle.Secondary).setDisabled(true),
    btn(`maps:${p + 1}`, "Next ▶", ButtonStyle.Secondary).setDisabled(p >= MAP_PAGES - 1),
  );
  const links = row(...MAPS.map(m =>
    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(mapUrl(m.code)).setLabel(`Open ${m.label} in Workshop`)));
  return { embeds, components: [nav, links] };
}

async function showMapCard(i) {
  if (!i.inGuild()) fail("Use this command inside a server.");
  await defer(i, false);
  const entries = await loadAllMaps(true);
  const msg = await i.editReply(mapsPayload(entries, 0));
  db.mapTrackers ??= {};
  db.mapTrackers[msg.id] = { channelId: msg.channelId, guildId: i.guildId, page: 0 };
  const ids = Object.keys(db.mapTrackers);
  if (ids.length > 50) for (const old of ids.slice(0, ids.length - 50)) delete db.mapTrackers[old];
  save();
  return msg;
}

async function onMapsPage(i, page) {
  const entries = await loadAllMaps(false);
  const p = clampPage(page);
  const t = db.mapTrackers?.[i.message.id];
  if (t) { t.page = p; save(); }
  return i.update(mapsPayload(entries, p));
}

async function refreshMapCards() {
  const trackers = Object.entries(db.mapTrackers ?? {});
  if (!trackers.length) return;
  const entries = await loadAllMaps(true);
  for (const [messageId, t] of trackers) {
    const channel = await client.channels.fetch(t.channelId).catch(() => null);
    const message = channel ? await channel.messages.fetch(messageId).catch(() => null) : null;
    if (!message) { delete db.mapTrackers[messageId]; continue; }
    await message.edit(mapsPayload(entries, t.page ?? 0)).catch(() => {});
  }
  save();
}

// ============================================================
//  LD STOCK BOARD
// ============================================================
function progressBar(percent, size = 10) {
  const filled = Math.round((Math.min(Math.max(percent, 0), 100) / 100) * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}

function ldBoardPayload(guildId) {
  const s = db.ldStock[guildId];
  const refresh = row(btn("ld:refresh", "Refresh", ButtonStyle.Primary, e("refresh")));
  if (!s) {
    return { embeds: [embed(`${e("money")} LD Stock Board`, "No LD stock has been set for this server yet. An administrator can use /set-ld-stock.")], components: [refresh] };
  }
  const reserved = Math.min(s.reserved ?? 0, s.stock);
  const available = s.stock - reserved;
  const pct = s.stock ? Math.round((available / s.stock) * 100) : 0;
  const em = embed(`${e("money")} LD Stock Board`, [
    `**Total stock:** ${fmt(s.stock)} LD`,
    `**Reserved (giveaways / events):** ${fmt(reserved)} LD`,
    `**Available:** ${fmt(available)} LD`,
    "",
    `${progressBar(pct)} ${pct}% available`,
    "",
    s.note ? `**Note:** ${cut(s.note, 300)}` : "",
    `**Last updated:** ${rel(s.updatedAt)} by <@${s.updatedBy}>`,
  ].join("\n"));
  return { embeds: [em], components: [refresh] };
}

// ============================================================
//  POLLS
// ============================================================
function pollPayload(p) {
  const total = Object.keys(p.votes).length;
  const counts = p.options.map((_, idx) => Object.values(p.votes).filter(v => v === idx).length);
  const top = Math.max(...counts);
  const letters = [e("letter_a") || "🇦", e("letter_b") || "🇧", e("letter_c") || "🇨", e("letter_d") || "🇩"];
  const lines = p.options.map((opt, idx) => {
    const c = counts[idx];
    const pct = total ? Math.round((c / total) * 100) : 0;
    const crown = total && c === top ? ` ${e("crown")}` : "";
    return `${letters[idx]} **${opt}**${crown}\n${progressBar(pct, 20)}  **${pct}%** · ${c} vote${c === 1 ? "" : "s"}`;
  }).join("\n\n");
  const status = p.closed
    ? `${e("lock")} **Poll closed**`
    : p.closesAt ? `${e("timer")} Closes ${rel(p.closesAt)}` : `${e("online")} **Voting is open**`;
  const em = embed(`${e("stats")} ${p.question}`, `${lines}\n\n${status}`, p.closed ? 0x64748b : DEFAULT_COLOR)
    .setFooter({ text: `${total} vote(s) • started by ${p.creatorTag}` });
  const buttons = p.options.map((opt, idx) =>
    btn(`poll:${p.id}:${idx}`, cut(opt, 80), p.closed ? ButtonStyle.Secondary : ButtonStyle.Primary, FALLBACK_EMOJI[["letter_a", "letter_b", "letter_c", "letter_d"][idx]])
      .setDisabled(Boolean(p.closed)));
  return { embeds: [em], components: [row(...buttons)] };
}

async function votePoll(i, pollId, idx) {
  const p = db.polls[pollId];
  if (!p || p.guildId !== i.guildId) fail("This poll no longer exists.");
  if (p.closed) fail("This poll is closed.");
  if (!p.options[idx]) fail("That option does not exist.");
  p.votes[i.user.id] = idx;
  save();
  return i.update(pollPayload(p));
}

// ============================================================
//  PUBLIC UTILITY COMMANDS
// ============================================================
const VERIFICATION = ["None", "Low", "Medium", "High", "Very High"];

function serverInfoPayload(g) {
  const chans = g.channels.cache;
  const text = chans.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement).size;
  const voice = chans.filter(c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice).size;
  const categories = chans.filter(c => c.type === ChannelType.GuildCategory).size;
  const em = new EmbedBuilder()
    .setColor(DEFAULT_COLOR)
    .setAuthor({ name: `${g.name} • Server profile` })
    .setTitle(`${e("server")} Server overview`)
    .setDescription(g.description ? `> ${cut(g.description, 300)}` : "A community on Discord.")
    .addFields(
      { name: `${e("crown")} Owner`, value: `<@${g.ownerId}>`, inline: true },
      { name: `${e("members")} Members`, value: fmt(g.memberCount), inline: true },
      { name: `${e("boost")} Boost`, value: `Level ${g.premiumTier} • ${g.premiumSubscriptionCount ?? 0} boosts`, inline: true },
      { name: `${e("categories")} Categories`, value: `${categories}`, inline: true },
      { name: `${e("text")} Text channels`, value: `${text}`, inline: true },
      { name: `${e("voice")} Voice channels`, value: `${voice}`, inline: true },
      { name: `${e("roles")} Roles`, value: `${g.roles.cache.size - 1}`, inline: true },
      { name: `${e("automod")} Verification`, value: VERIFICATION[g.verificationLevel] ?? "Unknown", inline: true },
      { name: `${e("created")} Created`, value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>\n${rel(g.createdTimestamp)}`, inline: true },
    )
    .setTimestamp();
  const icon = g.iconURL({ size: 256 });
  if (icon) em.setThumbnail(icon);
  const banner = g.bannerURL({ size: 1024 });
  if (banner) em.setImage(banner);
  return { embeds: [em] };
}

async function userInfoPayload(i) {
  const user = i.options.getUser("user") ?? i.user;
  const member = i.guild.members.cache.get(user.id) ?? await i.guild.members.fetch(user.id).catch(() => null);
  const warns = (db.warnings[i.guildId]?.[user.id] ?? []).length;

  let roleList = "Not in this server";
  let topRole = "None";
  let roleCount = 0;
  let joined = "Not in this server";
  let boosting = "No";
  if (member) {
    const roles = member.roles.cache.filter(r => r.id !== i.guildId).sort((a, b) => b.position - a.position);
    roleCount = roles.size;
    roleList = roles.size ? roles.first(8).map(r => `<@&${r.id}>`).join(" ") : "None";
    topRole = roles.size ? `<@&${roles.first().id}>` : "None";
    joined = `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>\n${rel(member.joinedTimestamp)}`;
    boosting = member.premiumSinceTimestamp ? `Since <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:D>` : "No";
  }

  const em = new EmbedBuilder()
    .setColor(member?.displayColor || DEFAULT_COLOR)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ size: 64 }) })
    .setTitle(`${e("user")} ${member?.displayName ?? user.username}`)
    .addFields(
      { name: `${e("id")} User ID`, value: `\`${user.id}\``, inline: true },
      { name: `${e("ai")} Bot`, value: user.bot ? "Yes" : "No", inline: true },
      { name: `${e("warning")} Warnings`, value: `${warns}`, inline: true },
      { name: `${e("created")} Account created`, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>\n${rel(user.createdTimestamp)}`, inline: true },
      { name: `${e("join")} Joined server`, value: joined, inline: true },
      { name: `${e("boost")} Boosting`, value: boosting, inline: true },
      { name: `${e("top_role")} Top role`, value: topRole, inline: true },
      { name: `${e("roles")} Roles`, value: `${roleCount}`, inline: true },
      { name: `${e("role_list")} Role list`, value: roleList, inline: false },
    )
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setTimestamp();
  return { embeds: [em] };
}

async function tickPolls() {
  for (const p of Object.values(db.polls ?? {})) {
    if (p.closed || !p.closesAt || p.closesAt > now()) continue;
    p.closed = true;
    save();
    const channel = p.channelId ? await client.channels.fetch(p.channelId).catch(() => null) : null;
    const msg = channel && p.messageId ? await channel.messages.fetch(p.messageId).catch(() => null) : null;
    await msg?.edit(pollPayload(p)).catch(() => {});
  }
}

async function tickReminders() {
  await tickPolls().catch(err => console.error("Poll tick:", err.message));
  for (const [id, r] of Object.entries(db.reminders ?? {})) {
    if (r.dueAt > now()) continue;
    delete db.reminders[id];
    save();
    const channel = await client.channels.fetch(r.channelId).catch(() => null);
    const em = embed(`${e("remind")} Reminder`, `> ${r.text}`).setFooter({ text: "Reminder from /remind" });
    await channel?.send({ content: `<@${r.userId}>`, embeds: [em], allowedMentions: { users: [r.userId] } }).catch(() => {});
  }
}

// ============================================================
//  DISCORD NATIVE AUTOMOD (creates real AutoMod rules)
// ============================================================
const api = new REST({ version: "10" }).setToken(TOKEN);
const AUTOMOD_TRIGGER = { KEYWORD: 1, SPAM: 3, MENTION_SPAM: 5 };
const AUTOMOD_ACTION = { BLOCK_MESSAGE: 1, SEND_ALERT_MESSAGE: 2 };

function nativeAutoModRules(logChannelId) {
  const alert = logChannelId ? [{ type: AUTOMOD_ACTION.SEND_ALERT_MESSAGE, metadata: { channel_id: logChannelId } }] : [];
  const block = { type: AUTOMOD_ACTION.BLOCK_MESSAGE, metadata: { custom_message: "This message was blocked by AutoMod." } };
  return [
    {
      name: "Ld Bank | Block invite links",
      event_type: 1,
      trigger_type: AUTOMOD_TRIGGER.KEYWORD,
      trigger_metadata: { keyword_filter: ["*discord.gg/*", "*discord.com/invite/*", "*discordapp.com/invite/*"] },
      actions: [block, ...alert],
      enabled: true,
    },
    {
      name: "Ld Bank | Block mention spam",
      event_type: 1,
      trigger_type: AUTOMOD_TRIGGER.MENTION_SPAM,
      trigger_metadata: { mention_total_limit: 5 },
      actions: [block, ...alert],
      enabled: true,
    },
    {
      name: "Ld Bank | Block spam",
      event_type: 1,
      trigger_type: AUTOMOD_TRIGGER.SPAM,
      trigger_metadata: {},
      actions: [block, ...alert],
      enabled: true,
    },
  ];
}

async function setNativeAutoMod(guildId, enabled) {
  for (const ruleId of db.automodRules?.[guildId] ?? []) {
    await api.patch(`/guilds/${guildId}/auto-moderation/rules/${ruleId}`, { body: { enabled } }).catch(() => {});
  }
}

async function enableNativeAutoMod(guild) {
  await botCan(guild, PermissionFlagsBits.ManageGuild, "Manage Server");
  db.automodRules ??= {};
  const existing = db.automodRules[guild.id] ?? [];

  if (existing.length) {
    let restored = true;
    for (const ruleId of existing) {
      await api.patch(`/guilds/${guild.id}/auto-moderation/rules/${ruleId}`, { body: { enabled: true } })
        .catch(() => { restored = false; });
    }
    if (restored) return existing;
  }

  const created = [];
  try {
    for (const body of nativeAutoModRules(db.logChannels[guild.id] ?? null)) {
      const rule = await api.post(`/guilds/${guild.id}/auto-moderation/rules`, { body });
      created.push(rule.id);
    }
  } catch (err) {
    for (const ruleId of created) {
      await api.delete(`/guilds/${guild.id}/auto-moderation/rules/${ruleId}`).catch(() => {});
    }
    throw err;
  }
  db.automodRules[guild.id] = created;
  return created;
}

// Built-in fallback filter. Runs only when the server has no active native AutoMod rules.
client.on(Events.MessageCreate, async msg => {
  if (!msg.guild || msg.author.bot || !db.automod[msg.guild.id]) return;
  if (db.automodRules?.[msg.guild.id]?.length) return;
  if (msg.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const invite = /(discord\.gg|discord(app)?\.com\/invite)\/[\w-]+/i.test(msg.content);
  const mass = msg.mentions.users.size + msg.mentions.roles.size >= 5;
  if (!invite && !mass) return;

  await msg.delete().catch(() => {});
  const count = addWarning(msg.guild.id, msg.author.id, `AutoMod: ${invite ? "invite link" : "mass mention"}`, client.user.id);
  const notice = await msg.channel.send(`${e("warning")} <@${msg.author.id}> ${invite ? "Posting invite links" : "Mass mentioning"} is not allowed here. Warning #${count}.`).catch(() => null);
  setTimeout(() => notice?.delete().catch(() => {}), 6000);
});

// ============================================================
//  LD BANK AI (Google Gemini, configured through GEMINI_API_KEY)
// ============================================================
const aiCooldown = new Map();
const aiHistory = new Map();

// Thrown when the AI cannot work anymore (quota, limit, bad or missing token).
// The channel is locked when this happens.
class AiStopError extends Error {}

function serverContext(guild) {
  const chans = [...guild.channels.cache.values()]
    .filter(c => [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice].includes(c.type))
    .slice(0, 60)
    .map(c => (c.type === ChannelType.GuildVoice ? `${e("voice")} ${c.name}` : `<#${c.id}>`))
    .join(", ");
  const roles = [...guild.roles.cache.values()]
    .filter(r => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .slice(0, 40)
    .map(r => `<@&${r.id}>`)
    .join(", ");
  const stock = db.ldStock[guild.id];
  const reserved = stock ? Math.min(stock.reserved ?? 0, stock.stock) : 0;
  const ld = stock
    ? `total ${fmt(stock.stock)} LD, reserved ${fmt(reserved)} LD, available ${fmt(stock.stock - reserved)} LD`
    : "not set yet";
  const giveaways = Object.values(db.giveaways).filter(g => g.guildId === guild.id && g.state === "active").length;
  const categories = (db.ticketConfig[guild.id]?.categories ?? []).map(c => c.name).join(", ") || "none";
  const maps = MAPS.map(m => {
    const d = mapCache[m.code]?.data;
    const aka = m.aliases ? ` (people also say: ${m.aliases.join(", ")})` : "";
    return d
      ? `${m.label}: "${d.title}" by ${d.author ?? "unknown"}, ${d.installs ?? "unknown"} installs, ${d.percent ?? "unknown"}% recommended${aka}`
      : `${m.label}: details unavailable right now${aka}`;
  }).join("\n");
  return [
    `Server: ${guild.name} (${fmt(guild.memberCount)} members)`,
    `Channels: ${chans || "none"}`,
    `Roles: ${roles || "none"}`,
    `LD stock: ${ld}`,
    `Active giveaways: ${giveaways}`,
    `Ticket categories: ${categories}`,
    `Maps:\n${maps}`,
  ].join("\n").slice(0, 3500);
}

function aiSystemPrompt(guild) {
  return [
    "You are Ld Bank, the sharp, witty assistant of a GoreBox 27 community on Discord.",
    "Reply in the same language the user writes in. If unsure, reply in Turkish. Keep answers short (1 to 6 lines) and use Discord markdown where it helps.",
    "You know GoreBox 27 well. Known facts: GoreBox Animosity is the PC version on Steam (app 2027330); GoreBox 27 is free on Google Play; maps are shared on the GoreBox 27 Workshop.",
    "Do not invent facts that are not in the data below. If you are not sure, say so.",
    "Use the live server data when it is relevant. Mention channels and roles with the exact mention format given.",
    "You may be playful and lightly clever, but never harass or insult real people, never use slurs, and never reveal secrets such as keys or tokens.",
    "",
    "LIVE SERVER DATA:",
    serverContext(guild),
  ].join("\n");
}

async function askGemini(system, contents) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) fail("Ld Bank AI is not configured yet. An administrator must add GEMINI_API_KEY to the server.");
  const model = process.env.AI_MODEL || "gemini-2.5-flash";
  const generationConfig = { maxOutputTokens: 600, temperature: 0.9 };
  // 2.5 models think before answering; turn thinking off so the short answer is not cut off.
  if (/2\.5/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`AI HTTP ${res.status} (${model}):`, body.slice(0, 300));
    if ([400, 401, 403, 429].includes(res.status) || /quota|RESOURCE_EXHAUSTED|API key|billing/i.test(body)) {
      throw new AiStopError(`AI stopped: HTTP ${res.status}`);
    }
    throw new Error(`AI HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? "").join("").trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

// Locks the AI channel for everyone and tells the channel why.
async function lockAiChannel(guildId, reason) {
  const channelId = db.aiChannels?.[guildId];
  if (!channelId) return;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(err => {
    console.error("AI channel lock failed:", err.message);
  });
  db.aiLocked ??= {};
  db.aiLocked[guildId] = { reason, at: now() };
  save();
  await channel.send({
    embeds: [embed(`${e("lock")} Ld Bank AI is locked`, `${reason}\nAn administrator can open it again with /talk-to-bot.`, 0xe74c3c)],
    allowedMentions: noMentions,
  }).catch(() => {});
}

// Unlocks the AI channel (used by /talk-to-bot).
async function unlockAiChannel(guildId) {
  const channelId = db.aiChannels?.[guildId];
  const guild = client.guilds.cache.get(guildId);
  if (!channelId || !guild) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }).catch(() => {});
  if (db.aiLocked) delete db.aiLocked[guildId];
  save();
}

// Daily usage counter (resets at midnight Istanbul time).
function aiUsageToday(guildId) {
  db.aiUsage ??= {};
  const day = istanbulDay();
  const u = db.aiUsage[guildId];
  if (!u || u.day !== day) db.aiUsage[guildId] = { day, count: 0 };
  return db.aiUsage[guildId];
}

// Every night at 00:00 (Istanbul) the AI channel is locked so nobody can talk to it.
async function nightLockTick() {
  const [h, m] = istanbulHM().split(":").map(Number);
  if (h !== 0 || m > 5) return;
  const day = istanbulDay();
  if (db.aiNightLock === day) return;
  db.aiNightLock = day;
  save();
  for (const guildId of Object.keys(db.aiChannels ?? {})) {
    await lockAiChannel(guildId, "Gece kilidi: saat 00:00 oldu, AI bu gece kapalı.").catch(() => {});
  }
}

client.on(Events.MessageCreate, async msg => {
  if (!msg.guild || msg.author.bot || !client.user) return;
  if (db.aiChannels?.[msg.guild.id] !== msg.channelId) return;
  const mentioned = msg.mentions.has(client.user.id);
  if (!mentioned && !/\bld\b/i.test(msg.content)) return;

  const question = msg.content.replace(new RegExp(`<@!?${client.user.id}>`, "g"), "").trim();
  if (!question) return;
  const last = aiCooldown.get(msg.author.id) ?? 0;
  if (now() - last < 5000) return;
  aiCooldown.set(msg.author.id, now());

  // Daily limit: lock the channel when it is reached.
  const usage = aiUsageToday(msg.guild.id);
  if (usage.count >= CONFIG.AI_DAILY_LIMIT) {
    await lockAiChannel(msg.guild.id, `Günlük AI limiti doldu (${CONFIG.AI_DAILY_LIMIT} cevap). Kanal kilitlendi.`);
    return;
  }

  const key = `${msg.channelId}:${msg.author.id}`;
  const history = aiHistory.get(key) ?? [];
  try {
    await msg.channel.sendTyping().catch(() => {});
    const contents = [...history, { role: "user", parts: [{ text: `${msg.author.username}: ${cut(question, 800)}` }] }];
    const answer = await askGemini(aiSystemPrompt(msg.guild), contents);
    usage.count++;
    save();
    const reply = cut(answer, 1900);
    history.push(
      { role: "user", parts: [{ text: cut(question, 800) }] },
      { role: "model", parts: [{ text: reply }] },
    );
    aiHistory.set(key, history.slice(-8));
    await msg.reply({ content: reply, allowedMentions: noMentions });
  } catch (err) {
    if (err instanceof AiStopError) {
      await lockAiChannel(msg.guild.id, "AI limiti veya token bitti. Kanal kilitlendi.");
      return;
    }
    const text = err instanceof UserError ? err.message : `Ld Bank could not answer right now. Reference: \`${newId(3)}\``;
    if (!(err instanceof UserError)) console.error("AI error:", err.message);
    await msg.reply({ content: text, allowedMentions: noMentions }).catch(() => {});
  }
});

// ============================================================
//  COUNTING GAME
// ============================================================
function countingState(guildId) {
  db.counting ??= {};
  return db.counting[guildId] ?? null;
}

async function countingReset(cfg, msg, why) {
  cfg.current = 0;
  cfg.lastUserId = null;
  cfg.resets = (cfg.resets ?? 0) + 1;
  save();
  const notice = await msg.channel.send({
    embeds: [embed(`${e("cross")} Count reset`, `${why}\nThe next number is **1**. Start again!`, 0xe74c3c)],
    allowedMentions: noMentions,
  }).catch(() => null);
  setTimeout(() => notice?.delete().catch(() => {}), 10000);
}

function countingLeaderboard(cfg, limit = 10) {
  return Object.entries(cfg.totals ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

client.on(Events.MessageCreate, async msg => {
  if (!msg.guild || msg.author.bot) return;
  const cfg = countingState(msg.guild.id);
  if (!cfg || cfg.channelId !== msg.channelId) return;
  const text = msg.content.trim();
  if (!/^\d{1,9}$/.test(text)) return;

  const n = Number(text);
  const expected = cfg.current + 1;
  if (cfg.lastUserId === msg.author.id) {
    await msg.react(reactTarget("cross")).catch(() => {});
    return countingReset(cfg, msg, `<@${msg.author.id}> counted twice in a row. Each member gets one number at a time.`);
  }
  if (n !== expected) {
    await msg.react(reactTarget("cross")).catch(() => {});
    return countingReset(cfg, msg, `<@${msg.author.id}> wrote **${n}**, but the next number was **${expected}**.`);
  }

  cfg.current = n;
  cfg.lastUserId = msg.author.id;
  cfg.best = Math.max(cfg.best ?? 0, n);
  cfg.totals ??= {};
  cfg.totals[msg.author.id] = (cfg.totals[msg.author.id] ?? 0) + 1;
  save();
  await msg.react(reactTarget("check")).catch(() => {});

  if (n === 50 || n % 100 === 0) {
    const board = countingLeaderboard(cfg).map(([uid, count], idx) =>
      `**${idx + 1}.** <@${uid}> • ${fmt(count)} number(s)`).join("\n") || "No counters yet.";
    const milestone = new EmbedBuilder()
      .setColor(WINTER_GOLD)
      .setTitle(`${e("trophy")} Milestone ${fmt(n)} reached!`)
      .setDescription(`Together, the community counted to **${fmt(n)}**. Congratulations everyone!\n\n${board}`)
      .setFooter({ text: `Best ever: ${fmt(cfg.best)} • Resets: ${fmt(cfg.resets ?? 0)}` })
      .setTimestamp();
    await msg.channel.send({ embeds: [milestone], allowedMentions: noMentions }).catch(() => {});
  }
});

// ============================================================
//  COMMAND HANDLER
// ============================================================
async function onCommand(i) {
  const name = i.commandName;
  if (name === "help") return i.reply({ embeds: [helpEmbed()], allowedMentions: noMentions });
  if (name === "about") return i.reply({ embeds: [aboutEmbed()], allowedMentions: noMentions });
  if (PUBLIC_COMMANDS.has(name)) return onPublicCommand(i);
  if (!i.inGuild()) fail("Use this command inside a server.");
  if (ADMIN_COMMANDS.has(name)) requireAdmin(i);
  await defer(i);

  switch (name) {
    // ---------- MESSAGING ----------
    case "announcement": {
      const channel = textTarget(i.options.getChannel("channel") ?? i.channel);
      const image = i.options.getString("image")?.trim() || null;
      if (image && !isHttpsUrl(image)) fail("The image must be a valid https link (500 characters or fewer).");
      return askColor(i, "announcement", {
        channelId: channel.id,
        text: i.options.getString("text", true),
        title: i.options.getString("title") || `${e("announce")} Announcement`,
        image,
        pingRoleId: i.options.getRole("ping_role")?.id ?? null,
      });
    }

    case "say": {
      const channel = textTarget(i.options.getChannel("channel") ?? i.channel);
      await channel.send({ content: i.options.getString("text", true), allowedMentions: noMentions });
      return say(i, `${e("check")} Message sent to <#${channel.id}>.`);
    }

    case "status": {
      db.presence = { type: i.options.getString("type", true), text: cut(i.options.getString("text", true), 128) };
      save();
      applyPresence();
      return say(i, `${e("check")} Bot status updated.`);
    }

    case "dm": {
      const user = i.options.getUser("user", true);
      const text = i.options.getString("text", true);
      await user.send({ content: text, allowedMentions: noMentions })
        .catch(() => fail("I could not DM that user. Their direct messages may be closed."));
      return say(i, `${e("check")} DM sent to ${user.tag}.`);
    }

    // ---------- TICKETS ----------
    case "ticket-setup": {
      const cfg = ticketConfigOf(i.guildId);
      cfg.logChannelId = i.options.getChannel("log_channel")?.id ?? cfg.logChannelId;
      save();
      return say(i, `${e("check")} Ticket log channel saved. Add categories with /ticket-category-add, then post /ticket-panel.`);
    }

    case "ticket-category-add": {
      const cfg = ticketConfigOf(i.guildId);
      const catName = i.options.getString("name", true).trim();
      if (cfg.categories.length >= CONFIG.MAX_TICKET_CATEGORIES) fail(`You can have at most ${CONFIG.MAX_TICKET_CATEGORIES} ticket categories.`);
      if (cfg.categories.some(c => c.name.toLowerCase() === catName.toLowerCase())) fail("A category with this name already exists.");
      cfg.categories.push({
        id: newId(4),
        name: catName,
        description: i.options.getString("description")?.trim() || "",
        welcome: i.options.getString("welcome")?.trim() || "",
        supportRoleId: i.options.getRole("support_role")?.id ?? null,
        parentId: i.options.getChannel("parent_category")?.id ?? null,
      });
      save();
      return say(i, `${e("check")} Category **${catName}** added (${cfg.categories.length}/${CONFIG.MAX_TICKET_CATEGORIES}).`);
    }

    case "ticket-category-remove": {
      const cfg = ticketConfigOf(i.guildId);
      const catName = i.options.getString("name", true).trim().toLowerCase();
      const before = cfg.categories.length;
      cfg.categories = cfg.categories.filter(c => c.name.toLowerCase() !== catName);
      if (cfg.categories.length === before) fail("No category with that name.");
      save();
      return say(i, `${e("remove")} Category removed. ${cfg.categories.length} category(ies) left.`);
    }

    case "ticket-categories": {
      const cfg = ticketConfigOf(i.guildId);
      if (!cfg.categories.length) return say(i, "No ticket categories yet. Add one with /ticket-category-add.");
      const lines = cfg.categories.map((c, k) =>
        `**${k + 1}. ${c.name}**${c.description ? ` — ${c.description}` : ""}\nStaff: ${c.supportRoleId ? `<@&${c.supportRoleId}>` : "not set"} • Category: ${c.parentId ? `<#${c.parentId}>` : "default"}`);
      return say(i, { embeds: [embed(`${e("ticket")} Ticket categories`, lines.join("\n\n"))] });
    }

    case "ticket-panel": {
      const cfg = ticketConfigOf(i.guildId);
      if (!cfg.categories.length) fail("Add at least one category with /ticket-category-add first.");
      const channel = textTarget(i.options.getChannel("channel") ?? i.channel);
      return askColor(i, "ticket-panel", {
        channelId: channel.id,
        title: i.options.getString("title", true),
        description: i.options.getString("description", true),
      });
    }

    // ---------- GIVEAWAYS ----------
    case "giveaway": {
      const channel = textTarget(i.options.getChannel("channel") ?? i.channel);
      return askColor(i, "giveaway", {
        channelId: channel.id,
        prize: i.options.getString("prize", true),
        winners: i.options.getInteger("winners", true),
        requiredRoleId: i.options.getRole("required_role")?.id ?? null,
        winnerRoleId: i.options.getRole("winner_role")?.id ?? null,
        minAccountDays: i.options.getInteger("min_account_days") ?? 0,
      });
    }

    case "giveaway-end": {
      const g = findGiveaway(i, i.options.getString("message_id", true));
      if (g.state !== "active") fail("This giveaway is not active.");
      await concludeGiveaway(g);
      return say(i, `${e("check")} Giveaway ended.`);
    }

    case "giveaway-reroll": {
      const g = findGiveaway(i, i.options.getString("message_id", true));
      if (g.state !== "ended") fail("Only an ended giveaway can be rerolled.");
      g.winnerIds = await pickWinners(i.guild, g, g.winnerIds ?? [], g.winners);
      save();
      await publishGiveawayResult(i.guild, g, true);
      return say(i, `${e("check")} Reroll complete.`);
    }

    case "giveaway-cancel": {
      const g = findGiveaway(i, i.options.getString("message_id", true));
      if (g.state !== "active") fail("Only an active giveaway can be cancelled.");
      g.state = "cancelled";
      save();
      const channel = await i.guild.channels.fetch(g.channelId).catch(() => null);
      const message = channel && g.messageId ? await channel.messages.fetch(g.messageId).catch(() => null) : null;
      await message?.edit({ embeds: [giveawayEmbed(g)], components: [] }).catch(() => {});
      await channel?.send(`${e("blocked")} The giveaway for **${g.prize}** was cancelled.`).catch(() => {});
      return say(i, `${e("check")} Giveaway cancelled.`);
    }

    // ---------- APPLICATIONS ----------
    case "application-setup": {
      const review = textTarget(i.options.getChannel("review_channel", true));
      const panel = textTarget(i.options.getChannel("panel_channel", true));
      const old = db.applicationConfig[i.guildId] ?? {};
      const id = newId(4);
      const d = {
        id,
        guildId: i.guildId,
        userId: i.user.id,
        reviewChannelId: review.id,
        panelChannelId: panel.id,
        acceptedRoleId: i.options.getRole("accepted_role")?.id ?? null,
        questions: [...(old.questions ?? [])],
        title: old.title || "Staff Applications",
        text: old.text || "Press Apply to fill out the form. Staff will review your answers and send you the result by DM.",
        button: old.button || "Apply",
        expires: now() + CONFIG.SESSION_TTL,
      };
      appDrafts.set(id, d);
      return say(i, appBuilderPayload(d));
    }

    // ---------- ROLE PANELS ----------
    case "rolepanel-create": {
      const channel = textTarget(i.options.getChannel("channel") ?? i.channel);
      return askColor(i, "rolepanel-create", {
        channelId: channel.id,
        title: i.options.getString("title", true),
        description: i.options.getString("description", true),
      });
    }

    case "rolepanel-add": {
      const messageId = i.options.getString("message_id", true);
      const panel = db.rolePanels[messageId];
      if (!panel || panel.guildId !== i.guildId) fail("Role panel not found.");
      const role = i.options.getRole("role", true);
      const label = i.options.getString("label", true);
      const emoji = i.options.getString("emoji")?.trim() || null;
      if (role.managed || role.id === i.guildId) fail("I cannot give this role.");
      const me = await botCan(i.guild, PermissionFlagsBits.ManageRoles, "Manage Roles");
      if (role.position >= me.roles.highest.position) fail("My highest role must be above the role you selected.");
      if (panel.buttons.length >= 25) fail("A role panel can hold up to 25 roles.");
      if (panel.buttons.some(b => b.roleId === role.id)) fail("That role is already on this panel.");

      const candidate = { ...panel, buttons: [...panel.buttons, { roleId: role.id, label: cut(label, 80), emoji }] };
      const channel = await i.guild.channels.fetch(panel.channelId);
      const message = await channel.messages.fetch(messageId);
      await message.edit({ components: rolePanelRows(candidate) })
        .catch(() => fail("Discord rejected this button. Check the emoji and try again."));
      db.rolePanels[messageId] = candidate;
      save();
      return say(i, `${e("check")} **${label}** now gives **${role.name}**.`);
    }

    // ---------- SERVER SETUP ----------
    case "setup-server": {
      const rows = [];
      for (let p = 0; p < TEMPLATES.length; p += 25) {
        const slice = TEMPLATES.slice(p, p + 25);
        rows.push(row(new StringSelectMenuBuilder()
          .setCustomId(`setup:${p}`)
          .setPlaceholder(`Templates ${p + 1}-${p + slice.length}`)
          .addOptions(slice.map((t, k) => ({ label: t[0], value: String(p + k) })))));
      }
      return say(i, { content: `${e("setup")} Choose a template. Its categories and channels will be added to this server.`, components: rows });
    }

    // ---------- MODERATION ----------
    case "ban": {
      const user = i.options.getUser("user", true);
      const reason = i.options.getString("reason") ?? "No reason provided";
      const me = await botCan(i.guild, PermissionFlagsBits.BanMembers, "Ban Members");
      const target = await i.guild.members.fetch(user.id).catch(() => null);
      if (target) assertHierarchy(i, target, me);
      await i.guild.members.ban(user.id, { reason: cut(reason, 512), deleteMessageSeconds: 0 })
        .catch(() => fail("I could not ban that user. Check my permissions and role position."));
      await audit(i.guild, "Ban", i.user, user.id, reason);
      return say(i, `${e("ban")} **${user.tag}** was banned. Reason: ${reason}`);
    }

    case "kick": {
      const user = i.options.getUser("user", true);
      const reason = i.options.getString("reason") ?? "No reason provided";
      const me = await botCan(i.guild, PermissionFlagsBits.KickMembers, "Kick Members");
      const target = await i.guild.members.fetch(user.id).catch(() => fail("That user is not in this server."));
      assertHierarchy(i, target, me);
      await target.kick(cut(reason, 512)).catch(() => fail("I could not kick that user."));
      await audit(i.guild, "Kick", i.user, user.id, reason);
      return say(i, `${e("kick")} **${user.tag}** was kicked. Reason: ${reason}`);
    }

    case "timeout": {
      const user = i.options.getUser("user", true);
      const minutes = i.options.getInteger("minutes", true);
      const reason = i.options.getString("reason") ?? "No reason provided";
      const me = await botCan(i.guild, PermissionFlagsBits.ModerateMembers, "Timeout Members");
      const target = await i.guild.members.fetch(user.id).catch(() => fail("That user is not in this server."));
      assertHierarchy(i, target, me);
      await target.timeout(minutes * 60 * 1000, cut(reason, 512)).catch(() => fail("I could not timeout that user."));
      await audit(i.guild, "Timeout", i.user, user.id, `${minutes} minute(s). ${reason}`);
      return say(i, `${e("timeout")} **${user.tag}** was timed out for ${minutes} minute(s). Reason: ${reason}`);
    }

    case "untimeout": {
      const user = i.options.getUser("user", true);
      const me = await botCan(i.guild, PermissionFlagsBits.ModerateMembers, "Timeout Members");
      const target = await i.guild.members.fetch(user.id).catch(() => fail("That user is not in this server."));
      assertHierarchy(i, target, me);
      await target.timeout(null).catch(() => fail("I could not remove the timeout."));
      await audit(i.guild, "Untimeout", i.user, user.id, "Timeout removed");
      return say(i, `${e("voice")} Timeout removed from **${user.tag}**.`);
    }

    case "warn": {
      const user = i.options.getUser("user", true);
      const reason = i.options.getString("reason", true);
      const count = addWarning(i.guildId, user.id, reason, i.user.id);
      await user.send({ embeds: [embed(`${e("warning")} Warning`, `You received a warning in **${i.guild.name}**.\n\n**Reason:** ${reason}`, 0xf1c40f)] }).catch(() => {});
      await audit(i.guild, "Warning", i.user, user.id, reason);
      return say(i, `${e("warning")} **${user.tag}** was warned. Total warnings: ${count}. Reason: ${reason}`);
    }

    case "warnings": {
      const user = i.options.getUser("user", true);
      const list = db.warnings[i.guildId]?.[user.id] ?? [];
      if (!list.length) return say(i, `${user.tag} has no warnings.`);
      const text = list.map((w, k) => `**${k + 1}.** ${w.reason} • <t:${Math.floor(w.at / 1000)}:d>`).join("\n");
      return say(i, { embeds: [embed(`Warnings for ${user.tag}`, text)] });
    }

    case "clear": {
      const amount = i.options.getInteger("amount", true);
      await botCan(i.guild, PermissionFlagsBits.ManageMessages, "Manage Messages");
      const deleted = await i.channel.bulkDelete(amount, true);
      return say(i, `${e("clear")} Deleted ${deleted.size} message(s).`);
    }

    case "lock": {
      await botCan(i.guild, PermissionFlagsBits.ManageChannels, "Manage Channels");
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
      return say(i, `${e("lock")} Channel locked.`);
    }

    case "unlock": {
      await botCan(i.guild, PermissionFlagsBits.ManageChannels, "Manage Channels");
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
      return say(i, `${e("unlock")} Channel unlocked.`);
    }

    case "slowmode": {
      const seconds = i.options.getInteger("seconds", true);
      await botCan(i.guild, PermissionFlagsBits.ManageChannels, "Manage Channels");
      await i.channel.setRateLimitPerUser(seconds);
      return say(i, `${e("slowmode")} Slowmode set to ${seconds} second(s).`);
    }

    case "automod": {
      const enabled = i.options.getBoolean("enabled", true);
      if (!enabled) {
        delete db.automod[i.guildId];
        await setNativeAutoMod(i.guildId, false);
        save();
        return say(i, `${e("automod")} AutoMod is now OFF.`);
      }
      db.automod[i.guildId] = true;
      try {
        const ids = await enableNativeAutoMod(i.guild);
        save();
        return say(i, `${e("automod")} AutoMod is ON. Discord's native AutoMod is active with ${ids.length} rules: invite links, mention spam and spam are blocked.`);
      } catch (err) {
        console.error("Native AutoMod failed:", err.message);
        save();
        return say(i, `${e("automod")} AutoMod is ON with the built-in filter. Discord's native rules could not be created (${cut(err.message, 200)}). Check that I have Manage Server permission.`);
      }
    }

    case "automod-stats": {
      // Counts real rules on Discord for every server the bot is in (not just the saved list).
      let total = 0;
      let serversWithRules = 0;
      const problems = [];
      for (const guild of client.guilds.cache.values()) {
        const rules = await api.get(`/guilds/${guild.id}/auto-moderation/rules`).catch(err => {
          problems.push(`${guild.name}: ${cut(err.message, 60)}`);
          return null;
        });
        if (!rules) continue;
        const mine = rules.filter(r => r.creator_id === CLIENT_ID);
        if (mine.length) serversWithRules++;
        total += mine.length;
      }
      const lines = [
        `**Servers the bot is in:** ${client.guilds.cache.size}`,
        `**Servers with bot-created AutoMod rules:** ${serversWithRules}`,
        `**Total bot-created AutoMod rules:** ${total}`,
        `**Badge threshold:** 100 rules`,
      ];
      if (problems.length) lines.push("", "**Could not read:**", ...problems.slice(0, 10));
      return say(i, { embeds: [embed(`${e("automod")} AutoMod rule count`, lines.join("\n"))] });
    }

    case "set-ld-stock": {
      const stock = i.options.getInteger("stock", true);
      const reserved = i.options.getInteger("reserved") ?? 0;
      if (reserved > stock) fail("Reserved LD cannot be more than the total stock.");
      const note = i.options.getString("note")?.trim() || null;
      const prev = db.ldStock[i.guildId];
      const history = [...(prev?.history ?? []), { stock, reserved, by: i.user.id, at: now() }].slice(-10);
      db.ldStock[i.guildId] = {
        stock,
        reserved,
        note: note ?? prev?.note ?? null,
        updatedAt: now(),
        updatedBy: i.user.id,
        history,
      };
      save();
      await audit(i.guild, "LD stock updated", i.user, null, `Total: ${fmt(stock)} LD | Reserved: ${fmt(reserved)} LD`);
      return say(i, `${e("check")} LD stock updated. Members can check it with /ld-stock.`);
    }

    case "giveaway-list": {
      const active = Object.values(db.giveaways)
        .filter(g => g.guildId === i.guildId && g.state === "active")
        .sort((a, b) => a.endsAt - b.endsAt);
      if (!active.length) return say(i, "There are no active giveaways right now.");
      const em = new EmbedBuilder()
        .setColor(DEFAULT_COLOR)
        .setAuthor({ name: "Ld Bank • Live giveaways" })
        .setTitle(`${e("party")} ${active.length} active giveaway${active.length === 1 ? "" : "s"}`)
        .setDescription("Jump to a giveaway with its link. Joining happens on the giveaway message.")
        .setTimestamp();
      for (const g of active.slice(0, 10)) {
        em.addFields({
          name: `${e("gift")} ${cut(g.prize, 200)}`,
          value: `${e("members")} ${g.entries.length} entr${g.entries.length === 1 ? "y" : "ies"} • ${e("trophy")} ${g.winners} winner(s)\n${e("timer")} Ends ${rel(g.endsAt)}\n[Jump to giveaway](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`,
          inline: false,
        });
      }
      return say(i, { embeds: [em] });
    }

    // ---------- EMOJI ----------
    case "add-emoji": {
      await botCan(i.guild, PermissionFlagsBits.ManageGuildExpressions, "Manage Expressions");
      await defer(i);

      const raw = i.options.getString("emojis") ?? "";
      const attachment = i.options.getAttachment("image");
      const single = i.options.getString("name")?.trim() || null;

      // Collect items: custom emojis first, then links, then the attached file.
      const items = [];
      const customRe = /<(a?):(\w{2,32}):(\d{15,25})>/g;
      for (const m of raw.matchAll(customRe)) {
        items.push({
          label: `:${m[2]}:`,
          name: m[2],
          url: `https://cdn.discordapp.com/emojis/${m[3]}.${m[1] === "a" ? "gif" : "png"}`,
        });
      }
      for (const token of raw.replace(customRe, " ").split(/\s+/).filter(Boolean)) {
        if (!isHttpsUrl(token)) fail(`Not a custom emoji or https link: ${cut(token, 60)}`);
        items.push({ label: cut(token, 60), name: null, url: token });
      }
      if (attachment) {
        items.push({ label: cut(attachment.name, 60), name: attachment.name.replace(/\.[^.]+$/, ""), url: attachment.url });
      }
      if (!items.length) fail("Give custom emojis or https image links, or attach an image.");
      if (items.length > 10) fail(`You can add at most 10 emojis at once. You gave ${items.length}.`);
      if (single && items.length === 1) items[0].name = single;

      await i.guild.emojis.fetch();
      const taken = new Set(i.guild.emojis.cache.map(x => x.name));
      const results = [];
      let added = 0;

      for (const item of items) {
        try {
          const res = await fetch(item.url, { signal: AbortSignal.timeout(10000) });
          if (!res.ok) throw new Error("download failed");
          const type = res.headers.get("content-type") || "";
          if (!/^image\/(png|jpeg|gif|webp)/.test(type)) throw new Error("only PNG, JPG, GIF or WEBP");
          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.length > 256 * 1024) throw new Error("larger than 256 KB");

          let fromUrl = "";
          try { fromUrl = decodeURIComponent(new URL(item.url).pathname.split("/").pop() || "").replace(/\.[^.]+$/, ""); } catch {}
          const base = (item.name || fromUrl || "emoji").replace(/[^\w]/g, "_").slice(0, 28).padEnd(2, "_");
          let name = base;
          for (let n = 2; taken.has(name); n++) name = `${base}_${n}`;

          const emoji = await i.guild.emojis.create({ attachment: buffer, name });
          taken.add(emoji.name);
          added++;
          results.push(`${e("check")} ${emoji.toString()} \`:${emoji.name}:\``);
        } catch (err) {
          results.push(`${e("cross")} ${item.label}: ${cut(err.message, 120)}`);
        }
      }

      await audit(i.guild, "Emojis added", i.user, null, `${added} of ${items.length} emoji(s) added`);
      return say(i, {
        embeds: [embed(`${e("color")} Emoji import: ${added}/${items.length} added`, results.join("\n"))],
      });
    }

    case "talk-to-bot": {
      const channel = textTarget(i.options.getChannel("channel") ?? i.channel);
      db.aiChannels ??= {};
      db.aiChannels[i.guildId] = channel.id;
      save();
      // Opening the channel again also clears any lock from the nightly or quota rules.
      await unlockAiChannel(i.guildId);
      const keyNote = process.env.GEMINI_API_KEY ? "" : `\n${e("warning")} GEMINI_API_KEY is not set yet, so answers will not work until it is added.`;
      return say(i, `${e("ai")} Ld Bank is now listening in <#${channel.id}>. Mention me or write **ld** to talk.${keyNote}`);
    }

    case "talk-to-bot-off": {
      delete db.aiChannels?.[i.guildId];
      if (db.aiLocked) delete db.aiLocked[i.guildId];
      save();
      return say(i, `${e("check")} AI chat is now off in this server.`);
    }

    case "counting-setup": {
      const channel = textTarget(i.options.getChannel("channel", true));
      const prev = countingState(i.guildId);
      db.counting ??= {};
      db.counting[i.guildId] = {
        channelId: channel.id,
        current: 0,
        lastUserId: null,
        best: prev?.best ?? 0,
        totals: prev?.totals ?? {},
        resets: prev?.resets ?? 0,
      };
      save();
      await channel.send({ embeds: [embed(`${e("counting")} Counting has started!`, "Count upward from **1**. One number per member at a time. A wrong number resets the count.\nMilestones at 50 and every 100.")], allowedMentions: noMentions });
      return say(i, `${e("check")} Counting game set in <#${channel.id}>.`);
    }

    case "moderation-log": {
      const channel = textTarget(i.options.getChannel("channel", true));
      db.logChannels[i.guildId] = channel.id;
      save();
      return say(i, `${e("check")} Moderation logs will be sent to <#${channel.id}>.`);
    }

    default:
      fail("Unknown command.");
  }
}

// ============================================================
//  COLOR PICK: posts the embed the command asked for
// ============================================================
async function onColorPick(i, kind) {
  const pending = pendingEmbeds.get(i.user.id);
  if (!pending || pending.kind !== kind || pending.expires < now()) {
    return i.update({ content: "This setup expired. Run the command again.", components: [] });
  }
  pendingEmbeds.delete(i.user.id);
  const color = COLORS[Number(i.values[0])]?.value ?? DEFAULT_COLOR;
  const d = pending.data;
  await i.deferUpdate();

  if (kind === "announcement") {
    const channel = textTarget(await i.guild.channels.fetch(d.channelId).catch(() => null) ?? fail("The channel no longer exists."));
    const em = embed(d.title, d.text, color);
    if (d.image) em.setImage(d.image);
    await channel.send({
      content: d.pingRoleId ? `<@&${d.pingRoleId}>` : undefined,
      embeds: [em],
      allowedMentions: d.pingRoleId ? { roles: [d.pingRoleId] } : noMentions,
    });
    return i.editReply({ content: `${e("check")} Announcement sent to <#${channel.id}>.`, components: [] });
  }

  if (kind === "ticket-panel") {
    const channel = textTarget(await i.guild.channels.fetch(d.channelId).catch(() => null) ?? fail("The channel no longer exists."));
    const cfg = ticketConfigOf(i.guildId);
    if (!cfg.categories.length) fail("There are no ticket categories. Add one first.");
    await channel.send({
      embeds: [embed(d.title, d.description, color)],
      components: [ticketPanelRow(cfg)],
    });
    return i.editReply({ content: `${e("check")} Ticket panel posted in <#${channel.id}>.`, components: [] });
  }

  if (kind === "application-panel") {
    const channel = textTarget(await i.guild.channels.fetch(d.channelId).catch(() => null) ?? fail("The panel channel no longer exists."));
    db.applicationConfig[i.guildId] = {
      reviewChannelId: d.reviewChannelId,
      acceptedRoleId: d.acceptedRoleId,
      questions: d.questions,
      title: d.title,
      text: d.text,
      button: d.button,
      panelChannelId: channel.id,
    };
    save();
    appDrafts.delete(d.draftId);
    await channel.send({
      embeds: [embed(d.title, d.text, color)],
      components: [row(btn("app:apply", d.button, ButtonStyle.Primary, e("apply")))],
    });
    return i.editReply({ content: `${e("check")} Application panel posted in <#${channel.id}>.`, components: [] });
  }

  if (kind === "rolepanel-create") {
    const channel = textTarget(await i.guild.channels.fetch(d.channelId).catch(() => null) ?? fail("The channel no longer exists."));
    const message = await channel.send({
      embeds: [embed(d.title, `${d.description}\n\nPress a button to get the role. Press it again after 20 seconds to remove it.`, color)],
    });
    db.rolePanels[message.id] = { guildId: i.guildId, channelId: channel.id, buttons: [] };
    save();
    return i.editReply({ content: `${e("check")} Role panel created. ID: \`${message.id}\`. Now use /rolepanel-add.`, components: [] });
  }

  if (kind === "giveaway") {
    pendingGiveaways.set(i.user.id, { ...d, color, expires: now() + CONFIG.PENDING_TTL });
    return i.editReply({
      content: `${e("gift")} **Prize:** ${d.prize}\n${e("trophy")} **Winners:** ${d.winners}\n\nChoose how long the giveaway lasts:`,
      components: [row(new StringSelectMenuBuilder()
        .setCustomId("gw_duration")
        .setPlaceholder("Select duration")
        .addOptions(DURATIONS.map(([label, ms]) => ({ label, value: String(ms) }))))],
    });
  }

  fail("Unknown color setup.");
}

// ============================================================
//  BUTTONS, SELECT MENUS, MODALS
// ============================================================
async function onButton(i) {
  const parts = i.customId.split(":");
  const key = `${parts[0]}:${parts[1]}`;

  switch (key) {
    case "ticket:claim": return claimTicket(i);
    case "ticket:close": return closeTicket(i);
    case "app:apply": return startApplication(i);
    case "app:restart": return showApplicationPage(i, 0);
    case "app:next": return showApplicationPage(i, Number(parts[2]));
    case "app:submit": return submitApplication(i);
    case "app:accept": {
      requireAdmin(i);
      const app = db.applications[parts[2]];
      if (!app || app.guildId !== i.guildId) fail("Application not found.");
      if (app.state !== "pending") fail("This application has already been reviewed.");
      await defer(i);
      const dm = await finishApplication(i, app, "accepted", null);
      return say(i, `${e("check")} Application accepted. DM: ${dm}`);
    }
    case "app:reject": {
      requireAdmin(i);
      const app = db.applications[parts[2]];
      if (!app || app.guildId !== i.guildId) fail("Application not found.");
      if (app.state !== "pending") fail("This application has already been reviewed.");
      const modal = new ModalBuilder().setCustomId(`app:rejectmodal:${app.id}`).setTitle("Reject application");
      modal.addComponents(row(new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Reason (shown to the applicant)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500)));
      return i.showModal(modal);
    }
  }

  if (parts[0] === "mywarn" || parts[0] === "publicwarn") return onWarnPage(i);
  if (parts[0] === "maps") return onMapsPage(i, Number(parts[1]));
  if (parts[0] === "poll") return votePoll(i, parts[1], Number(parts[2]));
  if (parts[0] === "ld") return i.update(ldBoardPayload(i.guildId));
  if (parts[0] === "appsetup") return onAppSetupButton(i, parts[1], parts[2]);
  if (parts[0] === "gw" && parts[1] === "list") {
    const g = db.giveaways[parts[2]];
    if (!g || g.guildId !== i.guildId) fail("Giveaway not found.");
    const shown = g.entries.slice(0, 50).map(u => `<@${u}>`).join("\n") || "No participants yet.";
    const more = g.entries.length > 50 ? `\n…and ${g.entries.length - 50} more` : "";
    return say(i, { embeds: [embed(`${e("members")} Participants (${g.entries.length})`, shown + more)] });
  }
  if (parts[0] === "gw" && parts[1] === "enter") return toggleGiveawayEntry(i, parts[2]);
  if (parts[0] === "rp") return toggleRole(i, parts[1]);
  fail("This button is no longer supported. Ask an administrator to recreate the panel.");
}

async function onSelect(i) {
  if (i.customId.startsWith("appsetup:")) return onAppSetupSelect(i);
  if (i.customId.startsWith("color:")) return onColorPick(i, i.customId.slice("color:".length));

  if (i.customId === "ticket:open") {
    const cfg = db.ticketConfig[i.guildId];
    const category = cfg?.categories.find(c => c.id === i.values[0]);
    if (!category) fail("This ticket panel is outdated: its category setup is missing. An administrator should run /ticket-categories to check, then post a new panel with /ticket-panel.");
    await defer(i);
    return openTicket(i, category);
  }

  if (i.customId === "gw_duration") {
    const pending = pendingGiveaways.get(i.user.id);
    if (!pending || pending.expires < now()) {
      return i.update({ content: "This giveaway setup expired. Run /giveaway again.", components: [] });
    }
    pendingGiveaways.delete(i.user.id);
    await i.deferUpdate();

    const id = crypto.randomUUID();
    const g = {
      id,
      guildId: i.guildId,
      channelId: pending.channelId,
      prize: pending.prize,
      winners: pending.winners,
      hostId: i.user.id,
      requiredRoleId: pending.requiredRoleId,
      winnerRoleId: pending.winnerRoleId,
      minAccountDays: pending.minAccountDays,
      color: pending.color,
      entries: [],
      winnerIds: [],
      state: "active",
      endsAt: now() + Number(i.values[0]),
      endedAt: null,
      messageId: null,
    };
    const channel = await i.guild.channels.fetch(pending.channelId);
    const message = await channel.send({
      embeds: [giveawayEmbed(g)],
      components: [row(
        btn(`gw:enter:${id}`, "Join or Leave", ButtonStyle.Success, e("party")),
        btn(`gw:list:${id}`, "Participants", ButtonStyle.Secondary, e("members")),
      )],
    });
    g.messageId = message.id;
    db.giveaways[id] = g;
    save();
    return i.editReply({ content: `${e("check")} Giveaway started in <#${channel.id}>. Message ID: \`${message.id}\``, components: [] });
  }

  if (i.customId.startsWith("setup:")) {
    requireAdmin(i);
    const template = TEMPLATES[Number(i.values[0])];
    if (!template) fail("Unknown template.");
    await i.deferUpdate();
    await botCan(i.guild, PermissionFlagsBits.ManageChannels, "Manage Channels");
    const created = await applyTemplate(i.guild, template);
    return i.editReply({ content: `${e("check")} Template **${template[0]}** applied. ${created} channel(s) created.`, components: [] });
  }

  fail("Unknown menu.");
}

async function onModal(i) {
  const parts = i.customId.split(":");
  if (parts[0] === "appsetup") return onAppSetupModal(i, parts[1], parts[2]);
  if (parts[0] === "app" && parts[1] === "page") return submitApplicationPage(i, Number(parts[2]));
  if (parts[0] === "app" && parts[1] === "rejectmodal") {
    requireAdmin(i);
    const app = db.applications[parts[2]];
    if (!app || app.guildId !== i.guildId) fail("Application not found.");
    if (app.state !== "pending") fail("This application has already been reviewed.");
    await defer(i);
    const reason = i.fields.getTextInputValue("reason").trim() || null;
    const dm = await finishApplication(i, app, "rejected", reason);
    return say(i, `${e("cross")} Application rejected. DM: ${dm}`);
  }
  fail("Unknown form.");
}

client.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand()) return await onCommand(i);
    if (i.isButton()) return await onButton(i);
    if (i.isStringSelectMenu()) return await onSelect(i);
    if (i.isModalSubmit()) return await onModal(i);
  } catch (err) {
    let content;
    if (err instanceof UserError) {
      content = err.message;
    } else {
      const ref = newId(3);
      content = `An unexpected error occurred. Reference: \`${ref}\``;
      console.error(`[${ref}]`, err);
    }
    try {
      const payload = { content, allowedMentions: noMentions };
      if (i.deferred) await i.editReply(payload);
      else if (i.replied) await i.followUp({ ...payload, flags: MessageFlags.Ephemeral });
      else await i.reply({ ...payload, flags: MessageFlags.Ephemeral });
    } catch (sendErr) {
      console.error("Could not send error response:", sendErr.message);
    }
  }
});

// ============================================================
//  STARTUP
// ============================================================
client.once(Events.ClientReady, async c => {
  console.log(`Logged in as ${c.user.tag}`);
  applyPresence();
  try { await registerCommands(); }
  catch (err) { console.error("Command registration failed:", err.message); }
  tickGiveaways();
  setInterval(() => tickGiveaways().catch(err => console.error("Giveaway tick:", err.message)), 10 * 1000);
  setInterval(() => refreshMapCards().catch(err => console.error("Map refresh:", err.message)), 60 * 60 * 1000);
  setInterval(() => tickReminders().catch(err => console.error("Reminder tick:", err.message)), 30 * 1000);
  setInterval(() => nightLockTick().catch(err => console.error("Night lock:", err.message)), 30 * 1000);
});

http.createServer((req, res) => {
  const ready = client.isReady();
  res.writeHead(ready ? 200 : 503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ service: "Ld Bank", ready }));
}).listen(CONFIG.PORT, "0.0.0.0", () => console.log(`Health server on port ${CONFIG.PORT}`));

client.login(TOKEN).catch(err => {
  console.error("Login failed:", err.message);
  process.exit(1);
});
