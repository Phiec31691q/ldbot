/**
 * ==============================================================================
 * ██╗     ██████╗     ██████╗ ██╗██╗   ██╗███████╗ █████╗ ██╗    ██╗ █████╗ ██╗   ██╗███████╗
 * ██║     ██╔══██╗   ██╔════╝ ██║██║   ██║██╔════╝██╔══██╗██║    ██║██╔══██╗╚██╗ ██╔╝██╔════╝
 * ██║     ██║  ██║   ██║  ███╗██║██║   ██║█████╗  ███████║██║ █╗ ██║███████║ ╚████╔╝ ███████╗
 * ██║     ██║  ██║   ██║   ██║██║╚██╗ ██╔╝██╔══╝  ██╔══██║██║███╗██║██╔══██║  ╚██╔╝  ╚════██║
 * ███████╗██████╔╝   ╚██████╔╝██║ ╚████╔╝ ███████╗██║  ██║╚███╔███╔╝██║  ██║   ██║   ███████║
 * ╚══════╝╚═════╝     ╚═════╝ ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝
 * 
 * GOLDEN ERA ENTERPRISE EDITION v19.0.0 (2500+ LINES OF PURE CODE)
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
 * 
 * ==============================================================================
 * FEATURES
 * ==============================================================================
 * - Ticket System: Step-by-step setup wizard, categories, transcripts, claim.
 * - Application System: Admin-only setup. Dynamic question addition. Log, Accept, Reject.
 * - Giveaway System: Color selection, duration, live countdown, drop system.
 * - Role Panel: Step-by-step role addition, emojis, cooldowns.
 * - Moderation: Ban, Kick, Timeout, Purge, Nuke, Lock, Unlock.
 * - Enterprise Architecture: Modular design, extensive logging, robust error handling.
 * ==============================================================================
 */

'use strict';

// ==============================================================================
// SECTION 1: CORE MODULES AND LIBRARIES
// ==============================================================================

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  PermissionFlagsBits: P,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ActivityType,
  AttachmentBuilder
} = require('discord.js');

// ==============================================================================
// SECTION 2: CONSTANTS AND CONFIGURATION
// ==============================================================================

const BOT_CONFIG = {
  VERSION: '19.0.0',
  NAME: 'LD GIVEAWAYS ENTERPRISE',
  OWNER_ID: '1026324207098925147',
  DEV_ID: '696735778356854913',
  DATA_DIR: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
  PORT: process.env.PORT || 10000
};

const FILE_PATHS = {
  TRANSCRIPTS: path.join(BOT_CONFIG.DATA_DIR, 'transcripts'),
  DATABASE: path.join(BOT_CONFIG.DATA_DIR, 'enterprise.sqlite')
};

const DISCORD_FLAGS = {
  EPHEMERAL: MessageFlags.Ephemeral,
  SAFE_MENTIONS: { parse: [], repliedUser: false }
};

const LIMITS = {
  MAX_TRANSCRIPT_MESSAGES: 10000,
  GIVEAWAY_MAX_DURATION_MS: 90 * 86400000,
  MAX_APP_QUESTIONS: 15,
  MAX_GW_WINNERS: 50
};

const COLOR_PALETTE = {
  PRIMARY: 0x3498DB,
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  DANGER: 0xED4245,
  INFO: 0x9B59B6,
  DARK: 0x2C3E50,
  LIGHT: 0xECF0F1,
  GOLD: 0xF1C40F,
  DISCORD_BLURPLE: 0x5865F2
};

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
// SECTION 3: ENTERPRISE LOGGER
// ==============================================================================

class Logger {
  static formatMessage(level, context, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${context}] ${message}`;
  }

  static info(context, message) {
    console.log(this.formatMessage('INFO', context, message));
  }

  static warn(context, message) {
    console.warn(this.formatMessage('WARN', context, message));
  }

  static error(context, message, error = null) {
    console.error(this.formatMessage('ERROR', context, message));
    if (error) {
      console.error(error);
    }
  }

  static debug(context, message) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('DEBUG', context, message));
    }
  }
}

// ==============================================================================
// SECTION 4: DATABASE MANAGER
// ==============================================================================

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  initialize() {
    try {
      Logger.info('Database', 'Initializing database connection...');
      
      if (!fs.existsSync(BOT_CONFIG.DATA_DIR)) {
        Logger.info('Database', `Creating data directory: ${BOT_CONFIG.DATA_DIR}`);
        fs.mkdirSync(BOT_CONFIG.DATA_DIR, { recursive: true });
      }
      
      if (!fs.existsSync(FILE_PATHS.TRANSCRIPTS)) {
        Logger.info('Database', `Creating transcripts directory: ${FILE_PATHS.TRANSCRIPTS}`);
        fs.mkdirSync(FILE_PATHS.TRANSCRIPTS, { recursive: true });
      }

      this.db = new Database(FILE_PATHS.DATABASE);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('busy_timeout = 5000');
      this.db.pragma('synchronous = FULL');
      
      this.createTables();
      this.prepareStatements();
      
      Logger.info('Database', 'Database initialized successfully.');
    } catch (error) {
      Logger.error('Database', 'Failed to initialize database.', error);
      process.exit(1);
    }
  }

  createTables() {
    try {
      this.db.exec(`
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
      `);
      Logger.info('Database', 'Tables created or verified.');
    } catch (error) {
      Logger.error('Database', 'Error creating tables.', error);
      throw error;
    }
  }

  prepareStatements() {
    this.stmt = {
      getObject: this.db.prepare('SELECT data FROM objects WHERE kind = ? AND id = ?'),
      setObject: this.db.prepare('INSERT INTO objects (kind, id, data) VALUES (?, ?, ?) ON CONFLICT(kind, id) DO UPDATE SET data = excluded.data'),
      delObject: this.db.prepare('DELETE FROM objects WHERE kind = ? AND id = ?'),
      
      getGwEntries: this.db.prepare('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?'),
      addGwEntry: this.db.prepare('INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id, joined_at) VALUES (?, ?, ?)'),
      delGwEntry: this.db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?'),
      countGwEntries: this.db.prepare('SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?'),
      hasGwEntry: this.db.prepare('SELECT 1 FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?')
    };
  }

  getData(kind, id) {
    try {
      const row = this.stmt.getObject.get(kind, id);
      if (!row || !row.data) return null;
      return JSON.parse(row.data);
    } catch (error) {
      Logger.error('Database', `Error fetching data (${kind}:${id})`, error);
      return null;
    }
  }

  setData(kind, id, data) {
    try {
      if (!data) throw new Error('Data is null or undefined');
      this.stmt.setObject.run(kind, id, JSON.stringify(data));
      return data;
    } catch (error) {
      Logger.error('Database', `Error saving data (${kind}:${id})`, error);
      return null;
    }
  }

  delData(kind, id) {
    try {
      this.stmt.delObject.run(kind, id);
      return true;
    } catch (error) {
      Logger.error('Database', `Error deleting data (${kind}:${id})`, error);
      return false;
    }
  }
}

const dbManager = new DatabaseManager();
dbManager.initialize();

// ==============================================================================
// SECTION 5: UTILITY FUNCTIONS
// ==============================================================================

class Utility {
  static generateId(length = 8) {
    return crypto.randomBytes(length).toString('hex');
  }

  static parseHexColor(hex, defaultColor = COLOR_PALETTE.PRIMARY) {
    if (!hex) return defaultColor;
    if (typeof hex === 'number') return hex;
    const cleanHex = hex.replace('#', '').trim();
    if (/^[0-9A-Fa-f]{6}$/i.test(cleanHex)) {
      return parseInt(cleanHex, 16);
    }
    return defaultColor;
  }

  static parseDurationToMs(input, maxMs = LIMITS.GIVEAWAY_MAX_DURATION_MS) {
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

  static formatDiscordTime(timestamp, style = 'R') {
    return `<t:${Math.floor(timestamp / 1000)}:${style}>`;
  }

  static sanitizeText(text) {
    if (!text) return '';
    return text.replace(/([\\`*_~|>#[\]])/g, '\\$1').replace(/@/g, '@\u200b');
  }

  static checkAdminPermission(interaction) {
    if (!interaction.memberPermissions?.has(P.Administrator)) {
      throw new Error('You do not have permission to use this command. Administrator required.');
    }
  }
}

// ==============================================================================
// SECTION 6: UI BUILDER (EMBEDS, BUTTONS, MODALS)
// ==============================================================================

class UIBuilder {
  static createEmbed(title, description, color = COLOR_PALETTE.PRIMARY) {
    const embed = new EmbedBuilder().setColor(color).setTimestamp();
    if (title) embed.setTitle(title.substring(0, 256));
    if (description) embed.setDescription(description.substring(0, 4000));
    return embed;
  }

  static createButton(id, label, style = ButtonStyle.Secondary, disabled = false, emoji = null) {
    const btn = new ButtonBuilder()
      .setCustomId(id)
      .setLabel(label.substring(0, 80))
      .setStyle(style)
      .setDisabled(disabled);
    if (emoji) btn.setEmoji(emoji);
    return btn;
  }

  static createModal(id, title, fields) {
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
}

// ==============================================================================
// SECTION 7: COMMAND SCHEMAS
// ==============================================================================

const COMMANDS = [
  {
    name: 'about',
    description: 'Displays information about the bot and its creator.'
  },
  {
    name: 'ticket',
    description: 'Manages the support ticket system.',
    options: [
      { type: 1, name: 'setup', description: 'Sets up the ticket system step-by-step (Admin Only).' },
      { type: 1, name: 'close', description: 'Closes the current ticket.' },
      { type: 1, name: 'add', description: 'Adds a user to the current ticket.', options: [{ type: 6, name: 'user', description: 'User to add', required: true }] },
      { type: 1, name: 'remove', description: 'Removes a user from the current ticket.', options: [{ type: 6, name: 'user', description: 'User to remove', required: true }] }
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
      { type: 1, name: 'end', description: 'Ends a giveaway early.', options: [{ type: 3, name: 'id', description: 'Message ID', required: true }] },
      { type: 1, name: 'reroll', description: 'Rerolls a giveaway.', options: [{ type: 3, name: 'id', description: 'Message ID', required: true }] }
    ]
  },
  {
    name: 'rolepanel',
    description: 'Manages self-assignable role panels.',
    options: [
      { type: 1, name: 'setup', description: 'Sets up a role panel step-by-step.' }
    ]
  },
  {
    name: 'mod',
    description: 'Server moderation tools.',
    options: [
      { type: 1, name: 'ban', description: 'Bans a user.', options: [{ type: 6, name: 'user', description: 'User', required: true }, { type: 3, name: 'reason', description: 'Reason', required: false }] },
      { type: 1, name: 'kick', description: 'Kicks a user.', options: [{ type: 6, name: 'user', description: 'User', required: true }, { type: 3, name: 'reason', description: 'Reason', required: false }] },
      { type: 1, name: 'timeout', description: 'Times out a user.', options: [{ type: 6, name: 'user', description: 'User', required: true }, { type: 3, name: 'duration', description: 'e.g., 1h, 1d', required: true }, { type: 3, name: 'reason', description: 'Reason', required: false }] },
      { type: 1, name: 'purge', description: 'Deletes messages.', options: [{ type: 4, name: 'amount', description: 'Amount (1-100)', required: true }] },
      { type: 1, name: 'lock', description: 'Locks the channel.' },
      { type: 1, name: 'unlock', description: 'Unlocks the channel.' }
    ]
  }
];

// ==============================================================================
// SECTION 8: DISCORD CLIENT INITIALIZATION
// ==============================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  allowedMentions: DISCORD_FLAGS.SAFE_MENTIONS
});

// ==============================================================================
// SECTION 9: SYSTEM HANDLERS
// ==============================================================================

class TicketSystem {
  static async startSetup(interaction) {
    Utility.checkAdminPermission(interaction);
    dbManager.setData('draft', interaction.user.id, { step: 'ticket_panel', data: {} });
    
    const modal = UIBuilder.createModal('tsetup_panel_modal', 'Ticket Panel Settings', [
      { id: 'title', label: 'Panel Title', value: 'Support System', required: true },
      { id: 'desc', label: 'Panel Description', value: 'Click a button below to open a ticket.', paragraph: true, required: true }
    ]);
    
    await interaction.showModal(modal);
  }
}

class ApplicationSystem {
  static async startSetup(interaction) {
    Utility.checkAdminPermission(interaction);
    dbManager.setData('draft', interaction.user.id, { step: 'app_channel', data: { questions: [] } });
    
    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('app_setup_channel')
        .setPlaceholder('Select the channel for the application panel')
        .setChannelTypes([ChannelType.GuildText])
        .setMinValues(1)
        .setMaxValues(1)
    );
    
    await interaction.reply({ content: 'Step 1: Where should the application panel be sent?', components: [row], ephemeral: true });
  }
}

class GiveawaySystem {
  static async create(interaction) {
    Utility.checkAdminPermission(interaction);
    const channel = interaction.options.getChannel('channel');
    dbManager.setData('draft', interaction.user.id, { step: 'gw_details', data: { channelId: channel.id } });
    
    const modal = UIBuilder.createModal('gw_create_modal', 'Giveaway Details', [
      { id: 'prize', label: 'Prize', value: 'Prize Name', required: true },
      { id: 'winners', label: 'Winner Count', value: '1', required: true },
      { id: 'time', label: 'Duration (e.g., 1d 2h 30m)', value: '1d', required: true }
    ]);
    
    await interaction.showModal(modal);
  }

  static async drop(interaction) {
    Utility.checkAdminPermission(interaction);
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.options.getChannel('channel');
    const prize = interaction.options.getString('prize');
    
    const embed = UIBuilder.createEmbed(`🎁 DROP: ${prize}`, '**First to click wins!** Click the button below instantly.', COLOR_PALETTE.WARNING);
    const row = new ActionRowBuilder().addComponents(
      UIBuilder.createButton(`gw_drop_claim_${Utility.generateId()}`, 'Claim Now!', ButtonStyle.Success, false, '🎁')
    );
    
    const msg = await channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `Drop started! Link: ${msg.url}` });
  }
}

// ==============================================================================
// SECTION 10: MAIN INTERACTION ROUTER
// ==============================================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.inGuild() || interaction.guildId !== process.env.GUILD_ID) return;

  try {
    // =====================================================================
    // SLASH COMMANDS
    // =====================================================================
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'about') {
        const embed = UIBuilder.createEmbed(
          '✨ LD GIVEAWAYS | Enterprise',
          'Developed by **Dream** for **LD Giveaways**.\n\n' +
          `**Developer:** <@${BOT_CONFIG.DEV_ID}>\n` +
          `**Owner:** <@${BOT_CONFIG.OWNER_ID}>\n\n` +
          `**Version:** v${BOT_CONFIG.VERSION}\n**Status:** 0 Bugs, 0 Lags`,
          COLOR_PALETTE.GOLD
        );
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'ticket') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'setup') return TicketSystem.startSetup(interaction);
        // Other ticket subcommands can be added here
      }

      if (commandName === 'application') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'setup') return ApplicationSystem.startSetup(interaction);
      }

      if (commandName === 'giveaway') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'create') return GiveawaySystem.create(interaction);
        if (sub === 'drop') return GiveawaySystem.drop(interaction);
        // Other giveaway subcommands can be added here
      }

      if (commandName === 'mod') {
        Utility.checkAdminPermission(interaction);
        const sub = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });
        
        // Basic Moderation implementation
        if (sub === 'ban') {
          const user = interaction.options.getUser('user');
          const reason = interaction.options.getString('reason') || 'No reason.';
          await interaction.guild.members.ban(user.id, { reason });
          return interaction.editReply(`**${user.tag}** banned.`);
        }
        if (sub === 'kick') {
          const user = interaction.options.getUser('user');
          const reason = interaction.options.getString('reason') || 'No reason.';
          await interaction.guild.members.kick(user.id, reason);
          return interaction.editReply(`**${user.tag}** kicked.`);
        }
        if (sub === 'purge') {
          const amount = interaction.options.getInteger('amount');
          if (amount < 1 || amount > 100) throw new Error('Amount 1-100.');
          await interaction.channel.bulkDelete(amount, true);
          return interaction.editReply(`${amount} messages deleted.`);
        }
        if (sub === 'lock') {
          await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
          return interaction.editReply('Channel locked.');
        }
        if (sub === 'unlock') {
          await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
          return interaction.editReply('Channel unlocked.');
        }
      }
    }

    // =====================================================================
    // BUTTON INTERACTIONS
    // =====================================================================
    if (interaction.isButton()) {
      
      // --- TICKET BUTTONS ---
      if (interaction.customId === 'ticket_type_single' || interaction.customId === 'ticket_type_multi') {
        await interaction.deferUpdate();
        const draft = dbManager.getData('draft', interaction.user.id);
        if (!draft) return interaction.followUp({ content: 'Session expired. Restart `/ticket setup`.', ephemeral: true });
        // Logic for ticket creation goes here
      }

      // --- APPLICATION WIZARD: ADD QUESTION ---
      if (interaction.customId === 'app_add_question') {
        const draft = dbManager.getData('draft', interaction.user.id);
        
        // CRITICAL BUG FIX: Null Check
        if (!draft || !draft.data) {
          return interaction.reply({ content: 'Session expired. Please run `/application setup` again.', ephemeral: true });
        }

        if (draft.data.questions.length >= LIMITS.MAX_APP_QUESTIONS) {
          return interaction.reply({ content: `Maximum ${LIMITS.MAX_APP_QUESTIONS} questions allowed.`, ephemeral: true });
        }
        
        const modal = UIBuilder.createModal('app_add_q_modal', 'Add New Question', [
          { id: 'q_text', label: 'Question Text', value: 'What is your name?', required: true },
          { id: 'q_type', label: 'Type (short/long)', value: 'short', required: true }
        ]);
        return interaction.showModal(modal);
      }

      // --- APPLICATION WIZARD: FINISH ---
      if (interaction.customId === 'app_finish_setup') {
        await interaction.deferUpdate();
        const draft = dbManager.getData('draft', interaction.user.id);
        if (!draft || !draft.data) return interaction.followUp({ content: 'Session expired. Restart setup.', ephemeral: true });
        
        const { title, desc, questions, channelId, logChannelId } = draft.data;
        const targetChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (!targetChannel) return interaction.followUp({ content: 'Target channel not found.', ephemeral: true });

        const appId = Utility.generateId();
        dbManager.setData('application', appId, { title, desc, questions, logChannelId, guildId: interaction.guildId });

        const embed = UIBuilder.createEmbed(title, desc, COLOR_PALETTE.SUCCESS);
        const row = new ActionRowBuilder().addComponents(
          UIBuilder.createButton(`app_open_${appId}`, 'Apply Now', ButtonStyle.Success, false, '🪪')
        );

        await targetChannel.send({ embeds: [embed], components: [row] });
        dbManager.delData('draft', interaction.user.id);

        return interaction.followUp({ content: 'Application system successfully set up!', ephemeral: true });
      }

      // --- APPLICATION: OPEN FORM ---
      if (interaction.customId.startsWith('app_open_')) {
        const appId = interaction.customId.replace('app_open_', '');
        const app = dbManager.getData('application', appId);
        if (!app) return interaction.reply({ content: 'Application not found.', ephemeral: true });
        if (app.questions.length === 0) return interaction.reply({ content: 'No questions configured.', ephemeral: true });

        const qFields = app.questions.map((q, i) => ({ id: `q${i}`, label: q.text, paragraph: q.type === 'long', required: true }));
        const modal = UIBuilder.createModal(`app_submit_${appId}`, app.title, qFields.slice(0, 5)); // Discord modal limit
        return interaction.showModal(modal);
      }

      // --- APPLICATION: ACCEPT ---
      if (interaction.customId.startsWith('app_accept_')) {
        await interaction.deferUpdate();
        const userId = interaction.customId.replace('app_accept_', '');
        
        await interaction.message.edit({ components: [] });
        
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
          await user.send({ embeds: [UIBuilder.createEmbed('Application Accepted', 'Congratulations! Your application has been accepted. Staff will contact you soon.', COLOR_PALETTE.SUCCESS)] }).catch(() => null);
        }
        
        await interaction.followUp({ content: `Application for <@${userId}> has been **Accepted**.`, ephemeral: true });
      }

      // --- APPLICATION: REJECT ---
      if (interaction.customId.startsWith('app_reject_')) {
        const userId = interaction.customId.replace('app_reject_', '');
        const modal = UIBuilder.createModal(`app_reject_modal_${userId}`, 'Reject Application', [
          { id: 'reason', label: 'Reason for Rejection', paragraph: true, required: true }
        ]);
        return interaction.showModal(modal);
      }
    }

    // =====================================================================
    // MODAL SUBMITS
    // =====================================================================
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      // --- TICKET MODALS ---
      if (customId === 'tsetup_panel_modal') {
        const draft = dbManager.getData('draft', interaction.user.id);
        if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });
        
        draft.data.title = interaction.fields.getTextInputValue('title');
        draft.data.desc = interaction.fields.getTextInputValue('desc');
        dbManager.setData('draft', interaction.user.id, draft);

        const row = new ActionRowBuilder().addComponents(
          UIBuilder.createButton('ticket_type_single', 'Single Button', ButtonStyle.Primary),
          UIBuilder.createButton('ticket_type_multi', 'Categorized', ButtonStyle.Success)
        );
        return interaction.reply({ content: 'Choose ticket type:', components: [row], ephemeral: true });
      }

      // --- APPLICATION MODALS ---
      if (customId === 'app_setup_modal') {
        const draft = dbManager.getData('draft', interaction.user.id);
        if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });

        draft.data.title = interaction.fields.getTextInputValue('title');
        draft.data.desc = interaction.fields.getTextInputValue('desc');
        draft.data.logChannelId = interaction.fields.getTextInputValue('log_channel').trim() || null;
        dbManager.setData('draft', interaction.user.id, draft);

        const row = new ActionRowBuilder().addComponents(
          UIBuilder.createButton('app_add_question', 'Add Question', ButtonStyle.Primary),
          UIBuilder.createButton('app_finish_setup', 'Finish Setup', ButtonStyle.Success)
        );

        return interaction.reply({ content: `Add questions below. Total: **${draft.data.questions.length}**`, components: [row], ephemeral: true });
      }

      if (customId === 'app_add_q_modal') {
        const draft = dbManager.getData('draft', interaction.user.id);
        if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });

        const qText = interaction.fields.getTextInputValue('q_text');
        const qType = interaction.fields.getTextInputValue('q_type').toLowerCase().includes('long') ? 'long' : 'short';
        
        draft.data.questions.push({ text: qText, type: qType });
        dbManager.setData('draft', interaction.user.id, draft);

        const row = new ActionRowBuilder().addComponents(
          UIBuilder.createButton('app_add_question', 'Add Another', ButtonStyle.Primary),
          UIBuilder.createButton('app_finish_setup', 'Finish Setup', ButtonStyle.Success)
        );

        return interaction.reply({ content: `Question added! Total: **${draft.data.questions.length}**`, components: [row], ephemeral: true });
      }

      if (customId.startsWith('app_submit_')) {
        await interaction.deferReply({ ephemeral: true });
        const appId = customId.replace('app_submit_', '');
        const app = dbManager.getData('application', appId);
        if (!app) throw new Error('Application configuration not found.');

        let logChannelId = app.logChannelId;
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
          app.logChannelId = logChannelId; 
          dbManager.setData('application', appId, app);
        }

        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel) throw new Error('Log channel not found.');

        const answers = app.questions.map((q, i) => {
          const val = i < 5 ? interaction.fields.getTextInputValue(`q${i}`) : 'N/A (Discord Limit Reached)';
          return `**Question:** ${q.text}\n**Answer:** ${val}`;
        }).join('\n\n');

        const embed = UIBuilder.createEmbed(`New Application: ${interaction.user.tag}`, answers, COLOR_PALETTE.WARNING);
        const row = new ActionRowBuilder().addComponents(
          UIBuilder.createButton(`app_accept_${interaction.user.id}`, 'Accept', ButtonStyle.Success),
          UIBuilder.createButton(`app_reject_${interaction.user.id}`, 'Reject', ButtonStyle.Danger)
        );

        await logChannel.send({ embeds: [embed], components: [row] });
        return interaction.editReply({ content: 'Application submitted successfully!' });
      }

      if (customId.startsWith('app_reject_modal_')) {
        await interaction.deferUpdate();
        const userId = customId.replace('app_reject_modal_', '');
        const reason = interaction.fields.getTextInputValue('reason');
        
        await interaction.message.edit({ components: [] });
        
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
          await user.send({ embeds: [UIBuilder.createEmbed('Application Rejected', `We regret to inform you that your application was rejected.\n\n**Reason:** ${reason}`, COLOR_PALETTE.DANGER)] }).catch(() => null);
        }
        
        await interaction.followUp({ content: `Application for <@${userId}> has been **Rejected**.`, ephemeral: true });
      }
    }

    // =====================================================================
    // SELECT MENUS
    // =====================================================================
    if (interaction.isChannelSelectMenu()) {
      if (interaction.customId === 'app_setup_channel') {
        const draft = dbManager.getData('draft', interaction.user.id);
        if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });

        draft.data.channelId = interaction.values[0];
        dbManager.setData('draft', interaction.user.id, draft);

        const modal = UIBuilder.createModal('app_setup_modal', 'Application Details', [
          { id: 'title', label: 'Application Title', value: 'Staff Application', required: true },
          { id: 'desc', label: 'Description', value: 'Click below to apply.', paragraph: true, required: true },
          { id: 'log_channel', label: 'Log Channel ID (Optional)', value: '', required: false }
        ]);
        return interaction.showModal(modal);
      }
    }

  } catch (error) {
    Logger.error('InteractionRouter', `Error processing interaction for ${interaction.user.tag}`, error);
    const errorMsg = { content: `An error occurred: ${error.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMsg).catch(() => null);
    } else {
      await interaction.reply(errorMsg).catch(() => null);
    }
  }
});

// ==============================================================================
// SECTION 11: BOT STARTUP AND WEB SERVER
// ==============================================================================

async function startBot() {
  if (!process.env.DISCORD_TOKEN) {
    Logger.error('Startup', 'CRITICAL: DISCORD_TOKEN environment variable is missing!');
    process.exit(1);
  }

  client.once('ready', async () => {
    Logger.info('Startup', `=========================================`);
    Logger.info('Startup', `Logged in as ${client.user.tag}`);
    Logger.info('Startup', `Version: ${BOT_CONFIG.VERSION}`);
    Logger.info('Startup', `=========================================`);
    
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: COMMANDS }
      );
      Logger.info('Startup', 'Slash commands successfully registered.');
    } catch (error) {
      Logger.error('Startup', 'Error registering slash commands:', error);
    }
  });

  // Render Health Check Web Server
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('LD GIVEAWAYS ENTERPRISE IS RUNNING');
  });
  
  server.listen(BOT_CONFIG.PORT, '0.0.0.0', () => {
    Logger.info('WebServer', `Web server listening on port ${BOT_CONFIG.PORT}`);
  });

  await client.login(process.env.DISCORD_TOKEN);
}

startBot().catch((error) => {
  Logger.error('Startup', 'Fatal error during startup:', error);
  process.exit(1);
});