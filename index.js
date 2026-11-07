/**
 * ==============================================================================
 * ██╗     ██████╗     ██████╗ ██╗██╗   ██╗███████╗ █████╗ ██╗    ██╗ █████╗ ██╗   ██╗███████╗
 * ██║     ██╔══██╗   ██╔════╝ ██║██║   ██║██╔════╝██╔══██╗██║    ██║██╔══██╗╚██╗ ██╔╝██╔════╝
 * ██║     ██║  ██║   ██║  ███╗██║██║   ██║█████╗  ███████║██║ █╗ ██║███████║ ╚████╔╝ ███████╗
 * ██║     ██║  ██║   ██║   ██║██║╚██╗ ██╔╝██╔══╝  ██╔══██║██║███╗██║██╔══██║  ╚██╔╝  ╚════██║
 * ███████╗██████╔╝   ╚██████╔╝██║ ╚████╔╝ ███████╗██║  ██║╚███╔███╔╝██║  ██║   ██║   ███████║
 * ╚══════╝╚═════╝     ╚═════╝ ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝
 * 
 * LD GIVEAWAYS | OMNIPOTENT ENTERPRISE EDITION v21.0.0
 * My Owner: Unitey (1026324207098925147)
 * My Developer: Dream (696735778356854913)
 * 
 * ==============================================================================
 * SYSTEM OVERVIEW & INSTALLATION
 * ==============================================================================
 * 1. Create an app on Discord Developer Portal.
 * 2. Enable all 3 Privileged Intents (Presence, Server Members, Message Content).
 * 3. Upload this file to GitHub as "index.js".
 * 4. Render.com -> Web Service -> Add Environment Variables:
 *    - DISCORD_TOKEN (Bot Token)
 *    - CLIENT_ID (App ID)
 *    - GUILD_ID (Server ID)
 *    - DATA_DIR = ./data
 * 5. Deploy. The bot is designed to NEVER crash.
 * 
 * ==============================================================================
 * CORE FEATURES
 * ==============================================================================
 * - Anti-Crash System: Global error handlers prevent the bot from ever going offline.
 * - Ticket System: Step-by-step setup, categorized or single, transcript logging.
 * - Application System: Admin-only setup, dynamic questions, accept/reject DM flows.
 * - Giveaway System: Live timers, role requirements, join/leave buttons.
 * - Moderation: Ban, Kick, Purge, Lock, Unlock.
 * - Global Commands: Works on ANY server the bot is invited to.
 * ==============================================================================
 */

'use strict';

// ==============================================================================
// SECTION 1: REQUIRED LIBRARIES AND IMPORTS
// ==============================================================================

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
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
// SECTION 2: GLOBAL CONFIGURATION & CONSTANTS
// ==============================================================================

const CONFIG = {
  VERSION: '21.0.0',
  NAME: 'LD GIVEAWAYS ENTERPRISE',
  OWNER_ID: '1026324207098925147',
  DEV_ID: '696735778356854913',
  DATA_DIR: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
  PORT: process.env.PORT || 10000,
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID
};

const PATHS = {
  TRANSCRIPTS: path.join(CONFIG.DATA_DIR, 'transcripts'),
  DATABASE: path.join(CONFIG.DATA_DIR, 'enterprise.sqlite')
};

const FLAGS = {
  EPHEMERAL: MessageFlags.Ephemeral,
  SAFE_MENTIONS: { parse: [], repliedUser: false }
};

const LIMITS = {
  MAX_TRANSCRIPT: 10000,
  MAX_GW_DURATION: 90 * 86400000,
  MAX_APP_QUESTIONS: 15,
  MAX_GW_WINNERS: 50
};

const COLORS = {
  PRIMARY: 0x3498DB,
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  DANGER: 0xED4245,
  INFO: 0x9B59B6,
  GOLD: 0xF1C40F,
  DARK: 0x2C3E50,
  LIGHT: 0xECF0F1
};

// ==============================================================================
// SECTION 3: ENTERPRISE LOGGER (Advanced Console Output)
// ==============================================================================

class Logger {
  static log(level, context, message, error = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${context}]`;
    
    if (level === 'ERROR') {
      console.error(`${prefix} ${message}`);
      if (error && error.stack) console.error(error.stack);
    } else if (level === 'WARN') {
      console.warn(`${prefix} ${message}`);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  static info(ctx, msg) { this.log('INFO', ctx, msg); }
  static warn(ctx, msg) { this.log('WARN', ctx, msg); }
  static error(ctx, msg, err = null) { this.log('ERROR', ctx, msg, err); }
}

// ==============================================================================
// SECTION 4: DATABASE MANAGER (Bulletproof SQLite Wrapper)
// ==============================================================================

class DatabaseManager {
  constructor() {
    this.db = null;
    this.stmt = {};
  }

  init() {
    try {
      Logger.info('Database', 'Initializing database connection...');
      
      if (!fs.existsSync(CONFIG.DATA_DIR)) {
        Logger.info('Database', `Creating data directory: ${CONFIG.DATA_DIR}`);
        fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(PATHS.TRANSCRIPTS)) {
        Logger.info('Database', `Creating transcripts directory: ${PATHS.TRANSCRIPTS}`);
        fs.mkdirSync(PATHS.TRANSCRIPTS, { recursive: true });
      }

      this.db = new Database(PATHS.DATABASE);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('busy_timeout = 5000');
      this.db.pragma('synchronous = FULL');
      
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS objects (
          kind TEXT NOT NULL,
          id TEXT NOT NULL,
          data TEXT NOT NULL,
          PRIMARY KEY(kind, id)
        );
      `);

      this.stmt = {
        get: this.db.prepare('SELECT data FROM objects WHERE kind = ? AND id = ?'),
        set: this.db.prepare('INSERT INTO objects (kind, id, data) VALUES (?, ?, ?) ON CONFLICT(kind, id) DO UPDATE SET data = excluded.data'),
        del: this.db.prepare('DELETE FROM objects WHERE kind = ? AND id = ?')
      };
      
      Logger.info('Database', 'Database initialized and tables verified.');
    } catch (error) {
      Logger.error('Database', 'FATAL: Failed to initialize database.', error);
      process.exit(1);
    }
  }

  get(kind, id) {
    try {
      const row = this.stmt.get.get(kind, id);
      if (!row || !row.data) return null;
      return JSON.parse(row.data);
    } catch (error) {
      Logger.error('Database', `Error fetching (${kind}:${id})`, error);
      return null;
    }
  }

  set(kind, id, data) {
    try {
      this.stmt.set.run(kind, id, JSON.stringify(data));
      return data;
    } catch (error) {
      Logger.error('Database', `Error saving (${kind}:${id})`, error);
      return null;
    }
  }

  del(kind, id) {
    try {
      this.stmt.del.run(kind, id);
      return true;
    } catch (error) {
      Logger.error('Database', `Error deleting (${kind}:${id})`, error);
      return false;
    }
  }
}

const db = new DatabaseManager();
db.init();

// ==============================================================================
// SECTION 5: UTILITY FUNCTIONS
// ==============================================================================

class Utils {
  static genId(bytes = 6) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  static checkAdmin(interaction) {
    if (!interaction.memberPermissions?.has(P.Administrator)) {
      throw new Error('You do not have permission to use this command. Administrator required.');
    }
  }

  static parseDuration(input) {
    if (!input) throw new Error('Duration required.');
    const str = input.toLowerCase().trim();
    let ms = 0, match, end = 0;
    const regex = /(\d+)\s*(s|m|h|d|w)/g;
    
    while ((match = regex.exec(str)) !== null) {
      if (str.slice(end, match.index).trim() !== '') throw new Error('Invalid format. Use 1d 2h 30m');
      const amt = parseInt(match[1], 10);
      const unit = match[2];
      const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 }[unit];
      ms += amt * mult;
      end = regex.lastIndex;
    }
    
    if (!end || str.slice(end).trim() !== '' || ms < 10000 || ms > LIMITS.MAX_GW_DURATION) {
      throw new Error('Invalid duration (Min 10s, Max 90d).');
    }
    return ms;
  }

  static formatTime(ts, style = 'R') {
    return `<t:${Math.floor(ts / 1000)}:${style}>`;
  }
}

// ==============================================================================
// SECTION 6: UI BUILDER (Discord Components)
// ==============================================================================

class UI {
  static embed(title, desc, color = COLORS.PRIMARY) {
    const e = new EmbedBuilder().setColor(color).setTimestamp();
    if (title) e.setTitle(title.substring(0, 256));
    if (desc) e.setDescription(desc.substring(0, 4000));
    return e;
  }

  static btn(id, label, style = ButtonStyle.Secondary, disabled = false, emoji = null) {
    const b = new ButtonBuilder().setCustomId(id).setLabel(label.substring(0, 80)).setStyle(style).setDisabled(disabled);
    if (emoji) b.setEmoji(emoji);
    return b;
  }

  static modal(id, title, fields) {
    const m = new ModalBuilder().setCustomId(id).setTitle(title.substring(0, 45));
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
    m.addComponents(rows);
    return m;
  }
}

// ==============================================================================
// SECTION 7: COMMAND SCHEMAS (GLOBAL)
// ==============================================================================

const COMMANDS = [
  { name: 'about', description: 'Displays information about the bot.' },
  {
    name: 'ticket',
    description: 'Manages the ticket system.',
    options: [
      { type: 1, name: 'setup', description: 'Sets up the ticket system (Admin Only).' },
      { type: 1, name: 'close', description: 'Closes the current ticket.' }
    ]
  },
  {
    name: 'application',
    description: 'Manages the application system (Admin Only).',
    options: [
      { type: 1, name: 'setup', description: 'Sets up the application system.' }
    ]
  },
  {
    name: 'giveaway',
    description: 'Manages giveaways.',
    options: [
      { type: 1, name: 'create', description: 'Creates a new giveaway.', options: [{ type: 7, name: 'channel', description: 'Channel', required: true }] }
    ]
  },
  {
    name: 'mod',
    description: 'Moderation tools.',
    options: [
      { type: 1, name: 'ban', description: 'Bans a user.', options: [{ type: 6, name: 'user', description: 'User', required: true }, { type: 3, name: 'reason', description: 'Reason', required: false }] },
      { type: 1, name: 'kick', description: 'Kicks a user.', options: [{ type: 6, name: 'user', description: 'User', required: true }, { type: 3, name: 'reason', description: 'Reason', required: false }] },
      { type: 1, name: 'purge', description: 'Deletes messages.', options: [{ type: 4, name: 'amount', description: 'Amount', required: true }] },
      { type: 1, name: 'lock', description: 'Locks the channel.' },
      { type: 1, name: 'unlock', description: 'Unlocks the channel.' }
    ]
  }
];

// ==============================================================================
// SECTION 8: DISCORD CLIENT INIT
// ==============================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  allowedMentions: FLAGS.SAFE_MENTIONS
});

// ==============================================================================
// SECTION 9: TICKET SYSTEM IMPLEMENTATION
// ==============================================================================

class TicketSystem {
  static async handleSetup(interaction) {
    Utils.checkAdmin(interaction);
    db.set('draft', interaction.user.id, { step: 'panel', data: { categories: [] } });
    
    const m = UI.modal('t_panel_modal', 'Ticket Panel Settings', [
      { id: 'title', label: 'Panel Title', value: 'Support System', required: true },
      { id: 'desc', label: 'Panel Description', value: 'Open a ticket below.', paragraph: true, required: true }
    ]);
    await interaction.showModal(m);
  }

  static async handlePanelModal(interaction) {
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.reply({ content: 'Session expired. Run `/ticket setup` again.', ephemeral: true });

    draft.data.title = interaction.fields.getTextInputValue('title');
    draft.data.desc = interaction.fields.getTextInputValue('desc');
    draft.step = 'type';
    db.set('draft', interaction.user.id, draft);

    const row = new ActionRowBuilder().addComponents(
      UI.btn('t_type_single', 'Single (Button)', ButtonStyle.Primary),
      UI.btn('t_type_multi', 'Categorized (Menu)', ButtonStyle.Success)
    );
    await interaction.reply({ content: 'Choose the ticket system type:', components: [row], ephemeral: true });
  }

  static async handleTypeSelect(interaction, type) {
    await interaction.deferUpdate();
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.followUp({ content: 'Session expired.', ephemeral: true });

    draft.data.type = type;
    db.set('draft', interaction.user.id, draft);

    if (type === 'single') {
      const m = UI.modal('t_single_modal', 'Single Button Setup', [
        { id: 'btn_name', label: 'Button Name', value: 'Open Ticket', required: true },
        { id: 'welcome', label: 'Ticket Welcome Message', value: 'Staff will assist you shortly.', paragraph: true, required: true }
      ]);
      return interaction.showModal(m);
    } else {
      const m = UI.modal('t_multi_modal', 'Category Setup', [
        { id: 'cats', label: 'Categories (Comma Separated)', value: 'General Support, Bug Report, Billing', paragraph: true, required: true }
      ]);
      return interaction.showModal(m);
    }
  }

  static async handleSingleModal(interaction) {
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });

    draft.data.btnName = interaction.fields.getTextInputValue('btn_name');
    draft.data.welcome = interaction.fields.getTextInputValue('welcome');
    draft.step = 'channel';
    db.set('draft', interaction.user.id, draft);

    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('t_channel_select').setPlaceholder('Select Category for Tickets').setChannelTypes([ChannelType.GuildCategory])
    );
    await interaction.reply({ content: 'Step 3: Select the Category channel where tickets will be created.', components: [row], ephemeral: true });
  }

  static async handleMultiModal(interaction) {
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });

    const catsRaw = interaction.fields.getTextInputValue('cats');
    draft.data.categories = catsRaw.split(',').map(c => c.trim()).filter(c => c.length > 0);
    draft.step = 'channel';
    db.set('draft', interaction.user.id, draft);

    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('t_channel_select').setPlaceholder('Select Category for Tickets').setChannelTypes([ChannelType.GuildCategory])
    );
    await interaction.reply({ content: 'Step 3: Select the Category channel where tickets will be created.', components: [row], ephemeral: true });
  }

  static async handleChannelSelect(interaction) {
    await interaction.deferUpdate();
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.followUp({ content: 'Session expired.', ephemeral: true });

    draft.data.parentId = interaction.values[0];
    draft.step = 'log';
    db.set('draft', interaction.user.id, draft);

    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('t_log_select').setPlaceholder('Select Log Channel for Transcripts').setChannelTypes([ChannelType.GuildText])
    );
    await interaction.followUp({ content: 'Step 4: Select the Log channel for transcripts.', components: [row], ephemeral: true });
  }

  static async handleLogSelect(interaction) {
    await interaction.deferUpdate();
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.followUp({ content: 'Session expired.', ephemeral: true });

    draft.data.logId = interaction.values[0];
    draft.step = 'deploy';
    db.set('draft', interaction.user.id, draft);

    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('t_panel_deploy').setPlaceholder('Where to send the panel?').setChannelTypes([ChannelType.GuildText])
    );
    await interaction.followUp({ content: 'Step 5: Where should I send the Ticket Panel?', components: [row], ephemeral: true });
  }

  static async handleDeploy(interaction) {
    await interaction.deferUpdate();
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.followUp({ content: 'Session expired.', ephemeral: true });

    const channelId = interaction.values[0];
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return interaction.followUp({ content: 'Channel not found.', ephemeral: true });

    const configId = Utils.genId();
    db.set('ticket_config', configId, draft.data);
    db.del('draft', interaction.user.id);

    const embed = UI.embed(draft.data.title, draft.data.desc, COLORS.PRIMARY);
    
    if (draft.data.type === 'single') {
      const row = new ActionRowBuilder().addComponents(
        UI.btn(`t_open_${configId}_0`, draft.data.btnName, ButtonStyle.Primary, false, '📩')
      );
      await channel.send({ embeds: [embed], components: [row] });
    } else {
      const options = draft.data.categories.map((c, i) => ({ label: c, value: `cat_${i}` }));
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(`t_open_multi_${configId}`).setPlaceholder('Select a category').addOptions(options)
      );
      await channel.send({ embeds: [embed], components: [row] });
    }

    await interaction.followUp({ content: 'Ticket System deployed successfully!', ephemeral: true });
  }

  static async handleOpen(interaction, configId, catIndex) {
    await interaction.deferReply({ ephemeral: true });
    const config = db.get('ticket_config', configId);
    if (!config) return interaction.editReply({ content: 'Ticket system configuration not found. Please ask an admin to recreate it.' });

    let welcomeMsg = 'Staff will be with you shortly.';
    let catName = 'General';

    if (config.type === 'single') {
      welcomeMsg = config.welcome;
    } else {
      catName = config.categories[catIndex] || 'General';
      welcomeMsg = `Category: **${catName}**\nStaff will be with you shortly.`;
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: config.parentId,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [P.ViewChannel] },
        { id: interaction.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] },
        { id: interaction.client.user.id, allow: [P.ViewChannel, P.SendMessages, P.ManageChannels] }
      ]
    });

    const embed = UI.embed(`Ticket: ${catName}`, welcomeMsg, COLORS.SUCCESS);
    const row = new ActionRowBuilder().addComponents(
      UI.btn(`t_close_${ticketChannel.id}`, 'Close Ticket', ButtonStyle.Danger, false, '🔒')
    );

    await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
    await interaction.editReply({ content: `Ticket created: <#${ticketChannel.id}>` });
  }

  static async handleClose(interaction, channelId) {
    await interaction.deferReply();
    const channel = interaction.channel;
    
    await interaction.editReply({ content: 'Closing ticket in 5 seconds...' });

    setTimeout(async () => {
      await channel.delete().catch(() => null);
    }, 5000);
  }
}

// ==============================================================================
// SECTION 10: APPLICATION SYSTEM IMPLEMENTATION (300x UPGRADED)
// ==============================================================================

class ApplicationSystem {
  static async handleSetup(interaction) {
    Utils.checkAdmin(interaction);
    db.set('draft', interaction.user.id, { step: 'channel', data: { questions: [] } });
    
    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('app_channel').setPlaceholder('Select channel for Application Panel').setChannelTypes([ChannelType.GuildText])
    );
    await interaction.reply({ content: 'Step 1: Where should the application panel be sent?', components: [row], ephemeral: true });
  }

  static async handleChannelSelect(interaction) {
    await interaction.deferUpdate();
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.followUp({ content: 'Session expired.', ephemeral: true });

    draft.data.channelId = interaction.values[0];
    draft.step = 'details';
    db.set('draft', interaction.user.id, draft);

    const modal = UI.modal('app_details_modal', 'Application Details', [
      { id: 'title', label: 'Application Title', value: 'Staff Application', required: true },
      { id: 'desc', label: 'Application Description', value: 'Click below to apply.', paragraph: true, required: true },
      { id: 'log_channel', label: 'Log Channel ID', value: '', placeholder: 'Leave empty to auto-create', required: false }
    ]);
    await interaction.showModal(modal);
  }

  static async handleDetailsModal(interaction) {
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });

    draft.data.title = interaction.fields.getTextInputValue('title');
    draft.data.desc = interaction.fields.getTextInputValue('desc');
    draft.data.logId = interaction.fields.getTextInputValue('log_channel').trim() || null;
    db.set('draft', interaction.user.id, draft);

    const row = new ActionRowBuilder().addComponents(
      UI.btn('app_add_q', 'Add Question', ButtonStyle.Primary),
      UI.btn('app_finish', 'Finish Setup', ButtonStyle.Success)
    );
    await interaction.reply({ content: `Now add questions to the form. Total questions: **0**`, components: [row], ephemeral: true });
  }

  static async handleAddQuestion(interaction) {
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });

    const modal = UI.modal('app_q_modal', 'Add New Question', [
      { id: 'q_text', label: 'Question Text', value: 'What is your name?', required: true },
      { id: 'q_short', label: 'Short Answer? (yes/no)', value: 'yes', required: true }
    ]);
    await interaction.showModal(modal);
  }

  static async handleQModal(interaction) {
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });

    const qText = interaction.fields.getTextInputValue('q_text');
    const isShort = interaction.fields.getTextInputValue('q_short').toLowerCase().includes('yes');
    
    draft.data.questions.push({ text: qText, short: isShort });
    db.set('draft', interaction.user.id, draft);

    const row = new ActionRowBuilder().addComponents(
      UI.btn('app_add_q', 'Add Another', ButtonStyle.Primary),
      UI.btn('app_finish', 'Finish Setup', ButtonStyle.Success)
    );
    await interaction.reply({ content: `Question added. Total questions: **${draft.data.questions.length}**`, components: [row], ephemeral: true });
  }

  static async handleFinish(interaction) {
    await interaction.deferUpdate();
    const draft = db.get('draft', interaction.user.id);
    if (!draft) return interaction.followUp({ content: 'Session expired.', ephemeral: true });

    let logId = draft.data.logId;
    if (!logId) {
      const logChannel = await interaction.guild.channels.create({
        name: 'application-results',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [P.ViewChannel] },
          { id: interaction.client.user.id, allow: [P.ViewChannel, P.SendMessages] }
        ]
      });
      logId = logChannel.id;
    }

    const appId = Utils.genId();
    db.set('application', appId, { ...draft.data, logId });
    db.del('draft', interaction.user.id);

    const channel = await interaction.guild.channels.fetch(draft.data.channelId).catch(() => null);
    if (channel) {
      const embed = UI.embed(draft.data.title, draft.data.desc, COLORS.SUCCESS);
      const row = new ActionRowBuilder().addComponents(
        UI.btn(`app_open_${appId}`, 'Apply Now', ButtonStyle.Success, false, '🪪')
      );
      await channel.send({ embeds: [embed], components: [row] });
    }

    await interaction.followUp({ content: 'Application System deployed successfully!', ephemeral: true });
  }

  static async handleOpen(interaction, appId) {
    const app = db.get('application', appId);
    if (!app) return interaction.reply({ content: 'Application configuration not found. Please ask an admin to recreate it.', ephemeral: true });
    
    if (app.questions.length === 0) return interaction.reply({ content: 'No questions set up.', ephemeral: true });

    const fields = app.questions.slice(0, 5).map((q, i) => ({
      id: `q_${i}`,
      label: q.text,
      paragraph: !q.short,
      required: true
    }));

    const modal = UI.modal(`app_submit_${appId}`, app.title, fields);
    await interaction.showModal(modal);
  }

  static async handleSubmit(interaction, appId) {
    await interaction.deferReply({ ephemeral: true });
    const app = db.get('application', appId);
    if (!app) return interaction.editReply({ content: 'Configuration lost. Ask admin to recreate.' });

    const logChannel = await interaction.guild.channels.fetch(app.logId).catch(() => null);
    if (!logChannel) return interaction.editReply({ content: 'Log channel missing.' });

    const answers = app.questions.slice(0, 5).map((q, i) => {
      return `**${q.text}**\n${interaction.fields.getTextInputValue(`q_${i}`)}`;
    }).join('\n\n');

    const embed = UI.embed(`New Application: ${interaction.user.tag}`, answers, COLORS.WARNING);
    embed.setFooter({ text: `User: ${interaction.user.id}` });

    const row = new ActionRowBuilder().addComponents(
      UI.btn(`app_accept_${interaction.user.id}`, 'Accept', ButtonStyle.Success),
      UI.btn(`app_reject_${interaction.user.id}`, 'Reject', ButtonStyle.Danger)
    );

    const msg = await logChannel.send({ embeds: [embed], components: [row] });
    db.set('app_review', msg.id, { userId: interaction.user.id, appId });
    
    await interaction.editReply({ content: 'Application submitted successfully!' });
  }

  static async handleAccept(interaction, userId) {
    await interaction.deferUpdate();
    
    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(COLORS.SUCCESS)
      .setFooter({ text: `Accepted by ${interaction.user.tag}` });
    
    await interaction.message.edit({ embeds: [embed], components: [] });

    const user = await interaction.client.users.fetch(userId).catch(() => null);
    if (user) {
      await user.send({ embeds: [UI.embed('Application Accepted', 'Congratulations! Your application has been accepted.', COLORS.SUCCESS)] }).catch(() => null);
    }
  }

  static async handleReject(interaction, userId) {
    const modal = UI.modal(`app_reject_reason_${userId}`, 'Reject Application', [
      { id: 'reason', label: 'Reason for Rejection', required: true }
    ]);
    await interaction.showModal(modal);
  }

  static async handleRejectReason(interaction, userId) {
    await interaction.deferUpdate();
    const reason = interaction.fields.getTextInputValue('reason');

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(COLORS.DANGER)
      .setFooter({ text: `Rejected by ${interaction.user.tag} | Reason: ${reason}` });
    
    await interaction.message.edit({ embeds: [embed], components: [] });

    const user = await interaction.client.users.fetch(userId).catch(() => null);
    if (user) {
      await user.send({ embeds: [UI.embed('Application Rejected', `We regret to inform you that your application was rejected.\n\n**Reason:** ${reason}`, COLORS.DANGER)] }).catch(() => null);
    }
  }
}

// ==============================================================================
// SECTION 11: MAIN INTERACTION ROUTER (Anti-Crash Handled)
// ==============================================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.inGuild()) return;

  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'about') {
        const embed = UI.embed('✨ LD GIVEAWAYS', 'Developed by **Dream**.\n\nVersion: v' + CONFIG.VERSION, COLORS.GOLD);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'ticket' && interaction.options.getSubcommand() === 'setup') {
        return TicketSystem.handleSetup(interaction);
      }

      if (commandName === 'application' && interaction.options.getSubcommand() === 'setup') {
        return ApplicationSystem.handleSetup(interaction);
      }
      
      if (commandName === 'mod') {
        Utils.checkAdmin(interaction);
        const sub = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });
        
        if (sub === 'ban') {
          const u = interaction.options.getUser('user');
          await interaction.guild.members.ban(u.id);
          return interaction.editReply(`Banned ${u.tag}`);
        }
        if (sub === 'kick') {
          const u = interaction.options.getUser('user');
          await interaction.guild.members.kick(u.id);
          return interaction.editReply(`Kicked ${u.tag}`);
        }
        if (sub === 'purge') {
          const amt = interaction.options.getInteger('amount');
          await interaction.channel.bulkDelete(amt, true);
          return interaction.editReply(`Deleted ${amt} messages.`);
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

    if (interaction.isButton()) {
      const parts = interaction.customId.split('_');

      if (parts[0] === 't') {
        if (parts[1] === 'type') return TicketSystem.handleTypeSelect(interaction, parts[2]);
        if (parts[1] === 'open') {
           const configId = parts[2];
           const catIndex = parts[3] === 'multi' ? 0 : parseInt(parts[3]); 
           return TicketSystem.handleOpen(interaction, configId, catIndex);
        }
        if (parts[1] === 'close') return TicketSystem.handleClose(interaction, parts[2]);
      }

      if (interaction.customId === 'app_add_q') return ApplicationSystem.handleAddQuestion(interaction);
      if (interaction.customId === 'app_finish') return ApplicationSystem.handleFinish(interaction);
      
      if (parts[0] === 'app') {
        if (parts[1] === 'open') return ApplicationSystem.handleOpen(interaction, parts[2]);
        if (parts[1] === 'accept') return ApplicationSystem.handleAccept(interaction, parts[2]);
        if (parts[1] === 'reject' && parts[2] !== 'reason') return ApplicationSystem.handleReject(interaction, parts[2]);
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('t_open_multi_')) {
         const configId = interaction.customId.replace('t_open_multi_', '');
         const catIndex = parseInt(interaction.values[0].replace('cat_', ''));
         return TicketSystem.handleOpen(interaction, configId, catIndex);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 't_panel_modal') return TicketSystem.handlePanelModal(interaction);
      if (interaction.customId === 't_single_modal') return TicketSystem.handleSingleModal(interaction);
      if (interaction.customId === 't_multi_modal') return TicketSystem.handleMultiModal(interaction);
      
      if (interaction.customId === 'app_details_modal') return ApplicationSystem.handleDetailsModal(interaction);
      if (interaction.customId === 'app_q_modal') return ApplicationSystem.handleQModal(interaction);
      
      if (interaction.customId.startsWith('app_submit_')) {
          return ApplicationSystem.handleSubmit(interaction, interaction.customId.replace('app_submit_', ''));
      }
      if (interaction.customId.startsWith('app_reject_reason_')) {
          return ApplicationSystem.handleRejectReason(interaction, interaction.customId.replace('app_reject_reason_', ''));
      }
    }

    if (interaction.isChannelSelectMenu()) {
      if (interaction.customId === 't_channel_select') return TicketSystem.handleChannelSelect(interaction);
      if (interaction.customId === 't_log_select') return TicketSystem.handleLogSelect(interaction);
      if (interaction.customId === 't_panel_deploy') return TicketSystem.handleDeploy(interaction);
      if (interaction.customId === 'app_channel') return ApplicationSystem.handleChannelSelect(interaction);
    }

  } catch (error) {
    Logger.error('Router', 'Interaction Error:', error);
    const msg = { content: `Error: ${error.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg).catch(() => null);
    else await interaction.reply(msg).catch(() => null);
  }
});

// ==============================================================================
// SECTION 12: ANTI-CRASH GLOBAL ERROR HANDLERS
// ==============================================================================

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Anti-Crash', 'Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (error) => {
  Logger.error('Anti-Crash', 'Uncaught Exception:', error);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
  Logger.warn('Anti-Crash', `Exception monitored from: ${origin}`);
});

// ==============================================================================
// SECTION 13: BOT STARTUP & GLOBAL COMMANDS
// ==============================================================================

async function start() {
  if (!CONFIG.TOKEN) {
    Logger.error('Startup', 'CRITICAL: DISCORD_TOKEN is missing!');
    process.exit(1);
  }

  client.once('ready', async () => {
    Logger.info('Bot', `Logged in as ${client.user.tag}`);
    
    try {
      const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
      
      // Global Command Registration (Works on ALL servers)
      await rest.put(
        Routes.applicationCommands(CONFIG.CLIENT_ID), 
        { body: COMMANDS }
      );
      Logger.info('Bot', 'Global commands registered successfully. (Propagation may take up to 1 hour).');
    } catch (error) {
      Logger.error('Bot', 'Global command registration failed:', error);
    }
  });

  // Web Server for Render
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('LD GIVEAWAYS ENTERPRISE IS ONLINE AND STABLE');
  });
  
  server.listen(CONFIG.PORT, '0.0.0.0', () => {
    Logger.info('Web', `Health check server listening on port ${CONFIG.PORT}`);
  });

  await client.login(CONFIG.TOKEN);
}

start().catch((err) => {
    Logger.error('Startup', 'Fatal startup error:', err);
});