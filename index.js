/**
 * ==============================================================================
 * LD GIVEAWAYS | ULTIMATE ENTERPRISE EDITION v15.0.0
 * ==============================================================================
 * My Owner: Unitey (1026324207098925147)
 * My Developer: Dream (696735778356854913)
 * 
 * [KURULUM REHBERİ]
 * 1. Discord Developer Portal üzerinden botunuzu oluşturun.
 * 2. "Server Members Intent" ve "Message Content Intent" ayarlarını açın.
 * 3. Bu kodu GitHub reponuza "index.js" olarak yükleyin.
 * 4. Render.com'da Web Service oluşturup reponuzu bağlayın.
 * 5. Environment değişkenlerine DISCORD_TOKEN, CLIENT_ID, GUILD_ID ve DATA_DIR=./data ekleyin.
 * 6. Deploy butonuna basın.
 * 
 * [ÖZELLİKLER]
 * - Ticket Sistemi: Adım adım kurulum, düz/kategorili seçenekleri, transcript.
 * - Başvuru Sistemi: SADECE SUNUCU YÖNETİCİSİ kurabilir. Yönetici kendi sorularını ekler.
 * - Çekiliş Sistemi: Renk seçimi, süre, canlı sayaç, drop sistemi.
 * - Rol Paneli: Adım adım rol ekleme, bekleme süreleri.
 * - Moderasyon: Ban, Kick, Timeout, Purge, Nuke, Lock, Unlock.
 * ==============================================================================
 */

'use strict';

// ==============================================================================
// BÖLÜM 1: GEREKLİ KÜTÜPHANELER VE MODÜLLER
// ==============================================================================

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');

// Discord.js v14 Kütüphanesi
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
// BÖLÜM 2: SABİTLER VE YAPILANDIRMA
// ==============================================================================

// Bot Sürüm Bilgileri
const BOT_VERSION = '15.0.0';
const BOT_NAME = 'LD GIVEAWAYS ENTERPRISE';

// Depolama Ayarları
const DATA_DIRECTORY = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const TRANSCRIPTS_DIRECTORY = path.join(DATA_DIRECTORY, 'transcripts');
const DATABASE_FILE = path.join(DATA_DIRECTORY, 'enterprise.sqlite');

// Discord Etkileşim Sabitleri
const EPHEMERAL = MessageFlags.Ephemeral;
const IS_COMPONENTS_V2 = MessageFlags.IsComponentsV2 || 32768;
const SAFE_MENTIONS = { parse: [], repliedUser: false };

// Limitler ve Zaman Aşımları
const MAX_TRANSCRIPT_MESSAGES = 10000;
const GIVEAWAY_MAX_DURATION_MS = 90 * 86400000;
const MAX_APP_QUESTIONS = 20;

// Renk Paleti
const COLORS = {
  PRIMARY: 0x3498DB,
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  DANGER: 0xED4245,
  INFO: 0x9B59B6,
  DARK: 0x2C3E50,
  LIGHT: 0xECF0F1
};

// Tehlikeli İzinler (Rol Panellerinde Verilmesi Yasak)
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
// BÖLÜM 3: VERİTABANI YÖNETİMİ
// ==============================================================================

/**
 * Veritabanı dosyasının ve klasörlerinin varlığını kontrol eder, yoksa oluşturur.
 * @returns {Database} SQLite Veritabanı nesnesi.
 */
function initializeDatabase() {
  if (!fs.existsSync(DATA_DIRECTORY)) {
    console.log(`[DB] Veri klasörü oluşturuluyor: ${DATA_DIRECTORY}`);
    fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  }
  
  if (!fs.existsSync(TRANSCRIPTS_DIRECTORY)) {
    console.log(`[DB] Transcript klasörü oluşturuluyor: ${TRANSCRIPTS_DIRECTORY}`);
    fs.mkdirSync(TRANSCRIPTS_DIRECTORY, { recursive: true });
  }

  console.log(`[DB] Veritabanı bağlantısı kuruluyor: ${DATABASE_FILE}`);
  const database = new Database(DATABASE_FILE);
  
  database.pragma('journal_mode = WAL');
  database.pragma('busy_timeout = 5000');
  database.pragma('synchronous = FULL');
  
  return database;
}

// Veritabanı nesnesini başlat
const db = initializeDatabase();

/**
 * Gerekli tüm tabloları oluşturur.
 */
function createTables() {
  console.log('[DB] Tablolar kontrol ediliyor ve oluşturuluyor...');
  db.exec(`
    -- Genel Amaçlı Nesne Deposu
    CREATE TABLE IF NOT EXISTS objects (
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY(kind, id)
    );

    -- Çekiliş Katılımcıları
    CREATE TABLE IF NOT EXISTS giveaway_entries (
      giveaway_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY(giveaway_id, user_id)
    );

    -- Rol Paneli Bekleme Süreleri
    CREATE TABLE IF NOT EXISTS role_cooldowns (
      panel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      until INTEGER NOT NULL,
      PRIMARY KEY(panel_id, user_id, role_id)
    );

    -- Ticket Sistemi
    CREATE TABLE IF NOT EXISTS tickets (
      channel_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      status TEXT DEFAULT 'open'
    );

    -- Başvuru Sistemi
    CREATE TABLE IF NOT EXISTS applications (
      message_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      answers TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );
  `);
  console.log('[DB] Tüm tablolar hazır.');
}

createTables();

// Hazır SQL Sorguları
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
    console.error(`[DB] Veri çekme hatası (${kind}):`, e);
    return null;
  }
}

function setData(kind, id, data) {
  try {
    sqlStatements.setObject.run(kind, id, JSON.stringify(data));
    return data;
  } catch (e) {
    console.error(`[DB] Veri yazma hatası (${kind}):`, e);
    return null;
  }
}

function deleteData(kind, id) {
  try {
    sqlStatements.delObject.run(kind, id);
    return true;
  } catch (e) {
    console.error(`[DB] Veri silme hatası (${kind}):`, e);
    return false;
  }
}

// ==============================================================================
// BÖLÜM 4: YARDIMCI FONKSİYONLAR
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
  if (!input) throw new Error('Süre belirtilmedi.');
  const str = input.toString().toLowerCase().trim();
  let totalMs = 0;
  let match;
  let endIndex = 0;
  const regex = /(\d+)\s*(s|m|h|d|w)/g;
  
  while ((match = regex.exec(str)) !== null) {
    if (str.slice(endIndex, match.index).trim() !== '') {
      throw new Error('Geçersiz süre formatı. Örnek: 1d 2h 30m');
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    totalMs += amount * multipliers[unit];
    endIndex = regex.lastIndex;
  }
  
  if (!endIndex || str.slice(endIndex).trim() !== '' || !Number.isSafeInteger(totalMs) || totalMs < 10000 || totalMs > maxMs) {
    throw new Error('Geçersiz süre veya süre sınırların dışında (En az 10 saniye).');
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
    throw new Error('Bu komutu sadece Sunucu Yöneticileri (Administrator) kullanabilir.');
  }
}

// ==============================================================================
// BÖLÜM 5: UI BİLEŞENLERİ
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
// BÖLÜM 6: KOMUT ŞEMALARI
// ==============================================================================

const BOT_COMMANDS = [
  { name: 'about', description: 'Bot hakkında detaylı bilgi verir.' },
  {
    name: 'ticket',
    description: 'Ticket sistemini yönetir.',
    options: [
      { type: 1, name: 'setup', description: 'Ticket sistemini adım adım kurar.' },
      { type: 1, name: 'close', description: 'Açık olan bileti kapatır.' },
      { type: 1, name: 'add', description: 'Bilete üye ekler.', options: [{ type: 6, name: 'user', description: 'Eklenecek üye', required: true }] },
      { type: 1, name: 'remove', description: 'Biletten üye çıkarır.', options: [{ type: 6, name: 'user', description: 'Çıkarılacak üye', required: true }] }
    ]
  },
  {
    name: 'application',
    description: 'Başvuru sistemini yönetir (Sadece Adminler).',
    options: [
      { type: 1, name: 'setup', description: 'Başvuru sistemini adım adım kurar.' }
    ]
  },
  {
    name: 'giveaway',
    description: 'Çekiliş sistemini yönetir.',
    options: [
      { type: 1, name: 'create', description: 'Yeni çekiliş oluşturur.', options: [{ type: 7, name: 'channel', description: 'Çekiliş kanalı', required: true }] },
      { type: 1, name: 'drop', description: 'Hızlı çekiliş başlatır.', options: [{ type: 7, name: 'channel', description: 'Kanal', required: true }, { type: 3, name: 'prize', description: 'Ödül', required: true }] },
      { type: 1, name: 'end', description: 'Çekilişi erken bitirir.', options: [{ type: 3, name: 'id', description: 'Mesaj ID', required: true }] }
    ]
  },
  {
    name: 'rolepanel',
    description: 'Rol paneli oluşturur.',
    options: [
      { type: 1, name: 'setup', description: 'Adım adım rol paneli oluşturur.' }
    ]
  },
  {
    name: 'mod',
    description: 'Moderasyon komutları.',
    options: [
      { type: 1, name: 'ban', description: 'Üyeyi banlar.', options: [{ type: 6, name: 'user', description: 'Üye', required: true }, { type: 3, name: 'reason', description: 'Sebep', required: false }] },
      { type: 1, name: 'kick', description: 'Üyeyi atar.', options: [{ type: 6, name: 'user', description: 'Üye', required: true }, { type: 3, name: 'reason', description: 'Sebep', required: false }] },
      { type: 1, name: 'purge', description: 'Mesaj siler.', options: [{ type: 4, name: 'amount', description: 'Miktar (1-100)', required: true }] },
      { type: 1, name: 'lock', description: 'Kanalı kilitler.' },
      { type: 1, name: 'unlock', description: 'Kanal kilidini açar.' }
    ]
  }
];

// ==============================================================================
// BÖLÜM 7: DİSCORD İSTEMCİSİ
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
// BÖLÜM 8: TICKET SİSTEMİ (WIZARD)
// ==============================================================================

async function handleTicketSetupStart(interaction) {
  checkAdminPermission(interaction);
  setData('draft', interaction.user.id, { step: 'ticket_panel', data: { categories: [] } });
  
  const modal = createCustomModal('tsetup_modal_panel', 'Ticket Paneli Bilgileri', [
    { id: 'title', label: 'Panel Başlığı', value: 'Destek Sistemi', required: true },
    { id: 'desc', label: 'Panel Açıklaması', value: 'Aşağıdaki butonlardan birini seçerek bilet açabilirsiniz.', paragraph: true, required: true }
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
    createCustomButton('tsetup_type_single', 'Düz (Tek Buton)', ButtonStyle.Primary),
    createCustomButton('tsetup_type_multi', 'Kategorili (Menü)', ButtonStyle.Success)
  );

  await interaction.reply({ content: 'Bilet sistemi kategorili mi olsun, yoksa tek bir buton mu olsun?', components: [row], ephemeral: true });
}

// ==============================================================================
// BÖLÜM 9: BAŞVURU SİSTEMİ (WIZARD + ADMIN SORULARI)
// ==============================================================================

async function handleApplicationSetupStart(interaction) {
  // SADECE YÖNETİCİLER KURABİLİR
  checkAdminPermission(interaction);
  setData('draft', interaction.user.id, { step: 'app_channel', data: { questions: [] } });
  
  const row = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('app_setup_channel')
      .setPlaceholder('Başvuru panelinin gönderileceği kanalı seçin')
      .setChannelTypes([ChannelType.GuildText])
      .setMinValues(1)
      .setMaxValues(1)
  );
  
  await interaction.reply({ content: 'Adım 1: Başvuru paneli nereye gönderilsin?', components: [row], ephemeral: true });
}

async function handleApplicationChannelSelect(interaction) {
  const draft = getData('draft', interaction.user.id);
  draft.data.channelId = interaction.values[0];
  draft.step = 'app_details';
  setData('draft', interaction.user.id, draft);

  const modal = createCustomModal('app_setup_modal', 'Başvuru Sistemi Detayları', [
    { id: 'title', label: 'Başvuru Başlığı', value: 'Yetkili Başvurusu', required: true },
    { id: 'desc', label: 'Başvuru Açıklaması', value: 'Aşağıdaki butona tıklayarak başvuru formunu doldurabilirsiniz.', paragraph: true, required: true },
    { id: 'log_channel', label: 'Log Kanalı ID (Boş bırakırsanız otomatik açar)', value: '', required: false }
  ]);

  await interaction.showModal(modal);
}

// ==============================================================================
// BÖLÜM 10: ÇEKİLİŞ SİSTEMİ
// ==============================================================================

async function handleGiveawayCreate(interaction) {
  checkAdminPermission(interaction);
  const channel = interaction.options.getChannel('channel');
  setData('draft', interaction.user.id, { step: 'gw_details', data: { channelId: channel.id } });
  
  const modal = createCustomModal('gw_create_modal', 'Çekiliş Detayları', [
    { id: 'prize', label: 'Ödül', value: 'Ödül Adı', required: true },
    { id: 'winners', label: 'Kazanan Sayısı', value: '1', required: true },
    { id: 'time', label: 'Süre (Örnek: 1d 2h 30m)', value: '1d', required: true },
    { id: 'desc', label: 'Açıklama (İsteğe Bağlı)', value: '', paragraph: true, required: false }
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
    .setDescription('**İlk tıklayan kazanır!** Hemen aşağıdaki butona tıkla.')
    .setColor(COLORS.WARNING);
    
  const row = new ActionRowBuilder().addComponents(
    createCustomButton(`gw_drop_claim_${generateId()}`, 'Hemen Tıkla!', ButtonStyle.Success, false, '🎁')
  );
  
  const msg = await channel.send({ embeds: [embed], components: [row] });
  
  await interaction.editReply({ content: `Drop başarıyla başlatıldı! Mesaj Linki: ${msg.url}` });
}

// ==============================================================================
// BÖLÜM 11: ANA İNTERAKSİYON YÖNETİCİSİ (MOTOR)
// ==============================================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.inGuild() || interaction.guildId !== process.env.GUILD_ID) return;

  try {
    // =====================================================================
    // 1. SLASH KOMUTLARI
    // =====================================================================
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'about') {
        const embed = createStandardEmbed(
          '✨ LD GIVEAWAYS | Enterprise',
          'Bu bot **Dream** tarafından **LD Giveaways** için özel olarak geliştirilmiştir.\n\n' +
          '**Geliştirici:** <@696735778356854913>\n' +
          '**Sahip:** <@1026324207098925147>\n\n' +
          `**Versiyon:** v${BOT_VERSION}\n**Altyapı:** Node.js & Discord.js v14`,
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
          return interaction.editReply(`\`${id}\` ID'li çekiliş bitirildi (Simüle edildi).`);
        }
      }

      if (commandName === 'mod') {
        checkAdminPermission(interaction);
        const sub = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });
        
        if (sub === 'ban') {
          const user = interaction.options.getUser('user');
          const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi.';
          await interaction.guild.members.ban(user.id, { reason });
          return interaction.editReply(`**${user.tag}** başarıyla banlandı. Sebep: ${reason}`);
        }
        if (sub === 'kick') {
          const user = interaction.options.getUser('user');
          const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi.';
          await interaction.guild.members.kick(user.id, reason);
          return interaction.editReply(`**${user.tag}** sunucudan atıldı.`);
        }
        if (sub === 'purge') {
          const amount = interaction.options.getInteger('amount');
          if (amount < 1 || amount > 100) throw new Error('Miktar 1 ile 100 arasında olmalıdır.');
          await interaction.channel.bulkDelete(amount, true);
          return interaction.editReply(`${amount} adet mesaj silindi.`);
        }
        if (sub === 'lock') {
          await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
          return interaction.editReply('Kanal başarıyla kilitlendi.');
        }
        if (sub === 'unlock') {
          await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
          return interaction.editReply('Kanal kilidi başarıyla açıldı.');
        }
      }
    }

    // =====================================================================
    // 2. BUTONLAR
    // =====================================================================
    if (interaction.isButton()) {
      
      // --- TICKET BUTONLARI ---
      if (interaction.customId === 'tsetup_type_single') {
        const draft = getData('draft', interaction.user.id);
        draft.data.type = 'single';
        draft.step = 'ticket_single_btn';
        setData('draft', interaction.user.id, draft);
        
        const modal = createCustomModal('tsetup_modal_single', 'Buton Ayarları', [
          { id: 'btn_name', label: 'Buton Adı', value: 'Destek Aç', required: true },
          { id: 'welcome', label: 'Bilet İçi Karşılama Mesajı', value: 'Yetkililerimiz en kısa sürede ilgilenecektir.', paragraph: true, required: true }
        ]);
        return interaction.showModal(modal);
      }

      // --- BAŞVURU BUTONLARI (SORU EKLEME) ---
      if (interaction.customId === 'app_add_question') {
        const draft = getData('draft', interaction.user.id);
        if (draft.data.questions.length >= MAX_APP_QUESTIONS) {
          return interaction.reply({ content: `Maksimum ${MAX_APP_QUESTIONS} soru ekleyebilirsiniz.`, ephemeral: true });
        }
        
        const modal = createCustomModal('app_add_question_modal', 'Yeni Soru Ekle', [
          { id: 'q_text', label: 'Soru Metni', value: 'Adınız nedir?', required: true },
          { id: 'q_type', label: 'Cevap Tipi (kisa/uzun)', value: 'kisa', required: true }
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
            name: 'başvuru-sonuçları',
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
          createCustomButton(`app_open_${appId}`, 'Başvuru Yap', ButtonStyle.Success, false, '🪪')
        );

        await targetChannel.send({ embeds: [embed], components: [row] });
        deleteData('draft', interaction.user.id);

        return interaction.editReply({ content: 'Başvuru sistemi başarıyla kuruldu ve panel gönderildi!' });
      }

      if (interaction.customId.startsWith('app_open_')) {
        const appId = interaction.customId.replace('app_open_', '');
        const app = getData('application', appId);
        if (!app) return interaction.reply({ content: 'Başvuru sistemi bulunamadı.', ephemeral: true });

        if (app.questions.length === 0) {
          return interaction.reply({ content: 'Bu başvuru formunda hiç soru yok.', ephemeral: true });
        }

        const questions = app.questions.map((q, i) => ({ id: `q${i}`, label: q.text, paragraph: q.type === 'uzun', required: true }));
        const modal = createCustomModal(`app_submit_${appId}`, app.title, questions.slice(0, 5));
        return interaction.showModal(modal);
      }

      // --- ÇEKİLİŞ DROP BUTONU ---
      if (interaction.customId.startsWith('gw_drop_claim_')) {
        await interaction.reply({ content: '🎉 **Tebrikler!** Ödülü kazandınız. Yetkililer en kısa sürede size ulaşacak.', ephemeral: true });
        const row = new ActionRowBuilder().addComponents(
          createCustomButton('gw_drop_claimed', 'Kazanıldı!', ButtonStyle.Secondary, true)
        );
        await interaction.message.edit({ components: [row] });
      }
    }

    // =====================================================================
    // 3. MODALLAR
    // =====================================================================
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      // --- TICKET MODALLARI ---
      if (customId === 'tsetup_modal_panel') return handleTicketSetupPanelSubmit(interaction);

      // --- BAŞVURU MODALLARI ---
      if (customId === 'app_setup_modal') {
        const draft = getData('draft', interaction.user.id);
        draft.data.title = interaction.fields.getTextInputValue('title');
        draft.data.desc = interaction.fields.getTextInputValue('desc');
        draft.data.logChannelId = interaction.fields.getTextInputValue('log_channel').trim() || null;
        setData('draft', interaction.user.id, draft);

        const row = new ActionRowBuilder().addComponents(
          createCustomButton('app_add_question', 'Soru Ekle', ButtonStyle.Primary),
          createCustomButton('app_finish_setup', 'Kurulumu Bitir', ButtonStyle.Success)
        );

        return interaction.reply({ 
          content: `Harika! Şimdi başvuru formuna sorular ekleyin.\nŞu anki soru sayısı: **${draft.data.questions.length}**`, 
          components: [row], 
          ephemeral: true 
        });
      }

      if (customId === 'app_add_question_modal') {
        const draft = getData('draft', interaction.user.id);
        const qText = interaction.fields.getTextInputValue('q_text');
        const qType = interaction.fields.getTextInputValue('q_type').toLowerCase().includes('uzun') ? 'uzun' : 'kisa';
        
        draft.data.questions.push({ text: qText, type: qType });
        setData('draft', interaction.user.id, draft);

        const row = new ActionRowBuilder().addComponents(
          createCustomButton('app_add_question', 'Yeni Soru Ekle', ButtonStyle.Primary),
          createCustomButton('app_finish_setup', 'Kurulumu Bitir', ButtonStyle.Success)
        );

        return interaction.reply({ 
          content: `Soru başarıyla eklendi! Toplam Soru: **${draft.data.questions.length}**\nDevam etmek için bir seçenek belirleyin.`, 
          components: [row], 
          ephemeral: true 
        });
      }

      if (customId.startsWith('app_submit_')) {
        await interaction.deferReply({ ephemeral: true });
        const appId = customId.replace('app_submit_', '');
        const app = getData('application', appId);
        if (!app) throw new Error('Başvuru bulunamadı.');

        const logChannel = await interaction.guild.channels.fetch(app.logChannelId).catch(() => null);
        if (!logChannel) throw new Error('Log kanalı bulunamadı (Silinmiş olabilir).');

        const answers = app.questions.map((q, i) => {
          const answer = interaction.fields.getTextInputValue(`q${i}`).substring(0, 1000);
          return `**Soru:** ${q.text}\n**Cevap:** ${answer}`;
        }).join('\n\n');

        const embed = createStandardEmbed(`Yeni Başvuru: ${interaction.user.tag}`, answers, COLORS.WARNING);
        embed.setFooter({ text: `Kullanıcı ID: ${interaction.user.id}` });

        const row = new ActionRowBuilder().addComponents(
          createCustomButton(`app_accept_${interaction.user.id}`, 'Kabul Et', ButtonStyle.Success),
          createCustomButton(`app_reject_${interaction.user.id}`, 'Reddet', ButtonStyle.Danger)
        );

        await logChannel.send({ embeds: [embed], components: [row] });
        return interaction.editReply({ content: 'Başvurunuz başarıyla iletildi! Yetkililerimiz sizinle iletişime geçecektir.' });
      }
    }

    // =====================================================================
    // 4. SELECT MENÜLER
    // =====================================================================
    if (interaction.isChannelSelectMenu()) {
      if (interaction.customId === 'app_setup_channel') {
        return handleApplicationChannelSelect(interaction);
      }
    }

  } catch (error) {
    console.error(`[HATA] ${interaction.user.tag} etkileşiminde sorun çıktı:`, error);
    const errorMsg = { content: `Bir hata oluştu: ${error.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMsg).catch(() => null);
    } else {
      await interaction.reply(errorMsg).catch(() => null);
    }
  }
});

// ==============================================================================
// BÖLÜM 12: BOTU BAŞLATMA VE WEB SUNUCUSU
// ==============================================================================

async function startBot() {
  if (!process.env.DISCORD_TOKEN) {
    console.error('KRİTİK HATA: DISCORD_TOKEN ortam değişkeni eksik!');
    process.exit(1);
  }

  client.once('ready', async () => {
    console.log(`=========================================`);
    console.log(`[BOT] ${client.user.tag} olarak giriş yapıldı.`);
    console.log(`[BOT] Versiyon: ${BOT_VERSION}`);
    console.log(`=========================================`);
    
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: BOT_COMMANDS }
      );
      console.log('[BOT] Slash komutları başarıyla yüklendi.');
    } catch (error) {
      console.error('[BOT] Komutlar yüklenirken hata oluştu:', error);
    }
  });

  // Render Health Check
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('LD GIVEAWAYS ENTERPRISE IS RUNNING');
  });
  
  server.listen(process.env.PORT || 10000, '0.0.0.0', () => {
    console.log(`[WEB] Web sunucusu ${process.env.PORT || 10000} portunda aktif.`);
  });

  await client.login(process.env.DISCORD_TOKEN);
}

startBot().catch(console.error);