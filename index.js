/**
 * ==============================================================================
 * LD GIVEAWAYS | OMNIPOTENT ENTERPRISE EDITION v22.0.0
 * My Owner: Unitey (1026324207098925147)
 * My Developer: Dream (696735778356854913)
 * 
 * KURULUM:
 * 1. Discord Developer Portal'da botu oluşturun.
 * 2. Tüm Privileged Intents (Server Members, Message Content) açın.
 * 3. GitHub'a index.js olarak yükleyin.
 * 4. Render'da Web Service oluşturup Environment kısmına şunları ekleyin:
 *    - DISCORD_TOKEN
 *    - CLIENT_ID
 *    - GUILD_ID
 *    - DATA_DIR = ./data
 * 5. Deploy edin.
 * ==============================================================================
 */

'use strict';

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
  ChannelSelectMenuBuilder
} = require('discord.js');

// ==============================================================================
// KONFİGÜRASYON
// ==============================================================================
const CONFIG = {
  VERSION: '22.0.0',
  DATA_DIR: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
  PORT: process.env.PORT || 10000,
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  DEV_ID: '696735778356854913',
  OWNER_ID: '1026324207098925147'
};

const PATHS = {
  DATABASE: path.join(CONFIG.DATA_DIR, 'enterprise.sqlite')
};

const COLORS = {
  PRIMARY: 0x3498DB,
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  DANGER: 0xED4245,
  GOLD: 0xF1C40F,
  DARK: 0x2C3E50
};

// ==============================================================================
// VERİTABANI YÖNETİMİ (SQLite)
// ==============================================================================
if (!fs.existsSync(CONFIG.DATA_DIR)) fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
const db = new Database(PATHS.DATABASE);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS objects (
    kind TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY(kind, id)
  );
`);

const dbGet = (kind, id) => {
  try {
    const row = db.prepare('SELECT data FROM objects WHERE kind = ? AND id = ?').get(kind, id);
    return row ? JSON.parse(row.data) : null;
  } catch (e) { return null; }
};

const dbSet = (kind, id, data) => {
  try {
    db.prepare('INSERT INTO objects (kind, id, data) VALUES (?, ?, ?) ON CONFLICT(kind, id) DO UPDATE SET data = excluded.data')
      .run(kind, id, JSON.stringify(data));
    return data;
  } catch (e) { return null; }
};

const dbDel = (kind, id) => {
  try { db.prepare('DELETE FROM objects WHERE kind = ? AND id = ?').run(kind, id); } catch (e) {}
};

// ==============================================================================
// YARDIMCI FONKSİYONLAR
// ==============================================================================
const genId = () => crypto.randomBytes(4).toString('hex');
const checkAdmin = (i) => {
  if (!i.memberPermissions?.has(P.Administrator)) throw new Error('Administrator permission required.');
};

const parseDuration = (input) => {
  if (!input) throw new Error('Duration required.');
  const str = input.toLowerCase().trim();
  let ms = 0, match, end = 0;
  const regex = /(\d+)\s*(s|m|h|d|w)/g;
  while ((match = regex.exec(str)) !== null) {
    if (str.slice(end, match.index).trim() !== '') throw new Error('Invalid format. Use 1d 2h 30m');
    const amt = parseInt(match[1], 10);
    const unit = match[2];
    ms += amt * ({ s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 })[unit];
    end = regex.lastIndex;
  }
  if (!end || str.slice(end).trim() !== '' || ms < 10000) throw new Error('Invalid duration (Min 10s).');
  return ms;
};

const UI = {
  embed: (title, desc, color = COLORS.PRIMARY) => {
    const e = new EmbedBuilder().setColor(color).setTimestamp();
    if (title) e.setTitle(title.substring(0, 256));
    if (desc) e.setDescription(desc.substring(0, 4000));
    return e;
  },
  btn: (id, label, style = ButtonStyle.Secondary, disabled = false, emoji = null) => {
    const b = new ButtonBuilder().setCustomId(id).setLabel(label.substring(0, 80)).setStyle(style).setDisabled(disabled);
    if (emoji) b.setEmoji(emoji);
    return b;
  },
  modal: (id, title, fields) => {
    const m = new ModalBuilder().setCustomId(id).setTitle(title.substring(0, 45));
    const rows = fields.map(f => {
      const input = new TextInputBuilder()
        .setCustomId(f.id).setLabel(f.label.substring(0, 45))
        .setStyle(f.paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(f.required !== false).setMaxLength(2000);
      if (f.value) input.setValue(f.value);
      return new ActionRowBuilder().addComponents(input);
    });
    m.addComponents(rows);
    return m;
  }
};

// ==============================================================================
// KOMUTLAR
// ==============================================================================
const COMMANDS = [
  { name: 'about', description: 'Bot information and credits.' },
  {
    name: 'ticket', description: 'Ticket System',
    options: [{ type: 1, name: 'setup', description: 'Setup the ticket system (Admin Only)' }]
  },
  {
    name: 'application', description: 'Application System',
    options: [{ type: 1, name: 'setup', description: 'Setup the application system (Admin Only)' }]
  },
  {
    name: 'giveaway', description: 'Giveaway System',
    options: [
      { type: 1, name: 'create', description: 'Create a new giveaway', options: [{ type: 7, name: 'channel', description: 'Channel', required: true }] }
    ]
  },
  {
    name: 'mod', description: 'Moderation',
    options: [
      { type: 1, name: 'ban', description: 'Ban a user', options: [{ type: 6, name: 'user', description: 'User', required: true }] },
      { type: 1, name: 'purge', description: 'Delete messages', options: [{ type: 4, name: 'amount', description: 'Amount', required: true }] }
    ]
  }
];

// ==============================================================================
// DİSCORD CLIENT
// ==============================================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  allowedMentions: { parse: [], repliedUser: false }
});

// ==============================================================================
// ETKİLEŞİM YÖNETİCİSİ (ANA MOTOR - ASLA ÇÖKMEZ)
// ==============================================================================
client.on('interactionCreate', async (interaction) => {
  // 1. ANINDA YANIT KALKANI (TIMEOUT ENGELLEYİCİ)
  // Eğer komut çalışması uzarsa Discord hata vermesin diye bekletme başlatıyoruz.
  // Ancak showModal kullanacaksak deferReply KULLANAMIYORUZ. 
  // O yüzden sadece deferReply gerektiren işlemlerde kullanacağız.

  try {
    // -------------------------------------------------------------------------
    // SLASH KOMUTLARI
    // -------------------------------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'about') {
        const embed = UI.embed(
          '✨ LD GIVEAWAYS | Enterprise Edition',
          `This bot is a masterpiece developed by <@${CONFIG.DEV_ID}> for <@${CONFIG.OWNER_ID}>.\n\n` +
          `👑 **Owner:** <@${CONFIG.OWNER_ID}>\n` +
          `💻 **Developer:** <@${CONFIG.DEV_ID}>\n\n` +
          `🚀 **Version:** v${CONFIG.VERSION}\n` +
          `🛡️ **Status:** 0 Bugs, 0 Lags, 0 Crashes`,
          COLORS.GOLD
        );
        embed.setThumbnail(client.user.displayAvatarURL());
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'ticket' && interaction.options.getSubcommand() === 'setup') {
        checkAdmin(interaction);
        dbSet('draft', interaction.user.id, { step: 'ticket_panel' });
        return interaction.showModal(UI.modal('t_panel_modal', 'Ticket Panel Setup', [
          { id: 'title', label: 'Panel Title', value: 'Support System', required: true },
          { id: 'desc', label: 'Panel Description', value: 'Click below to open a ticket.', paragraph: true, required: true }
        ]));
      }

      if (commandName === 'application' && interaction.options.getSubcommand() === 'setup') {
        checkAdmin(interaction);
        dbSet('draft', interaction.user.id, { step: 'app_channel', data: { questions: [] } });
        return interaction.reply({
          content: 'Step 1: Select a channel for the Application Panel.',
          components: [new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder().setCustomId('app_channel').setPlaceholder('Select Channel').setChannelTypes([ChannelType.GuildText])
          )],
          ephemeral: true
        });
      }

      if (commandName === 'giveaway' && interaction.options.getSubcommand() === 'create') {
        checkAdmin(interaction);
        const channel = interaction.options.getChannel('channel');
        dbSet('draft', interaction.user.id, { step: 'gw_create', data: { channelId: channel.id } });
        return interaction.showModal(UI.modal('gw_create_modal', 'Giveaway Setup', [
          { id: 'prize', label: 'Prize', value: 'Nitro Classic', required: true },
          { id: 'winners', label: 'Winner Count', value: '1', required: true },
          { id: 'time', label: 'Duration (e.g., 1d 12h)', value: '1d', required: true }
        ]));
      }

      if (commandName === 'mod') {
        checkAdmin(interaction);
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();
        if (sub === 'ban') {
          const u = interaction.options.getUser('user');
          await interaction.guild.members.ban(u.id);
          return interaction.editReply(`Banned **${u.tag}**.`);
        }
        if (sub === 'purge') {
          const amt = interaction.options.getInteger('amount');
          await interaction.channel.bulkDelete(amt, true);
          return interaction.editReply(`Deleted ${amt} messages.`);
        }
      }
    }

    // -------------------------------------------------------------------------
    // BUTONLAR
    // -------------------------------------------------------------------------
    if (interaction.isButton()) {
      const [type, action, id, extra] = interaction.customId.split('_');

      // Ticket Wizard
      if (type === 't' && action === 'type') {
        await interaction.deferUpdate();
        const draft = dbGet('draft', interaction.user.id);
        if (!draft) return interaction.followUp({ content: 'Session expired. Run /ticket setup again.', ephemeral: true });
        
        draft.data.type = id; // 'single' or 'multi'
        dbSet('draft', interaction.user.id, draft);
        
        if (id === 'single') {
          return interaction.showModal(UI.modal('t_single_modal', 'Single Button Setup', [
            { id: 'btn_name', label: 'Button Name', value: 'Open Ticket', required: true },
            { id: 'welcome', label: 'Welcome Message', value: 'Staff will be with you shortly.', paragraph: true, required: true }
          ]));
        } else {
          return interaction.showModal(UI.modal('t_multi_modal', 'Category Setup', [
            { id: 'cats', label: 'Categories (Comma Separated)', value: 'General, Bug Report, Billing', paragraph: true, required: true }
          ]));
        }
      }

      // Ticket Close
      if (type === 't' && action === 'close') {
        await interaction.deferReply();
        await interaction.editReply({ content: 'Closing ticket in 5 seconds...' });
        return setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
      }

      // Application Add Question
      if (type === 'app' && action === 'addq') {
        const draft = dbGet('draft', interaction.user.id);
        if (!draft || !draft.data) return interaction.reply({ content: 'Session expired. Run /application setup again.', ephemeral: true });
        
        return interaction.showModal(UI.modal('app_q_modal', 'Add Question', [
          { id: 'q_text', label: 'Question Text', value: 'What is your name?', required: true },
          { id: 'q_short', label: 'Short Answer? (yes/no)', value: 'yes', required: true }
        ]));
      }

      // Application Finish
      if (type === 'app' && action === 'finish') {
        await interaction.deferUpdate();
        const draft = dbGet('draft', interaction.user.id);
        if (!draft) return interaction.followUp({ content: 'Session expired.', ephemeral: true });

        let logId = draft.data.logId;
        if (!logId) {
          const logChannel = await interaction.guild.channels.create({
            name: 'application-results', type: ChannelType.GuildText,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [P.ViewChannel] }, { id: client.user.id, allow: [P.ViewChannel, P.SendMessages] }]
          });
          logId = logChannel.id;
        }

        const appId = genId();
        dbSet('application', appId, { ...draft.data, logId });
        dbDel('draft', interaction.user.id);

        const channel = await interaction.guild.channels.fetch(draft.data.channelId).catch(() => null);
        if (channel) {
          const embed = UI.embed(draft.data.title, draft.data.desc, COLORS.SUCCESS);
          const row = new ActionRowBuilder().addComponents(UI.btn(`app_open_${appId}`, 'Apply Now', ButtonStyle.Success, false, '🪪'));
          await channel.send({ embeds: [embed], components: [row] });
        }
        return interaction.followUp({ content: 'Application System Deployed!', ephemeral: true });
      }

      // Application Open (User clicks)
      if (type === 'app' && action === 'open') {
        const app = dbGet('application', id);
        if (!app) return interaction.reply({ content: 'Application config lost (Render restart). Ask admin to recreate.', ephemeral: true });
        if (app.questions.length === 0) return interaction.reply({ content: 'No questions configured.', ephemeral: true });

        const fields = app.questions.slice(0, 5).map((q, i) => ({ id: `q_${i}`, label: q.text, paragraph: !q.short, required: true }));
        return interaction.showModal(UI.modal(`app_submit_${id}`, app.title, fields));
      }

      // Application Accept/Reject
      if (type === 'app' && (action === 'accept' || action === 'reject')) {
        await interaction.deferUpdate();
        const userId = id;
        
        if (action === 'accept') {
          const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(COLORS.SUCCESS).setFooter({ text: `Accepted by ${interaction.user.tag}` });
          await interaction.message.edit({ embeds: [embed], components: [] });
          const user = await client.users.fetch(userId).catch(() => null);
          if (user) await user.send({ embeds: [UI.embed('Application Accepted', 'Congratulations! Your application has been accepted.', COLORS.SUCCESS)] }).catch(() => null);
          return interaction.followUp({ content: 'Application accepted.', ephemeral: true });
        } else {
          return interaction.showModal(UI.modal(`app_reject_reason_${userId}`, 'Reject Application', [
            { id: 'reason', label: 'Reason for Rejection', required: true }
          ]));
        }
      }

      // Giveaway Join/Leave
      if (type === 'gw' && (action === 'join' || action === 'leave')) {
        await interaction.deferReply({ ephemeral: true });
        const gw = dbGet('giveaway', id);
        if (!gw) return interaction.editReply({ content: 'Giveaway not found (Render restart).', ephemeral: true });
        
        if (action === 'join') {
          if (gw.entries.includes(interaction.user.id)) return interaction.editReply({ content: 'You are already in!', ephemeral: true });
          gw.entries.push(interaction.user.id);
          dbSet('giveaway', id, gw);
          return interaction.editReply({ content: '🎉 Successfully joined!', ephemeral: true });
        } else {
          gw.entries = gw.entries.filter(e => e !== interaction.user.id);
          dbSet('giveaway', id, gw);
          return interaction.editReply({ content: '🚫 Left the giveaway.', ephemeral: true });
        }
      }
    }

    // -------------------------------------------------------------------------
    // SELECT MENÜLER
    // -------------------------------------------------------------------------
    if (interaction.isChannelSelectMenu()) {
      await interaction.deferUpdate();
      const draft = dbGet('draft', interaction.user.id);
      if (!draft) return interaction.followUp({ content: 'Session expired.', ephemeral: true });

      if (interaction.customId === 'app_channel') {
        draft.data.channelId = interaction.values[0];
        draft.step = 'app_details';
        dbSet('draft', interaction.user.id, draft);
        return interaction.showModal(UI.modal('app_details_modal', 'Application Details', [
          { id: 'title', label: 'Title', value: 'Staff Application', required: true },
          { id: 'desc', label: 'Description', value: 'Click below to apply.', paragraph: true, required: true },
          { id: 'log_channel', label: 'Log Channel ID (Optional)', value: '', required: false }
        ]));
      }

      if (interaction.customId === 't_category') {
        draft.data.parentId = interaction.values[0];
        draft.step = 't_log';
        dbSet('draft', interaction.user.id, draft);
        return interaction.followUp({
          content: 'Step 4: Select a log channel for transcripts.',
          components: [new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder().setCustomId('t_log').setPlaceholder('Select Log Channel').setChannelTypes([ChannelType.GuildText])
          )],
          ephemeral: true
        });
      }

      if (interaction.customId === 't_log') {
        draft.data.logId = interaction.values[0];
        draft.step = 't_deploy';
        dbSet('draft', interaction.user.id, draft);
        return interaction.followUp({
          content: 'Step 5: Select the channel to send the Ticket Panel.',
          components: [new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder().setCustomId('t_deploy').setPlaceholder('Select Panel Channel').setChannelTypes([ChannelType.GuildText])
          )],
          ephemeral: true
        });
      }

      if (interaction.customId === 't_deploy') {
        const channel = await interaction.guild.channels.fetch(interaction.values[0]).catch(() => null);
        if (!channel) return interaction.followUp({ content: 'Channel not found.', ephemeral: true });

        const configId = genId();
        dbSet('ticket_config', configId, draft.data);
        dbDel('draft', interaction.user.id);

        const embed = UI.embed(draft.data.title, draft.data.desc, COLORS.PRIMARY);
        if (draft.data.type === 'single') {
          await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(UI.btn(`t_open_${configId}_0`, draft.data.btnName, ButtonStyle.Primary, false, '📩'))] });
        } else {
          const options = draft.data.categories.map((c, i) => ({ label: c, value: `cat_${i}` }));
          await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`t_open_multi_${configId}`).setPlaceholder('Select Category').addOptions(options))] });
        }
        return interaction.followUp({ content: 'Ticket System Deployed!', ephemeral: true });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('t_open_multi_')) {
        await interaction.deferReply({ ephemeral: true });
        const configId = interaction.customId.replace('t_open_multi_', '');
        const catIndex = parseInt(interaction.values[0].replace('cat_', ''));
        const config = dbGet('ticket_config', configId);
        if (!config) return interaction.editReply({ content: 'Config not found.', ephemeral: true });

        const catName = config.categories[catIndex];
        const ticketChannel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`, type: ChannelType.GuildText, parent: config.parentId,
          permissionOverwrites: [{ id: interaction.guild.id, deny: [P.ViewChannel] }, { id: interaction.user.id, allow: [P.ViewChannel, P.SendMessages] }]
        });
        await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [UI.embed(`Ticket: ${catName}`, 'Staff will be with you shortly.', COLORS.SUCCESS)], components: [new ActionRowBuilder().addComponents(UI.btn(`t_close_${ticketChannel.id}`, 'Close', ButtonStyle.Danger))] });
        return interaction.editReply({ content: `Ticket created: <#${ticketChannel.id}>` });
      }
    }

    // -------------------------------------------------------------------------
    // MODALLAR
    // -------------------------------------------------------------------------
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;
      const draft = dbGet('draft', interaction.user.id);

      if (customId === 't_panel_modal') {
        if (!draft) return interaction.reply({ content: 'Session expired.', ephemeral: true });
        draft.data.title = interaction.fields.getTextInputValue('title');
        draft.data.desc = interaction.fields.getTextInputValue('desc');
        draft.step = 't_type';
        dbSet('draft', interaction.user.id, draft);
        return interaction.reply({
          content: 'Select Ticket Type:',
          components: [new ActionRowBuilder().addComponents(UI.btn('t_type_single', 'Single', ButtonStyle.Primary), UI.btn('t_type_multi', 'Categorized', ButtonStyle.Success))],
          ephemeral: true
        });
      }

      if (customId === 't_single_modal') {
        draft.data.btnName = interaction.fields.getTextInputValue('btn_name');
        draft.data.welcome = interaction.fields.getTextInputValue('welcome');
        dbSet('draft', interaction.user.id, draft);
        return interaction.reply({
          content: 'Select Category channel for tickets:',
          components: [new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('t_category').setPlaceholder('Category').setChannelTypes([ChannelType.GuildCategory]))],
          ephemeral: true
        });
      }

      if (customId === 't_multi_modal') {
        draft.data.categories = interaction.fields.getTextInputValue('cats').split(',').map(c => c.trim());
        dbSet('draft', interaction.user.id, draft);
        return interaction.reply({
          content: 'Select Category channel for tickets:',
          components: [new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('t_category').setPlaceholder('Category').setChannelTypes([ChannelType.GuildCategory]))],
          ephemeral: true
        });
      }

      if (customId === 'app_details_modal') {
        draft.data.title = interaction.fields.getTextInputValue('title');
        draft.data.desc = interaction.fields.getTextInputValue('desc');
        draft.data.logId = interaction.fields.getTextInputValue('log_channel').trim() || null;
        dbSet('draft', interaction.user.id, draft);
        return interaction.reply({
          content: 'Add questions to the form.',
          components: [new ActionRowBuilder().addComponents(UI.btn('app_addq', 'Add Question', ButtonStyle.Primary), UI.btn('app_finish', 'Finish Setup', ButtonStyle.Success))],
          ephemeral: true
        });
      }

      if (customId === 'app_q_modal') {
        const qText = interaction.fields.getTextInputValue('q_text');
        const isShort = interaction.fields.getTextInputValue('q_short').toLowerCase().includes('yes');
        draft.data.questions.push({ text: qText, short: isShort });
        dbSet('draft', interaction.user.id, draft);
        return interaction.reply({
          content: `Question added. Total: ${draft.data.questions.length}`,
          components: [new ActionRowBuilder().addComponents(UI.btn('app_addq', 'Add Another', ButtonStyle.Primary), UI.btn('app_finish', 'Finish Setup', ButtonStyle.Success))],
          ephemeral: true
        });
      }

      if (customId.startsWith('app_submit_')) {
        await interaction.deferReply({ ephemeral: true });
        const appId = customId.replace('app_submit_', '');
        const app = dbGet('application', appId);
        if (!app) return interaction.editReply({ content: 'Config lost.', ephemeral: true });

        const logChannel = await interaction.guild.channels.fetch(app.logId).catch(() => null);
        if (!logChannel) return interaction.editReply({ content: 'Log channel missing.', ephemeral: true });

        const answers = app.questions.slice(0, 5).map((q, i) => `**${q.text}**\n${interaction.fields.getTextInputValue(`q_${i}`)}`).join('\n\n');
        const embed = UI.embed(`New App: ${interaction.user.tag}`, answers, COLORS.WARNING);
        const row = new ActionRowBuilder().addComponents(UI.btn(`app_accept_${interaction.user.id}`, 'Accept', ButtonStyle.Success), UI.btn(`app_reject_${interaction.user.id}`, 'Reject', ButtonStyle.Danger));
        
        await logChannel.send({ embeds: [embed], components: [row] });
        return interaction.editReply({ content: 'Application submitted!' });
      }

      if (customId.startsWith('app_reject_reason_')) {
        await interaction.deferUpdate();
        const userId = customId.replace('app_reject_reason_', '');
        const reason = interaction.fields.getTextInputValue('reason');
        const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(COLORS.DANGER).setFooter({ text: `Rejected by ${interaction.user.tag} | Reason: ${reason}` });
        await interaction.message.edit({ embeds: [embed], components: [] });
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) await user.send({ embeds: [UI.embed('Application Rejected', `Reason: ${reason}`, COLORS.DANGER)] }).catch(() => null);
        return interaction.followUp({ content: 'Rejected.', ephemeral: true });
      }

      if (customId === 'gw_create_modal') {
        await interaction.deferReply({ ephemeral: true });
        const prize = interaction.fields.getTextInputValue('prize');
        const winners = parseInt(interaction.fields.getTextInputValue('winners'));
        const ms = parseDuration(interaction.fields.getTextInputValue('time'));
        
        const channel = await interaction.guild.channels.fetch(draft.data.channelId).catch(() => null);
        if (!channel) return interaction.editReply({ content: 'Channel not found.', ephemeral: true });

        const gwId = genId();
        dbSet('giveaway', gwId, { prize, winners, ends: Date.now() + ms, entries: [] });

        const embed = UI.embed(`🎉 GIVEAWAY: ${prize}`, `Ends: <t:${Math.floor((Date.now() + ms) / 1000)}:R>\nHosted by: <@${interaction.user.id}>`, COLORS.PRIMARY);
        embed.addFields({ name: 'Winners', value: `${winners}`, inline: true }, { name: 'Entries', value: '0', inline: true });
        const row = new ActionRowBuilder().addComponents(UI.btn(`gw_join_${gwId}`, 'Join', ButtonStyle.Success, false, '🎉'), UI.btn(`gw_leave_${gwId}`, 'Leave', ButtonStyle.Danger, false, '🚫'));

        await channel.send({ embeds: [embed], components: [row] });
        return interaction.editReply({ content: 'Giveaway started!' });
      }
    }

  } catch (error) {
    // Anti-Crash: Hata olsa bile bot çökmez, kullanıcıya bilgi verir.
    console.error('[HATA]', error);
    const msg = { content: `An error occurred: ${error.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg).catch(() => null);
    else await interaction.reply(msg).catch(() => null);
  }
});

// ==============================================================================
// GLOBAL ÇÖKME ENGELLEYİCİ
// ==============================================================================
process.on('unhandledRejection', (reason) => console.error('[ANTI-CRASH] Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.error('[ANTI-CRASH] Uncaught Exception:', err));

// ==============================================================================
// BAŞLATMA VE WEB SUNUCUSU
// ==============================================================================
async function start() {
  if (!CONFIG.TOKEN) return process.exit(1);

  client.once('ready', async () => {
    console.log(`[BOT] Logged in as ${client.user.tag}`);
    try {
      const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
      await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: COMMANDS });
      console.log('[BOT] Global commands registered.');
    } catch (e) { console.error(e); }
  });

  const server = http.createServer((req, res) => { res.writeHead(200); res.end('OK'); });
  server.listen(CONFIG.PORT, '0.0.0.0', () => console.log(`[WEB] Port ${CONFIG.PORT}`));

  await client.login(CONFIG.TOKEN);
}
start().catch(console.error);