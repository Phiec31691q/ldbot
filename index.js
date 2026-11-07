/**
 * ==============================================================================
 * ██╗     ██████╗     ██████╗ ██╗██╗   ██╗███████╗ █████╗ ██╗    ██╗ █████╗ ██╗   ██╗███████╗
 * ██║     ██╔══██╗   ██╔════╝ ██║██║   ██║██╔════╝██╔══██╗██║    ██║██╔══██╗╚██╗ ██╔╝██╔════╝
 * ██║     ██║  ██║   ██║  ███╗██║██║   ██║█████╗  ███████║██║ █╗ ██║███████║ ╚████╔╝ ███████╗
 * ██║     ██║  ██║   ██║   ██║██║╚██╗ ██╔╝██╔══╝  ██╔══██║██║███╗██║██╔══██║  ╚██╔╝  ╚════██║
 * ███████╗██████╔╝   ╚██████╔╝██║ ╚████╔╝ ███████╗██║  ██║╚███╔███╔╝██║  ██║   ██║   ███████║
 * ╚══════╝╚═════╝     ╚═════╝ ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝
 * 
 * ULTIMATE ENTERPRISE EDITION v17.0.0 (ENGLISH VERSION)
 * My Owner: Unitey (1026324207098925147)
 * My Developer: Dream (696735778356854913)
 * 
 * ==============================================================================
 * SYSTEM INSTALLATION GUIDE
 * ==============================================================================
 * 1. Create an application on the Discord Developer Portal.
 * 2. Enable "Server Members Intent" and "Message Content Intent" in the Bot section.
 * 3. Upload this file to your GitHub repository as "index.js".
 * 4. Create a "Web Service" on Render.com and connect your repository.
 * 5. Add the following Environment Variables in Render:
 *    - DISCORD_TOKEN = (Your Bot Token)
 *    - CLIENT_ID = (Your Application ID)
 *    - GUILD_ID = (Your Server ID)
 *    - DATA_DIR = ./data
 * 6. Deploy the service.
 * ==============================================================================
 */

'use strict';

// ==============================================================================
// SECTION 1: REQUIRED LIBRARIES AND MODULES
// ==============================================================================

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');

// Discord.js v14 Library and necessary classes
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  PermissionFlagsBits: P,
  ChannelType,
  ActivityType,
  MessageFlags,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder
} = require('discord.js');

// ==============================================================================
// SECTION 2: CONSTANTS AND CONFIGURATION
// ==============================================================================

// Bot Version Information
const BOT_VERSION = '17.0.0';
const BOT_NAME = 'LD GIVEAWAYS ENTERPRISE';

// Storage Settings
const DATA_DIRECTORY = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const TRANSCRIPTS_DIRECTORY = path.join(DATA_DIRECTORY, 'transcripts');
const DATABASE_FILE = path.join(DATA_DIRECTORY, 'enterprise.sqlite');

// Discord Interaction Constants
const EPHEMERAL = MessageFlags.Ephemeral;
const IS_COMPONENTS_V2 = MessageFlags.IsComponentsV2 || 32768;
const SAFE_MENTIONS = { parse: [], repliedUser: false };

// Limits and Timeouts
const MAX_TRANSCRIPT_MESSAGES = 10000;
const GIVEAWAY_MAX_DURATION_MS = 90 * 86400000; // 90 Days
const MAX_APP_QUESTIONS = 20; // Maximum questions allowed in application form

// Color Palette
const COLORS = {
  PRIMARY: 0x3498DB,
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  DANGER: 0xED4245,
  INFO: 0x9B59B6,
  DARK: 0x2C3E50,
  LIGHT: 0xECF0F1
};

// Restricted Permissions (Forbidden in Role Panels)
const RESTRICTED_PERMISSIONS = [
  P.Administrator,
  P.ManageGuild,
  P.ManageRoles,
  P.ManageChannels,
  P.ManageWebhooks,
  P.BanMembers,
  P.KickMembers,
  P.ModerateMembers,
  P.ManageMessages,
  P.MentionEveryone,
  P.ManageEvents,
  P.ManageThreads,
  P.ManageGuildExpressions,
  P.ViewAuditLog
].filter(Boolean);

// ==============================================================================
// SECTION 3: DATABASE MANAGEMENT
// ==============================================================================

/**
 * Initializes the database directory and connection.
 * @returns {Database} SQLite Database object.
 */
function initializeDatabase() {
  try {
    if (!fs.existsSync(DATA_DIRECTORY)) {
      console.log(`[DB] Creating data directory: ${DATA_DIRECTORY}`);
      fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
    }
    
    if (!fs.existsSync(TRANSCRIPTS_DIRECTORY)) {
      console.log(`[DB] Creating transcripts directory: ${TRANSCRIPTS_DIRECTORY}`);
      fs.mkdirSync(TRANSCRIPTS_DIRECTORY, { recursive: true });
    }

    console.log(`[DB] Establishing database connection: ${DATABASE_FILE}`);
    const database = new Database(DATABASE_FILE);
    
    database.pragma('journal_mode = WAL');
    database.pragma('busy_timeout = 5000');
    database.pragma('synchronous = FULL');
    
    return database;
  } catch (error) {
    console.error('[DB] Fatal error initializing database:', error);
    process.exit(1);
  }
}

// Initialize Database
const db = initializeDatabase();

/**
 * Creates necessary tables if they do not exist.
 */
function createTables() {
  try {
    console.log('[DB] Checking and creating tables...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS objects (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY(kind, id)
      );

      CREATE TABLE IF NOT EXISTS giveaway_entries (
        giveaway_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        joined_at INTEGER NOT NULL,
        PRIMARY KEY(giveaway_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS role_cooldowns (
        panel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        until INTEGER NOT NULL,
        PRIMARY KEY(panel_id, user_id, role_id)
      );

      CREATE TABLE IF NOT EXISTS tickets (
        channel_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT DEFAULT 'open'
      );

      CREATE TABLE IF NOT EXISTS applications (
        message_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        answers TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL
      );
    `);
    console.log('[DB] All tables are ready.');
  } catch (error) {
    console.error('[DB] Error creating tables:', error);
    process.exit(1);
  }
}

createTables();

// Prepared SQL Statements
const sqlStatements = {
  getObject: db.prepare('SELECT data FROM objects WHERE kind = ? AND id = ?'),
  setObject: db.prepare('INSERT INTO objects (kind, id, data) VALUES (?, ?, ?) ON CONFLICT(kind, id) DO UPDATE SET data = excluded.data'),
  delObject: db.prepare('DELETE FROM objects WHERE kind = ? AND id = ?'),
  
  getGwEntries: db.prepare('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?'),
  addGwEntry: db.prepare('INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id, joined_at) VALUES (?, ?, ?)'),
  delGwEntry: db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?'),
  countGwEntries: db.prepare('SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?'),
  hasGwEntry: db.prepare('SELECT 1 FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?'),
  
  getCooldown: db.prepare('SELECT until FROM role_cooldowns WHERE user_id = ? AND role_id = ?'),
  setCooldown: db.prepare('INSERT INTO role_cooldowns (panel_id, user_id, role_id, until) VALUES (?, ?, ?, ?) ON CONFLICT(panel_id, user_id, role_id) DO UPDATE SET until = excluded.until')
};

function getData(kind, id) {
  try {
    const row = sqlStatements.getObject.get(kind, id);
    return row ? JSON.parse(row.data) : null;
  } catch (e) {
    console.error(`[DB] Error fetching data (${kind}):`, e);
    return null;
  }
}

function setData(kind, id, data) {
  try {
    sqlStatements.setObject.run(kind, id, JSON.stringify(data));
    return data;
  } catch (e) {
    console.error(`[DB] Error saving data (${kind}):`, e);
    return null;
  }
}

function deleteData(kind, id) {
  try {
    sqlStatements.delObject.run(kind, id);
    return true;
  } catch (e) {
    console.error(`[DB] Error deleting data (${kind}):`, e);
    return false;
  }
}

// ==============================================================================
// SECTION 4: HELPER FUNCTIONS
// ==============================================================================

function generateId() {
  return crypto.randomBytes(6).toString('hex');
}

function parseHexColor(hex, defaultColor = COLORS.PRIMARY) {
  if (!hex) return defaultColor;
  if (typeof hex === 'number') return hex;
  const cleanHex = hex.replace('#', '').trim();
  if (/^[0-9A-Fa-f]{6}$/i.test(cleanHex)) {
    return parseInt(cleanHex, 16);
  }
  return defaultColor;
}

function parseDurationToMs(input, maxMs = GIVEAWAY_MAX_DURATION_MS) {
  if (!input) throw new Error('Duration not specified.');
  const str = input.toString().toLowerCase().trim();
  let totalMs = 0;
  let match;
  let endIndex = 0;
  const regex = /(\d+)\s*(s|m|h|d|w)/g;
  
  while ((match = regex.exec(str)) !== null) {
    if (str.slice(endIndex, match.index).trim() !== '') {
      throw new Error('Invalid duration format. Example: 1d 2h 30m');
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    totalMs += amount * multipliers[unit];
    endIndex = regex.lastIndex;
  }
  
  if (!endIndex || str.slice(endIndex).trim() !== '' || !Number.isSafeInteger(totalMs) || totalMs < 10000 || totalMs > maxMs) {
    throw new Error('Invalid duration or outside allowed limits (Min 10 seconds).');
  }
  return totalMs;
}

function formatDiscordTime(timestamp, style = 'R') {
  return `<t:${Math.floor(timestamp / 1000)}:${style}>`;
}

function sanitizeText(text) {
  if (!text) return '';
  return text.replace(/([\\`*_~|>#[\]])/g, '\\$1').replace(/@/g, '@\u200b');
}

function checkAdminPermission(interaction) {
  if (!interaction.memberPermissions?.has(P.Administrator)) {
    throw new Error('You do not have permission to use this command. Administrator required.');
  }
}

// ==============================================================================
// SECTION 5: UI COMPONENTS
// ==============================================================================

function createStandardEmbed(title, description, color = COLORS.PRIMARY) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTimestamp();
  if (title) embed.setTitle(title.substring(0, 256));
  if (description) embed.setDescription(description.substring(0, 4000));
  return embed;
}

function createCustomButton(id, label, style = ButtonStyle.Secondary, disabled = false, emoji = null) {
  const btn = new ButtonBuilder()
    .setCustomId(id)
    .setLabel(label.substring(0, 80))
    .setStyle(style)
    .setDisabled(disabled);
  if (emoji) btn.setEmoji(emoji);
  return btn;
}

function createCustomModal(id, title, fields) {
  const modal = new ModalBuilder().setCustomId(id).setTitle(title.substring(0, 45));
  const rows = fields.map(f => {
    const input = new TextInputBuilder()
      .setCustomId(f.id)
      .setLabel(f.label.substring(0, 45))
      .setStyle(f.paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(f.required !== false)
      .setMaxLength(f.max || 2000);
    if (f.value) input.setValue(f.value);
    if (f.placeholder) input.setPlaceholder(f.placeholder);
    return new ActionRowBuilder().addComponents(input);
  });
  modal.addComponents(rows);
  return modal;
}

// ==============================================================================
// SECTION 6: COMMAND SCHEMAS
// ==============================================================================

const BOT_COMMANDS = [
  { name: 'about', description: 'Displays information about the bot.' },
  {
    name: 'ticket',
    description: 'Manages the ticket system.',
    options: [
      { type: 1, name: 'setup', description: 'Sets up the ticket system step-by-step.' },
      { type: 1, name: 'close', description: 'Closes the current ticket.' },
      { type: 1, name: 'add', description: 'Adds a user to the ticket.', options: [{ type: 6, name: 'user', description: 'User to add', required: true }] },
      { type: 1, name: 'remove', description: 'Removes a user from the ticket.', options: [{ type: 6, name: 'user', description: 'User to remove', required: true }] }
    ]
  },
  {
    name: 'application',
    description: 'Manages the application system (Admin Only).',
    options: [
      { type: 1, name: 'setup', description: 'Sets up the application system step-by-step.' }
    ]
  },
  {
    name: 'giveaway',
    description: 'Manages the giveaway system.',
    options: [
      { type: 1, name: 'create', description: 'Creates a new giveaway.', options: [{ type: 7, name: 'channel', description: 'Giveaway channel', required: true }] },
      { type: 1, name: 'drop', description: 'Starts a fast drop giveaway.', options: [{ type: 7, name: 'channel', description: 'Channel', required: true }, { type: 3, name: 'prize', description: 'Prize', required: true }] },
      { type: 1, name: 'end', description: 'Ends a giveaway early.', options: [{ type: 3, name: 'id', description: 'Message ID', required: true }] }
    ]
  },
  {
    name: 'rolepanel',
    description: 'Creates a role panel.',
    options: [
      { type: 1, name: 'setup', description: 'Sets up a role panel step-by-step.' }
    ]
  },
  {
    name: 'mod',
    description: 'Moderation commands.',
    options: [
      { type: 1, name: 'ban', description: 'Bans a user.', options: [{ type: 6, name: 'user', description: 'User', required: true }, { type: 3, name: 'reason', description: 'Reason', required: false }] },
      { type: 1, name: 'kick', description: 'Kicks a user.', options: [{ type: 6, name: 'user', description: 'User', required: true }, { type: 3, name: 'reason', description: 'Reason', required: false }] },
      { type: 1, name: 'purge', description: 'Deletes messages.', options: [{ type: 4, name: 'amount', description: 'Amount (1-100)', required: true }] },
      { type: 1, name: 'lock', description: 'Locks the channel.' },
      { type: 1, name: 'unlock', description: 'Unlocks the channel.' }
    ]
  }
];

// ==============================================================================
// SECTION 7: DISCORD CLIENT
// ==============================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  allowedMentions: SAFE_MENTIONS
});

// ==============================================================================
// SECTION 8: TICKET SYSTEM (WIZARD)
// ==============================================================================

async function handleTicketSetupStart(interaction) {
  checkAdminPermission(interaction);
  setData('draft', interaction.user.id, { step: 'ticket_panel', data: { categories: [] } });
  
  const modal = createCustomModal('tsetup_modal_panel', 'Ticket Panel Settings', [
    { id: 'title', label: 'Panel Title', value: 'Support System', required: true },
    { id: 'desc', label: 'Panel Description', value: 'Click a button below to open a ticket.', paragraph: true, required: true }
  ]);
  
  await interaction.showModal(modal);
}

async function handleTicketSetupPanelSubmit(interaction) {
  const draft = getData('draft', interaction.user.id);
  draft.data.title = interaction.fields.getTextInputValue('title');
  draft.data.desc = interaction.fields.getTextInputValue('desc');
  draft.step = 'ticket_type';
  setData('draft', interaction.user.id, draft);

  const row = new ActionRowBuilder().addComponents(
    createCustomButton('tsetup_type_single', 'Single (One Button)', ButtonStyle.Primary),
    createCustomButton('tsetup_type_multi', 'Categorized (Menu)', ButtonStyle.Success)
  );

  await interaction.reply({ content: 'Should the ticket system be categorized or a single button?', components: [row], ephemeral: true });
}

// ==============================================================================
// SECTION 9: APPLICATION SYSTEM (WIZARD + ADMIN QUESTIONS)
// ==============================================================================

async function handleApplicationSetupStart(interaction) {
  // ONLY ADMINS CAN SETUP
  checkAdminPermission(interaction);
  setData('draft', interaction.user.id, { step: 'app_channel', data: { questions: [] } });
  
  const row = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('app_setup_channel')
      .setPlaceholder('Select the channel to send the application panel')
      .setChannelTypes([ChannelType.GuildText])
      .setMinValues(1)
      .setMaxValues(1)
  );
  
  await interaction.reply({ content: 'Step 1: Where should the application panel be sent?', components: [row], ephemeral: true });
}

async function handleApplicationChannelSelect(interaction) {
  const draft = getData('draft', interaction.user.id);
  draft.data.channelId = interaction.values[0];
  draft.step = 'app_details';
  setData('draft', interaction.user.id, draft);

  const modal = createCustomModal('app_setup_modal', 'Application System Details', [
    { id: 'title', label: 'Application Title', value: 'Staff Application', required: true },
    { id: 'desc', label: 'Application Description', value: 'Click the button below to fill out the application form.', paragraph: true, required: true },
    { id: 'log_channel', label: 'Log Channel ID (Leave empty to auto-create)', value: '', required: false }
  ]);

  await interaction.showModal(modal);
}

// ==============================================================================
// SECTION 10: GIVEAWAY SYSTEM
// ==============================================================================

async function handleGiveawayCreate(interaction) {
  checkAdminPermission(interaction);
  const channel = interaction.options.getChannel('channel');
  setData('draft', interaction.user.id, { step: 'gw_details', data: { channelId: channel.id } });
  
  const modal = createCustomModal('gw_create_modal', 'Giveaway Details', [
    { id: 'prize', label: 'Prize', value: 'Prize Name', required: true },
    { id: 'winners', label: 'Winner Count', value: '1', required: true },
    { id: 'time', label: 'Duration (e.g., 1d 2h 30m)', value: '1d', required: true },
    { id: 'desc', label: 'Description (Optional)', value: '', paragraph: true, required: false }
  ]);
  
  await interaction.showModal(modal);
}

async function handleGiveawayDrop(interaction) {
  checkAdminPermission(interaction);
  await interaction.deferReply({ ephemeral: true });
  const channel = interaction.options.getChannel('channel');
  const prize = interaction.options.getString('prize');
  
  const embed = new EmbedBuilder()
    .setTitle(`🎁 DROP: ${prize}`)
    .setDescription('**First to click wins!** Click the button below instantly.')
    .setColor(COLORS.WARNING);
    
  const row = new ActionRowBuilder().addComponents(
    createCustomButton(`gw_drop_claim_${generateId()}`, 'Claim Now!', ButtonStyle.Success, false, '🎁')
  );
  
  const msg = await channel.send({ embeds: [embed], components: [row] });
  
  await interaction.editReply({ content: `Drop successfully started! Message Link: ${msg.url}` });
}

// ==============================================================================
// SECTION 11: MAIN INTERACTION HANDLER (ENGINE)
// ==============================================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.inGuild() || interaction.guildId !== process.env.GUILD_ID) return;

  try {
    // =====================================================================
    // 1. SLASH COMMANDS
    // =====================================================================
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'about') {
        const embed = createStandardEmbed(
          '✨ LD GIVEAWAYS | Enterprise',
          'This bot was developed by **Dream** for **LD Giveaways**.\n\n' +
          '**Developer:** <@696735778356854913>\n' +
          '**Owner:** <@1026324207098925147>\n\n' +
          `**Version:** v${BOT_VERSION}\n**Infrastructure:** Node.js & Discord.js v14`,
          COLORS.PRIMARY
        );
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'ticket' && interaction.options.getSubcommand() === 'setup') {
        return handleTicketSetupStart(interaction);
      }

      if (commandName === 'application' && interaction.options.getSubcommand() === 'setup') {
        return handleApplicationSetupStart(interaction);
      }

      if (commandName === 'giveaway') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'create') return handleGiveawayCreate(interaction);
        if (sub === 'drop') return handleGiveawayDrop(interaction);
        if (sub === 'end') {
          checkAdminPermission(interaction);
          await interaction.deferReply({ ephemeral: true });
          const id = interaction.options.getString('id');
          return interaction.editReply(`Giveaway \`${id}\` has been ended (Simulated).`);
        }
      }

      if (commandName === 'mod') {
        checkAdminPermission(interaction);
        const sub = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });
        
        if (sub === 'ban') {
          const user = interaction.options.getUser('user');
          const reason = interaction.options.getString('reason') || 'No reason provided.';
          await interaction.guild.members.ban(user.id, { reason });
          return interaction.editReply(`**${user.tag}** has been banned. Reason: ${reason}`);
        }
        if (sub === 'kick') {
          const user = interaction.options.getUser('user');
          const reason = interaction.options.getString('reason') || 'No reason provided.';
          await interaction.guild.members.kick(user.id, reason);
          return interaction.editReply(`**${user.tag}** has been kicked.`);
        }
        if (sub === 'purge') {
          const amount = interaction.options.getInteger('amount');
          if (amount < 1 || amount > 100) throw new Error('Amount must be between 1 and 100.');
          await interaction.channel.bulkDelete(amount, true);
          return interaction.editReply(`${amount} messages have been deleted.`);
        }
        if (sub === 'lock') {
          await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
          return interaction.editReply('Channel has been successfully locked.');
        }
        if (sub === 'unlock') {
          await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
          return interaction.editReply('Channel has been successfully unlocked.');
        }
      }
    }

    // =====================================================================
    // 2. BUTTONS
    // =====================================================================
    if (interaction.isButton()) {
      
      // --- TICKET BUTTONS ---
      if (interaction.customId === 'tsetup_type_single') {
        const draft = getData('draft', interaction.user.id);
        draft.data.type = 'single';
        draft.step = 'ticket_single_btn';
        setData('draft', interaction.user.id, draft);
        
        const modal = createCustomModal('tsetup_modal_single', 'Button Settings', [
          { id: 'btn_name', label: 'Button Name', value: 'Open Ticket', required: true },
          { id: 'welcome', label: 'Ticket Welcome Message', value: 'Staff will be with you shortly.', paragraph: true, required: true }
        ]);
        return interaction.showModal(modal);
      }

      // --- APPLICATION BUTTONS (ADD QUESTION) ---
      if (interaction.customId === 'app_add_question') {
        const draft = getData('draft', interaction.user.id);
        if (draft.data.questions.length >= MAX_APP_QUESTIONS) {
          return interaction.reply({ content: `You can add a maximum of ${MAX_APP_QUESTIONS} questions.`, ephemeral: true });
        }
        
        const modal = createCustomModal('app_add_question_modal', 'Add New Question', [
          { id: 'q_text', label: 'Question Text', value: 'What is your name?', required: true },
          { id: 'q_type', label: 'Answer Type (short/long)', value: 'short', required: true }
        ]);
        return interaction.showModal(modal);
      }

      if (interaction.customId === 'app_finish_setup') {
        await interaction.deferReply({ ephemeral: true });
        const draft = getData('draft', interaction.user.id);
        
        const title = draft.data.title;
        const desc = draft.data.desc;
        const questions = draft.data.questions;
        let logChannelId = draft.data.logChannelId;
        const targetChannel = await interaction.guild.channels.fetch(draft.data.channelId);

        if (!logChannelId) {
          const logChannel = await interaction.guild.channels.create({
            name: 'application-results',
            type: ChannelType.GuildText,
            permissionOverwrites: [
              { id: interaction.guild.id, deny: [P.ViewChannel] },
              { id: interaction.client.user.id, allow: [P.ViewChannel, P.SendMessages, P.EmbedLinks] }
            ]
          });
          logChannelId = logChannel.id;
        }

        const appId = generateId();
        setData('application', appId, { title, desc, questions, logChannelId, guildId: interaction.guildId });

        const embed = createStandardEmbed(title, desc, COLORS.SUCCESS);
        const row = new ActionRowBuilder().addComponents(
          createCustomButton(`app_open_${appId}`, 'Apply Now', ButtonStyle.Success, false, '🪪')
        );

        await targetChannel.send({ embeds: [embed], components: [row] });
        deleteData('draft', interaction.user.id);

        return interaction.editReply({ content: 'Application system successfully set up and panel sent!' });
      }

      if (interaction.customId.startsWith('app_open_')) {
        const appId = interaction.customId.replace('app_open_', '');
        const app = getData('application', appId);
        if (!app) return interaction.reply({ content: 'Application system not found.', ephemeral: true });

        if (app.questions.length === 0) {
          return interaction.reply({ content: 'This application has no questions.', ephemeral: true });
        }

        const questions = app.questions.map((q, i) => ({ id: `q${i}`, label: q.text, paragraph: q.type === 'long', required: true }));
        const modal = createCustomModal(`app_submit_${appId}`, app.title, questions.slice(0, 5));
        return interaction.showModal(modal);
      }

      // --- APPLICATION ACCEPT / REJECT (BUG FIXED) ---
      if (interaction.customId.startsWith('app_accept_')) {
        await interaction.deferUpdate(); // Acknowledge immediately
        const userId = interaction.customId.replace('app_accept_', '');
        
        // Remove buttons from the log message
        await interaction.message.edit({ components: [] });
        
        // Send DM to user
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            await user.send({ embeds: [createStandardEmbed('Application Accepted', 'Congratulations! Your application has been accepted. Staff will contact you shortly.', COLORS.SUCCESS)] }).catch(() => null);
        }
        
        // Follow-up in the log channel
        await interaction.followUp({ content: `Application for <@${userId}> has been **Accepted**.`, ephemeral: true });
      }

      if (interaction.customId.startsWith('app_reject_')) {
        const userId = interaction.customId.replace('app_reject_', '');
        const modal = createCustomModal(`app_reject_modal_${userId}`, 'Reject Application', [
            { id: 'reason', label: 'Reason for Rejection', paragraph: true, required: true }
        ]);
        return interaction.showModal(modal);
      }

      // --- GIVEAWAY DROP BUTTON ---
      if (interaction.customId.startsWith('gw_drop_claim_')) {
        await interaction.reply({ content: '🎉 **Congratulations!** You won the prize. Staff will contact you shortly.', ephemeral: true });
        const row = new ActionRowBuilder().addComponents(
          createCustomButton('gw_drop_claimed', 'Claimed!', ButtonStyle.Secondary, true)
        );
        await interaction.message.edit({ components: [row] });
      }
    }

    // =====================================================================
    // 3. MODALS
    // =====================================================================
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      // --- TICKET MODALS ---
      if (customId === 'tsetup_modal_panel') return handleTicketSetupPanelSubmit(interaction);

      // --- APPLICATION MODALS ---
      if (customId === 'app_setup_modal') {
        const draft = getData('draft', interaction.user.id);
        draft.data.title = interaction.fields.getTextInputValue('title');
        draft.data.desc = interaction.fields.getTextInputValue('desc');
        draft.data.logChannelId = interaction.fields.getTextInputValue('log_channel').trim() || null;
        setData('draft', interaction.user.id, draft);

        const row = new ActionRowBuilder().addComponents(
          createCustomButton('app_add_question', 'Add Question', ButtonStyle.Primary),
          createCustomButton('app_finish_setup', 'Finish Setup', ButtonStyle.Success)
        );

        return interaction.reply({ 
          content: `Great! Now add questions to the application form.\nCurrent question count: **${draft.data.questions.length}**`, 
          components: [row], 
          ephemeral: true 
        });
      }

      if (customId === 'app_add_question_modal') {
        const draft = getData('draft', interaction.user.id);
        const qText = interaction.fields.getTextInputValue('q_text');
        const qType = interaction.fields.getTextInputValue('q_type').toLowerCase().includes('long') ? 'long' : 'short';
        
        draft.data.questions.push({ text: qText, type: qType });
        setData('draft', interaction.user.id, draft);

        const row = new ActionRowBuilder().addComponents(
          createCustomButton('app_add_question', 'Add New Question', ButtonStyle.Primary),
          createCustomButton('app_finish_setup', 'Finish Setup', ButtonStyle.Success)
        );

        return interaction.reply({ 
          content: `Question successfully added! Total Questions: **${draft.data.questions.length}**\nChoose an option to continue.`, 
          components: [row], 
          ephemeral: true 
        });
      }

      if (customId.startsWith('app_submit_')) {
        await interaction.deferReply({ ephemeral: true });
        const appId = customId.replace('app_submit_', '');
        const app = getData('application', appId);
        if (!app) throw new Error('Application not found.');

        const logChannel = await interaction.guild.channels.fetch(app.logChannelId).catch(() => null);
        if (!logChannel) throw new Error('Log channel not found (May have been deleted).');

        const answers = app.questions.map((q, i) => {
          const answer = interaction.fields.getTextInputValue(`q${i}`).substring(0, 1000);
          return `**Question:** ${q.text}\n**Answer:** ${answer}`;
        }).join('\n\n');

        const embed = createStandardEmbed(`New Application: ${interaction.user.tag}`, answers, COLORS.WARNING);
        embed.setFooter({ text: `User ID: ${interaction.user.id}` });

        const row = new ActionRowBuilder().addComponents(
          createCustomButton(`app_accept_${interaction.user.id}`, 'Accept', ButtonStyle.Success),
          createCustomButton(`app_reject_${interaction.user.id}`, 'Reject', ButtonStyle.Danger)
        );

        await logChannel.send({ embeds: [embed], components: [row] });
        return interaction.editReply({ content: 'Your application has been successfully submitted! Our staff will contact you shortly.' });
      }

      // --- APPLICATION REJECT MODAL ---
      if (customId.startsWith('app_reject_modal_')) {
        await interaction.deferUpdate(); // Acknowledge immediately
        const userId = customId.replace('app_reject_modal_', '');
        const reason = interaction.fields.getTextInputValue('reason');
        
        // Remove buttons from the log message
        await interaction.message.edit({ components: [] });
        
        // Send DM to user
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            await user.send({ embeds: [createStandardEmbed('Application Rejected', `We regret to inform you that your application has been rejected.\n\n**Reason:** ${reason}`, COLORS.DANGER)] }).catch(() => null);
        }
        
        // Follow-up in the log channel
        await interaction.followUp({ content: `Application for <@${userId}> has been **Rejected**.`, ephemeral: true });
      }
    }

    // =====================================================================
    // 4. SELECT MENUS
    // =====================================================================
    if (interaction.isChannelSelectMenu()) {
      if (interaction.customId === 'app_setup_channel') {
        return handleApplicationChannelSelect(interaction);
      }
    }

  } catch (error) {
    console.error(`[ERROR] Interaction failed for ${interaction.user.tag}:`, error);
    const errorMsg = { content: `An error occurred: ${error.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMsg).catch(() => null);
    } else {
      await interaction.reply(errorMsg).catch(() => null);
    }
  }
});

// ==============================================================================
// SECTION 12: BOT STARTUP AND WEB SERVER (FOR RENDER)
// ==============================================================================

async function startBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.error('CRITICAL ERROR: DISCORD_TOKEN environment variable is missing!');
    process.exit(1);
  }

  client.once('ready', async () => {
    console.log(`=========================================`);
    console.log(`[BOT] Logged in as ${client.user.tag}`);
    console.log(`[BOT] Version: ${BOT_VERSION}`);
    console.log(`=========================================`);
    
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: BOT_COMMANDS }
      );
      console.log('[BOT] Slash commands successfully loaded.');
    } catch (error) {
      console.error('[BOT] Error loading commands:', error);
    }
  });

  // Render Health Check
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('LD GIVEAWAYS ENTERPRISE IS RUNNING');
  });
  
  server.listen(process.env.PORT || 10000, '0.0.0.0', () => {
    console.log(`[WEB] Web server is active on port ${process.env.PORT || 10000}.`);
  });

  await client.login(process.env.DISCORD_TOKEN);
}

startBot().catch(console.error);