/**
 * LD GIVEAWAYS
 * My Owner: Unitey
 * My Developer: Dream
 *
 * ====================== TÜRKÇE KURULUM REHBERİ ======================
 * Bütün uygulama kodu bu dosyadadır. Başka kaynak dosyası gerekmez.
 * Veritabanını program kendisi oluşturur; veritabanı kod dosyası değildir.
 *
 * GEREKENLER
 * - Node.js 24.x
 * - discord.js 14.28.1 (Render build komutu otomatik kurar)
 * - Discord bot uygulaması, kendi sunucunda kurulum yetkisi
 * - Kesintisiz çalışma için uyumayan Render servisi ve kalıcı disk
 * - Bir servis örneği (instance). Aynı botu ikinci yerde çalıştırma.
 *
 * 1) DISCORD UYGULAMASI (mobilden tarayıcı masaüstü görünümü kullanılabilir)
 * https://discord.com/developers/applications adresinde New Application aç.
 * İsmini LD GIVEAWAYS yap. Bot sayfasından token oluştur/kopyala.
 * TOKEN ŞİFREDİR: bu dosyaya, GitHub'a, sohbete veya ekran görüntüsüne koyma.
 * Paylaşıldıysa Bot > Reset Token yap ve Render değişkenini güncelle.
 * General Information > Application ID değerini kopyala: CLIENT_ID.
 * Hazırlanan profil resmini kaydet; Developer Portal'daki bot avatarı
 *   alanına yükle. Banner dosyası da ayrıca teslim edilmiştir; görseller
 *   kod bağımlılığı değildir, GitHub reposuna yüklemen gerekmez.
 * Bot > Privileged Gateway Intents:
 *   SERVER MEMBERS INTENT: açık (üyelik, roller, uygunluk kontrolleri).
 *   MESSAGE CONTENT INTENT: açık (ticket transcript mesaj metinleri).
 *   PRESENCE INTENT gerekli değil.
 * Discord > Settings > Advanced > Developer Mode açık olsun.
 * Sunucu menüsünden Copy Server ID: GUILD_ID.
 *
 * 2) DAVET
 * OAuth2 > URL Generator > bot ve applications.commands seç.
 * Bot için kullanılan izinler:
 * View Channels, Send Messages, Embed Links, Attach Files,
 * Read Message History, Manage Channels, Manage Roles, Manage Messages,
 * Moderate Members, Kick Members, Ban Members.
 * Administrator şart değil. Yetki sınırlarını kendin belirleyebilirsin;
 * vermediğin izni gerektiren işlem hata mesajıyla durur.
 * Bot rolünü yöneteceği rollerin ve üyelerin ÜSTÜNE taşı.
 * Bot, sunucu sahibini veya kendisinden üst/eşit üyeyi yönetemez.
 * Ticket destek rolü kurulum komutunda seçilir, gizli yetki oluşturulmaz.
 *
 * 3) GITHUB (telefon uygulaması veya tarayıcı)
 * Yeni bir private repository aç. Add file > Upload files ile SADECE bu
 * index.js dosyasını yükle ve Commit changes yap. Token yükleme.
 * Ayrı package.json, .env veya komut dosyası gerekmiyor.
 *
 * 4) RENDER WEB SERVICE
 * https://dashboard.render.com > New > Web Service > GitHub reposunu seç.
 * Runtime: Node. Branch: yüklediğin branch. Root Directory: boş.
 * Build Command:
 *   npm install --no-save --package-lock=false discord.js@14.28.1
 * Start Command:
 *   node index.js
 * Health Check Path:
 *   /healthz
 * Instance: uyumayan ÜCRETLİ bir seçenek seç; fiyatı panelden kontrol et.
 * Environment:
 *   NODE_VERSION = 24
 *   DISCORD_TOKEN = Bot sayfasındaki gizli token
 *   CLIENT_ID = Application ID
 *   GUILD_ID = Server ID
 *   DB_PATH = /var/data/ld-giveaways.sqlite
 *   SETUP_ENABLED = true
 * Advanced / Disks bölümünde kalıcı disk ekle:
 *   Mount Path = /var/data
 *   Size = ihtiyacına göre, başlangıçta 1 GB yeterli olabilir.
 * Render PORT değişkenini kendisi verir; kod bu portu dinler.
 * Manual Deploy / Deploy latest commit yap. Logda "Ready as ..." bekle.
 * /healthz yalnızca bot Discord'a hazırken 200, değilken 503 döndürür.
 * Ücretsiz plan + ping servisi gerçek 7/24 garantisi değildir.
 * Hiçbir barındırıcı için %100 kesintisizlik garantisi verilemez.
 *
 * 5) İLK KULLANIM
 * /help veya /about: İngilizce, yalnız kullanıcıya görünen yardım.
 * /announcement text: seçilen kanala yalnız senin metnin.
 * /say text: aynı davranış. İkisi de sadece Administrator içindir.
 * /dm user text: sadece Administrator; önce özel önizleme, sonra Send.
 * /status text activity availability: sadece Administrator.
 * /moderation-log channel: mod kayıtları için kanal seç.
 *
 * TICKET:
 * /ticket setup channel support-role log-channel parent-category
 *   Başlık/metin/buton/ilk karşılama mesajı gir. Sonra düz/kategorili seç.
 *   Kategoriliyse 1-25 kategori seç; her birinin adını ve iç mesajını
 *   ayrı düzenle. Düzenlenmemiş kategoriyle yayınlamaya izin verilmez.
 *   Önizlemeden Send. Emoji veya rastgele başlık eklenmez.
 * /ticket edit message-id: mevcut paneli düzenle; mevcut ticket değişmez.
 *   support-role, log-channel, parent-category isteğe bağlı değiştirilebilir.
 *   clear-staff / clear-log / clear-parent ile önceki ayar temizlenebilir.
 * /ticket add user, remove user, close, transcript, delete: ticket kanalında.
 * Ticket butonları: Claim / Close. Kapatma notu, transcript ve DM
 *   geri bildirim puanı (1-5) var. Kapanan kanal otomatik silinmez.
 *   Transcript son 5000 mesajı alır; daha eskisi için uyarı içerir.
 *   Log kanalı açacaksan özel yap. Transcript hassas mesaj içerebilir.
 * /ticket delete: kapalı ticketı ayrıca onaylayarak siler.
 *
 * ÇEKİLİŞ:
 * /giveaway create channel required-role min-account-days
 *   Süre menüsünden seçim yap, sonra ödül/süre/kazanan/açıklama formu.
 *   Süre: 30m, 2h, 3d, 1w veya 1h 30m. En çok 365 gün.
 *   Önizlemeden Send. Katıl/ayrıl tek buton; kayıtlar kalıcıdır.
 * /giveaway end message-id, reroll message-id, cancel message-id
 *   Bunlar onay ister. Kazananlar crypto.randomInt ile seçilir.
 *   Kazananda üyelik, hesap yaşı ve gerekli rol yeniden kontrol edilir.
 *   DM kapalıysa sonuç kayda geçer, çekiliş bozulmaz.
 *   Bot kapalıyken süre dolarsa açılınca tamamlar; tam saniye garanti değil.
 *   Bu bot LD satın almaz/aktarmaz ve oyunun API'sine bağlanmaz.
 *   Ödül teslimi sizin tarafınızdan manuel yapılır.
 *
 * BAŞVURU:
 * /application setup channel log-channel staff-role
 *   Log seçmezsen private application-results kanalı oluşturulur.
 *   staff-role seçtiysen o rol + yöneticiler görebilir, diğerleri göremez.
 *   Başlık/metin/buton yazısı/soruları gir; her soru ayrı satır.
 *   1-25 soru; her soru en çok 45 karakter. 5'ten fazlası sayfalıdır.
 *   Form dolduran kişi Continue ile sonraki sayfayı açar.
 *   Sonra Submit ile gönderir. Edit answers ile cevaplarını değiştirebilir.
 *   Panelde yeşil 🪪 butonu var; diğer sistemlere emoji eklenmez.
 *   Sonuç kanalında yeşil Accept / kırmızı Reject.
 *   Uzun formlarda cevaplar ayrı düzenli mesajlara bölünür; karar butonları
 *   en son mesajdadır. Yarım aktarım kaydedilir, otomatik devam eder.
 *   Reject önce Note formu açar; karar ve sebep başvurana DM gider.
 *   Accept rol VERMEZ; rolü yetkililer manuel verir.
 * /application edit message-id: başlık/metin/soru/buton düzenle.
 * /application retry-dm submission-id: başarısız karar DM'sini tekrar dene.
 *
 * EMOJI ROL:
 * /roles setup channel: her satıra emoji | rol ID | buton yazısı.
 *   Örnek: 🎮 | 123456789012345678 | Gamer
 *   En çok 20 rol. Bunlar emoji BUTONLARIDIR, mesaj reaksiyonu değildir.
 *   Böylece kaldırma süresi gerçekten uygulanır: aldıktan 20 saniye sonra
 *   aynı butonla kaldırılabilir; tekrar alınca yeni 20 saniye başlar.
 *   Tehlikeli yetkili/managed/@everyone/üst rol eklenemez.
 *   Özel sunucu emojisi için <:name:id> veya <a:name:id> kullan.
 *
 * MODERASYON:
 * /moderate warn, warnings, clear-warnings, timeout, untimeout, kick,
 *   ban, unban, purge, slowmode, lock, unlock, cases.
 *   Uygun Discord izni gerekir. Ban/kick/purge/clear-warnings/lock onaylı.
 *   Lock mevcut @everyone SendMessages ayarını saklar; unlock geri yükler.
 *   Ban mesaj geçmişini topluca silmez. Purge en fazla 100 yeni mesaj.
 *
 * SUNUCU KURMA:
 * /server-setup: 30 özgün şablon, iki sayfalı seçim ve değişiklik önizleme.
 *   Create template tekrar onay ister. Var olan kanalları/rolleri silmez,
 *   üyelerin rollerini değiştirmez, kimseye otomatik yönetici vermez.
 *   Oluşturduğu normal rollerin izinleri sıfırdır, atamayı sen yaparsın.
 *   Information altındaki rules/announcements kanalları salt okunurdur.
 *   Aynı isim/türde var olanları atlar. Kısmi hataları raporlar.
 *   İlerleme veritabanında tutulur; yarım iş /server-setup-resume ile sürer.
 *   Kurulum komutunu kapatmak için SETUP_ENABLED=false yap.
 *
 * BAKIM / TEST
 * node index.js --self-test : token gerekmeden yerel testleri çalıştırır.
 * /diagnostics: sadece admin, bağlantı ve kayıt sayıları.
 * /data-export: sadece admin, sunucunun kayıtlarını JSON ek olarak verir.
 *   Bu dışa aktarım özel bilgi içerir; herkese açık paylaşma.
 * Kalıcı diskin Render snapshot/backuplarını düzenli kontrol et.
 * Kod tek instance içindir; yatay ölçeklendirme yapma.
 * Bot tokenı olmadan gerçek Discord uçtan uca testi yapılamaz.
 * Ağ kesilmesinde Discord'a gönderimle yerel kaydın aynı anda atomik
 *   tamamlanması mümkün değildir; nadiren tekrar bildirim oluşabilir.
 *
 * Belgeler:
 * https://render.com/docs/free
 * https://render.com/docs/disks
 * https://docs.discord.com/developers/components/reference
 * https://docs.discord.com/developers/interactions/receiving-and-responding
 * https://discord.js.org/docs/packages/discord.js/14.28.1
 * ==================================================================
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const D = require('discord.js');
const {
  Client, GatewayIntentBits: I, Partials, PermissionFlagsBits: P,
  SlashCommandBuilder: SC, EmbedBuilder: Embed, ActionRowBuilder: Row,
  ButtonBuilder: Button, ButtonStyle: BS, StringSelectMenuBuilder: Select,
  ModalBuilder: Modal, LabelBuilder: Label, TextInputBuilder: Input,
  TextInputStyle: TS, ChannelType: CT, ActivityType: AT, MessageFlags: MF,
  AttachmentBuilder: Attachment, REST, Routes, Events,
} = D;

const SELF_TEST = process.argv.includes('--self-test');
const VERSION = '1.0.0';
const COLOR = 0x57d7ef;
const SECRET_KEYS = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const now = () => Date.now();
const id = () => crypto.randomBytes(9).toString('hex');
const clone = x => JSON.parse(JSON.stringify(x));
const noMentions = { parse: [], repliedUser: false };
const cut = (v, n) => String(v ?? '').slice(0, n);
const stamp = t => `<t:${Math.floor(t / 1000)}:R>`;
const fail = text => { throw new Error(text); };
function duration(text) {
  const s = String(text).trim().toLowerCase();
  let total = 0, consumed = '';
  for (const m of s.matchAll(/(\d+)\s*([smhdw])/g)) {
    total += Number(m[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 }[m[2]];
    consumed += m[0].replace(/\s/g, '');
  }
  if (consumed !== s.replace(/\s/g, '') || !total || !Number.isSafeInteger(total)) fail('Enter a duration such as 30m, 2h, 3d or 1h 30m.');
  return total;
}
function choose(items, count, random = crypto.randomInt) {
  const pool = [...new Set(items)], out = [];
  while (pool.length && out.length < count) out.push(pool.splice(random(pool.length), 1)[0]);
  return out;
}
function questions(text) {
  const q = text.split('\n').map(x => x.trim()).filter(Boolean);
  if (!q.length || q.length > 25 || q.some(x => x.length > 45)) fail('Use 1-25 questions, one per line, with at most 45 characters each.');
  return q;
}
const templateSpecs = [
  ['LD Giveaways', ['giveaways', 'ld-drops', 'winners', 'proofs'], ['giveaway-chat', 'support'], ['Member', 'Giveaway Ping']],
  ['Gaming Community', ['game-news', 'looking-for-group', 'clips', 'game-chat'], ['General', 'Squad'], ['Gamer', 'Event Ping']],
  ['GoreBox Community', ['gorebox-news', 'game-chat', 'creations', 'screenshots'], ['General', 'Gameplay'], ['Player', 'Creator']],
  ['Esports Team', ['team-news', 'scrims', 'roster', 'match-results'], ['Team', 'Practice'], ['Player', 'Supporter']],
  ['Tournament', ['brackets', 'registration', 'match-schedule', 'results'], ['Lobby', 'Match Room'], ['Competitor', 'Spectator']],
  ['Streaming', ['stream-alerts', 'stream-chat', 'clips', 'suggestions'], ['Community', 'Watch Party'], ['Viewer', 'Stream Ping']],
  ['Content Creator', ['uploads', 'behind-the-scenes', 'ideas', 'fan-art'], ['Lounge', 'Collaboration'], ['Community', 'Upload Ping']],
  ['Study Group', ['resources', 'questions', 'notes', 'study-goals'], ['Study Room', 'Discussion'], ['Student', 'Study Ping']],
  ['School Club', ['club-news', 'events', 'projects', 'club-chat'], ['Meeting', 'Social'], ['Member', 'Event Ping']],
  ['University', ['campus-news', 'courses', 'assignments', 'campus-chat'], ['Study', 'Social'], ['Student', 'Alumni']],
  ['Programming', ['code-help', 'projects', 'resources', 'code-review'], ['Pair Programming', 'Discussion'], ['Developer', 'Learner']],
  ['Open Source', ['release-notes', 'issues', 'contributions', 'development'], ['Contributor Room', 'Planning'], ['Contributor', 'User']],
  ['Design', ['design-chat', 'showcase', 'feedback', 'resources'], ['Studio', 'Review'], ['Designer', 'Learner']],
  ['Art', ['gallery', 'work-in-progress', 'art-feedback', 'art-chat'], ['Studio', 'Lounge'], ['Artist', 'Collector']],
  ['Music', ['music-chat', 'releases', 'recommendations', 'collaborations'], ['Listening Room', 'Studio'], ['Listener', 'Musician']],
  ['Photography', ['photo-gallery', 'photo-feedback', 'gear-chat', 'locations'], ['Lounge', 'Workshop'], ['Photographer', 'Member']],
  ['Book Club', ['current-book', 'book-discussion', 'recommendations', 'reading-goals'], ['Book Discussion', 'Lounge'], ['Reader', 'Book Ping']],
  ['Anime', ['anime-chat', 'recommendations', 'fan-art', 'spoilers'], ['Lounge', 'Watch Party'], ['Member', 'Watch Ping']],
  ['Film Club', ['film-chat', 'reviews', 'watchlist', 'spoilers'], ['Discussion', 'Watch Party'], ['Member', 'Film Ping']],
  ['Fitness', ['fitness-chat', 'progress', 'workouts', 'goals'], ['Lounge', 'Training Chat'], ['Member', 'Challenge Ping']],
  ['Language Exchange', ['language-chat', 'practice', 'resources', 'introductions'], ['Practice Room', 'Conversation'], ['Learner', 'Partner']],
  ['Technology', ['tech-news', 'hardware', 'software', 'tech-help'], ['Lounge', 'Discussion'], ['Member', 'News Ping']],
  ['Support Community', ['support-guide', 'questions', 'known-issues', 'feedback'], ['Lounge', 'Support Waiting'], ['Member', 'Updates']],
  ['Small Business', ['business-updates', 'products', 'questions', 'feedback'], ['Community', 'Meeting'], ['Customer', 'Updates']],
  ['Project Team', ['project-updates', 'planning', 'tasks', 'deliverables'], ['Standup', 'Collaboration'], ['Contributor', 'Observer']],
  ['Events', ['event-news', 'schedule', 'registration', 'event-chat'], ['Event Room', 'Lounge'], ['Attendee', 'Event Ping']],
  ['Roleplay', ['world-info', 'characters', 'roleplay-chat', 'out-of-character'], ['Roleplay', 'Lounge'], ['Player', 'Spectator']],
  ['Minecraft', ['server-info', 'builds', 'trading', 'minecraft-chat'], ['Survival', 'Creative'], ['Player', 'Server Ping']],
  ['Roblox', ['game-updates', 'looking-for-group', 'creations', 'roblox-chat'], ['Gameplay', 'Lounge'], ['Player', 'Event Ping']],
  ['Friends', ['general', 'memes', 'photos', 'plans'], ['Hangout', 'Gaming'], ['Friend', 'Plans Ping']],
];
function templatePlan(n) {
  const [name, texts, voices, roles] = templateSpecs[n] || fail('Unknown template.');
  return { name, roles, categories: [
    { name: 'Information', channels: [{ name: 'rules', type: CT.GuildText, readOnly: true }, { name: 'announcements', type: CT.GuildText, readOnly: true }] },
    { name: name, channels: texts.map(name => ({ name, type: CT.GuildText })) },
    { name: 'Voice', channels: voices.map(name => ({ name, type: CT.GuildVoice })) },
  ] };
}

class Store {
  constructor(filename) {
    if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));');
    this.getStmt = this.db.prepare('SELECT data FROM records WHERE kind=? AND id=?');
    this.putStmt = this.db.prepare('INSERT INTO records(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data');
    this.allStmt = this.db.prepare('SELECT data FROM records WHERE kind=?');
  }
  get(k, key) { const r = this.getStmt.get(k, String(key)); return r ? JSON.parse(r.data) : null; }
  put(k, key, value) { this.putStmt.run(k, String(key), JSON.stringify(value)); return value; }
  all(k) { return this.allStmt.all(k).map(r => JSON.parse(r.data)); }
  del(k, key) { this.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(k, String(key)); }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = fn(); this.db.exec('COMMIT'); return value; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
}
const db = new Store(SELF_TEST ? ':memory:' : (process.env.DB_PATH || path.join(__dirname, 'data', 'ld-giveaways.sqlite')));
const client = new Client({
  intents: [I.Guilds, I.GuildMembers, I.GuildMessages, I.MessageContent, I.DirectMessages],
  partials: [Partials.Channel],
  allowedMentions: noMentions,
});
const locks = new Set();
async function locked(key, fn) {
  if (locks.has(key)) fail('This action is already being processed. Please try again shortly.');
  locks.add(key);
  try { return await fn(); } finally { locks.delete(key); }
}
const b = (custom, label, style = BS.Secondary, emoji) => {
  const x = new Button().setCustomId(custom).setLabel(cut(label, 80)).setStyle(style);
  if (emoji) x.setEmoji(emoji);
  return x;
};
const row = (...buttons) => new Row().addComponents(buttons);
const select = (custom, placeholder, options) => row(new Select().setCustomId(custom).setPlaceholder(placeholder).addOptions(options));
const embed = (title, text) => new Embed().setColor(COLOR).setTitle(cut(title, 256)).setDescription(cut(text || ' ', 4096));
async function reply(i, payload) {
  const data = typeof payload === 'string' ? { content: payload } : payload;
  if (i.deferred) return i.editReply({ ...data, allowedMentions: noMentions });
  if (i.replied) return i.followUp({ ...data, flags: MF.Ephemeral, allowedMentions: noMentions });
  return i.reply({ ...data, flags: MF.Ephemeral, allowedMentions: noMentions });
}
const defer = i => i.deferReply({ flags: MF.Ephemeral });
async function modal(i, custom, title, fields) {
  const m = new Modal().setCustomId(custom).setTitle(cut(title, 45));
  for (const f of fields) {
    const input = new Input().setCustomId(f.id).setStyle(f.long ? TS.Paragraph : TS.Short)
      .setRequired(f.required !== false).setMaxLength(f.max || 4000);
    if (f.value) input.setValue(cut(f.value, f.max || 4000));
    if (f.placeholder) input.setPlaceholder(cut(f.placeholder, 100));
    m.addLabelComponents(new Label().setLabel(cut(f.label, 45)).setTextInputComponent(input));
  }
  return i.showModal(m);
}
const field = (i, name) => i.fields.getTextInputValue(name).trim();
async function member(i) {
  if (!i.guild) fail('Use this command in the server.');
  return i.guild.members.fetch(i.user.id);
}
async function need(i, permission = P.Administrator) {
  const m = await member(i);
  if (!m.permissions.has(permission)) fail('You do not have permission to use this action.');
  return m;
}
async function botNeed(g, ...permissions) {
  const me = await g.members.fetchMe();
  if (!me.permissions.has(permissions)) fail('The bot is missing a required server permission.');
  return me;
}
async function textChannel(g, channelId) {
  const c = await g.channels.fetch(channelId);
  if (!c || c.type !== CT.GuildText) fail('Choose a standard server text channel.');
  const me = await g.members.fetchMe();
  if (!c.permissionsFor(me)?.has([P.ViewChannel, P.SendMessages, P.EmbedLinks])) fail('The bot needs View Channel, Send Messages and Embed Links in that channel.');
  return c;
}
function draft(i, kind, values = {}) {
  const d = { id: id(), kind, guild: i.guildId, owner: i.user.id, expires: now() + 86400000, ...values };
  db.put('draft', d.id, d); return d;
}
function getDraft(i, key, kind) {
  const d = db.get('draft', key);
  if (!d || d.expires < now()) fail('This setup has expired. Start the setup command again.');
  if (d.owner !== i.user.id || d.guild !== i.guildId || (kind && d.kind !== kind)) fail('This setup belongs to another user.');
  return d;
}
async function audit(g, action, actor, target, reason, extra = '') {
  const record = { id: id(), guild: g.id, action, actor, target, reason, extra, at: now() };
  db.put('case', record.id, record);
  const cfg = db.get('config', g.id);
  if (cfg?.log) {
    try {
      const c = await textChannel(g, cfg.log);
      await c.send({ embeds: [embed(action, `**Actor:** <@${actor}>\n**Target:** ${target || 'Not applicable'}\n**Reason:** ${cut(reason || 'Not provided', 1000)}\n${extra ? `**Details:** ${cut(extra, 1000)}\n` : ''}**Case ID:** \`${record.id}\``)] });
    } catch (e) { console.error('Audit delivery failed:', safeError(e)); }
  }
  return record;
}
function safeError(e) {
  const code = e?.code;
  if (code === 50007) return 'Direct messages are closed or unavailable.';
  if (code === 50013) return 'Missing permissions. Check channel access and role hierarchy.';
  if (code === 50001) return 'The bot cannot access this resource.';
  if (code === 10003 || code === 10008) return 'The channel or message no longer exists.';
  if (e?.name === 'DiscordAPIError' || String(e?.name).startsWith('DiscordAPIError')) return `Discord rejected the request (code ${code || 'unknown'}).`;
  return cut(e?.message || 'An unexpected error occurred.', 700).replace(/[\w-]{20,}\.[\w-]{5,}\.[\w-]{20,}/g, '[redacted]');
}

function command(name, description, permission) {
  const c = new SC().setName(name).setDescription(description).setDMPermission(false);
  if (permission) c.setDefaultMemberPermissions(permission);
  return c;
}
const str = (builder, name, description, required = false, max = 2000) =>
  builder.addStringOption(o => o.setName(name).setDescription(description).setRequired(required).setMaxLength(max));
const channelOpt = (builder, name, description, required = false, type = CT.GuildText) =>
  builder.addChannelOption(o => o.setName(name).setDescription(description).addChannelTypes(type).setRequired(required));
const userOpt = builder => builder.addUserOption(o => o.setName('user').setDescription('Member').setRequired(true));
const roleOpt = (builder, name, description) => builder.addRoleOption(o => o.setName(name).setDescription(description));
function commands() {
  const out = [command('help', 'View commands and bot information.'), command('about', 'View bot information.')];
  for (const name of ['announcement', 'say']) {
    const c = str(command(name, 'Send your exact text as the bot.', P.Administrator), 'text', 'Exact message text', true);
    channelOpt(c, 'channel', 'Destination (defaults to this channel)'); out.push(c);
  }
  out.push(str(userOpt(command('dm', 'Preview and send a direct message.', P.Administrator)), 'text', 'Exact direct message text', true));
  const status = str(command('status', 'Set the bot activity and availability.', P.Administrator), 'text', 'Activity text', true, 128);
  status.addStringOption(o => o.setName('activity').setDescription('Activity type').addChoices(...['Playing', 'Watching', 'Listening', 'Competing'].map(x => ({ name: x, value: x }))));
  status.addStringOption(o => o.setName('availability').setDescription('Availability').addChoices(...['online', 'idle', 'dnd', 'invisible'].map(x => ({ name: x, value: x }))));
  out.push(status);
  out.push(channelOpt(command('moderation-log', 'Choose the moderation log channel.', P.Administrator), 'channel', 'Private moderation log channel', true));
  for (const kind of ['ticket', 'application']) {
    const c = command(kind, `Manage ${kind} panels.`, P.Administrator);
    c.addSubcommand(s => {
      s.setName('setup').setDescription(`Create a ${kind} panel.`);
      channelOpt(s, 'channel', 'Panel channel', true);
      roleOpt(s, kind === 'ticket' ? 'support-role' : 'staff-role', 'Staff allowed to handle this system');
      channelOpt(s, 'log-channel', 'Private log channel; applications can create one automatically');
      if (kind === 'ticket') channelOpt(s, 'parent-category', 'Category for ticket channels', false, CT.GuildCategory);
      return s;
    });
    c.addSubcommand(s => {
      str(s.setName('edit').setDescription('Edit an existing panel.'), 'message-id', 'Panel message ID', true, 30);
      roleOpt(s, kind === 'ticket' ? 'support-role' : 'staff-role', 'Replace the configured staff role');
      channelOpt(s, 'log-channel', 'Replace the configured log channel');
      s.addBooleanOption(o => o.setName('clear-staff').setDescription('Use administrators only'));
      s.addBooleanOption(o => o.setName('clear-log').setDescription(kind === 'ticket' ? 'Disable the transcript log' : 'Create a new private review log'));
      if (kind === 'ticket') {
        channelOpt(s, 'parent-category', 'Replace the ticket parent category', false, CT.GuildCategory);
        s.addBooleanOption(o => o.setName('clear-parent').setDescription('Create tickets outside a category'));
      }
      return s;
    });
    if (kind === 'ticket') {
      for (const name of ['add', 'remove']) c.addSubcommand(s => userOpt(s.setName(name).setDescription(`${name === 'add' ? 'Add a member to' : 'Remove a member from'} this ticket.`)));
      for (const name of ['close', 'transcript', 'delete']) c.addSubcommand(s => s.setName(name).setDescription(name === 'delete' ? 'Delete this closed ticket after confirmation.' : name === 'close' ? 'Close this ticket with a closure note.' : 'Download a ticket transcript.'));
    } else c.addSubcommand(s => str(s.setName('retry-dm').setDescription('Retry a failed decision notification.'), 'submission-id', 'Submission ID', true, 30));
    // Ticket staff can use add/remove/transcript; setup/edit are checked again at runtime.
    if (kind === 'ticket') c.setDefaultMemberPermissions(null);
    out.push(c);
  }
  out.push(channelOpt(command('roles', 'Create an emoji role button panel.', P.Administrator), 'channel', 'Panel channel', true));
  const gw = command('giveaway', 'Create and manage giveaways.', P.Administrator);
  gw.addSubcommand(s => {
    s.setName('create').setDescription('Create a giveaway using a duration selector.');
    channelOpt(s, 'channel', 'Giveaway channel', true);
    roleOpt(s, 'required-role', 'Optional required role');
    return s.addIntegerOption(o => o.setName('min-account-days').setDescription('Minimum account age in days').setMinValue(0).setMaxValue(3650));
  });
  for (const name of ['end', 'reroll', 'cancel']) gw.addSubcommand(s => str(s.setName(name).setDescription(`${name} a giveaway after confirmation.`), 'message-id', 'Giveaway message ID', true, 30));
  out.push(gw);
  const mod = command('moderate', 'Moderation commands with permission and hierarchy checks.', P.ModerateMembers);
  // Discord cannot set different default permissions on subcommands.
  // Enforce each action's own permission in need()/hierarchy(), every time.
  mod.setDefaultMemberPermissions(null);
  for (const name of ['warn', 'warnings', 'clear-warnings', 'timeout', 'untimeout', 'kick', 'ban']) {
    mod.addSubcommand(s => {
      userOpt(s.setName(name).setDescription(`${name} a member.`));
      if (name === 'timeout') str(s, 'duration', 'Example: 30m, 2h, 7d (maximum 28d)', true, 40);
      if (!['warnings', 'clear-warnings'].includes(name)) str(s, 'reason', 'Reason shown in the case record', true, 400);
      return s;
    });
  }
  mod.addSubcommand(s => str(str(s.setName('unban').setDescription('Unban a user.'), 'user-id', 'User ID', true, 25), 'reason', 'Reason', true, 400));
  mod.addSubcommand(s => s.setName('purge').setDescription('Delete up to 100 recent messages after confirmation.').addIntegerOption(o => o.setName('amount').setDescription('Messages to delete').setRequired(true).setMinValue(1).setMaxValue(100)));
  mod.addSubcommand(s => s.setName('slowmode').setDescription('Set slowmode in this channel.').addIntegerOption(o => o.setName('seconds').setDescription('0 to disable').setRequired(true).setMinValue(0).setMaxValue(21600)));
  for (const name of ['lock', 'unlock', 'cases']) mod.addSubcommand(s => s.setName(name).setDescription(`${name} for this server or channel.`));
  out.push(mod, command('server-setup', 'Preview 30 additive server templates.', P.Administrator),
    command('server-setup-resume', 'Resume an interrupted server setup.', P.Administrator),
    command('diagnostics', 'View bot health and stored record counts.', P.Administrator),
    command('data-export', 'Download this server data privately.', P.Administrator));
  return out;
}

const HELP = [
  '**My Owner:** Unitey\n**My Developer:** Dream',
  'I manage tickets, giveaways, applications, emoji role buttons and moderation for LD GIVEAWAYS.',
  '**Information**\n`/help` `/about`',
  '**Administrator commands**\n`/announcement` `/say` `/dm` `/status`\n`/moderation-log` `/diagnostics` `/data-export`',
  '**Tickets**\n`/ticket setup` `/ticket edit`\n`/ticket add` `/ticket remove` `/ticket close` `/ticket transcript` `/ticket delete`',
  '**Giveaways**\n`/giveaway create` `/giveaway end`\n`/giveaway reroll` `/giveaway cancel`',
  '**Applications**\n`/application setup` `/application edit`\n`/application retry-dm`',
  '**Roles**\n`/roles` creates emoji role buttons. Wait 20 seconds after receiving a role before removing it.',
  '**Moderation**\n`/moderate warn` `warnings` `clear-warnings` `timeout` `untimeout`\n`kick` `ban` `unban` `purge` `slowmode` `lock` `unlock` `cases`',
  '**Server templates**\n`/server-setup` `/server-setup-resume`\nTemplates only add missing channels and unprivileged roles.',
  'Management actions require the relevant server permissions. Giveaway rewards are delivered manually by the server team.',
].join('\n\n');

async function panelModal(i, d) {
  const fields = [
    { id: 'title', label: 'Panel title', max: 256, value: d.title },
    { id: 'text', label: 'Panel text (Markdown supported)', long: true, value: d.text },
  ];
  if (d.kind !== 'roles') fields.push({ id: 'button', label: 'Button label', max: 80, value: d.button });
  if (d.kind === 'ticket') fields.push({ id: 'welcome', label: 'Message inside a new ticket', long: true, max: 2000, value: d.welcome });
  else if (d.kind === 'application') fields.push({ id: 'questions', label: 'Questions (one per line, max 45 characters)', long: true, max: 1500, value: d.questions?.join('\n') });
  else if (d.kind === 'roles') fields.push({ id: 'mappings', label: 'emoji | role ID | button label (one per line)', long: true, value: d.mappingText });
  return modal(i, `panel-form:${d.id}`, 'Panel setup', fields);
}
function panelPreview(d) {
  const parts = [row(b(`draft:edit:${d.id}`, 'Edit text'), b(`draft:send:${d.id}`, 'Send', BS.Success), b(`draft:cancel:${d.id}`, 'Cancel', BS.Danger))];
  let details = `**Destination:** <#${d.channel}>\n`;
  if (d.kind === 'ticket') {
    parts.unshift(select(`ticket-mode:${d.id}`, d.mode === 'categories' ? 'Category selection' : 'Single button', [
      { label: 'Single button', value: 'plain' }, { label: 'Category selection', value: 'categories' },
    ]));
    if (d.mode === 'categories') {
      parts.splice(1, 0, select(`ticket-count:${d.id}`, 'Number of categories', Array.from({ length: 25 }, (_, j) => ({ label: String(j + 1), value: String(j + 1) }))));
      if (d.categories?.length) parts.splice(2, 0, select(`ticket-category:${d.id}`, 'Edit a category', d.categories.map((c, j) => ({ label: cut(c.name || `Category ${j + 1} (not configured)`, 100), value: String(j) }))));
      details += `**Categories:** ${d.categories?.length || 0}\n`;
    }
    details += `**Support role:** ${d.staff ? `<@&${d.staff}>` : 'Administrators only'}\n**Button label:** ${d.button}\n**New ticket message:**\n${cut(d.welcome, 700)}`;
  } else if (d.kind === 'application') details += `**Review log:** ${d.log ? `<#${d.log}>` : 'Create private application-results automatically'}\n**Button label:** ${d.button}\n**Questions:** ${d.questions?.length || 0}`;
  else details += `**Role buttons:** ${d.mappings?.length || 0}`;
  return { embeds: [embed(d.title, d.text), embed('Setup preview', details)], components: parts };
}
const dangerous = [P.Administrator, P.ManageGuild, P.ManageRoles, P.ManageChannels, P.ManageWebhooks,
  P.KickMembers, P.BanMembers, P.ModerateMembers, P.ManageMessages, P.MentionEveryone, P.ManageThreads, P.ManageEvents,
  P.ManageGuildExpressions, P.CreateGuildExpressions, P.ViewAuditLog, P.ManageNicknames, P.MuteMembers, P.DeafenMembers, P.MoveMembers].filter(x => x !== undefined);
async function safeRole(g, roleId) {
  const r = await g.roles.fetch(roleId);
  const me = await botNeed(g, P.ManageRoles);
  if (!r || r.id === g.id || r.managed || r.position >= me.roles.highest.position || r.permissions.any(dangerous)) fail('A selected role is managed, above the bot, or has elevated permissions. Use ordinary member roles only.');
  return r;
}
async function parseMappings(g, text) {
  const lines = text.split('\n').map(x => x.trim()).filter(Boolean);
  if (!lines.length || lines.length > 20) fail('Use 1-20 role mappings.');
  const out = [];
  for (const line of lines) {
    const parts = line.split('|').map(x => x.trim());
    if (parts.length !== 3 || !/^\d{17,22}$/.test(parts[1]) || !parts[2] || parts[2].length > 80) fail('Each line must be: emoji | role ID | button label (maximum 80 characters).');
    const unicode = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(parts[0])];
    if (!/^<(a?):[A-Za-z0-9_]+:\d{17,22}>$/.test(parts[0]) && !(unicode.length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u.test(parts[0]))) fail('Use one valid Unicode emoji or a custom emoji such as <:name:id>.');
    await safeRole(g, parts[1]);
    if (out.some(x => x.role === parts[1])) fail('A role can only appear once in a panel.');
    out.push({ emoji: parts[0], role: parts[1], label: parts[2] });
  }
  return out;
}
function publicPanel(d) {
  const e = embed(d.title, d.text);
  if (d.kind === 'ticket') {
    return { embeds: [e], components: d.mode === 'categories'
      ? [select(`ticket-open:${d.id}`, d.button, d.categories.map((c, j) => ({ label: c.name, value: String(j) })))]
      : [row(b(`ticket-open:${d.id}:0`, d.button, BS.Primary))] };
  }
  if (d.kind === 'application') return { embeds: [e], components: [row(b(`apply:${d.id}`, d.button, BS.Success, '🪪'))] };
  const buttons = d.mappings.map((r, j) => b(`role:${d.id}:${j}`, r.label, BS.Secondary, r.emoji));
  const rows = [];
  for (let j = 0; j < buttons.length; j += 5) rows.push(row(...buttons.slice(j, j + 5)));
  return { embeds: [e], components: rows };
}
async function sendPanel(i, d) {
  await need(i);
  return locked(`publish:${d.id}`, async () => {
    if (getDraft(i, d.id).published) fail('This setup was already published.');
    if (!d.title || !d.text || (d.kind !== 'roles' && !d.button)) fail('Complete all panel fields first.');
    const channel = await textChannel(i.guild, d.channel);
    if (d.staff) {
      const staffRole = await i.guild.roles.fetch(d.staff);
      if (!staffRole || staffRole.id === i.guildId || staffRole.managed) fail('Choose an ordinary staff role, not @everyone or an integration-managed role.');
    }
    if (d.kind === 'ticket') {
      await botNeed(i.guild, P.ManageChannels);
      if (d.mode === 'categories' && (!d.categories?.length || d.categories.some(x => !x.name || !x.welcome))) fail('Configure every ticket category before sending.');
      if (d.mode !== 'categories') d.categories = [{ name: d.button, welcome: d.welcome }];
      if (d.parent) {
        const parent = await i.guild.channels.fetch(d.parent);
        if (parent?.type !== CT.GuildCategory) fail('The selected parent category no longer exists.');
      }
    }
    if (d.kind === 'application' && !d.log) {
      await botNeed(i.guild, P.ManageChannels);
      const permissions = [
        { id: i.guildId, deny: [P.ViewChannel] },
        { id: client.user.id, allow: [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.AttachFiles, P.ReadMessageHistory] },
      ];
      if (d.staff) permissions.push({ id: d.staff, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] });
      const log = await i.guild.channels.create({ name: 'application-results', type: CT.GuildText, permissionOverwrites: permissions, reason: 'Application setup requested by an administrator' });
      d.log = log.id;
      db.put('draft', d.id, d);
    }
    if (d.log) await textChannel(i.guild, d.log);
    if (d.kind === 'roles') {
      for (const m of d.mappings || []) await safeRole(i.guild, m.role);
      if (!d.mappings?.length) fail('Add at least one role.');
    }
    if (!d.message) db.put('panel', d.id, { ...d, active: false });
    const payload = { ...publicPanel(d), allowedMentions: noMentions };
    let message;
    if (d.message) {
      message = await channel.messages.fetch(d.message);
      if (message.author.id !== client.user.id) fail('This message does not belong to the bot.');
      await message.edit(payload);
    } else message = await channel.send(payload);
    d.message = message.id;
    db.put('panel', d.id, { ...d, active: true });
    d.published = true; db.put('draft', d.id, d);
    await reply(i, { content: `Panel saved in <#${channel.id}>.`, embeds: [], components: [] });
  });
}

function getPanel(i, key, kind) {
  const p = db.get('panel', key);
  if (!p || !p.active || p.guild !== i.guildId || p.kind !== kind) fail('This panel is no longer available.');
  return p;
}
async function ticketStaff(i, ticket) {
  const m = await member(i);
  if (!m.permissions.has(P.Administrator) && !(ticket.staff && m.roles.cache.has(ticket.staff))) fail('Only the configured support role or an administrator can use this action.');
  return m;
}
const ticketIn = channelId => db.all('ticket').find(t => t.channel === channelId);
async function openTicket(i, p, index) {
  await defer(i);
  await locked(`ticket:${p.id}:${i.user.id}`, async () => {
    const existing = db.all('ticket').find(t => t.panel === p.id && t.owner === i.user.id && ['open', 'closing', 'creating'].includes(t.state));
    if (existing) {
      if (existing.channel) {
        const c = await i.guild.channels.fetch(existing.channel).catch(() => null);
        if (c) return reply(i, `You already have a ticket: <#${c.id}>.`);
      }
      if (existing.state === 'creating' && now() - existing.at < 60000) fail('Your ticket is being created. Please wait.');
      existing.state = 'missing'; db.put('ticket', existing.id, existing);
    }
    const cat = p.categories[Number(index)];
    if (!cat) fail('This ticket category is no longer available.');
    if (db.all('ticket').filter(t => t.guild === i.guildId && ['open', 'creating', 'closing'].includes(t.state)).length >= 100) fail('This server has reached the limit of 100 active tickets. Ask the support team to close older tickets.');
    await botNeed(i.guild, P.ManageChannels);
    const t = { id: id(), guild: i.guildId, panel: p.id, owner: i.user.id, staff: p.staff, log: p.log, state: 'creating', at: now(), title: cat.name, participants: [] };
    db.put('ticket', t.id, t);
    const overwrites = [
      { id: i.guildId, deny: [P.ViewChannel] },
      { id: client.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks, P.ManageChannels] },
      { id: i.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles] },
    ];
    if (p.staff) overwrites.push({ id: p.staff, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles] });
    let c;
    try {
      c = await i.guild.channels.create({
        name: `ticket-${t.id.slice(0, 8)}`, type: CT.GuildText, parent: p.parent || undefined,
        topic: `Ticket ${t.id} | Owner ${i.user.id}`, permissionOverwrites: overwrites,
        reason: `Ticket requested by ${i.user.id}`,
      });
      t.channel = c.id; t.state = 'open'; db.put('ticket', t.id, t);
      const msg = await c.send({ content: cat.welcome, allowedMentions: noMentions,
        components: [row(b(`ticket-claim:${t.id}`, 'Claim', BS.Secondary), b(`ticket-close:${t.id}`, 'Close', BS.Danger))] });
      t.control = msg.id; db.put('ticket', t.id, t);
    } catch (e) {
      t.state = c ? 'open' : 'failed'; if (c) t.channel = c.id;
      db.put('ticket', t.id, t); throw e;
    }
    await reply(i, `Your ticket is ready: <#${c.id}>.`);
  });
}
async function transcript(g, t) {
  const c = await g.channels.fetch(t.channel);
  if (!c?.isTextBased()) fail('The ticket channel is unavailable.');
  const records = [];
  let before;
  while (records.length < 5000) {
    const batch = await c.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    records.push(...batch.values()); before = batch.last().id;
    if (batch.size < 100) break;
  }
  records.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const lines = [
    `Ticket: ${t.id}`, `Owner: ${t.owner}`, `Channel: ${t.channel}`,
    `Exported: ${new Date().toISOString()}`,
    records.length >= 5000 ? 'NOTICE: Limited to the latest 5000 messages. Older messages may be omitted.' : '',
    'Messages deleted before export cannot be recovered. Attachments are recorded as URLs, not archived files.', '',
  ];
  for (const m of records) {
    lines.push(`[${m.createdAt.toISOString()}] ${m.author.tag} (${m.author.id}) [message ${m.id}]`, m.content || '');
    for (const a of m.attachments.values()) lines.push(`Attachment: ${a.name} ${a.url}`);
    for (const e of m.embeds) lines.push(`Embed: ${e.title || ''}\n${e.description || ''}`);
    lines.push('');
  }
  let bytes = Buffer.from(lines.join('\n'), 'utf8');
  if (bytes.length > 7500000) {
    const header = Buffer.from(`Ticket: ${t.id}\nOwner: ${t.owner}\nNOTICE: This export was also truncated to fit the upload size limit. The latest text follows.\n\n`);
    bytes = Buffer.concat([header, Buffer.from(bytes.subarray(bytes.length - 7400000).toString('utf8'))]);
  }
  return new Attachment(bytes, { name: `ticket-${t.id}.txt` });
}
async function closeTicket(i, t, note) {
  await ticketStaff(i, t);
  await locked(`ticket-state:${t.id}`, async () => {
    t = db.get('ticket', t.id);
    if (!['open', 'closing'].includes(t.state)) fail('This ticket is already closed.');
    t.state = 'closing'; t.closeNote = note; db.put('ticket', t.id, t);
    const c = await i.guild.channels.fetch(t.channel);
    // Persist closing before external operations; Close may be retried after interruption.
    for (const user of [t.owner, ...(t.participants || [])]) {
      await c.permissionOverwrites.edit(user, { SendMessages: false, AddReactions: false, SendMessagesInThreads: false, CreatePublicThreads: false, CreatePrivateThreads: false });
    }
    if (t.log && !t.transcriptLogged) {
      const log = await textChannel(i.guild, t.log);
      if (log.id === c.id) fail('The transcript log must be outside this ticket.');
      await log.send({ content: `Ticket \`${t.id}\` closed by <@${i.user.id}>.\n**Note:** ${note || 'Not provided'}`, files: [await transcript(i.guild, t)], allowedMentions: noMentions });
      t.transcriptLogged = true; db.put('ticket', t.id, t);
    }
    t.state = 'closed'; t.closedAt = now(); t.closedBy = i.user.id;
    t.feedback = t.feedback || { token: id() };
    db.put('ticket', t.id, t);
    await c.send({ embeds: [embed('Ticket closed', `**Closed by:** <@${i.user.id}>\n**Note:** ${note || 'Not provided'}`)] });
    if (t.control) await c.messages.fetch(t.control).then(m => m.edit({ components: [] })).catch(() => {});
    try {
      const user = await client.users.fetch(t.owner);
      await user.send({ embeds: [embed('Ticket feedback', `Your ticket in **${i.guild.name}** has been closed.\nHow would you rate the support you received?`)],
        components: [select(`feedback:${t.id}:${t.feedback.token}`, 'Select a rating', [1, 2, 3, 4, 5].map(n => ({ label: `${n} / 5`, value: String(n) })))] });
      t.feedback.dm = 'sent';
    } catch (e) { t.feedback.dm = safeError(e); }
    db.put('ticket', t.id, t);
    await audit(i.guild, 'Ticket closed', i.user.id, t.owner, note, `Ticket ${t.id}`);
    await reply(i, 'Ticket closed. The feedback request was attempted by direct message.');
  });
}

async function appPage(i, a) {
  const p = db.get('panel', a.panel);
  if (!p) fail('The application panel was removed.');
  const start = a.page * 5;
  return modal(i, `application-form:${a.id}:${a.page}`, `Application (${a.page + 1}/${Math.ceil(a.questions.length / 5)})`,
    a.questions.slice(start, start + 5).map((q, n) => ({ id: `q${n}`, label: q, long: true, max: 1000, value: a.answers[start + n] })));
}
function appReview(a) {
  const done = a.answers.length >= a.questions.length;
  return {
    content: done ? 'Your answers have been saved. Submit your application when you are ready.' : `Page ${a.page} saved. Continue to the next page.`,
    components: [row(...(done
      ? [b(`application-submit:${a.id}`, 'Submit', BS.Success), b(`application-restart:${a.id}`, 'Edit answers')]
      : [b(`application-next:${a.id}`, 'Continue', BS.Primary)]), b(`application-abandon:${a.id}`, 'Cancel', BS.Danger))],
  };
}
const awaitingApplication = a => ['pending', 'submitting', 'delivery-failed'].includes(a.state);
async function deliverApplication(guild, a) {
  const log = await textChannel(guild, a.log);
  if (!a.overview) {
    const overview = await log.send({
      embeds: [embed(a.title, `**Applicant:** <@${a.user}>\n**Submitted:** ${stamp(a.at)}\n**Submission ID:** \`${a.id}\`\n\nAnswers follow below.`)],
      allowedMentions: noMentions,
    });
    a.overview = overview.id; db.put('application', a.id, a);
  }
  for (let n = a.delivered || 0; n < a.questions.length; n++) {
    await log.send({ embeds: [embed(`${n + 1}. ${a.questions[n]}`, a.answers[n])], allowedMentions: noMentions });
    a.delivered = n + 1; db.put('application', a.id, a);
  }
  if (!a.message) {
    const controls = await log.send({
      content: `**Applicant:** <@${a.user}>\n**Submission ID:** \`${a.id}\``,
      components: [row(b(`application-accept:${a.id}`, 'Accept', BS.Success), b(`application-reject:${a.id}`, 'Reject', BS.Danger))],
      allowedMentions: noMentions,
    });
    a.message = controls.id; db.put('application', a.id, a);
  }
  a.state = 'pending'; delete a.error; delete a.retryAt;
  db.put('application', a.id, a);
}
async function decisionDM(a, force = false) {
  if (a.dm === 'sent' && !force) return;
  try {
    const u = await client.users.fetch(a.user);
    const text = a.state === 'accepted'
      ? `Your application to **${a.guildName}** has been accepted.`
      : `Your application to **${a.guildName}** has not been accepted.\n\n**Reason:**\n${a.note}`;
    await u.send({ embeds: [embed('Application result', text)] }); a.dm = 'sent';
  } catch (e) { a.dm = safeError(e); }
  db.put('application', a.id, a);
}
async function decide(i, key, state, note = '') {
  let a = db.get('application', key);
  if (!a || a.guild !== i.guildId) fail('Application not found.');
  await ticketStaff(i, { staff: a.staff });
  await locked(`application-decision:${key}`, async () => {
    a = db.get('application', key);
    if (a.state !== 'pending') fail('This application has already been reviewed.');
    a.state = state; a.note = note; a.reviewer = i.user.id; a.decidedAt = now(); a.dm = 'pending';
    db.put('application', a.id, a);
    // The decision is durable before DM delivery; roles are never assigned here.
    await decisionDM(a);
    const log = await textChannel(i.guild, a.log);
    await log.messages.fetch(a.message).then(m => m.edit({
      content: `**${state === 'accepted' ? 'Accepted' : 'Rejected'}** by <@${i.user.id}>\n${note ? `**Note:** ${note}\n` : ''}**DM:** ${a.dm}\n**Submission ID:** \`${a.id}\``,
      components: [], allowedMentions: noMentions,
    })).catch(e => console.error('Application review edit:', safeError(e)));
    await audit(i.guild, `Application ${state}`, i.user.id, a.user, note, `Submission ${a.id}; DM: ${a.dm}`);
    await reply(i, `Application ${state}. DM: ${a.dm}. No role was assigned.`);
  });
}

function giveawayView(g) {
  const ended = g.state !== 'active';
  const e = embed(g.prize, [
    g.description || '',
    `**${ended ? 'Ended' : 'Ends'}:** ${stamp(g.ends)}`,
    `**Winners:** ${g.count}`, `**Entries:** ${g.entries.length}`,
    g.required ? `**Required role:** <@&${g.required}>` : '',
    g.minDays ? `**Minimum account age:** ${g.minDays} days` : '',
    ended ? (g.state === 'cancelled' ? '**Status:** Cancelled' : `**Result:** ${g.winners?.length ? g.winners.map(u => `<@${u}>`).join(', ') : 'No eligible entries'}`) : '',
  ].filter(Boolean).join('\n\n'));
  return { embeds: [e], components: ended ? [] : [row(b(`giveaway-enter:${g.id}`, 'Enter / Leave', BS.Success))] };
}
async function giveawayEligible(guild, g, userId) {
  const m = await guild.members.fetch(userId).catch(e => {
    if (e.code === 10007 || e.code === 10013) return null;
    throw e;
  });
  return !!m && !m.user.bot && (!g.required || m.roles.cache.has(g.required)) && now() - m.user.createdTimestamp >= (g.minDays || 0) * 86400000;
}
async function drawGiveaway(guild, key, reroll = false) {
  return locked(`giveaway:${key}`, async () => {
    let g = db.get('giveaway', key);
    if (!g || g.guild !== guild.id) fail('Giveaway not found.');
    if (!reroll && g.state !== 'active') return;
    if (reroll && g.state !== 'ended') fail('Only an ended giveaway can be rerolled.');
    const eligible = [];
    const previous = new Set(reroll ? (g.history || []).flat() : []);
    for (const u of g.entries) if (!previous.has(u) && await giveawayEligible(guild, g, u)) eligible.push(u);
    g = db.get('giveaway', key);
    if (reroll && !eligible.length) fail('No new eligible winners remain.');
    g.winners = choose(eligible, g.count); g.state = 'ended'; g.endedAt = now();
    g.round = (g.round || 0) + 1; g.history = [...(g.history || []), g.winners];
    g.delivery = { edited: false, announced: false, dms: {} };
    db.put('giveaway', key, g);
    await deliverGiveaway(guild, g);
  });
}
async function deliverGiveaway(guild, g) {
  if (g.state !== 'ended' || !g.delivery) return;
  const delivery = g.delivery;
  const c = await textChannel(guild, g.channel);
  if (!delivery.edited) {
    try { await (await c.messages.fetch(g.message)).edit(giveawayView(g)); delivery.edited = true; }
    catch (e) { if (e.code === 10008) delivery.edited = true; else throw e; }
    db.put('giveaway', g.id, g);
  }
  if (!delivery.announced) {
    await c.send({ embeds: [embed('Giveaway result', `**Prize:** ${g.prize}\n**Winners:** ${g.winners.length ? g.winners.map(u => `<@${u}>`).join(', ') : 'No eligible entries'}\n**Round:** ${g.round}\n**Giveaway ID:** \`${g.message}\``)], allowedMentions: noMentions });
    delivery.announced = true; db.put('giveaway', g.id, g);
  }
  for (const userId of g.winners) {
    if (delivery.dms[userId]) continue;
    try {
      const u = await client.users.fetch(userId);
      await u.send({ embeds: [embed('Giveaway result', `You won **${g.prize}** in **${guild.name}**.\n\nContact the server team to arrange delivery.\nhttps://discord.com/channels/${g.guild}/${g.channel}/${g.message}`)] });
      delivery.dms[userId] = 'sent';
    } catch (e) {
      if ([50007, 10013].includes(e.code)) delivery.dms[userId] = safeError(e);
      else throw e;
    }
    db.put('giveaway', g.id, g);
  }
}

const modPerm = {
  warn: P.ModerateMembers, warnings: P.ModerateMembers, 'clear-warnings': P.ModerateMembers,
  timeout: P.ModerateMembers, untimeout: P.ModerateMembers, kick: P.KickMembers,
  ban: P.BanMembers, unban: P.BanMembers, purge: P.ManageMessages, slowmode: P.ManageChannels,
  lock: P.ManageChannels, unlock: P.ManageChannels, cases: P.ModerateMembers,
};
async function hierarchy(i, userId, action) {
  const actor = await need(i, modPerm[action]);
  if ([i.user.id, client.user.id, i.guild.ownerId].includes(userId)) fail('You cannot target yourself, the bot, or the server owner.');
  const target = await i.guild.members.fetch(userId).catch(e => { if (e.code === 10007) return null; throw e; });
  if (!target) { if (action === 'ban') return null; fail('That user is not in this server.'); }
  const me = await i.guild.members.fetchMe();
  if (i.user.id !== i.guild.ownerId && target.roles.highest.position >= actor.roles.highest.position) fail('The target must be below your highest role.');
  if (target.roles.highest.position >= me.roles.highest.position) fail('The target must be below the bot highest role.');
  return target;
}
async function confirm(i, action, data, text) {
  const c = { id: id(), guild: i.guildId, user: i.user.id, action, data, expires: now() + 300000 };
  db.put('confirmation', c.id, c);
  return reply(i, { embeds: [embed('Confirm action', text)], components: [row(b(`confirm:${c.id}`, 'Confirm', BS.Danger), b(`cancel:${c.id}`, 'Cancel'))] });
}
async function executeMod(i, action, data) {
  const actor = await need(i, modPerm[action]);
  const reason = `${cut(data.reason || 'Not provided', 400)} | Actor ${i.user.id}`;
  let result = 'Action completed.';
  if (['warn', 'timeout', 'untimeout', 'kick', 'ban'].includes(action)) {
    const target = await hierarchy(i, data.user, action);
    if (action === 'warn') {
      const w = { id: id(), guild: i.guildId, user: data.user, actor: i.user.id, reason: data.reason, at: now() };
      db.put('warning', w.id, w); result = `Warning recorded. Warning ID: \`${w.id}\`.`;
    } else if (action === 'timeout' || action === 'untimeout') {
      await botNeed(i.guild, P.ModerateMembers);
      if (!target.moderatable) fail('This member cannot be timed out by the bot.');
      await target.timeout(action === 'timeout' ? data.ms : null, reason);
    } else if (action === 'kick') { await botNeed(i.guild, P.KickMembers); await target.kick(reason); }
    else { await botNeed(i.guild, P.BanMembers); await i.guild.members.ban(data.user, { reason, deleteMessageSeconds: 0 }); }
  } else if (action === 'unban') {
    await botNeed(i.guild, P.BanMembers);
    if (!/^\d{17,22}$/.test(data.user)) fail('Enter a valid user ID.');
    await i.guild.members.unban(data.user, reason);
  } else if (action === 'clear-warnings') {
    for (const w of db.all('warning').filter(w => w.guild === i.guildId && w.user === data.user)) db.del('warning', w.id);
    result = 'Warnings cleared. Historical case records were retained.';
  } else {
    const c = await textChannel(i.guild, data.channel || i.channelId);
    if (!c.permissionsFor(actor)?.has(modPerm[action])) fail('You do not have the required permission in this channel.');
    const me = await i.guild.members.fetchMe();
    const required = action === 'purge' ? [P.ManageMessages, P.ReadMessageHistory]
      : action === 'slowmode' ? [P.ManageChannels] : [P.ManageChannels, P.ManageRoles];
    if (!c.permissionsFor(me).has(required)) fail('The bot is missing channel permissions for this action.');
    if (action === 'purge') {
      const messages = await c.messages.fetch({ limit: data.amount });
      const deleted = await c.bulkDelete(messages, true);
      result = `${deleted.size} messages deleted. Messages older than 14 days were skipped.`;
    } else if (action === 'slowmode') { await c.setRateLimitPerUser(data.seconds, reason); result = `Slowmode set to ${data.seconds} seconds.`; }
    else if (action === 'lock') {
      const key = c.id;
      if (db.get('channel-lock', key)) fail('This channel is already locked by this bot.');
      const overwrite = c.permissionOverwrites.cache.get(i.guildId);
      const previous = overwrite?.allow.has(P.SendMessages) ? true : overwrite?.deny.has(P.SendMessages) ? false : null;
      db.put('channel-lock', key, { guild: i.guildId, channel: key, previous });
      try { await c.permissionOverwrites.edit(i.guildId, { SendMessages: false }, { reason }); }
      catch (e) { db.del('channel-lock', key); throw e; }
      result = 'Channel locked for @everyone. Explicit role/member overrides may still allow messages.';
    } else if (action === 'unlock') {
      const lock = db.get('channel-lock', c.id);
      if (!lock) fail('This bot has no stored lock for this channel.');
      await c.permissionOverwrites.edit(i.guildId, { SendMessages: lock.previous }, { reason });
      db.del('channel-lock', c.id); result = 'The previous @everyone send permission was restored.';
    }
  }
  await audit(i.guild, action, i.user.id, data.user || data.channel, data.reason, result);
  return reply(i, { content: result, embeds: [], components: [] });
}

async function showTemplates(i, page = 0) {
  const options = templateSpecs.slice(page * 15, page * 15 + 15).map((x, j) => ({ label: x[0], value: String(page * 15 + j) }));
  return reply(i, { embeds: [embed('Server setup', 'Choose a template to preview its exact changes. Nothing is created until you confirm.\nExisting channels and roles will not be deleted or reassigned.')],
    components: [select('template-select', `Templates ${page * 15 + 1}-${page * 15 + options.length} of 30`, options),
      row(b(`template-page:${page ? 0 : 1}`, page ? 'Previous page' : 'Next page'))] });
}
async function buildTemplate(i, n, resumeKey) {
  await need(i);
  if (process.env.SETUP_ENABLED === 'false') fail('Server setup is disabled by the deployment administrator.');
  await botNeed(i.guild, P.ManageChannels, P.ManageRoles);
  return locked(`server-setup:${i.guildId}`, async () => {
    const plan = templatePlan(n);
    const job = resumeKey ? db.get('setup-job', resumeKey) : { id: id(), guild: i.guildId, template: n, at: now(), created: [], state: 'running' };
    if (!job || job.guild !== i.guildId) fail('Setup job not found.');
    job.state = 'running'; db.put('setup-job', job.id, job);
    try {
      const roles = await i.guild.roles.fetch();
      for (const name of plan.roles) {
        if (roles.some(r => r.name === name)) continue;
        const r = await i.guild.roles.create({ name, permissions: [], reason: `Confirmed template ${plan.name}; actor ${i.user.id}` });
        job.created.push({ type: 'role', id: r.id, name }); db.put('setup-job', job.id, job); roles.set(r.id, r);
      }
      const channels = await i.guild.channels.fetch();
      for (const cat of plan.categories) {
        let parent = channels.find(c => c?.type === CT.GuildCategory && c.name === cat.name);
        if (!parent) {
          parent = await i.guild.channels.create({ name: cat.name, type: CT.GuildCategory, reason: `Confirmed template ${plan.name}` });
          channels.set(parent.id, parent); job.created.push({ type: 'category', id: parent.id, name: parent.name }); db.put('setup-job', job.id, job);
        }
        for (const child of cat.channels) {
          if (channels.some(c => c?.name === child.name && c.type === child.type && c.parentId === parent.id)) continue;
          const { readOnly, ...channelData } = child;
          const c = await i.guild.channels.create({ ...channelData, parent: parent.id,
            ...(readOnly ? { permissionOverwrites: [
              { id: i.guildId, deny: [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads] },
              { id: client.user.id, allow: [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.AttachFiles] },
            ] } : {}),
            reason: `Confirmed template ${plan.name}` });
          channels.set(c.id, c); job.created.push({ type: 'channel', id: c.id, name: c.name }); db.put('setup-job', job.id, job);
        }
      }
      job.state = 'done'; job.completed = now(); db.put('setup-job', job.id, job);
      await audit(i.guild, 'Server template created', i.user.id, '', plan.name, `${job.created.length} objects created; job ${job.id}`);
      return reply(i, { content: `Template **${plan.name}** completed. ${job.created.length} objects created in this job. Existing items were retained. No roles were assigned.\nJob ID: \`${job.id}\``, embeds: [], components: [] });
    } catch (e) {
      job.state = 'interrupted'; job.error = safeError(e); db.put('setup-job', job.id, job);
      return reply(i, { content: `Setup interrupted: ${job.error}\nCreated so far: ${job.created.length}. Nothing was deleted. Fix the permissions or server limits, then use /server-setup-resume.`, embeds: [], components: [] });
    }
  });
}

async function handleCommand(i) {
  const name = i.commandName, o = i.options;
  if (name === 'help' || name === 'about') return reply(i, { embeds: [embed('LD GIVEAWAYS', HELP)] });
  if (['announcement', 'say'].includes(name)) {
    await defer(i); await need(i);
    const c = await textChannel(i.guild, o.getChannel('channel')?.id || i.channelId);
    await c.send({ content: o.getString('text'), allowedMentions: noMentions });
    return reply(i, `Message sent in <#${c.id}>.`);
  }
  if (name === 'dm') {
    await need(i);
    return confirm(i, 'dm', { user: o.getUser('user').id, text: o.getString('text') }, `**Recipient:** <@${o.getUser('user').id}>\n\n${o.getString('text')}`);
  }
  if (name === 'status') {
    await defer(i); await need(i);
    const settings = { text: o.getString('text'), activity: o.getString('activity') || 'Playing', availability: o.getString('availability') || 'online' };
    db.put('presence', 'current', settings); applyPresence(settings);
    return reply(i, 'Bot status updated.');
  }
  if (name === 'moderation-log') {
    await defer(i); await need(i);
    const c = await textChannel(i.guild, o.getChannel('channel').id);
    db.put('config', i.guildId, { ...(db.get('config', i.guildId) || {}), log: c.id });
    return reply(i, `Moderation log set to <#${c.id}>.`);
  }
  if (name === 'ticket' || name === 'application') {
    const sub = o.getSubcommand();
    if (['setup', 'edit'].includes(sub)) {
      await need(i);
      let d;
      if (sub === 'setup') d = draft(i, name, {
        channel: o.getChannel('channel').id, staff: o.getRole(name === 'ticket' ? 'support-role' : 'staff-role')?.id,
        log: o.getChannel('log-channel')?.id, parent: name === 'ticket' ? o.getChannel('parent-category')?.id : undefined,
        mode: 'plain', categories: [],
      });
      else {
        const p = db.all('panel').find(p => p.guild === i.guildId && p.kind === name && p.message === o.getString('message-id'));
        if (!p) fail('Panel not found. Use the panel message ID from this server.');
        d = { ...clone(p), owner: i.user.id, expires: now() + 86400000, published: false };
        if (o.getBoolean('clear-staff')) delete d.staff;
        else if (o.getRole(name === 'ticket' ? 'support-role' : 'staff-role')) d.staff = o.getRole(name === 'ticket' ? 'support-role' : 'staff-role').id;
        if (o.getBoolean('clear-log')) delete d.log;
        else if (o.getChannel('log-channel')) d.log = o.getChannel('log-channel').id;
        if (name === 'ticket') {
          if (o.getBoolean('clear-parent')) delete d.parent;
          else if (o.getChannel('parent-category')) d.parent = o.getChannel('parent-category').id;
        }
        db.put('draft', d.id, d);
      }
      return panelModal(i, d);
    }
    if (name === 'ticket' && sub === 'close') {
      const t = ticketIn(i.channelId);
      if (!t || t.guild !== i.guildId) fail('Use this command inside a ticket channel.');
      await ticketStaff(i, t);
      return modal(i, `ticket-close-form:${t.id}`, 'Close ticket', [{ id: 'note', label: 'Closure note', long: true, max: 1000, required: false }]);
    }
    await defer(i);
    if (name === 'ticket') {
      const t = ticketIn(i.channelId);
      if (!t || t.guild !== i.guildId) fail('Use this command inside a ticket channel.');
      await ticketStaff(i, t);
      if (sub === 'transcript') return reply(i, { files: [await transcript(i.guild, t)] });
      if (sub === 'delete') {
        if (t.state !== 'closed') fail('Close the ticket before deleting it.');
        return confirm(i, 'ticket-delete', { ticket: t.id }, 'Permanently delete this closed ticket channel? Download the transcript first if you need it.');
      }
      if (t.state !== 'open') fail('Only open tickets can be modified.');
      const u = o.getUser('user');
      if ([t.owner, client.user.id, i.guild.ownerId].includes(u.id)) fail('You cannot change access for the ticket owner, bot or server owner.');
      if (sub === 'add') {
        await i.guild.members.fetch(u.id);
        await i.channel.permissionOverwrites.edit(u.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
        t.participants = [...new Set([...(t.participants || []), u.id])];
      } else {
        if (!(t.participants || []).includes(u.id)) fail('This member was not added through this ticket.');
        await i.channel.permissionOverwrites.delete(u.id);
        t.participants = t.participants.filter(x => x !== u.id);
      }
      db.put('ticket', t.id, t); return reply(i, 'Ticket access updated.');
    }
    const a = db.get('application', o.getString('submission-id'));
    if (!a || a.guild !== i.guildId || !['accepted', 'rejected'].includes(a.state)) fail('Reviewed application not found.');
    await ticketStaff(i, { staff: a.staff });
    if (a.dm === 'sent') fail('The decision notification was already sent.');
    await decisionDM(a, true); return reply(i, `DM: ${a.dm}.`);
  }
  if (name === 'roles') {
    await need(i);
    const d = draft(i, 'roles', { channel: o.getChannel('channel').id });
    return panelModal(i, d);
  }
  if (name === 'giveaway') {
    await need(i);
    const sub = o.getSubcommand();
    if (sub === 'create') {
      const d = draft(i, 'giveaway', { channel: o.getChannel('channel').id, required: o.getRole('required-role')?.id, minDays: o.getInteger('min-account-days') || 0 });
      return reply(i, { content: 'Choose a giveaway duration, then complete the form.',
        components: [select(`giveaway-duration:${d.id}`, 'Giveaway duration', ['10m', '30m', '1h', '6h', '12h', '1d', '3d', '7d', 'custom'].map(x => ({ label: x === 'custom' ? 'Custom duration' : x, value: x })))] });
    }
    await defer(i);
    const g = db.all('giveaway').find(g => g.guild === i.guildId && g.message === o.getString('message-id'));
    if (!g) fail('Giveaway not found.');
    return confirm(i, `giveaway-${sub}`, { id: g.id }, `${sub === 'reroll' ? 'Choose new eligible winners, excluding all previous winners' : sub === 'end' ? 'End this giveaway and draw winners now' : 'Cancel this giveaway without drawing winners'}?\n\n**Prize:** ${g.prize}`);
  }
  if (name === 'moderate') {
    await defer(i);
    const sub = o.getSubcommand(); await need(i, modPerm[sub]);
    const data = { user: o.getUser('user')?.id || o.getString('user-id'), reason: o.getString('reason'), channel: i.channelId, amount: o.getInteger('amount'), seconds: o.getInteger('seconds') };
    if (sub === 'warnings') {
      const list = db.all('warning').filter(w => w.guild === i.guildId && w.user === data.user).slice(-15);
      return reply(i, { embeds: [embed('Warnings', list.map(w => `\`${w.id}\` ${stamp(w.at)}\n${cut(w.reason, 180)}`).join('\n\n') || 'No warnings recorded.')] });
    }
    if (sub === 'cases') {
      const list = db.all('case').filter(c => c.guild === i.guildId).slice(-15).reverse();
      return reply(i, { embeds: [embed('Recent moderation cases', list.map(c => `\`${c.id}\` **${c.action}** ${stamp(c.at)}\n${cut(c.reason, 140)}`).join('\n\n') || 'No cases recorded.')] });
    }
    if (sub === 'timeout') {
      data.ms = duration(o.getString('duration'));
      if (data.ms > 28 * 86400000) fail('Timeouts cannot exceed 28 days.');
    }
    if (['ban', 'kick', 'purge', 'clear-warnings', 'lock'].includes(sub)) {
      if (data.user && ['ban', 'kick'].includes(sub)) await hierarchy(i, data.user, sub);
      return confirm(i, `mod-${sub}`, data, `**Action:** ${sub}\n${data.user ? `**User:** <@${data.user}>\n` : ''}${data.amount ? `**Messages:** Up to ${data.amount}\n` : ''}**Reason:** ${data.reason || 'Not applicable'}`);
    }
    return executeMod(i, sub, data);
  }
  if (name === 'server-setup') { await need(i); return showTemplates(i); }
  if (name === 'server-setup-resume') {
    await defer(i); await need(i);
    const jobs = db.all('setup-job').filter(j => j.guild === i.guildId && j.state !== 'done').sort((a, b) => b.at - a.at);
    if (!jobs.length) fail('No interrupted setup was found.');
    const j = jobs[0];
    return confirm(i, 'template-resume', { template: j.template, job: j.id }, `Resume **${templatePlan(j.template).name}**?\nAlready created: ${j.created.length}. Existing objects will be skipped.`);
  }
  if (name === 'diagnostics' || name === 'data-export') {
    await defer(i); await need(i);
    const kinds = ['panel', 'ticket', 'giveaway', 'application', 'warning', 'case', 'role-grant', 'channel-lock', 'setup-job', 'config'];
    const data = Object.fromEntries(kinds.map(k => [k, db.all(k).filter(x => x.guild === i.guildId)]));
    if (name === 'data-export') {
      const bytes = Buffer.from(JSON.stringify({ version: VERSION, exportedAt: new Date().toISOString(), guild: i.guildId, data }, null, 2));
      if (bytes.length > 8 * 1024 * 1024) fail('Export exceeds 8 MB. Use a private database backup from your hosting provider.');
      return reply(i, { content: 'Private server data export. Keep this file secure.', files: [new Attachment(bytes, { name: `ld-giveaways-export-${i.guildId}.json` })] });
    }
    return reply(i, { embeds: [embed('Diagnostics', `**Version:** ${VERSION}\n**Discord ready:** ${client.isReady() ? 'Yes' : 'No'}\n**Gateway latency:** ${client.ws.ping} ms\n**Uptime:** ${Math.floor(process.uptime())} seconds\n**Storage:** SQLite with WAL (persistent only when hosted on a persistent disk)\n\n${kinds.map(k => `**${k}:** ${data[k].length}`).join('\n')}`)] });
  }
}

async function handleModal(i) {
  const [action, key, index] = i.customId.split(':');
  if (action === 'panel-form') {
    const d = getDraft(i, key); await defer(i); await need(i);
    d.title = field(i, 'title'); d.text = field(i, 'text');
    if (d.kind !== 'roles') d.button = field(i, 'button');
    if (d.kind === 'ticket') d.welcome = field(i, 'welcome');
    if (d.kind === 'application') d.questions = questions(field(i, 'questions'));
    if (d.kind === 'roles') {
      d.mappingText = field(i, 'mappings'); d.mappings = await parseMappings(i.guild, d.mappingText);
    }
    db.put('draft', d.id, d);
    return reply(i, panelPreview(d));
  }
  if (action === 'ticket-category-form') {
    const d = getDraft(i, key, 'ticket'); await need(i);
    const n = Number(index); if (!d.categories?.[n]) fail('Choose the category again.');
    d.categories[n] = { name: field(i, 'name'), welcome: field(i, 'welcome') };
    db.put('draft', d.id, d); return reply(i, panelPreview(d));
  }
  if (action === 'ticket-close-form') {
    const t = db.get('ticket', key);
    if (!t || t.guild !== i.guildId || t.channel !== i.channelId) fail('Ticket not found.');
    await defer(i); return closeTicket(i, t, field(i, 'note'));
  }
  if (action === 'giveaway-form') {
    const d = getDraft(i, key, 'giveaway'); await need(i);
    d.prize = field(i, 'prize'); d.description = field(i, 'description');
    d.duration = field(i, 'duration'); d.ms = duration(d.duration);
    d.count = Number(field(i, 'winners'));
    if (d.ms < 10000 || d.ms > 365 * 86400000) fail('Use a duration between 10 seconds and 365 days.');
    if (!Number.isInteger(d.count) || d.count < 1 || d.count > 20) fail('Choose 1-20 winners.');
    db.put('draft', d.id, d);
    return reply(i, { embeds: [embed('Giveaway preview', `**Prize:** ${d.prize}\n**Duration:** ${d.duration}\n**Winners:** ${d.count}\n**Channel:** <#${d.channel}>\n\n${d.description}`)],
      components: [row(b(`giveaway-send:${d.id}`, 'Send', BS.Success), b(`draft:cancel:${d.id}`, 'Cancel', BS.Danger))] });
  }
  if (action === 'application-form') {
    const a = getDraft(i, key, 'application-entry');
    if (a.page !== Number(index) || a.submitted) fail('This application page is no longer active.');
    const offset = a.page * 5;
    for (let n = 0; n < Math.min(5, a.questions.length - offset); n++) a.answers[offset + n] = field(i, `q${n}`);
    a.page++; db.put('draft', a.id, a); return reply(i, appReview(a));
  }
  if (action === 'application-reject-form') {
    await defer(i); return decide(i, key, 'rejected', field(i, 'note'));
  }
}

async function handleComponent(i) {
  const [action, a, z] = i.customId.split(':');
  if (action === 'draft') {
    const d = getDraft(i, z);
    if (a === 'cancel') { db.del('draft', z); return reply(i, { content: 'Setup cancelled.', embeds: [], components: [] }); }
    await need(i);
    if (a === 'edit') return panelModal(i, d);
    await defer(i); return sendPanel(i, d);
  }
  if (action === 'ticket-mode') {
    await need(i); const d = getDraft(i, a, 'ticket');
    d.mode = i.values[0]; db.put('draft', d.id, d);
    return i.update({ ...panelPreview(d), allowedMentions: noMentions });
  }
  if (action === 'ticket-count') {
    await need(i); const d = getDraft(i, a, 'ticket');
    const count = Number(i.values[0]); d.categories = Array.from({ length: count }, (_, n) => d.categories?.[n] || {});
    db.put('draft', d.id, d); return i.update({ ...panelPreview(d), allowedMentions: noMentions });
  }
  if (action === 'ticket-category') {
    await need(i); const d = getDraft(i, a, 'ticket'), n = Number(i.values[0]), c = d.categories?.[n];
    if (!c) fail('Choose a valid category.');
    return modal(i, `ticket-category-form:${d.id}:${n}`, 'Ticket category', [
      { id: 'name', label: 'Category name', max: 100, value: c.name },
      { id: 'welcome', label: 'Message inside this category ticket', long: true, max: 2000, value: c.welcome },
    ]);
  }
  if (action === 'ticket-open') return openTicket(i, getPanel(i, a, 'ticket'), i.isStringSelectMenu() ? i.values[0] : z);
  if (action === 'ticket-claim' || action === 'ticket-close') {
    const t = db.get('ticket', a);
    if (!t || t.guild !== i.guildId || t.channel !== i.channelId) fail('Ticket not found.');
    await ticketStaff(i, t);
    if (action === 'ticket-close') return modal(i, `ticket-close-form:${a}`, 'Close ticket', [{ id: 'note', label: 'Closure note', long: true, max: 1000, required: false }]);
    await defer(i);
    return locked(`ticket-state:${t.id}`, async () => {
      const current = db.get('ticket', t.id);
      if (current.state !== 'open') fail('This ticket is not open.');
      if (current.claimed) fail(`This ticket is already claimed by <@${current.claimed}>.`);
      current.claimed = i.user.id; db.put('ticket', current.id, current);
      await i.channel.send({ content: `Ticket claimed by <@${i.user.id}>.`, allowedMentions: noMentions });
      return reply(i, 'Ticket claimed.');
    });
  }
  if (action === 'feedback') {
    const t = db.get('ticket', a);
    if (!t || t.owner !== i.user.id || t.feedback?.token !== z || t.state !== 'closed') fail('This feedback request is unavailable.');
    if (t.feedback.rating) fail('Your feedback was already submitted.');
    t.feedback.rating = Number(i.values[0]); t.feedback.at = now(); db.put('ticket', t.id, t);
    await defer(i);
    const g = await client.guilds.fetch(t.guild);
    if (t.log) {
      try { await (await textChannel(g, t.log)).send({ embeds: [embed('Ticket feedback', `**Ticket:** \`${t.id}\`\n**User:** <@${t.owner}>\n**Rating:** ${t.feedback.rating} / 5`)] }); }
      catch (e) { console.error('Feedback log:', safeError(e)); }
    }
    return reply(i, 'Your feedback has been recorded. Thank you.');
  }
  if (action === 'giveaway-duration') {
    await need(i); const d = getDraft(i, a, 'giveaway');
    const value = i.values[0] === 'custom' ? '' : i.values[0];
    return modal(i, `giveaway-form:${a}`, 'Giveaway setup', [
      { id: 'prize', label: 'Prize', max: 256 },
      { id: 'duration', label: 'Duration (for example 30m, 2h, 7d)', max: 40, value },
      { id: 'winners', label: 'Number of winners (1-20)', max: 2, value: '1' },
      { id: 'description', label: 'Additional text (optional)', max: 2000, long: true, required: false },
    ]);
  }
  if (action === 'giveaway-send') {
    const d = getDraft(i, a, 'giveaway'); await defer(i); await need(i);
    return locked(`publish:${a}`, async () => {
      const fresh = getDraft(i, a, 'giveaway'); if (fresh.published) fail('This giveaway was already published.');
      if (!d.prize || !d.ms || !d.count) fail('Complete the giveaway form first.');
      const c = await textChannel(i.guild, d.channel);
      const g = { id: d.id, guild: i.guildId, channel: c.id, prize: d.prize, description: d.description, required: d.required, minDays: d.minDays,
        count: d.count, ends: now() + d.ms, entries: [], state: 'creating', host: i.user.id };
      db.put('giveaway', g.id, g);
      const msg = await c.send({ ...giveawayView({ ...g, state: 'active' }), allowedMentions: noMentions });
      g.message = msg.id; g.state = 'active'; db.put('giveaway', g.id, g);
      d.published = true; db.put('draft', d.id, d);
      return reply(i, { content: `Giveaway created in <#${c.id}>. Message ID: \`${msg.id}\`.`, embeds: [], components: [] });
    });
  }
  if (action === 'giveaway-enter') {
    await defer(i);
    return locked(`giveaway:${a}`, async () => {
      let g = db.get('giveaway', a);
      if (!g || g.guild !== i.guildId || g.state !== 'active' || g.ends <= now()) fail('This giveaway is no longer accepting entries.');
      const entered = g.entries.includes(i.user.id);
      if (!entered && !await giveawayEligible(i.guild, g, i.user.id)) fail('You do not meet the required role, membership or account age requirements.');
      g = db.get('giveaway', a);
      if (g.ends <= now() || g.state !== 'active') fail('This giveaway has ended.');
      g.entries = entered ? g.entries.filter(u => u !== i.user.id) : [...g.entries, i.user.id];
      db.put('giveaway', g.id, g);
      await reply(i, entered ? 'Your entry has been removed.' : 'Your entry has been recorded.');
      await i.message.edit(giveawayView(g)).catch(e => console.error('Giveaway counter:', safeError(e)));
    });
  }
  if (action === 'role') {
    await defer(i);
    const p = getPanel(i, a, 'roles'), mapping = p.mappings[Number(z)];
    if (!mapping) fail('This role is no longer available.');
    return locked(`role:${i.guildId}:${i.user.id}:${mapping.role}`, async () => {
      const r = await safeRole(i.guild, mapping.role), m = await member(i);
      const key = `${i.guildId}:${i.user.id}:${r.id}`, grant = db.get('role-grant', key);
      if (m.roles.cache.has(r.id)) {
        // Roles obtained outside this panel have no artificial waiting period.
        if (grant && now() < grant.unlock) fail(`Wait ${Math.ceil((grant.unlock - now()) / 1000)} more seconds before removing this role.`);
        await m.roles.remove(r, 'Emoji role panel requested by member');
        db.del('role-grant', key);
        return reply(i, `Role removed: ${r.name}.`);
      }
      const record = { guild: i.guildId, user: i.user.id, role: r.id, unlock: now() + 20000 };
      db.put('role-grant', key, record);
      try { await m.roles.add(r, 'Emoji role panel requested by member'); }
      catch (e) { db.del('role-grant', key); throw e; }
      record.unlock = now() + 20000; db.put('role-grant', key, record);
      return reply(i, `Role added: ${r.name}. You can remove it after 20 seconds.`);
    });
  }
  if (action === 'apply') {
    const p = getPanel(i, a, 'application');
    const pending = db.all('application').find(x => x.panel === a && x.user === i.user.id && awaitingApplication(x));
    if (pending) fail('You already have an application awaiting review.');
    const existing = db.all('draft').find(x => x.kind === 'application-entry' && x.panel === a && x.owner === i.user.id && !x.submitted && x.expires > now());
    const app = existing || draft(i, 'application-entry', { panel: a, questions: clone(p.questions), answers: [], page: 0 });
    if (app.page * 5 >= app.questions.length) return reply(i, appReview(app));
    return appPage(i, app);
  }
  if (['application-next', 'application-restart', 'application-abandon', 'application-submit'].includes(action)) {
    const aDraft = getDraft(i, a, 'application-entry');
    if (aDraft.submitted) fail('This application was already submitted.');
    if (action === 'application-abandon') { db.del('draft', a); return reply(i, { content: 'Application draft cancelled.', components: [] }); }
    if (action === 'application-restart') { aDraft.page = 0; db.put('draft', a, aDraft); return appPage(i, aDraft); }
    if (action === 'application-next') return appPage(i, aDraft);
    await defer(i);
    return locked(`application-submit:${i.guildId}:${i.user.id}:${aDraft.panel}`, async () => {
      const current = getDraft(i, a, 'application-entry');
      if (current.submitted) fail('This application was already submitted.');
      if (current.answers.length < current.questions.length) fail('Complete every application page first.');
      const p = getPanel(i, current.panel, 'application');
      if (db.all('application').some(x => x.panel === p.id && x.user === i.user.id && awaitingApplication(x))) fail('You already have an application awaiting review.');
      await textChannel(i.guild, p.log);
      const submission = { id: current.id, guild: i.guildId, guildName: i.guild.name, user: i.user.id, panel: p.id, staff: p.staff, log: p.log,
        title: p.title, questions: current.questions, answers: current.answers, delivered: 0, state: 'submitting', at: now() };
      current.submitted = true;
      db.transaction(() => { db.put('application', submission.id, submission); db.put('draft', current.id, current); });
      try {
        await deliverApplication(i.guild, submission);
      } catch (e) {
        submission.state = 'delivery-failed'; submission.error = safeError(e); submission.retryAt = now() + 60000;
        db.put('application', submission.id, submission);
        return reply(i, { content: `Your application is saved, but delivery to the review channel was interrupted. Delivery will retry automatically. An administrator may need to fix channel permissions.\nSubmission ID: \`${submission.id}\`.`, components: [] });
      }
      return reply(i, { content: `Application submitted. Submission ID: \`${submission.id}\`.`, components: [] });
    });
  }
  if (action === 'application-accept' || action === 'application-reject') {
    const aRecord = db.get('application', a);
    if (!aRecord || aRecord.guild !== i.guildId || aRecord.state !== 'pending') fail('This application is no longer awaiting review.');
    await ticketStaff(i, { staff: aRecord.staff });
    if (action === 'application-reject') return modal(i, `application-reject-form:${a}`, 'Reject application', [{ id: 'note', label: 'Note', long: true, max: 1500 }]);
    await defer(i); return decide(i, a, 'accepted');
  }
  if (action === 'template-page') { await need(i); return showTemplates(i, Number(a)); }
  if (action === 'template-select') {
    await need(i); const n = Number(i.values[0]), p = templatePlan(n);
    const text = `**Template:** ${p.name}\n**Unprivileged roles:** ${p.roles.join(', ')}\n\n${p.categories.map(c => `**${c.name}**\n${c.channels.map(x => `${x.type === CT.GuildVoice ? 'Voice' : 'Text'}: ${x.name}${x.readOnly ? ' (read-only)' : ''}`).join('\n')}`).join('\n\n')}\n\nNo existing channels or roles will be deleted or reassigned. New information channels are read-only for @everyone. Other new channels inherit category permissions. Review permissions after setup.`;
    return confirm(i, 'template-build', { template: n }, text);
  }
  if (action === 'cancel') {
    const c = db.get('confirmation', a);
    if (!c || c.user !== i.user.id || c.guild !== i.guildId) fail('This confirmation is unavailable.');
    db.del('confirmation', a); return i.update({ content: 'Action cancelled.', embeds: [], components: [] });
  }
  if (action === 'confirm') {
    const c = db.get('confirmation', a);
    if (!c || c.user !== i.user.id || c.guild !== i.guildId || c.expires < now()) fail('This confirmation has expired or belongs to another user.');
    await defer(i);
    // Consume before side effects; duplicate clicks cannot replay destructive actions.
    if (!db.get('confirmation', a)) fail('This confirmation was already used or cancelled.');
    db.del('confirmation', a);
    if (c.action.startsWith('mod-')) return executeMod(i, c.action.slice(4), c.data);
    if (c.action === 'dm') {
      await need(i); const user = await client.users.fetch(c.data.user);
      await user.send({ content: c.data.text, allowedMentions: noMentions });
      return reply(i, 'Direct message sent.');
    }
    if (c.action === 'template-build' || c.action === 'template-resume') return buildTemplate(i, c.data.template, c.data.job);
    if (c.action === 'ticket-delete') {
      const t = db.get('ticket', c.data.ticket);
      if (!t || t.guild !== i.guildId || t.state !== 'closed') fail('Closed ticket not found.');
      await ticketStaff(i, t);
      await (await i.guild.channels.fetch(t.channel)).delete(`Closed ticket deletion confirmed by ${i.user.id}`);
      t.state = 'deleted'; db.put('ticket', t.id, t);
      return reply(i, 'Closed ticket channel deleted.');
    }
    if (c.action.startsWith('giveaway-')) {
      await need(i); const g = db.get('giveaway', c.data.id);
      if (!g || g.guild !== i.guildId) fail('Giveaway not found.');
      if (c.action === 'giveaway-cancel') {
        await locked(`giveaway:${g.id}`, async () => {
          const current = db.get('giveaway', g.id);
          if (current.state !== 'active') fail('Only an active giveaway can be cancelled.');
          current.state = 'cancelled'; db.put('giveaway', current.id, current);
          const ch = await textChannel(i.guild, current.channel);
          await (await ch.messages.fetch(current.message)).edit(giveawayView(current));
        });
      } else await drawGiveaway(i.guild, g.id, c.action === 'giveaway-reroll');
      await audit(i.guild, c.action, i.user.id, '', g.prize, `Giveaway ${g.message}`);
      return reply(i, 'Giveaway updated.');
    }
  }
}

function applyPresence(p) {
  client.user.setPresence({ activities: [{ name: p.text, type: AT[p.activity] ?? AT.Playing }], status: p.availability });
}
let ticking = false;
async function tick() {
  if (ticking || !client.isReady()) return;
  ticking = true;
  try {
    for (const g of db.all('giveaway')) {
      if (g.guild !== process.env.GUILD_ID || !['active', 'ended'].includes(g.state)) continue;
      try {
        const guild = await client.guilds.fetch(g.guild);
        if (g.state === 'active' && g.ends <= now()) await drawGiveaway(guild, g.id);
        else if (g.state === 'ended' && g.delivery && (!g.delivery.announced || !g.delivery.edited || g.winners.some(u => !g.delivery.dms[u]))) {
          await locked(`giveaway:${g.id}`, () => deliverGiveaway(guild, db.get('giveaway', g.id)));
        }
      } catch (e) { console.error(`Giveaway ${g.id}:`, safeError(e)); }
    }
    for (const a of db.all('application')) {
      if (a.guild === process.env.GUILD_ID && ['submitting', 'delivery-failed'].includes(a.state) && (!a.retryAt || a.retryAt <= now())) {
        try {
          const guild = await client.guilds.fetch(a.guild);
          await locked(`application-submit:${a.guild}:${a.user}:${a.panel}`, () => deliverApplication(guild, db.get('application', a.id)));
        } catch (e) {
          // The submitting handler may hold the lock; do not overwrite its newer state.
          if (!locks.has(`application-submit:${a.guild}:${a.user}:${a.panel}`)) {
            const current = db.get('application', a.id);
            if (['submitting', 'delivery-failed'].includes(current.state)) {
              current.state = 'delivery-failed'; current.error = safeError(e); current.retryAt = now() + 60000;
              db.put('application', current.id, current);
            }
          }
          console.error('Application delivery recovery:', safeError(e));
        }
      }
      if (a.guild === process.env.GUILD_ID && ['accepted', 'rejected'].includes(a.state) && a.dm === 'pending') {
        try { await locked(`application-decision:${a.id}`, () => decisionDM(a)); }
        catch (e) { console.error('Application recovery:', safeError(e)); }
      }
    }
    for (const kind of ['draft', 'confirmation']) for (const item of db.all(kind)) if (item.expires < now()) db.del(kind, item.id);
  } finally { ticking = false; }
}
async function start() {
  for (const key of SECRET_KEYS) if (!process.env[key]) fail(`Missing environment variable: ${key}`);
  if (!/^\d{17,22}$/.test(process.env.CLIENT_ID) || !/^\d{17,22}$/.test(process.env.GUILD_ID)) fail('CLIENT_ID and GUILD_ID must be numeric Discord IDs.');
  if (process.env.RENDER && !process.env.DB_PATH?.startsWith('/var/data/')) fail('Render requires DB_PATH=/var/data/ld-giveaways.sqlite and a persistent disk mounted at /var/data.');
  // Only liveness/readiness information is exposed, never guild data or credentials.
  const server = http.createServer((req, res) => {
    if (req.url !== '/' && req.url !== '/healthz') { res.writeHead(404); return res.end('Not found'); }
    const ready = client.isReady();
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ service: 'LD GIVEAWAYS', ready, version: VERSION }));
  });
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0');
  client.on(Events.InteractionCreate, async i => {
    if (!i.isChatInputCommand() && !i.isMessageComponent() && !i.isModalSubmit()) return;
    try {
      const isFeedback = i.isStringSelectMenu() && i.customId.startsWith('feedback:');
      if (!isFeedback && (!i.guildId || i.guildId !== process.env.GUILD_ID)) fail('This bot is configured for a different server.');
      if (i.isChatInputCommand()) await handleCommand(i);
      else if (i.isModalSubmit()) await handleModal(i);
      else await handleComponent(i);
    } catch (e) {
      console.error('Interaction error:', safeError(e));
      await reply(i, { content: safeError(e), embeds: [], components: [] }).catch(() => {});
    }
  });
  client.on(Events.Error, e => console.error('Client error:', safeError(e)));
  client.on(Events.Warn, s => console.warn(cut(s, 300)));
  client.once(Events.ClientReady, async readyClient => {
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      if (readyClient.user.id !== process.env.CLIENT_ID) fail('CLIENT_ID does not match the bot token.');
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands().map(c => c.toJSON()) });
      const presence = db.get('presence', 'current'); if (presence) applyPresence(presence);
      console.log(`Ready as ${readyClient.user.tag}. ${commands().length} commands registered. Storage opened.`);
      await tick();
    } catch (e) { console.error('Startup setup failed:', safeError(e)); process.exitCode = 1; await shutdown(); }
  });
  const timer = setInterval(() => { tick().catch(e => console.error('Scheduler:', safeError(e))); }, 15000);
  timer.unref();
  let stopping = false;
  async function shutdown() {
    if (stopping) return; stopping = true;
    clearInterval(timer); client.destroy();
    // Let active operations finish; sync SQLite commits are already durable.
    const until = now() + 8000;
    while (locks.size && now() < until) await new Promise(resolve => setTimeout(resolve, 100));
    db.db.close(); server.close(); process.exit(process.exitCode || 0);
  }
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
  process.on('unhandledRejection', e => { console.error('Unhandled rejection:', safeError(e)); process.exitCode = 1; shutdown(); });
  await client.login(process.env.DISCORD_TOKEN);
}

async function selfTest() {
  let count = 0;
  const test = (name, fn) => { fn(); count++; console.log(`PASS ${name}`); };
  test('duration units and composition', () => {
    assert.equal(duration('1h 30m'), 5400000); assert.equal(duration('2w'), 1209600000);
    assert.equal(duration('10s'), 10000); assert.equal(duration('1d'), 86400000);
  });
  test('duration invalid input', () => { for (const x of ['', '0m', '-1h', '1.5h', '2h junk', '30']) assert.throws(() => duration(x)); });
  test('random winners are unique and bounded', () => {
    assert.deepEqual(choose(['a', 'a', 'b'], 9, () => 0), ['a', 'b']); assert.equal(choose([], 1).length, 0);
    for (let n = 0; n < 100; n++) assert.equal(new Set(choose(['a', 'b', 'c'], 2)).size, 2);
  });
  test('question validation', () => { assert.deepEqual(questions('A?\n\nB?'), ['A?', 'B?']); assert.throws(() => questions('x'.repeat(46))); assert.throws(() => questions(Array(26).fill('Q').join('\n'))); });
  test('database roundtrip and isolation', () => {
    db.put('test', '1', { guild: 'g', n: 1 }); const a = db.get('test', '1'); a.n = 4;
    assert.equal(db.get('test', '1').n, 1); assert.equal(db.all('test').length, 1);
    db.del('test', '1'); assert.equal(db.get('test', '1'), null);
  });
  test('transaction rollback', () => {
    assert.throws(() => db.transaction(() => { db.put('test', 'rollback', { n: 1 }); throw Error('abort'); }));
    assert.equal(db.get('test', 'rollback'), null);
  });
  test('thirty distinct complete templates', () => {
    assert.equal(templateSpecs.length, 30); assert.equal(new Set(templateSpecs.map(t => t[0])).size, 30);
    for (let j = 0; j < 30; j++) { const p = templatePlan(j); assert.equal(p.categories.length, 3); assert.equal(p.roles.length, 2); assert.equal(p.categories.flatMap(c => c.channels).length, 8); }
  });
  test('slash command payloads serialize', () => {
    const cmds = commands().map(c => c.toJSON());
    assert(cmds.length < 100); assert.equal(new Set(cmds.map(c => c.name)).size, cmds.length);
    for (const c of cmds) assert(c.description.length <= 100);
  });
  test('public panel components persist stable IDs', () => {
    const ticket = { kind: 'ticket', id: 'abc', title: 'Support', text: 'Text', button: 'Open', mode: 'plain' };
    assert.equal(publicPanel(ticket).components[0].toJSON().components[0].custom_id, 'ticket-open:abc:0');
    const app = publicPanel({ ...ticket, kind: 'application' }).components[0].toJSON().components[0];
    assert.equal(app.style, BS.Success); assert.equal(app.emoji.name, '🪪');
  });
  test('role panels split into rows of five', () => {
    const data = publicPanel({ kind: 'roles', id: 'r', title: 'Roles', text: 'Choose', mappings: Array.from({ length: 20 }, (_, n) => ({ emoji: '🎮', role: String(n), label: `Role ${n}` })) });
    assert.equal(data.components.length, 4); assert(data.components.every(r => r.toJSON().components.length === 5));
  });
  test('category preview fits component limits', () => {
    const p = panelPreview({ kind: 'ticket', id: 'x', title: 'Support', text: 'Text', channel: '123', button: 'Open', mode: 'categories', categories: Array.from({ length: 25 }, (_, n) => ({ name: `Category ${n}`, welcome: 'Hi' })) });
    assert(p.components.length <= 5); assert.equal(p.components[2].toJSON().components[0].options.length, 25);
  });
  test('giveaway result has no entry button', () => {
    const g = { id: 'g', prize: 'LD', ends: now(), count: 1, entries: ['u'], state: 'ended', winners: ['u'] };
    assert.equal(giveawayView(g).components.length, 0); assert.equal(giveawayView({ ...g, state: 'active' }).components.length, 1);
  });
  test('draft ownership and expiry', () => {
    const i = { user: { id: 'u' }, guildId: 'g' }, d = draft(i, 'ticket');
    assert.equal(getDraft(i, d.id).id, d.id);
    assert.throws(() => getDraft({ ...i, user: { id: 'v' } }, d.id));
    d.expires = 1; db.put('draft', d.id, d); assert.throws(() => getDraft(i, d.id));
  });
  test('role cooldown survives storage roundtrip', () => {
    db.put('role-grant', 'g:u:r', { guild: 'g', user: 'u', role: 'r', unlock: now() + 20000 });
    assert(db.get('role-grant', 'g:u:r').unlock > now());
  });
  test('modern modal labels serialize', () => {
    const m = new Modal().setCustomId('test').setTitle('Test').addLabelComponents(
      new Label().setLabel('Question').setTextInputComponent(new Input().setCustomId('q').setStyle(TS.Short)));
    assert.equal(m.toJSON().components[0].type, 18);
  });
  test('secret errors are redacted', () => { assert(!safeError(Error('a'.repeat(24) + '.' + 'b'.repeat(8) + '.' + 'c'.repeat(24))).includes('a'.repeat(24))); });
  await locked('test-lock', async () => { await assert.rejects(() => locked('test-lock', async () => {})); });
  count++; console.log('PASS concurrent duplicate action lock');
  // Mocked API workflows exercise behavior without a token or network side effects.
  const asyncTest = async (name, fn) => { await fn(); count++; console.log(`PASS ${name}`); };
  const originalUser = client.user, originalFetch = client.users.fetch;
  const messagesSent = [], directMessages = [], channelsCreated = [], rolesCreated = [];
  let roleAdds = 0, roleRemoves = 0;
  const normalRole = { id: '123456789012345678', name: 'Member', position: 1, managed: false, permissions: new D.PermissionsBitField(0n) };
  const roles = new D.Collection([[normalRole.id, normalRole]]);
  const fakeMember = (uid, permissions = 0n) => ({
    id: uid, permissions: new D.PermissionsBitField(permissions),
    user: { id: uid, bot: false, createdTimestamp: now() - 400 * 86400000 },
    roles: { highest: { position: uid === 'admin' ? 20 : 2 }, cache: new D.Collection(),
      add: async r => { roleAdds++; members.get(uid).roles.cache.set(r.id, r); },
      remove: async r => { roleRemoves++; members.get(uid).roles.cache.delete(r.id); } },
  });
  const members = new Map([['admin', fakeMember('admin', P.Administrator)], ['user', fakeMember('user')], ['other', fakeMember('other')]]);
  const bot = { permissions: new D.PermissionsBitField(P.Administrator), roles: { highest: { position: 30 } } };
  const channelMap = new D.Collection();
  function fakeChannel(channelId = 'test-channel', name = 'test', type = CT.GuildText, parentId = null) {
    return {
      id: channelId, name, type, parentId,
      permissionsFor: () => new D.PermissionsBitField(P.Administrator),
      send: async payload => { messagesSent.push(payload); return { id: `message-${messagesSent.length}`, edit: async value => value }; },
      messages: { fetch: async () => ({ edit: async payload => payload }) },
      permissionOverwrites: { cache: new D.Collection(), edit: async () => {}, delete: async () => {} },
    };
  }
  const testChannel = fakeChannel(); channelMap.set(testChannel.id, testChannel);
  const guild = {
    id: 'test-guild', name: 'LD GIVEAWAYS', ownerId: 'owner',
    members: { fetch: async uid => members.get(uid) || null, fetchMe: async () => bot },
    roles: {
      fetch: async key => key ? roles.get(key) : roles,
      create: async options => { rolesCreated.push(options); const r = { ...options, id: `created-role-${rolesCreated.length}` }; roles.set(r.id, r); return r; },
    },
    channels: {
      fetch: async key => key ? channelMap.get(key) : channelMap,
      create: async options => {
        channelsCreated.push(options);
        const c = fakeChannel(`created-channel-${channelsCreated.length}`, options.name, options.type, options.parent || null);
        channelMap.set(c.id, c); return c;
      },
    },
  };
  function interaction(uid = 'admin', customId = '') {
    return {
      user: { id: uid }, guild, guildId: guild.id, channelId: testChannel.id, channel: testChannel,
      customId, deferred: false, replied: false, replies: [],
      deferReply: async function () { this.deferred = true; },
      reply: async function (x) { this.replied = true; this.replies.push(x); return x; },
      editReply: async function (x) { this.replies.push(x); return x; },
      followUp: async function (x) { this.replies.push(x); return x; },
      isStringSelectMenu: () => false,
    };
  }
  try {
    client.user = { id: 'bot' };
    client.users.fetch = async uid => ({ send: async payload => { directMessages.push({ uid, payload }); } });
    await asyncTest('announcement sends exact text without injected text or pings', async () => {
      const i = interaction(); i.commandName = 'announcement';
      i.options = { getChannel: () => null, getString: () => '**Original**\n@everyone' };
      await handleCommand(i);
      assert.equal(messagesSent.at(-1).content, '**Original**\n@everyone');
      assert.deepEqual(messagesSent.at(-1).allowedMentions.parse, []);
      i.user.id = 'user'; i.deferred = false;
      await assert.rejects(() => handleCommand(i), /permission/);
    });
    await asyncTest('emoji roles enforce persistent 20-second removal delay', async () => {
      db.put('panel', 'role-panel-test', { id: 'role-panel-test', kind: 'roles', active: true, guild: guild.id, mappings: [{ role: normalRole.id }] });
      await handleComponent(interaction('user', 'role:role-panel-test:0'));
      assert.equal(roleAdds, 1);
      await assert.rejects(() => handleComponent(interaction('user', 'role:role-panel-test:0')), /Wait/);
      assert.equal(roleRemoves, 0);
      const key = `${guild.id}:user:${normalRole.id}`, grant = db.get('role-grant', key);
      grant.unlock = now() - 1; db.put('role-grant', key, grant);
      await handleComponent(interaction('user', 'role:role-panel-test:0'));
      assert.equal(roleRemoves, 1);
      normalRole.permissions = new D.PermissionsBitField(P.Administrator);
      await assert.rejects(() => handleComponent(interaction('user', 'role:role-panel-test:0')), /elevated/);
      assert.equal(roleAdds, 1); normalRole.permissions = new D.PermissionsBitField(0n);
    });
    await asyncTest('concurrent confirmation clicks send only one DM', async () => {
      const c = { id: 'double-click', guild: guild.id, user: 'admin', action: 'dm', data: { user: 'user', text: 'Exact DM' }, expires: now() + 10000 };
      db.put('confirmation', c.id, c);
      const before = directMessages.length;
      const results = await Promise.allSettled([handleComponent(interaction('admin', `confirm:${c.id}`)), handleComponent(interaction('admin', `confirm:${c.id}`))]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(directMessages.length - before, 1); assert.equal(directMessages.at(-1).payload.content, 'Exact DM');
    });
    await asyncTest('application accepts without a role and rejects with the exact note', async () => {
      const before = roleAdds;
      for (const state of ['accepted', 'rejected']) {
        const a = { id: `test-${state}`, guild: guild.id, guildName: guild.name, user: 'user', state: 'pending', log: testChannel.id, message: 'review' };
        db.put('application', a.id, a);
        await decide(interaction(), a.id, state, state === 'rejected' ? 'Please add more detail.' : '');
        assert.equal(db.get('application', a.id).state, state);
        assert.equal(db.get('application', a.id).dm, 'sent');
      }
      assert.equal(roleAdds, before);
      assert(directMessages.at(-1).payload.embeds[0].toJSON().description.includes('**Reason:**\nPlease add more detail.'));
    });
    await asyncTest('closed decision DMs do not undo the application result', async () => {
      const goodFetch = client.users.fetch;
      client.users.fetch = async () => ({ send: async () => { const e = Error('closed'); e.code = 50007; throw e; } });
      const a = { id: 'closed-dm-app', guild: guild.id, guildName: guild.name, user: 'user', state: 'pending', log: testChannel.id, message: 'review' };
      db.put('application', a.id, a);
      await decide(interaction(), a.id, 'rejected', 'Test note');
      assert.equal(db.get('application', a.id).state, 'rejected');
      assert.match(db.get('application', a.id).dm, /closed/);
      client.users.fetch = goodFetch;
    });
    await asyncTest('interrupted application delivery resumes from the saved answer', async () => {
      const send = testChannel.send; let call = 0;
      testChannel.send = async payload => { call++; if (call === 3) throw Error('temporary connection error'); return send(payload); };
      const a = { id: 'resume-app', guild: guild.id, guildName: guild.name, user: 'user', title: 'Application', log: testChannel.id, at: now(),
        state: 'submitting', questions: ['First?', 'Second?'], answers: ['A', 'B'], delivered: 0 };
      db.put('application', a.id, a);
      await assert.rejects(() => deliverApplication(guild, a), /temporary/);
      const saved = db.get('application', a.id); assert(saved.overview); assert.equal(saved.delivered, 1);
      testChannel.send = send; const before = messagesSent.length;
      await deliverApplication(guild, saved);
      assert.equal(messagesSent.length - before, 2);
      assert.equal(db.get('application', a.id).state, 'pending');
      assert.equal(messagesSent.at(-1).components[0].toJSON().components.length, 2);
    });
    await asyncTest('giveaway draw persists unique winners and avoids repeat delivery', async () => {
      const g = { id: 'draw-test', guild: guild.id, channel: testChannel.id, message: 'giveaway-message', prize: '100 LD', count: 2, minDays: 7,
        entries: ['user', 'other', 'user'], state: 'active', ends: now() - 1 };
      db.put('giveaway', g.id, g); const before = directMessages.length;
      await drawGiveaway(guild, g.id);
      const ended = db.get('giveaway', g.id);
      assert.equal(ended.state, 'ended'); assert.equal(new Set(ended.winners).size, 2);
      assert.equal(directMessages.length - before, 2);
      const sent = messagesSent.length, dms = directMessages.length;
      await deliverGiveaway(guild, ended);
      assert.equal(messagesSent.length, sent); assert.equal(directMessages.length, dms);
      await assert.rejects(() => drawGiveaway(guild, g.id, true), /No new eligible/);
    });
    await asyncTest('ticket creation preserves custom text and prevents duplicate open tickets', async () => {
      const p = { id: 'ticket-test-panel', guild: guild.id, categories: [{ name: 'Help', welcome: 'Welcome. Please do not tag anyone.' }] };
      const before = channelsCreated.length;
      await openTicket(interaction('user'), p, 0);
      assert.equal(channelsCreated.length - before, 1);
      const t = db.all('ticket').find(t => t.panel === p.id);
      assert.equal(t.state, 'open');
      assert.equal(messagesSent.at(-1).content, 'Welcome. Please do not tag anyone.');
      assert(channelsCreated.at(-1).permissionOverwrites.some(o => o.id === guild.id && o.deny.includes(P.ViewChannel)));
      await openTicket(interaction('user'), p, 0);
      assert.equal(channelsCreated.length - before, 1);
      const close = interaction(); close.channelId = t.channel; close.channel = channelMap.get(t.channel);
      await closeTicket(close, t, 'Resolved.');
      assert.equal(db.get('ticket', t.id).state, 'closed');
      assert.equal(directMessages.at(-1).payload.components[0].toJSON().components[0].options.length, 5);
    });
    await asyncTest('template setup is additive and creates no privileged roles', async () => {
      const rBefore = rolesCreated.length, cBefore = channelsCreated.length, assignments = roleAdds;
      await buildTemplate(interaction(), 1);
      assert.equal(rolesCreated.length - rBefore, 2); assert.equal(channelsCreated.length - cBefore, 11);
      assert(rolesCreated.every(r => Array.isArray(r.permissions) && r.permissions.length === 0));
      assert.equal(roleAdds, assignments);
      const before = channelsCreated.length; await buildTemplate(interaction(), 1);
      assert.equal(channelsCreated.length, before); assert.equal(rolesCreated.length - rBefore, 2);
      assert(channelsCreated.some(c => c.name === 'announcements' && c.permissionOverwrites?.some(o => o.deny?.includes(P.SendMessages))));
    });
  } finally {
    client.user = originalUser; client.users.fetch = originalFetch;
  }
  db.db.close(); client.destroy(); console.log(`\n${count} self-tests passed. Discord live integration is not tested by this command.`);
}
if (require.main === module) {
  (SELF_TEST ? selfTest() : start()).catch(e => { console.error('Fatal:', safeError(e)); process.exit(1); });
}
