/*
 * LD GIVEAWAYS v2
 * My Owner: Unity
 * My Developer: Dream
 *
 * KURULUM
 * - Ortam değişkenleri: DISCORD_TOKEN, CLIENT_ID (zorunlu)
 *   GUILD_ID (isteğe bağlı, komutlar tek sunucuya anında yüklenir)
 *   DB_PATH (isteğe bağlı, veri dosyası yolu, varsayılan ./data.json)
 *   PORT (Render kendisi verir)
 * - Developer Portal > Bot > Privileged Gateway Intents:
 *   SERVER MEMBERS INTENT ve MESSAGE CONTENT INTENT açık olmalı.
 * - Build: npm install     Start: node index.js
 * - package.json içinde "discord.js": "^14.16.3" bulunmalı.
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
const DEFAULT_COLOR = COLORS[0].value;

process.on("unhandledRejection", err => console.error("Unhandled rejection:", err));

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
});

fs.mkdirSync(path.dirname(path.resolve(CONFIG.DB_FILE)), { recursive: true });
let db = EMPTY_DB();
try {
  db = { ...EMPTY_DB(), ...JSON.parse(fs.readFileSync(CONFIG.DB_FILE, "utf8")) };
} catch (e) {
  if (e.code !== "ENOENT") {
    const backup = `${CONFIG.DB_FILE}.corrupt-${Date.now()}`;
    try { fs.copyFileSync(CONFIG.DB_FILE, backup); } catch {}
    console.error(`Database could not be read. Backup saved to ${backup}`, e.message);
  }
}

function save() {
  const tmp = `${CONFIG.DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, CONFIG.DB_FILE);
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
    .setTimestamp();

const btn = (customId, label, style = ButtonStyle.Secondary, emoji) => {
  const b = new ButtonBuilder().setCustomId(customId).setLabel(cut(label, 80)).setStyle(style);
  if (emoji) b.setEmoji(emoji);
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
  const p = db.presence ?? { type: "watching", text: "LD GIVEAWAYS" };
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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

  new SlashCommandBuilder().setName("mywarn").setDescription("See your own warnings"),
  new SlashCommandBuilder().setName("publicwarn").setDescription("Public list of warned members in this server"),
  new SlashCommandBuilder().setName("detenction-facility-link").setDescription("Show the Detention Facility map card"),

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

  adminCmd("moderation-log", "Choose the channel for moderation logs")
    .addChannelOption(textOpt("channel", "Log channel", true)),
];

const ADMIN_COMMANDS = new Set(COMMANDS.map(c => c.name).filter(n => !["help", "about", "mywarn", "publicwarn", "detenction-facility-link"].includes(n)));

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  const body = COMMANDS.map(c => c.toJSON());
  if (GUILD_ID) await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
  else await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
  console.log(`Registered ${body.length} slash commands.`);
}

// ============================================================
//  HELP / ABOUT
// ============================================================
const INTRO = "I am **LD GIVEAWAYS**: giveaways, categorized tickets, applications, button roles, server templates and moderation in one bot.";
const OWNER_LINES = `**My Owner:** ${CONFIG.OWNER}\n**My Developer:** ${CONFIG.DEVELOPER}`;

const helpEmbed = () => embed("📖 LD GIVEAWAYS | Help", [
  INTRO, "", OWNER_LINES, "",
  "**Public:** `/help` `/about` `/mywarn` `/publicwarn` `/detenction-facility-link`",
  "**Messaging (admin):** `/announcement` `/say` `/status` `/dm`",
  "**Tickets (admin):** `/ticket-setup` `/ticket-category-add` `/ticket-category-remove` `/ticket-categories` `/ticket-panel`",
  "**Giveaways (admin):** `/giveaway` `/giveaway-end` `/giveaway-reroll` `/giveaway-cancel`",
  "**Applications (admin):** `/application-setup` (opens the panel builder)",
  "**Button roles (admin):** `/rolepanel-create` `/rolepanel-add`",
  "**Server (admin):** `/setup-server`",
  "**Moderation (admin):** `/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clear` `/lock` `/unlock` `/slowmode` `/automod` `/moderation-log`",
].join("\n"));

const aboutEmbed = () => embed("🤖 About LD GIVEAWAYS", [
  INTRO, "",
  "• Giveaways with required roles, account age checks and winner DMs",
  "• Categorized tickets with claim, close and transcripts",
  "• Applications with up to 20 custom questions and accept or reject review",
  "• Button role panels with a 20 second removal cooldown",
  "• Embed color picker with 15 colors on every embed command",
  "• One-click server templates and moderation tools",
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
  return say(i, { content: "🎨 Pick a color for the embed. It will be posted right after you choose.", components: [colorRow(kind)] });
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
    embeds: [embed(`🎫 ${category.name}`, welcome)],
    components: [row(
      btn("ticket:claim", "Claim", ButtonStyle.Primary, "🙋"),
      btn("ticket:close", "Close", ButtonStyle.Danger, "🔒"),
    )],
    allowedMentions: { users: [i.user.id], roles: category.supportRoleId ? [category.supportRoleId] : [] },
  });
  return say(i, `✅ Your ticket is ready: <#${channel.id}>`);
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
  return i.reply({ content: `🙋 <@${i.user.id}> claimed this ticket.`, allowedMentions: noMentions });
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

  await i.editReply({ content: "🔒 This ticket is closed. The channel will be deleted in 5 seconds.", allowedMentions: noMentions });
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
    g.state === "active" ? "🎉 GIVEAWAY" : "🏁 GIVEAWAY ENDED",
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
        ? `🎉 ${rerolled ? "New winner" : "Congratulations"} ${winnersText}! You won **${g.prize}**!`
        : `No valid entries for **${g.prize}**, so there are no winners this time.`,
      allowedMentions: { users: g.winnerIds },
    }).catch(() => {});
  }
  for (const userId of g.winnerIds) {
    const user = await client.users.fetch(userId).catch(() => null);
    await user?.send(`🎉 You won **${g.prize}** in **${guild.name}**! Please contact the host <@${g.hostId}> to claim your prize.`).catch(() => {});
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
      catch (e) { console.error(`Giveaway ${g.id} could not be concluded:`, e.message); }
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
  return say(i, `🎉 You joined **${g.prize}**! Press the button again to leave. Entries: ${g.entries.length}`);
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
    return say(i, `✅ You received **${role.name}**. Press the button again after 20 seconds to remove it.`);
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
  return say(i, `✅ **${role.name}** was removed.`);
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
    ? [btn("app:submit", "Submit", ButtonStyle.Success, "📨"), btn("app:restart", "Start over", ButtonStyle.Secondary)]
    : [btn(`app:next:${n + 1}`, "Continue", ButtonStyle.Primary, "➡️"), btn("app:restart", "Start over", ButtonStyle.Secondary)];
  return say(i, {
    content: isLast
      ? "All pages are saved. Press **Submit** to send your application."
      : `Page ${n + 1}/${pages} saved. Press **Continue** for the next page.`,
    components: [row(...controls)],
  });
}

async function postApplication(review, app) {
  await review.send({
    embeds: [embed("📝 New Application", `**Applicant:** <@${app.userId}>\n**Reference:** \`${app.id}\`\n**Submitted:** ${stamp(app.createdAt)}`)],
    allowedMentions: noMentions,
  });
  for (let s = 0; s < app.questions.length; s += 5) {
    const e = new EmbedBuilder()
      .setColor(DEFAULT_COLOR)
      .setTitle(`Answers ${s + 1}-${Math.min(s + 5, app.questions.length)}`)
      .addFields(app.questions.slice(s, s + 5).map((q, k) => ({
        name: cut(q, 256) || "Question",
        value: cut(app.answers[s + k] || "-", 900) || "-",
      })));
    await review.send({ embeds: [e], allowedMentions: noMentions });
  }
  return review.send({
    content: `Decision for application \`${app.id}\``,
    components: [row(
      btn(`app:accept:${app.id}`, "Accept", ButtonStyle.Success, "✅"),
      btn(`app:reject:${app.id}`, "Reject", ButtonStyle.Danger, "❌"),
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
  return say(i, `✅ Application submitted. Reference: \`${app.id}\`. You will receive a DM with the result.`);
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
        roleNote = "\n⚠️ The accepted role could not be assigned. Check my permissions and role position.";
      });
    }
  }

  const accepted = state === "accepted";
  let dm = "user not found";
  const user = await client.users.fetch(app.userId).catch(() => null);
  if (user) {
    dm = await user.send({
      embeds: [embed(
        accepted ? "✅ Application accepted" : "❌ Application rejected",
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
    content: `${accepted ? "✅ **Accepted**" : "❌ **Rejected**"} by <@${i.user.id}>\n**Applicant:** <@${app.userId}>\n**Reference:** \`${app.id}\`\n**DM:** ${dm}${reason ? `\n**Reason:** ${cut(reason, 800)}` : ""}${roleNote}`,
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
  const e = embed("📝 Application panel builder", [
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
    embeds: [e],
    components: [
      row(
        btn(`appsetup:text:${d.id}`, "Edit Text", ButtonStyle.Primary, "✏️"),
        btn(`appsetup:add:${d.id}`, "Add Question", ButtonStyle.Primary, "➕"),
        btn(`appsetup:remove:${d.id}`, "Remove Question", ButtonStyle.Secondary, "🗑️"),
      ),
      row(btn(`appsetup:send:${d.id}`, "Send Panel", ButtonStyle.Success, "📨")),
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
  return say(i, { content: "🎨 Pick a color for the application panel. It will be posted right after you choose.", components: [colorRow("application-panel")] });
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
    return { embeds: [embed("⚠️ Your warnings", "You have no warnings in this server. Keep it up! ✅")], components: [] };
  }
  const pages = Math.ceil(list.length / WARN_PAGE);
  const p = Math.min(Math.max(page, 0), pages - 1);
  const body = list.slice(p * WARN_PAGE, p * WARN_PAGE + WARN_PAGE).map((w, k) =>
    `**#${p * WARN_PAGE + k + 1}** • ${stamp(w.at)}\n**Reason:** ${cut(w.reason, 300)}\n**By:** ${w.moderatorId ? `<@${w.moderatorId}>` : "Unknown"}`
  ).join("\n\n");
  const e = embed(`⚠️ Your warnings (${list.length} total)`, body).setFooter({ text: `Page ${p + 1} of ${pages}` });
  return { embeds: [e], components: pages > 1 ? [pageControls("mywarn", p, pages, `${userId}:`)] : [], allowedMentions: noMentions };
}

function publicWarnView(guild, page) {
  const entries = Object.entries(db.warnings[guild.id] ?? {})
    .filter(([, list]) => list.length)
    .sort((a, b) => b[1].length - a[1].length);
  if (!entries.length) {
    return { embeds: [embed("📋 Public warning list", "Nobody in this server has a warning. 🎉")], components: [], allowedMentions: noMentions };
  }
  const pages = Math.ceil(entries.length / PUBLIC_PAGE);
  const p = Math.min(Math.max(page, 0), pages - 1);
  const lines = entries.slice(p * PUBLIC_PAGE, p * PUBLIC_PAGE + PUBLIC_PAGE).map(([uid, list], k) => {
    const last = list[list.length - 1];
    return `**${p * PUBLIC_PAGE + k + 1}.** <@${uid}> • **${list.length}** warning(s)\nLast: ${cut(last.reason, 120)} • ${rel(last.at)}`;
  }).join("\n\n");
  const e = embed("📋 Public warning list", lines)
    .setFooter({ text: `Page ${p + 1} of ${pages} • ${entries.length} member(s) with warnings` });
  return { embeds: [e], components: pages > 1 ? [pageControls("publicwarn", p, pages)] : [], allowedMentions: noMentions };
}

async function onPublicCommand(i) {
  if (i.commandName === "detenction-facility-link") return showMapCard(i);
  if (!i.inGuild()) fail("Use this command inside a server.");
  if (i.commandName === "mywarn") {
    return i.reply({ ...myWarnView(i.guildId, i.user.id, 0), flags: MessageFlags.Ephemeral });
  }
  return i.reply(publicWarnView(i.guild, 0));
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
//  MAP CARD (Detention Facility) - refreshed every hour
// ============================================================
const MAP_CODE = "wyunflpbzwtxv";
const MAP_URL = `https://gb27-workshop.gb27.workers.dev/m/${MAP_CODE}`;
const MAP_REFRESH = 60 * 60 * 1000;
const mapCache = { data: null, at: 0 };

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
  const recommend = rec ? Number(rec[1].replace(/,/g, "")) : null;
  const total = rec ? Number(rec[2].replace(/,/g, "")) : null;
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

async function loadMap(force = false) {
  if (!force && mapCache.data && now() - mapCache.at < MAP_REFRESH) return mapCache.data;
  try {
    const res = await fetch(MAP_URL, {
      headers: { "User-Agent": "LD-GIVEAWAYS-Bot" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = parseWorkshopMap(await res.text());
    if (!data) throw new Error("Map page could not be read");
    mapCache.data = data;
    mapCache.at = now();
  } catch (e) {
    console.error("Map fetch failed:", e.message);
  }
  return mapCache.data;
}

function mapEmbed(data) {
  if (!data) {
    return embed("🗺️ Detention Facility (RP)", `Map details could not be loaded right now. Try again later.\n**Link:** ${MAP_URL}`);
  }
  const or = v => cut(v || "Unknown", 1000);
  const card = new EmbedBuilder()
    .setColor(DEFAULT_COLOR)
    .setTitle(cut(`🗺️ ${data.title}`, 256))
    .setURL(MAP_URL)
    .setDescription(cut(data.description || "No description.", 400))
    .addFields(
      { name: "👤 Creator", value: or(data.author), inline: true },
      { name: "📥 Installs", value: or(data.installs), inline: true },
      { name: "👍 Recommended", value: data.percent !== null ? `${data.percent}% (${data.recommend} of ${data.total})` : "Unknown", inline: true },
      { name: "💾 Size", value: or(data.size), inline: true },
      { name: "🔖 Version", value: or(data.version), inline: true },
      { name: "🕒 Last updated", value: or(data.updated), inline: true },
      { name: "💰 Price", value: or(data.price), inline: true },
      { name: "🔑 Workshop code", value: `\`${MAP_CODE}\``, inline: true },
    )
    .setFooter({ text: "Stats refresh every hour" })
    .setTimestamp(mapCache.at || now());
  if (data.image) card.setImage(data.image);
  return card;
}

const mapRow = () => row(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(MAP_URL).setLabel("Open on Workshop"));

async function showMapCard(i) {
  if (!i.inGuild()) fail("Use this command inside a server.");
  await defer(i, false);
  const data = await loadMap(true);
  const msg = await i.editReply({ embeds: [mapEmbed(data)], components: [mapRow()] });
  db.mapTrackers ??= {};
  db.mapTrackers[msg.id] = { channelId: msg.channelId, guildId: i.guildId };
  const ids = Object.keys(db.mapTrackers);
  if (ids.length > 50) for (const old of ids.slice(0, ids.length - 50)) delete db.mapTrackers[old];
  save();
  return msg;
}

async function refreshMapCards() {
  const trackers = Object.entries(db.mapTrackers ?? {});
  if (!trackers.length) return;
  const data = await loadMap(true);
  for (const [messageId, t] of trackers) {
    const channel = await client.channels.fetch(t.channelId).catch(() => null);
    const message = channel ? await channel.messages.fetch(messageId).catch(() => null) : null;
    if (!message) {
      delete db.mapTrackers[messageId];
      continue;
    }
    await message.edit({ embeds: [mapEmbed(data)], components: [mapRow()] }).catch(() => {});
  }
  save();
}

// ============================================================
//  COMMAND HANDLER
// ============================================================
async function onCommand(i) {
  const name = i.commandName;
  if (name === "help") return i.reply({ embeds: [helpEmbed()], allowedMentions: noMentions });
  if (name === "about") return i.reply({ embeds: [aboutEmbed()], allowedMentions: noMentions });
  if (["mywarn", "publicwarn", "detenction-facility-link"].includes(name)) return onPublicCommand(i);
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
        title: i.options.getString("title") || "📢 Announcement",
        image,
        pingRoleId: i.options.getRole("ping_role")?.id ?? null,
      });
    }

    case "say": {
      const channel = textTarget(i.options.getChannel("channel") ?? i.channel);
      await channel.send({ content: i.options.getString("text", true), allowedMentions: noMentions });
      return say(i, `✅ Message sent to <#${channel.id}>.`);
    }

    case "status": {
      db.presence = { type: i.options.getString("type", true), text: cut(i.options.getString("text", true), 128) };
      save();
      applyPresence();
      return say(i, "✅ Bot status updated.");
    }

    case "dm": {
      const user = i.options.getUser("user", true);
      const text = i.options.getString("text", true);
      await user.send({ content: text, allowedMentions: noMentions })
        .catch(() => fail("I could not DM that user. Their direct messages may be closed."));
      return say(i, `✅ DM sent to ${user.tag}.`);
    }

    // ---------- TICKETS ----------
    case "ticket-setup": {
      const cfg = ticketConfigOf(i.guildId);
      cfg.logChannelId = i.options.getChannel("log_channel")?.id ?? cfg.logChannelId;
      save();
      return say(i, "✅ Ticket log channel saved. Add categories with /ticket-category-add, then post /ticket-panel.");
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
      return say(i, `✅ Category **${catName}** added (${cfg.categories.length}/${CONFIG.MAX_TICKET_CATEGORIES}).`);
    }

    case "ticket-category-remove": {
      const cfg = ticketConfigOf(i.guildId);
      const catName = i.options.getString("name", true).trim().toLowerCase();
      const before = cfg.categories.length;
      cfg.categories = cfg.categories.filter(c => c.name.toLowerCase() !== catName);
      if (cfg.categories.length === before) fail("No category with that name.");
      save();
      return say(i, `🗑️ Category removed. ${cfg.categories.length} category(ies) left.`);
    }

    case "ticket-categories": {
      const cfg = ticketConfigOf(i.guildId);
      if (!cfg.categories.length) return say(i, "No ticket categories yet. Add one with /ticket-category-add.");
      const lines = cfg.categories.map((c, k) =>
        `**${k + 1}. ${c.name}**${c.description ? ` — ${c.description}` : ""}\nStaff: ${c.supportRoleId ? `<@&${c.supportRoleId}>` : "not set"} • Category: ${c.parentId ? `<#${c.parentId}>` : "default"}`);
      return say(i, { embeds: [embed("🎫 Ticket categories", lines.join("\n\n"))] });
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
      return say(i, "✅ Giveaway ended.");
    }

    case "giveaway-reroll": {
      const g = findGiveaway(i, i.options.getString("message_id", true));
      if (g.state !== "ended") fail("Only an ended giveaway can be rerolled.");
      g.winnerIds = await pickWinners(i.guild, g, g.winnerIds ?? [], g.winners);
      save();
      await publishGiveawayResult(i.guild, g, true);
      return say(i, "✅ Reroll complete.");
    }

    case "giveaway-cancel": {
      const g = findGiveaway(i, i.options.getString("message_id", true));
      if (g.state !== "active") fail("Only an active giveaway can be cancelled.");
      g.state = "cancelled";
      save();
      const channel = await i.guild.channels.fetch(g.channelId).catch(() => null);
      const message = channel && g.messageId ? await channel.messages.fetch(g.messageId).catch(() => null) : null;
      await message?.edit({ embeds: [giveawayEmbed(g)], components: [] }).catch(() => {});
      await channel?.send(`🚫 The giveaway for **${g.prize}** was cancelled.`).catch(() => {});
      return say(i, "✅ Giveaway cancelled.");
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
      return say(i, `✅ **${label}** now gives **${role.name}**.`);
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
      return say(i, { content: "🏗️ Choose a template. Its categories and channels will be added to this server.", components: rows });
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
      return say(i, `🔨 **${user.tag}** was banned. Reason: ${reason}`);
    }

    case "kick": {
      const user = i.options.getUser("user", true);
      const reason = i.options.getString("reason") ?? "No reason provided";
      const me = await botCan(i.guild, PermissionFlagsBits.KickMembers, "Kick Members");
      const target = await i.guild.members.fetch(user.id).catch(() => fail("That user is not in this server."));
      assertHierarchy(i, target, me);
      await target.kick(cut(reason, 512)).catch(() => fail("I could not kick that user."));
      await audit(i.guild, "Kick", i.user, user.id, reason);
      return say(i, `👢 **${user.tag}** was kicked. Reason: ${reason}`);
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
      return say(i, `🔇 **${user.tag}** was timed out for ${minutes} minute(s). Reason: ${reason}`);
    }

    case "untimeout": {
      const user = i.options.getUser("user", true);
      const me = await botCan(i.guild, PermissionFlagsBits.ModerateMembers, "Timeout Members");
      const target = await i.guild.members.fetch(user.id).catch(() => fail("That user is not in this server."));
      assertHierarchy(i, target, me);
      await target.timeout(null).catch(() => fail("I could not remove the timeout."));
      await audit(i.guild, "Untimeout", i.user, user.id, "Timeout removed");
      return say(i, `🔊 Timeout removed from **${user.tag}**.`);
    }

    case "warn": {
      const user = i.options.getUser("user", true);
      const reason = i.options.getString("reason", true);
      const count = addWarning(i.guildId, user.id, reason, i.user.id);
      await user.send({ embeds: [embed("⚠️ Warning", `You received a warning in **${i.guild.name}**.\n\n**Reason:** ${reason}`, 0xf1c40f)] }).catch(() => {});
      await audit(i.guild, "Warning", i.user, user.id, reason);
      return say(i, `⚠️ **${user.tag}** was warned. Total warnings: ${count}. Reason: ${reason}`);
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
      return say(i, `🧹 Deleted ${deleted.size} message(s).`);
    }

    case "lock": {
      await botCan(i.guild, PermissionFlagsBits.ManageChannels, "Manage Channels");
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
      return say(i, "🔒 Channel locked.");
    }

    case "unlock": {
      await botCan(i.guild, PermissionFlagsBits.ManageChannels, "Manage Channels");
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
      return say(i, "🔓 Channel unlocked.");
    }

    case "slowmode": {
      const seconds = i.options.getInteger("seconds", true);
      await botCan(i.guild, PermissionFlagsBits.ManageChannels, "Manage Channels");
      await i.channel.setRateLimitPerUser(seconds);
      return say(i, `🐢 Slowmode set to ${seconds} second(s).`);
    }

    case "automod": {
      const enabled = i.options.getBoolean("enabled", true);
      if (enabled) db.automod[i.guildId] = true;
      else delete db.automod[i.guildId];
      save();
      return say(i, `🛡️ AutoMod is now ${enabled ? "ON" : "OFF"}. It removes invite links and mass mentions.`);
    }

    case "moderation-log": {
      const channel = textTarget(i.options.getChannel("channel", true));
      db.logChannels[i.guildId] = channel.id;
      save();
      return say(i, `✅ Moderation logs will be sent to <#${channel.id}>.`);
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
    const e = embed(d.title, d.text, color);
    if (d.image) e.setImage(d.image);
    await channel.send({
      content: d.pingRoleId ? `<@&${d.pingRoleId}>` : undefined,
      embeds: [e],
      allowedMentions: d.pingRoleId ? { roles: [d.pingRoleId] } : noMentions,
    });
    return i.editReply({ content: `✅ Announcement sent to <#${channel.id}>.`, components: [] });
  }

  if (kind === "ticket-panel") {
    const channel = textTarget(await i.guild.channels.fetch(d.channelId).catch(() => null) ?? fail("The channel no longer exists."));
    const cfg = ticketConfigOf(i.guildId);
    if (!cfg.categories.length) fail("There are no ticket categories. Add one first.");
    await channel.send({
      embeds: [embed(d.title, d.description, color)],
      components: [ticketPanelRow(cfg)],
    });
    return i.editReply({ content: `✅ Ticket panel posted in <#${channel.id}>.`, components: [] });
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
      components: [row(btn("app:apply", d.button, ButtonStyle.Primary, "📝"))],
    });
    return i.editReply({ content: `✅ Application panel posted in <#${channel.id}>.`, components: [] });
  }

  if (kind === "rolepanel-create") {
    const channel = textTarget(await i.guild.channels.fetch(d.channelId).catch(() => null) ?? fail("The channel no longer exists."));
    const message = await channel.send({
      embeds: [embed(d.title, `${d.description}\n\nPress a button to get the role. Press it again after 20 seconds to remove it.`, color)],
    });
    db.rolePanels[message.id] = { guildId: i.guildId, channelId: channel.id, buttons: [] };
    save();
    return i.editReply({ content: `✅ Role panel created. ID: \`${message.id}\`. Now use /rolepanel-add.`, components: [] });
  }

  if (kind === "giveaway") {
    pendingGiveaways.set(i.user.id, { ...d, color, expires: now() + CONFIG.PENDING_TTL });
    return i.editReply({
      content: `🎁 **Prize:** ${d.prize}\n🏆 **Winners:** ${d.winners}\n\nChoose how long the giveaway lasts:`,
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
      return say(i, `✅ Application accepted. DM: ${dm}`);
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
  if (parts[0] === "appsetup") return onAppSetupButton(i, parts[1], parts[2]);
  if (parts[0] === "gw" && parts[1] === "list") {
    const g = db.giveaways[parts[2]];
    if (!g || g.guildId !== i.guildId) fail("Giveaway not found.");
    const shown = g.entries.slice(0, 50).map(u => `<@${u}>`).join("\n") || "No participants yet.";
    const more = g.entries.length > 50 ? `\n…and ${g.entries.length - 50} more` : "";
    return say(i, { embeds: [embed(`👥 Participants (${g.entries.length})`, shown + more)] });
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
        btn(`gw:enter:${id}`, "Join or Leave", ButtonStyle.Success, "🎉"),
        btn(`gw:list:${id}`, "Participants", ButtonStyle.Secondary, "👥"),
      )],
    });
    g.messageId = message.id;
    db.giveaways[id] = g;
    save();
    return i.editReply({ content: `✅ Giveaway started in <#${channel.id}>. Message ID: \`${message.id}\``, components: [] });
  }

  if (i.customId.startsWith("setup:")) {
    requireAdmin(i);
    const template = TEMPLATES[Number(i.values[0])];
    if (!template) fail("Unknown template.");
    await i.deferUpdate();
    await botCan(i.guild, PermissionFlagsBits.ManageChannels, "Manage Channels");
    const created = await applyTemplate(i.guild, template);
    return i.editReply({ content: `✅ Template **${template[0]}** applied. ${created} channel(s) created.`, components: [] });
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
    return say(i, `❌ Application rejected. DM: ${dm}`);
  }
  fail("Unknown form.");
}

client.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand()) return await onCommand(i);
    if (i.isButton()) return await onButton(i);
    if (i.isStringSelectMenu()) return await onSelect(i);
    if (i.isModalSubmit()) return await onModal(i);
  } catch (e) {
    let content;
    if (e instanceof UserError) {
      content = e.message;
    } else {
      const ref = newId(3);
      content = `An unexpected error occurred. Reference: \`${ref}\``;
      console.error(`[${ref}]`, e);
    }
    try {
      const payload = { content, allowedMentions: noMentions };
      if (i.deferred) await i.editReply(payload);
      else if (i.replied) await i.followUp({ ...payload, flags: MessageFlags.Ephemeral });
      else await i.reply({ ...payload, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error("Could not send error response:", err.message);
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
  catch (e) { console.error("Command registration failed:", e.message); }
  tickGiveaways();
  setInterval(() => tickGiveaways().catch(e => console.error("Giveaway tick:", e.message)), 10 * 1000);
  setInterval(() => refreshMapCards().catch(e => console.error("Map refresh:", e.message)), 60 * 60 * 1000);
});

http.createServer((req, res) => {
  const ready = client.isReady();
  res.writeHead(ready ? 200 : 503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ service: "LD GIVEAWAYS", ready }));
}).listen(CONFIG.PORT, "0.0.0.0", () => console.log(`Health server on port ${CONFIG.PORT}`));

client.login(TOKEN).catch(e => {
  console.error("Login failed:", e.message);
  process.exit(1);
});
