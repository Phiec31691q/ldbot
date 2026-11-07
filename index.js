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
 * - Mevcut Render servisin ve mevcut bot bağlantı ayarların kullanılabilir.
 * - Kalıcı veri saklamak için kalıcı depolama önerilir, açılış şartı değildir.
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
 * Mevcut servisin varsa servis veya environment ayarlarını değiştirmen
 *   gerekmez. index.js dosyasını güncellemen ve auto deploy yeterlidir.
 * Aşağıdaki bağlantı ayarları yalnız sıfırdan kurulum içindir:
 *   NODE_VERSION = 24
 *   DISCORD_TOKEN = Bot sayfasındaki gizli token
 *   CLIENT_ID = Application ID
 *   GUILD_ID = Server ID
 * İsteğe bağlı mevcut ayarlar (eklemen zorunlu değil):
 *   DB_PATH = kullanmak istediğin yazılabilir veritabanı dosyası yolu
 *   SETUP_ENABLED = false yazılırsa sunucu şablonu kurulumu kapanır.
 * DB_PATH yoksa ./data/ld-giveaways.sqlite otomatik kullanılır.
 * Disk veya /var/data yolu zorunlu değildir; kod bu nedenle durmaz.
 * Mevcut kalıcı depolaman yoksa deploy/restart sonrasında yerel kayıtlar
 *   kaybolabilir. Sürekli açık tutmak, kalıcı veri depolamakla aynı değildir.
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
 *   Başlık/metin/buton yazısını gir. Sonra Add questions butonuna bas.
 *   Her soru ayrı satır; güncel discord.js ile her soru en çok 100 karakter.
 *   45 karakteri aşan soru formda açıklama alanında tam gösterilir.
 *   Add questions tekrar tekrar kullanılabilir; 25 soru sınırı yoktur.
 *   Edit question / Remove question / View questions ile listeyi düzenle.
 *   Başvuranlara sorular beşerli sayfalarda gösterilir.
 *   Form dolduran kişi Continue ile sonraki sayfayı açar.
 *   Sonra Submit ile gönderir. Edit answers ile cevaplarını değiştirebilir.
 *   Panelde yeşil 🪪 butonu var; diğer sistemlere emoji eklenmez.
 *   Sonuç kanalında yeşil Accept / kırmızı Reject.
 *   Uzun formlarda cevaplar ayrı düzenli mesajlara bölünür; karar butonları
 *   en son mesajdadır. Yarım aktarım kaydedilir, otomatik devam eder.
 *   Gönderim arka planda beş cevaplık paketlerle yapılır; uzun başvuru
 *   aktarımı çekiliş zamanlayıcısını veya komut yanıtlarını bekletmez.
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
 * 1.1.0 GÜNCELLEME:
 * - Eski global komutların bu bottaki komutlarla aynı isimli kopyaları,
 *   başlangıçta temizlenir; diğer uygulamalara dokunulmaz.
 * - Setup ekranı/formu işlemlerinin yanıt türleri ayrıldı; form açılmadan
 *   defer yapılmaz, uzun işlemlerde ise ilk yanıt hemen gönderilir.
 * - Hatalar referans koduyla Render loguna kaydedilir. Token paylaşma.
 * - Eski ve veritabanı kaydı kaybolmuş panelleri yeniden kurmak gerekir.
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
const VERSION = '1.1.0';
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
  const max = typeof Label === 'function' ? 100 : 45;
  if (!q.length || q.some(x => x.length > max)) fail(`Enter questions on separate lines, with 1-${max} characters per question. You can add more batches afterwards.`);
  return q;
}
const completeAnswers = a => !!a.questions?.length && a.questions.every((_, n) => typeof a.answers?.[n] === 'string' && a.answers[n].trim().length > 0);
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
function databasePath(env = process.env) {
  return env.DB_PATH || path.join(__dirname, 'data', 'ld-giveaways.sqlite');
}
const db = new Store(SELF_TEST ? ':memory:' : databasePath());
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
const defer = i => i.deferred || i.replied ? Promise.resolve() : i.deferReply({ flags: MF.Ephemeral });
async function update(i, payload) {
  if (i.deferred) return i.editReply({ ...payload, allowedMentions: noMentions });
  return i.update({ ...payload, allowedMentions: noMentions });
}
async function modal(i, custom, title, fields) {
  if (!fields.length || fields.length > 5) fail('This form page must contain between 1 and 5 fields.');
  if (i.deferred || i.replied) fail('This form could not be opened. Click the button again.');
  // Label forms on current v14; legacy rows on installations without LabelBuilder.
  const data = { custom_id: custom, title: cut(title, 45), components: fields.map(f => {
    const component = {
      type: 4, custom_id: f.id, style: f.long ? TS.Paragraph : TS.Short,
      required: f.required !== false, max_length: f.max || 4000,
      ...(f.value ? { value: cut(f.value, f.max || 4000) } : {}),
      ...(f.placeholder ? { placeholder: cut(f.placeholder, 100) } : {}),
    };
    return typeof Label === 'function' ? { type: 18, label: cut(f.label, 45), ...(f.description ? { description: cut(f.description, 100) } : {}), component }
      : { type: 1, components: [{ ...component, label: cut(f.label, 45) }] };
  }) };
  return i.showModal(data);
}
const field = (i, name) => i.fields.getTextInputValue(name).trim();
async function member(i) {
  if (!i.guild) fail('Use this command in the server.');
  if (i.member?.permissions?.has && i.member.roles?.cache) return i.member;
  const cached = i.guild.members.cache?.get(i.user.id);
  if (cached) return cached;
  return i.guild.members.fetch(i.user.id);
}
async function need(i, permission = P.Administrator) {
  const m = await member(i);
  if (!m.permissions.has(permission)) fail('You do not have permission to use this action.');
  return m;
}
async function botNeed(g, ...permissions) {
  const me = g.members.me || await g.members.fetchMe();
  const missing = new D.PermissionsBitField(permissions).toArray().filter(p => !me.permissions.has(P[p]));
  if (missing.length) fail(`The bot needs these server permissions: ${missing.join(', ')}.`);
  return me;
}
async function textChannel(g, channelId, needsEmbeds = true) {
  const c = await g.channels.fetch(channelId);
  if (!c || ![CT.GuildText, CT.GuildAnnouncement].includes(c.type)) fail('Choose a server text or announcement channel.');
  const me = await g.members.fetchMe();
  const required = [P.ViewChannel, P.SendMessages, ...(needsEmbeds ? [P.EmbedLinks] : [])];
  const missing = new D.PermissionsBitField(required).toArray().filter(p => !c.permissionsFor(me)?.has(P[p]));
  if (missing.length) fail(`The bot needs these permissions in this channel: ${missing.join(', ')}.`);
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
  if (code === 10062) return 'This interaction expired. Please click the current button or run the command again.';
  if (code === 40060) return 'This action has already been acknowledged. Please use the latest panel.';
  if (code === 50035) return cut(`Discord rejected a field: ${apiErrorDetails(e.rawError?.errors).join('; ') || 'invalid form data'}`, 700);
  if (e?.name === 'DiscordAPIError' || String(e?.name).startsWith('DiscordAPIError')) return `Discord rejected the request (code ${code || 'unknown'}).`;
  return cut(e?.message || 'An unexpected error occurred.', 700).replace(/[\w-]{20,}\.[\w-]{5,}\.[\w-]{20,}/g, '[redacted]');
}
function apiErrorDetails(value, prefix = '') {
  if (!value || typeof value !== 'object') return [];
  const out = [];
  for (const [key, child] of Object.entries(value)) {
    if (key === '_errors' && Array.isArray(child)) {
      for (const e of child) out.push(`${prefix || 'payload'}: ${cut(e.message, 120)}`);
    } else out.push(...apiErrorDetails(child, prefix ? `${prefix}.${key}` : key));
  }
  return out.slice(0, 6);
}
async function syncCommands(rest, appId, guildId) {
  const payload = commands().map(c => c.toJSON());
  if (new Set(payload.map(c => c.name)).size !== payload.length) fail('Duplicate command definitions were found.');
  // Register one canonical guild copy before removing matching legacy global copies.
  await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: payload });
  const globals = await rest.get(Routes.applicationCommands(appId));
  const names = new Set(payload.map(c => c.name));
  let removed = 0;
  for (const c of globals) {
    if (names.has(c.name) && (!c.type || c.type === 1)) {
      await rest.delete(Routes.applicationCommand(appId, c.id)); removed++;
    }
  }
  return { count: payload.length, removed };
}

function command(name, description, permission) {
  const c = new SC().setName(name).setDescription(description).setDMPermission(false);
  if (permission) c.setDefaultMemberPermissions(permission);
  return c;
}
const str = (builder, name, description, required = false, max = 2000) =>
  builder.addStringOption(o => o.setName(name).setDescription(description).setRequired(required).setMaxLength(max));
const channelOpt = (builder, name, description, required = false, type = [CT.GuildText, CT.GuildAnnouncement]) =>
  builder.addChannelOption(o => o.setName(name).setDescription(description).addChannelTypes(...(Array.isArray(type) ? type : [type])).setRequired(required));
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
    } else {
      c.setDefaultMemberPermissions(null);
      c.addSubcommand(s => str(s.setName('retry-dm').setDescription('Retry a failed decision notification.'), 'submission-id', 'Submission ID', true, 30));
    }
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
  if (d.kind === 'roles') fields.push({ id: 'mappings', label: 'emoji | role ID | button label (one per line)', long: true, value: d.mappingText });
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
  } else if (d.kind === 'application') {
    details += `**Review log:** ${d.log ? `<#${d.log}>` : 'Create private application-results automatically'}\n**Button label:** ${d.button}\n**Questions:** ${d.questions?.length || 0}\n\nUse Add questions as often as needed. Questions are presented in pages of five. Keep the review log private.`;
    parts.unshift(row(b(`questions-add:${d.id}`, 'Add questions', BS.Primary), b(`questions-edit:${d.id}`, 'Edit question'), b(`questions-remove:${d.id}`, 'Remove question'), b(`questions-list:${d.id}:0`, 'View questions')));
  }
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
      if (d.categories.some(c => !c.welcome?.trim())) fail('Enter the message that will be sent inside each ticket.');
      if (d.parent) {
        const parent = await i.guild.channels.fetch(d.parent);
        if (parent?.type !== CT.GuildCategory) fail('The selected parent category no longer exists.');
      }
    }
    if (d.kind === 'application' && !d.questions?.length) fail('Add at least one question with Add questions before sending the panel.');
    if (d.kind === 'application' && !d.log) {
      await botNeed(i.guild, P.ManageChannels, P.ViewChannel, P.SendMessages, P.EmbedLinks, P.AttachFiles, P.ReadMessageHistory);
      const permissions = [
        { id: i.guildId, type: 0, deny: [P.ViewChannel] },
        { id: client.user.id, type: 1, allow: [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.AttachFiles, P.ReadMessageHistory] },
      ];
      if (d.staff) permissions.push({ id: d.staff, type: 0, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] });
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
function questionList(d, requested = 0) {
  const list = d.questions || [], pages = Math.max(1, Math.ceil(list.length / 10));
  const page = Math.max(0, Math.min(pages - 1, requested));
  const text = list.slice(page * 10, page * 10 + 10).map((q, n) => `**${page * 10 + n + 1}.** ${q}`).join('\n\n');
  return { embeds: [embed('Application questions', `${text || 'No questions added yet.'}\n\n**Page:** ${page + 1}/${pages}\n**Total questions:** ${list.length}`)], components: [
    row(b(`questions-list:${d.id}:${Math.max(0, page - 1)}`, 'Previous'), b(`questions-list:${d.id}:${Math.min(pages - 1, page + 1)}`, 'Next'), b(`questions-back:${d.id}`, 'Back to setup')),
  ] };
}

function getPanel(i, key, kind) {
  const p = db.get('panel', key);
  if (!p || !p.active || p.guild !== i.guildId || p.kind !== kind) fail('This panel has no available saved configuration. An administrator must recreate it with /ticket setup or /application setup (or /roles for role panels). This can happen after a redeploy without persistent storage.');
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
    const cat = p.categories?.[Number(index)];
    if (!cat) fail('This ticket category is no longer available.');
    if (db.all('ticket').filter(t => t.guild === i.guildId && ['open', 'creating', 'closing'].includes(t.state)).length >= 100) fail('This server has reached the limit of 100 active tickets. Ask the support team to close older tickets.');
    await botNeed(i.guild, P.ManageChannels, P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks);
    if (p.staff) {
      const staff = await i.guild.roles.fetch(p.staff);
      if (!staff || staff.id === i.guildId || staff.managed) fail('The ticket support role no longer exists or is not valid. Ask an administrator to edit the panel.');
    }
    if (p.parent) {
      const parent = await i.guild.channels.fetch(p.parent);
      if (!parent || parent.type !== CT.GuildCategory) fail('The ticket parent category was deleted. Ask an administrator to edit the panel.');
      if ((parent.children?.cache?.size || 0) >= 50) fail('The ticket parent category is full. Ask an administrator to choose another category.');
    }
    const t = { id: id(), guild: i.guildId, panel: p.id, owner: i.user.id, staff: p.staff, log: p.log, state: 'creating', at: now(), title: cat.name, participants: [] };
    db.put('ticket', t.id, t);
    const overwrites = [
      { id: i.guildId, type: 0, deny: [P.ViewChannel] },
      { id: client.user.id, type: 1, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks] },
      { id: i.user.id, type: 1, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles] },
    ];
    if (p.staff) overwrites.push({ id: p.staff, type: 0, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles] });
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
      t.error = safeError(e); db.put('ticket', t.id, t);
      if (c) return reply(i, `Your ticket was created: <#${c.id}>. The welcome message could not be delivered: ${safeError(e)}. Staff can use /ticket close in that channel.`);
      throw e;
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
    const me = await botNeed(i.guild, P.ManageRoles);
    const c = await i.guild.channels.fetch(t.channel);
    if (!c) fail('The ticket channel no longer exists.');
    if (!c.permissionsFor(me)?.has(P.ManageRoles)) fail('The bot needs Manage Roles in this ticket to update its permission overwrites.');
    t.state = 'closing'; t.closeNote = note; db.put('ticket', t.id, t);
    // Persist closing before external operations; Close may be retried after interruption.
    for (const user of [t.owner, ...(t.participants || [])]) {
      await c.permissionOverwrites.edit(user, { SendMessages: false, AddReactions: false, SendMessagesInThreads: false, CreatePublicThreads: false, CreatePrivateThreads: false }, { type: 1 });
    }
    if (t.log && !t.transcriptLogged) {
      try {
        const log = await textChannel(i.guild, t.log);
        if (log.id === c.id) fail('The transcript log must be outside this ticket.');
        await log.send({ content: `Ticket \`${t.id}\` closed by <@${i.user.id}>.\n**Note:** ${note || 'Not provided'}`, files: [await transcript(i.guild, t)], allowedMentions: noMentions });
        t.transcriptLogged = true;
      } catch (e) { t.transcriptError = safeError(e); }
      db.put('ticket', t.id, t);
    }
    t.state = 'closed'; t.closedAt = now(); t.closedBy = i.user.id;
    t.feedback = t.feedback || { token: id(), dm: 'pending' };
    db.put('ticket', t.id, t);
    await c.send({ embeds: [embed('Ticket closed', `**Closed by:** <@${i.user.id}>\n**Note:** ${note || 'Not provided'}`)] }).catch(e => console.error('Closure notice:', safeError(e)));
    if (t.control) await c.messages.fetch(t.control).then(m => m.edit({ components: [] })).catch(() => {});
    await deliverTicketFeedback(i.guild, t.id);
    await audit(i.guild, 'Ticket closed', i.user.id, t.owner, note, `Ticket ${t.id}`);
    await reply(i, `Ticket closed. The feedback request was attempted by direct message.${t.transcriptError ? `\nTranscript log delivery failed: ${t.transcriptError}. The channel was retained; use /ticket transcript to download it.` : ''}`);
  });
}
async function deliverTicketFeedback(guild, key) {
  const lockKey = `feedback-send:${key}`;
  if (locks.has(lockKey)) return;
  return locked(lockKey, async () => {
    const t = db.get('ticket', key);
    if (!t || !['closed', 'deleted'].includes(t.state) || !t.feedback || t.feedback.rating || t.feedback.dm === 'sent') return;
    try {
      const user = await client.users.fetch(t.owner);
      await user.send({ embeds: [embed('Ticket feedback', `Your ticket in **${guild.name}** has been closed.\nHow would you rate the support you received?`)],
        components: [select(`feedback:${t.id}:${t.feedback.token}`, 'Select a rating', [1, 2, 3, 4, 5].map(n => ({ label: `${n} / 5`, value: String(n) })))] });
      t.feedback.dm = 'sent'; delete t.feedback.retryAt;
    } catch (e) {
      t.feedback.dm = [50007, 10013].includes(e.code) ? safeError(e) : 'pending';
      t.feedback.error = safeError(e); t.feedback.retryAt = now() + 60000;
    }
    db.put('ticket', t.id, t);
  });
}

async function appPage(i, a) {
  const p = db.get('panel', a.panel);
  if (!p) fail('The application panel was removed.');
  const start = a.page * 5;
  if (!a.questions?.length) fail('This application has no configured questions. Ask an administrator to edit the panel.');
  if (start >= a.questions.length) return reply(i, appReview(a));
  if (typeof Label !== 'function' && a.questions.some(q => q.length > 45)) fail('Long questions require discord.js 14.28.1. Ask the administrator to update the dependency in the build command.');
  return modal(i, `application-form:${a.id}:${a.page}`, `Application (${a.page + 1}/${Math.ceil(a.questions.length / 5)})`,
    a.questions.slice(start, start + 5).map((q, n) => ({ id: `q${n}`, label: q.length > 45 ? `Question ${start + n + 1}` : q,
      ...(q.length > 45 ? { description: q } : {}), long: true, max: 1000, value: a.answers[start + n] })));
}
function appReview(a) {
  const done = completeAnswers(a);
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
  for (let n = a.delivered || 0; n < a.questions.length; n += 5) {
    const embeds = a.questions.slice(n, n + 5).map((q, j) => embed(`${n + j + 1}. ${q}`, a.answers[n + j]));
    await log.send({ embeds, allowedMentions: noMentions });
    a.delivered = Math.min(n + 5, a.questions.length); db.put('application', a.id, a);
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
const activeApplicationDeliveries = new Set();
async function runApplicationDelivery(guild, key) {
  const a = db.get('application', key);
  if (!a || !['submitting', 'delivery-failed'].includes(a.state) || activeApplicationDeliveries.has(key) || activeApplicationDeliveries.size >= 2) return;
  const lockKey = `application-submit:${a.guild}:${a.user}:${a.panel}`;
  if (locks.has(lockKey)) return;
  activeApplicationDeliveries.add(key);
  try {
    await locked(lockKey, async () => {
      try { await deliverApplication(guild, db.get('application', key)); }
      catch (e) {
        const current = db.get('application', key);
        current.state = 'delivery-failed'; current.error = safeError(e); current.retryAt = now() + 60000;
        db.put('application', key, current);
        console.error(`Application ${key} delivery:`, safeError(e));
      }
    });
  } finally { activeApplicationDeliveries.delete(key); }
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
      content: `**${state === 'accepted' ? 'Accepted' : 'Rejected'}** by <@${i.user.id}>\n${note ? `**Note:** ${note}\n` : ''}**DM:** ${cut(a.dm, 180)}\n**Submission ID:** \`${a.id}\``,
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
    const c = await textChannel(i.guild, data.channel || i.channelId, false);
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
      try { await c.permissionOverwrites.edit(i.guildId, { SendMessages: false }, { type: 0, reason }); }
      catch (e) { db.del('channel-lock', key); throw e; }
      result = 'Channel locked for @everyone. Explicit role/member overrides may still allow messages.';
    } else if (action === 'unlock') {
      const lock = db.get('channel-lock', c.id);
      if (!lock) fail('This bot has no stored lock for this channel.');
      await c.permissionOverwrites.edit(i.guildId, { SendMessages: lock.previous }, { type: 0, reason });
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
  await botNeed(i.guild, P.ManageChannels, P.ManageRoles, P.ViewChannel, P.SendMessages, P.EmbedLinks, P.AttachFiles);
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
              { id: i.guildId, type: 0, deny: [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads] },
              { id: client.user.id, type: 1, allow: [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.AttachFiles] },
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
    const c = await textChannel(i.guild, o.getChannel('channel')?.id || i.channelId, false);
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
      return locked(`ticket-state:${t.id}`, async () => {
        const current = db.get('ticket', t.id);
        if (current.state !== 'open') fail('Only open tickets can be modified.');
        const u = o.getUser('user');
        if (!u) fail('Choose a member to add or remove.');
        if ([current.owner, client.user.id, i.guild.ownerId].includes(u.id)) fail('You cannot change access for the ticket owner, bot or server owner.');
        await botNeed(i.guild, P.ManageRoles);
        if (sub === 'add') {
          const target = await i.guild.members.fetch(u.id);
          if (!target) fail('This user is not in the server.');
          await i.channel.permissionOverwrites.edit(u.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true }, { type: 1 });
          current.participants = [...new Set([...(current.participants || []), u.id])];
        } else {
          if (!(current.participants || []).includes(u.id)) fail('This member was not added through this ticket.');
          await i.channel.permissionOverwrites.delete(u.id);
          current.participants = current.participants.filter(x => x !== u.id);
        }
        db.put('ticket', current.id, current);
        return reply(i, 'Ticket access updated.');
      });
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
  return reply(i, 'This command belongs to an older version. Refresh Discord and use a command from /help.');
}

async function handleModal(i) {
  const [action, key, index] = i.customId.split(':');
  if (action === 'panel-form') {
    const d = getDraft(i, key); await defer(i); await need(i);
    d.title = field(i, 'title'); d.text = field(i, 'text');
    if (d.kind !== 'roles') d.button = field(i, 'button');
    if (d.kind === 'ticket') d.welcome = field(i, 'welcome');
    if (d.kind === 'application') d.questions = d.questions || [];
    if (d.kind === 'roles') {
      d.mappingText = field(i, 'mappings'); d.mappings = await parseMappings(i.guild, d.mappingText);
    }
    db.put('draft', d.id, d);
    return reply(i, panelPreview(d));
  }
  if (action === 'ticket-category-form') {
    const d = getDraft(i, key, 'ticket'); await defer(i); await need(i);
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
    const d = getDraft(i, key, 'giveaway'); await defer(i); await need(i);
    d.prize = field(i, 'prize'); d.description = field(i, 'description');
    d.duration = field(i, 'duration'); d.ms = duration(d.duration);
    d.count = Number(field(i, 'winners'));
    if (d.ms < 10000 || d.ms > 365 * 86400000) fail('Use a duration between 10 seconds and 365 days.');
    if (!Number.isInteger(d.count) || d.count < 1 || d.count > 20) fail('Choose 1-20 winners.');
    db.put('draft', d.id, d);
    return reply(i, { embeds: [embed('Giveaway preview', `**Prize:** ${d.prize}\n**Duration:** ${d.duration}\n**Winners:** ${d.count}\n**Channel:** <#${d.channel}>\n\n${d.description}`)],
      components: [row(b(`giveaway-send:${d.id}`, 'Send', BS.Success), b(`draft:cancel:${d.id}`, 'Cancel', BS.Danger))] });
  }
  if (['questions-add-form', 'questions-edit-form', 'questions-remove-form'].includes(action)) {
    await defer(i); await need(i);
    const d = getDraft(i, key, 'application');
    if (d.published) fail('This panel was already sent. Use /application edit to change its questions.');
    d.questions = d.questions || [];
    if (action === 'questions-add-form') d.questions.push(...questions(field(i, 'questions')));
    else {
      const n = Number(field(i, 'number')) - 1;
      if (!Number.isInteger(n) || n < 0 || n >= d.questions.length) fail(`Enter a question number between 1 and ${d.questions.length}.`);
      if (action === 'questions-remove-form') d.questions.splice(n, 1);
      else {
        const replacement = questions(field(i, 'question'));
        if (replacement.length !== 1) fail('Enter exactly one replacement question.');
        d.questions[n] = replacement[0];
      }
    }
    db.put('draft', d.id, d);
    return reply(i, panelPreview(d));
  }
  if (action === 'application-form') {
    await defer(i);
    const a = getDraft(i, key, 'application-entry');
    if (a.page !== Number(index) || a.submitted) fail('This application page is no longer active.');
    const offset = a.page * 5;
    const remaining = Math.min(5, a.questions.length - offset);
    if (remaining < 1) fail('This page was already completed. Use the latest Continue or Submit button.');
    for (let n = 0; n < remaining; n++) {
      const answer = field(i, `q${n}`);
      if (!answer) fail('Please answer every question on this page.');
      a.answers[offset + n] = answer;
    }
    a.page++; db.put('draft', a.id, a); return reply(i, appReview(a));
  }
  if (action === 'application-reject-form') {
    await defer(i);
    const note = field(i, 'note'); if (!note) fail('Enter a rejection note.');
    return decide(i, key, 'rejected', note);
  }
  return reply(i, 'This form belongs to an older version. Please reopen the current setup.');
}

async function handleComponent(i) {
  const [action, a, z] = i.customId.split(':');
  if (action.startsWith('questions-')) {
    await need(i);
    const d = getDraft(i, a, 'application');
    if (d.published) fail('This panel was already sent. Use /application edit to change its questions.');
    if (action === 'questions-list') return update(i, questionList(d, Number(z) || 0));
    if (action === 'questions-back') return update(i, panelPreview(d));
    if (action === 'questions-add') return modal(i, `questions-add-form:${d.id}`, 'Add application questions', [
      { id: 'questions', label: 'Questions (one per line, max 100 chars)', long: true, max: 4000 },
    ]);
    if (!d.questions?.length) fail('Add a question first.');
    if (action === 'questions-edit') return modal(i, `questions-edit-form:${d.id}`, 'Edit application question', [
      { id: 'number', label: `Question number (1-${d.questions.length})`, max: 10 },
      { id: 'question', label: 'New question', max: typeof Label === 'function' ? 100 : 45 },
    ]);
    if (action === 'questions-remove') return modal(i, `questions-remove-form:${d.id}`, 'Remove application question', [
      { id: 'number', label: `Question number (1-${d.questions.length})`, max: 10 },
    ]);
    fail('This question editor control is no longer available.');
  }
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
    return update(i, panelPreview(d));
  }
  if (action === 'ticket-count') {
    await need(i); const d = getDraft(i, a, 'ticket');
    const count = Number(i.values[0]); d.categories = Array.from({ length: count }, (_, n) => d.categories?.[n] || {});
    db.put('draft', d.id, d); return update(i, panelPreview(d));
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
    if (!t || t.owner !== i.user.id || t.feedback?.token !== z || !['closed', 'deleted'].includes(t.state)) fail('This feedback request is unavailable.');
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
    if (!p.questions?.length) fail('This application has no questions. Ask an administrator to use /application edit.');
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
      if (!completeAnswers(current)) fail('Complete every application page first.');
      const p = getPanel(i, current.panel, 'application');
      if (db.all('application').some(x => x.panel === p.id && x.user === i.user.id && awaitingApplication(x))) fail('You already have an application awaiting review.');
      await textChannel(i.guild, p.log);
      const submission = { id: current.id, guild: i.guildId, guildName: i.guild.name, user: i.user.id, panel: p.id, staff: p.staff, log: p.log,
        title: p.title, questions: current.questions, answers: current.answers, delivered: 0, state: 'submitting', at: now() };
      current.submitted = true;
      db.transaction(() => { db.put('application', submission.id, submission); db.put('draft', current.id, current); });
      await reply(i, { content: `Application submitted and saved. It is queued for delivery to the review team.\nSubmission ID: \`${submission.id}\`.`, components: [] });
      setImmediate(() => { runApplicationDelivery(i.guild, submission.id).catch(e => console.error('Application worker:', safeError(e))); });
      return;
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
    db.del('confirmation', a); return update(i, { content: 'Action cancelled.', embeds: [], components: [] });
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
      await reply(i, 'Deleting the closed ticket channel.');
      await (await i.guild.channels.fetch(t.channel)).delete(`Closed ticket deletion confirmed by ${i.user.id}`);
      t.state = 'deleted'; db.put('ticket', t.id, t);
      return;
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
  return reply(i, 'This button belongs to an older or unavailable panel. Ask an administrator to recreate it using /ticket setup or /application setup.');
}

function interactionMode(i) {
  if (i.isChatInputCommand()) {
    if (i.commandName === 'roles') return 'modal';
    if (['ticket', 'application'].includes(i.commandName) && ['setup', 'edit', 'close'].includes(i.options.getSubcommand())) return 'modal';
    return 'reply';
  }
  if (i.isModalSubmit()) {
    // Edit an existing private wizard, never overwrite a public application panel.
    return i.isFromMessage?.() && i.message?.flags?.has(MF.Ephemeral) ? 'update' : 'reply';
  }
  const [action, operation] = i.customId.split(':');
  if (action === 'draft' && operation === 'edit') return 'modal';
  if (action === 'draft' && operation === 'cancel') return 'update';
  if (['ticket-category', 'ticket-close', 'giveaway-duration', 'apply', 'application-next', 'application-restart',
    'application-reject', 'questions-add', 'questions-edit', 'questions-remove'].includes(action)) return 'modal';
  if (['ticket-mode', 'ticket-count', 'questions-list', 'questions-back', 'cancel'].includes(action)) return 'update';
  return 'reply';
}
async function dispatchInteraction(i) {
  const mode = interactionMode(i);
  i.ldResponseMode = mode;
  if (mode === 'update' && !i.deferred && !i.replied) await i.deferUpdate();
  else if (mode === 'reply') await defer(i);
  if (i.isChatInputCommand()) return handleCommand(i);
  if (i.isModalSubmit()) return handleModal(i);
  return handleComponent(i);
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
          // Independent bounded workers keep long forms from blocking giveaways.
          runApplicationDelivery(guild, a.id).catch(e => console.error('Application worker:', safeError(e)));
        } catch (e) {
          console.error('Application delivery recovery:', safeError(e));
        }
      }
      if (a.guild === process.env.GUILD_ID && ['accepted', 'rejected'].includes(a.state) && a.dm === 'pending') {
        try { await locked(`application-decision:${a.id}`, () => decisionDM(a)); }
        catch (e) { console.error('Application recovery:', safeError(e)); }
      }
    }
    for (const t of db.all('ticket')) {
      if (t.guild === process.env.GUILD_ID && ['closed', 'deleted'].includes(t.state) && t.feedback?.dm === 'pending' && (!t.feedback.retryAt || t.feedback.retryAt <= now())) {
        try { await deliverTicketFeedback(await client.guilds.fetch(t.guild), t.id); }
        catch (e) { console.error('Ticket feedback recovery:', safeError(e)); }
      }
    }
    for (const kind of ['draft', 'confirmation']) for (const item of db.all(kind)) if (item.expires < now()) db.del(kind, item.id);
  } finally { ticking = false; }
}
async function start() {
  for (const key of SECRET_KEYS) if (!process.env[key]) fail(`Missing environment variable: ${key}`);
  if (!/^\d{17,22}$/.test(process.env.CLIENT_ID) || !/^\d{17,22}$/.test(process.env.GUILD_ID)) fail('CLIENT_ID and GUILD_ID must be numeric Discord IDs.');
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
      await dispatchInteraction(i);
    } catch (e) {
      const reference = id().slice(0, 10);
      console.error(JSON.stringify({ reference, event: i.commandName || i.customId, code: e.code,
        message: safeError(e), details: apiErrorDetails(e.rawError?.errors), stack: cut(e.stack, 1200) }));
      const content = `${safeError(e)}\nError reference: \`${reference}\``;
      // Keep the private editor controls available after a validation error.
      await reply(i, i.ldResponseMode === 'update' ? { content } : { content, embeds: [], components: [] }).catch(() => {});
    }
  });
  client.on(Events.Error, e => console.error('Client error:', safeError(e)));
  client.on(Events.Warn, s => console.warn(cut(s, 300)));
  client.once(Events.ClientReady, async readyClient => {
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      if (readyClient.user.id !== process.env.CLIENT_ID) fail('CLIENT_ID does not match the bot token.');
      const synced = await syncCommands(rest, process.env.CLIENT_ID, process.env.GUILD_ID);
      const presence = db.get('presence', 'current'); if (presence) applyPresence(presence);
      console.log(`Ready as ${readyClient.user.tag}. Version ${VERSION}. ${synced.count} commands registered; ${synced.removed} legacy global duplicates removed. Storage opened.`);
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
  test('Render storage path is optional and existing paths are preserved', () => {
    const fallback = path.join(__dirname, 'data', 'ld-giveaways.sqlite');
    assert.equal(databasePath({ RENDER: 'true' }), fallback);
    assert.equal(databasePath({ RENDER: 'true', DB_PATH: '' }), fallback);
    assert.equal(databasePath({ RENDER: 'true', DB_PATH: '/existing/storage/bot.sqlite' }), '/existing/storage/bot.sqlite');
    assert.equal(databasePath({ DB_PATH: './existing.sqlite' }), './existing.sqlite');
  });
  test('duration units and composition', () => {
    assert.equal(duration('1h 30m'), 5400000); assert.equal(duration('2w'), 1209600000);
    assert.equal(duration('10s'), 10000); assert.equal(duration('1d'), 86400000);
  });
  test('duration invalid input', () => { for (const x of ['', '0m', '-1h', '1.5h', '2h junk', '30']) assert.throws(() => duration(x)); });
  test('random winners are unique and bounded', () => {
    assert.deepEqual(choose(['a', 'a', 'b'], 9, () => 0), ['a', 'b']); assert.equal(choose([], 1).length, 0);
    for (let n = 0; n < 100; n++) assert.equal(new Set(choose(['a', 'b', 'c'], 2)).size, 2);
  });
  test('question validation supports more than 25 questions', () => { assert.deepEqual(questions('A?\n\nB?'), ['A?', 'B?']); assert.throws(() => questions('x'.repeat(101))); assert.equal(questions(Array(100).fill('Q').join('\n')).length, 100); });
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
  const originalUser = client.user, originalFetch = client.users.fetch, originalGuildFetch = client.guilds.fetch;
  const originalSetupEnabled = process.env.SETUP_ENABLED;
  const messagesSent = [], directMessages = [], channelsCreated = [], rolesCreated = [], messageEdits = [], moderationCalls = [];
  let roleAdds = 0, roleRemoves = 0;
  const normalRole = { id: '123456789012345678', name: 'Member', position: 1, managed: false, permissions: new D.PermissionsBitField(0n) };
  const roles = new D.Collection([[normalRole.id, normalRole]]);
  const fakeMember = (uid, permissions = 0n) => ({
    id: uid, permissions: new D.PermissionsBitField(permissions),
    moderatable: true, timeout: async (ms, reason) => moderationCalls.push({ action: 'timeout', uid, ms, reason }),
    kick: async reason => moderationCalls.push({ action: 'kick', uid, reason }),
    user: { id: uid, bot: false, createdTimestamp: now() - 400 * 86400000 },
    roles: { highest: { position: uid === 'admin' ? 20 : 2 }, cache: new D.Collection(),
      add: async r => { roleAdds++; members.get(uid).roles.cache.set(r.id, r); },
      remove: async r => { roleRemoves++; members.get(uid).roles.cache.delete(r.id); } },
  });
  const members = new Map([['admin', fakeMember('admin', P.Administrator)], ['user', fakeMember('user')], ['other', fakeMember('other')]]);
  const bot = { permissions: new D.PermissionsBitField(P.Administrator), roles: { highest: { position: 30 } } };
  const channelMap = new D.Collection();
  function validateMessage(payload) {
    if (payload.content) assert(payload.content.length <= 2000, 'message content limit');
    assert((payload.components?.length || 0) <= 5, 'message row limit');
    let total = 0;
    for (const builder of payload.embeds || []) {
      const e = builder.toJSON ? builder.toJSON() : builder;
      assert((e.description?.length || 0) <= 4096);
      assert((e.title?.length || 0) <= 256);
      total += (e.title?.length || 0) + (e.description?.length || 0);
      for (const f of e.fields || []) total += f.name.length + f.value.length;
    }
    assert(total <= 6000, 'aggregate embed text limit');
    for (const builder of payload.components || []) {
      const r = builder.toJSON ? builder.toJSON() : builder;
      assert(r.components.length <= 5);
      for (const c of r.components) if (c.options) assert(c.options.length <= 25);
    }
  }
  function fakeChannel(channelId = 'test-channel', name = 'test', type = CT.GuildText, parentId = null) {
    const overwriteCache = new D.Collection();
    return {
      id: channelId, name, type, parentId,
      permissionsFor: () => new D.PermissionsBitField(P.Administrator),
      send: async payload => {
        validateMessage(payload); messagesSent.push(payload);
        return { id: `message-${messagesSent.length}`, author: { id: 'bot' }, edit: async value => { validateMessage(value); messageEdits.push(value); return value; } };
      },
      messages: { fetch: async key => typeof key === 'object' ? new D.Collection() : ({ id: key, author: { id: 'bot' }, edit: async payload => { validateMessage(payload); messageEdits.push(payload); return payload; } }) },
      permissionOverwrites: {
        cache: overwriteCache,
        edit: async (key, options, extra) => {
          assert.equal(typeof extra?.type, 'number', 'overwrite edits must specify role/member type');
          const resolved = D.PermissionOverwrites.resolveOverwriteOptions(options, overwriteCache.get(key));
          overwriteCache.set(key, { id: key, allow: new D.PermissionsBitField(resolved.allow), deny: new D.PermissionsBitField(resolved.deny) });
        },
        delete: async key => overwriteCache.delete(key),
      },
      delete: async () => { channelMap.delete(channelId); },
      bulkDelete: async messages => { moderationCalls.push({ action: 'purge', channelId }); return messages; },
      setRateLimitPerUser: async seconds => { moderationCalls.push({ action: 'slowmode', seconds }); },
      isTextBased: () => type === CT.GuildText,
    };
  }
  const testChannel = fakeChannel(); channelMap.set(testChannel.id, testChannel);
  const guild = {
    id: 'test-guild', name: 'LD GIVEAWAYS', ownerId: 'owner',
    members: { fetch: async uid => members.get(uid) || null, fetchMe: async () => bot,
      ban: async uid => moderationCalls.push({ action: 'ban', uid }), unban: async uid => moderationCalls.push({ action: 'unban', uid }) },
    roles: {
      fetch: async key => key ? roles.get(key) : roles,
      create: async options => { rolesCreated.push(options); const r = { ...options, id: `created-role-${rolesCreated.length}` }; roles.set(r.id, r); return r; },
    },
    channels: {
      fetch: async key => key ? channelMap.get(key) : channelMap,
      create: async options => {
        for (const o of options.permissionOverwrites || []) {
          assert.equal(typeof o.type, 'number', 'channel overwrite type must be explicit');
          D.PermissionOverwrites.resolve(o, guild);
        }
        channelsCreated.push(options);
        const c = fakeChannel(`created-channel-${channelsCreated.length}`, options.name, options.type, options.parent || null);
        channelMap.set(c.id, c); return c;
      },
    },
  };
  function interaction(uid = 'admin', customId = '') {
    return {
      user: { id: uid }, guild, guildId: guild.id, channelId: testChannel.id, channel: testChannel,
      get member() { return members.get(this.user.id); },
      customId, deferred: false, replied: false, replies: [],
      deferReply: async function () { assert(!this.deferred && !this.replied, 'double initial response'); this.deferred = true; },
      deferUpdate: async function () { assert(!this.deferred && !this.replied, 'double initial update'); this.deferred = true; },
      showModal: async function (data) {
        assert(!this.deferred && !this.replied, 'cannot show modal after acknowledgement');
        assert(data.components.length >= 1 && data.components.length <= 5);
        assert(data.custom_id.length <= 100); assert(data.title.length <= 45);
        for (const c of data.components) { assert.equal(c.type, 18); assert.equal(c.component.type, 4); assert(c.label.length <= 45); }
        this.modal = data; this.replied = true;
      },
      reply: async function (x) { assert(!this.deferred && !this.replied, 'double reply'); validateMessage(x); this.replied = true; this.replies.push(x); return x; },
      editReply: async function (x) { assert(this.deferred || this.replied, 'edit before response'); validateMessage(x); this.replies.push(x); return x; },
      followUp: async function (x) { assert(this.deferred || this.replied, 'followup before response'); validateMessage(x); this.replies.push(x); return x; },
      update: async function (x) { assert(!this.deferred && !this.replied, 'update after acknowledgement'); validateMessage(x); this.replied = true; this.replies.push(x); return x; },
      message: { edit: async x => { validateMessage(x); messageEdits.push(x); } },
      isChatInputCommand: function () { return !!this.commandName; },
      isModalSubmit: function () { return !!this.modalSubmit; },
      isStringSelectMenu: () => false,
    };
  }
  function commandInteraction(uid, name, sub, values = {}) {
    const i = interaction(uid); i.commandName = name;
    const schema = commands().find(c => c.name === name).toJSON();
    const definitions = sub ? schema.options.find(o => o.name === sub).options || [] : schema.options || [];
    const options = Object.entries(values).map(([name, value]) => {
      const definition = definitions.find(d => d.name === name);
      assert(definition, `unknown option ${name}`);
      const o = { name, type: definition.type, value };
      if (o.type === 7) o.channel = channelMap.get(value);
      if (o.type === 8) o.role = roles.get(value);
      if (o.type === 6) { o.user = members.get(value)?.user || { id: value }; o.member = members.get(value); }
      return o;
    });
    i.options = new D.CommandInteractionOptionResolver(client, sub ? [{ name: sub, type: 1, options }] : options);
    return i;
  }
  function formInteraction(uid, customId, values) {
    const i = interaction(uid, customId); i.modalSubmit = true;
    i.fields = new D.ModalSubmitFields(Object.entries(values).map(([customId, value]) => ({
      type: 18, component: { type: 4, customId, value },
    })));
    return i;
  }
  try {
    process.env.SETUP_ENABLED = 'true';
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
        state: 'submitting', questions: Array.from({ length: 7 }, (_, n) => `Question ${n + 1}?`), answers: Array(7).fill('Answer'), delivered: 0 };
      db.put('application', a.id, a);
      await assert.rejects(() => deliverApplication(guild, a), /temporary/);
      const saved = db.get('application', a.id); assert(saved.overview); assert.equal(saved.delivered, 5);
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
    await asyncTest('command sync removes matching global duplicates only', async () => {
      const calls = [];
      const rest = {
        put: async (route, payload) => calls.push({ method: 'put', route, payload }),
        get: async () => [{ id: 'old-help', name: 'help', type: 1 }, { id: 'old-about', name: 'about', type: 1 },
          { id: 'keep-context', name: 'about', type: 2 }, { id: 'keep-other', name: 'unrelated', type: 1 }],
        delete: async route => calls.push({ method: 'delete', route }),
      };
      const result = await syncCommands(rest, 'app', 'guild');
      assert.equal(result.removed, 2);
      assert.equal(calls.filter(c => c.method === 'delete').length, 2);
      assert(calls.filter(c => c.method === 'delete').every(c => c.route.includes('old-')));
      assert.equal(new Set(calls[0].payload.body.map(c => c.name)).size, result.count);
    });
    await asyncTest('application full route supports repeatable questions and twelve form pages', async () => {
      const setup = commandInteraction('admin', 'application', 'setup', { channel: testChannel.id });
      await dispatchInteraction(setup); assert(setup.modal); assert(!setup.deferred);
      assert.equal(setup.modal.components.length, 3);
      const key = setup.modal.custom_id.split(':')[1];
      await dispatchInteraction(formInteraction('admin', `panel-form:${key}`, { title: 'Staff Application', text: '**Apply here.**', button: 'Apply' }));
      assert.equal(db.get('draft', key).questions.length, 0);
      await assert.rejects(() => dispatchInteraction(interaction('admin', `draft:send:${key}`)), /Add at least one question/);
      for (const [start, size] of [[1, 31], [32, 30]]) {
        const add = interaction('admin', `questions-add:${key}`); await dispatchInteraction(add);
        assert(add.modal && !add.deferred);
        await dispatchInteraction(formInteraction('admin', add.modal.custom_id, { questions: Array.from({ length: size }, (_, n) => `Question ${start + n}?`).join('\n') }));
      }
      assert.equal(db.get('draft', key).questions.length, 61);
      const edit = interaction('admin', `questions-edit:${key}`); await dispatchInteraction(edit);
      await dispatchInteraction(formInteraction('admin', edit.modal.custom_id, { number: '2', question: 'Updated question?' }));
      const remove = interaction('admin', `questions-remove:${key}`); await dispatchInteraction(remove);
      await dispatchInteraction(formInteraction('admin', remove.modal.custom_id, { number: '3' }));
      assert.equal(db.get('draft', key).questions.length, 60); assert.equal(db.get('draft', key).questions[1], 'Updated question?');
      const list = interaction('admin', `questions-list:${key}:5`); await dispatchInteraction(list);
      assert(list.deferred); assert(list.replies.at(-1).embeds[0].toJSON().description.includes('6/6'));
      await dispatchInteraction(interaction('admin', `draft:send:${key}`));
      const panel = db.get('panel', key); assert(panel.active); assert(panel.log);
      assert(channelsCreated.find(c => c.name === 'application-results').permissionOverwrites.some(o => o.id === guild.id && o.deny.includes(P.ViewChannel)));
      await assert.rejects(() => dispatchInteraction(interaction('admin', `questions-add:${key}`)), /already sent/);
      const apply = interaction('user', `apply:${key}`); await dispatchInteraction(apply);
      const entryId = apply.modal.custom_id.split(':')[1];
      let pageModal = apply.modal;
      for (let page = 0; page < 12; page++) {
        assert.equal(pageModal.components.length, 5);
        await dispatchInteraction(formInteraction('user', pageModal.custom_id, Object.fromEntries(Array.from({ length: 5 }, (_, n) => [`q${n}`, `Answer ${page + 1}.${n + 1}`]))));
        if (page < 11) {
          const next = interaction('user', `application-next:${entryId}`); await dispatchInteraction(next); pageModal = next.modal;
          assert(next.modal && !next.deferred);
        }
      }
      assert(completeAnswers(db.get('draft', entryId)));
      await assert.rejects(() => dispatchInteraction(formInteraction('user', pageModal.custom_id, { q0: 'stale' })), /no longer active/);
      const before = messagesSent.length;
      await dispatchInteraction(interaction('user', `application-submit:${entryId}`));
      for (let n = 0; n < 100 && db.get('application', entryId).state !== 'pending'; n++) await new Promise(resolve => setImmediate(resolve));
      assert.equal(db.get('application', entryId).state, 'pending');
      assert.equal(messagesSent.length - before, 14); // overview + 12 batches + controls
      const assignments = roleAdds;
      await dispatchInteraction(interaction('admin', `application-accept:${entryId}`));
      assert.equal(db.get('application', entryId).state, 'accepted'); assert.equal(roleAdds, assignments);
      await assert.rejects(() => dispatchInteraction(interaction('admin', `application-reject:${entryId}`)), /no longer awaiting/);
    });
    await asyncTest('ticket full route configures categories, adds members, closes and deletes', async () => {
      const setup = commandInteraction('admin', 'ticket', 'setup', { channel: testChannel.id });
      await dispatchInteraction(setup); assert(setup.modal && !setup.deferred);
      const key = setup.modal.custom_id.split(':')[1];
      await dispatchInteraction(formInteraction('admin', setup.modal.custom_id, { title: 'Support', text: 'Choose a category.', button: 'Open ticket', welcome: 'Default welcome.' }));
      const mode = interaction('admin', `ticket-mode:${key}`); mode.values = ['categories']; await dispatchInteraction(mode);
      const countPick = interaction('admin', `ticket-count:${key}`); countPick.values = ['2']; await dispatchInteraction(countPick);
      await assert.rejects(() => dispatchInteraction(interaction('admin', `draft:send:${key}`)), /Configure every ticket category/);
      for (let n = 0; n < 2; n++) {
        const category = interaction('admin', `ticket-category:${key}`); category.values = [String(n)];
        await dispatchInteraction(category); assert(category.modal && !category.deferred);
        await dispatchInteraction(formInteraction('admin', category.modal.custom_id, { name: n ? 'Giveaway support' : 'General support', welcome: n ? 'Your giveaway support message.' : 'Your general support message.' }));
      }
      await dispatchInteraction(interaction('admin', `draft:send:${key}`));
      assert.equal(db.get('panel', key).categories.length, 2);
      const open = interaction('user', `ticket-open:${key}`); open.values = ['1']; open.isStringSelectMenu = () => true;
      await dispatchInteraction(open);
      const t = db.all('ticket').find(t => t.panel === key);
      assert.equal(t.state, 'open'); assert.equal(messagesSent.at(-1).content, 'Your giveaway support message.');
      const claim = interaction('admin', `ticket-claim:${t.id}`); claim.channelId = t.channel; claim.channel = channelMap.get(t.channel);
      await dispatchInteraction(claim);
      assert.equal(db.get('ticket', t.id).claimed, 'admin');
      for (const action of ['add', 'remove']) {
        const change = commandInteraction('admin', 'ticket', action, { user: 'other' });
        change.channelId = t.channel; change.channel = channelMap.get(t.channel); await dispatchInteraction(change);
        assert.equal(db.get('ticket', t.id).participants.includes('other'), action === 'add');
      }
      const close = commandInteraction('admin', 'ticket', 'close'); close.channelId = t.channel; close.channel = channelMap.get(t.channel);
      await dispatchInteraction(close); assert(close.modal && !close.deferred);
      const submitClose = formInteraction('admin', close.modal.custom_id, { note: 'Issue resolved.' });
      submitClose.channelId = t.channel; submitClose.channel = channelMap.get(t.channel); await dispatchInteraction(submitClose);
      assert.equal(db.get('ticket', t.id).state, 'closed');
      const exportTicket = commandInteraction('admin', 'ticket', 'transcript'); exportTicket.channelId = t.channel;
      await dispatchInteraction(exportTicket); assert(exportTicket.replies.at(-1).files.length);
      const removeTicket = commandInteraction('admin', 'ticket', 'delete'); removeTicket.channelId = t.channel;
      await dispatchInteraction(removeTicket);
      const confirmId = removeTicket.replies.at(-1).components[0].toJSON().components[0].custom_id;
      await dispatchInteraction(interaction('admin', confirmId)); assert.equal(db.get('ticket', t.id).state, 'deleted');
    });
    await asyncTest('giveaway full route creates, enters, ends and rerolls', async () => {
      const create = commandInteraction('admin', 'giveaway', 'create', { channel: testChannel.id });
      await dispatchInteraction(create);
      const menu = create.replies.at(-1).components[0].toJSON().components[0];
      const selectDuration = interaction('admin', menu.custom_id); selectDuration.values = ['1h'];
      await dispatchInteraction(selectDuration); assert(selectDuration.modal && !selectDuration.deferred);
      const key = selectDuration.modal.custom_id.split(':')[1];
      await dispatchInteraction(formInteraction('admin', selectDuration.modal.custom_id, { prize: '500 LD', duration: '1h', winners: '1', description: 'Test giveaway.' }));
      await dispatchInteraction(interaction('admin', `giveaway-send:${key}`));
      for (const uid of ['user', 'other']) await dispatchInteraction(interaction(uid, `giveaway-enter:${key}`));
      assert.equal(db.get('giveaway', key).entries.length, 2);
      for (const action of ['end', 'reroll']) {
        const cmd = commandInteraction('admin', 'giveaway', action, { 'message-id': db.get('giveaway', key).message });
        await dispatchInteraction(cmd);
        await dispatchInteraction(interaction('admin', cmd.replies.at(-1).components[0].toJSON().components[0].custom_id));
      }
      const g = db.get('giveaway', key);
      assert.equal(g.state, 'ended'); assert.equal(g.history.length, 2); assert.notEqual(g.history[0][0], g.history[1][0]);
    });
    await asyncTest('every moderation subcommand routes through the SDK option resolver', async () => {
      for (const action of ['warn', 'warnings', 'clear-warnings', 'timeout', 'untimeout', 'kick', 'ban', 'unban', 'purge', 'slowmode', 'lock', 'unlock', 'cases']) {
        const values = {};
        if (['warn', 'warnings', 'clear-warnings', 'timeout', 'untimeout', 'kick', 'ban'].includes(action)) values.user = 'other';
        if (['warn', 'timeout', 'untimeout', 'kick', 'ban', 'unban'].includes(action)) values.reason = 'Test reason';
        if (action === 'timeout') values.duration = '30m';
        if (action === 'unban') values['user-id'] = '123456789012345678';
        if (action === 'purge') values.amount = 10;
        if (action === 'slowmode') values.seconds = 5;
        const i = commandInteraction('admin', 'moderate', action, values); await dispatchInteraction(i);
        const payload = i.replies.at(-1);
        const confirmId = payload?.components?.[0]?.toJSON().components?.[0]?.custom_id;
        if (confirmId?.startsWith('confirm:')) await dispatchInteraction(interaction('admin', confirmId));
      }
      assert(moderationCalls.some(c => c.action === 'timeout' && c.ms === 1800000));
      for (const action of ['ban', 'unban', 'kick', 'purge', 'slowmode']) assert(moderationCalls.some(c => c.action === action));
      assert(!db.get('channel-lock', testChannel.id));
      await assert.rejects(() => dispatchInteraction(commandInteraction('user', 'moderate', 'warn', { user: 'other', reason: 'Denied' })), /permission/);
    });
    await asyncTest('basic help, about, say, DM, status and admin utilities acknowledge once', async () => {
      client.user.setPresence = p => { client.user.testPresence = p; };
      const examples = [
        ['help', {}], ['about', {}], ['say', { text: 'Exact say text.' }],
        ['announcement', { text: 'Exact announcement.' }], ['dm', { user: 'user', text: 'A reviewed DM.' }],
        ['status', { text: 'LD GIVEAWAYS', activity: 'Watching', availability: 'online' }],
        ['diagnostics', {}], ['data-export', {}],
      ];
      for (const [name, values] of examples) {
        const i = commandInteraction('admin', name, null, values); await dispatchInteraction(i);
        assert(i.replies.length);
        if (name === 'dm') await dispatchInteraction(interaction('admin', i.replies.at(-1).components[0].toJSON().components[0].custom_id));
      }
      assert.equal(client.user.testPresence.activities[0].name, 'LD GIVEAWAYS');
    });
    await asyncTest('stale controls respond and incomplete answer arrays cannot submit', async () => {
      const i = interaction('user', 'legacy-ticket-control'); await dispatchInteraction(i);
      assert.match(i.replies.at(-1).content, /older or unavailable/);
      assert.equal(completeAnswers({ questions: ['Q1', 'Q2'], answers: [, 'A2'] }), false);
      const details = apiErrorDetails({ components: { 0: { _errors: [{ message: 'Invalid component' }] } } });
      assert.deepEqual(details, ['components.0: Invalid component']);
    });
    await asyncTest('role panel setup, publication and cooldown work through the full dispatcher', async () => {
      const setup = commandInteraction('admin', 'roles', null, { channel: testChannel.id });
      await dispatchInteraction(setup); assert(setup.modal && !setup.deferred);
      const key = setup.modal.custom_id.split(':')[1];
      await dispatchInteraction(formInteraction('admin', setup.modal.custom_id, { title: 'Roles', text: 'Choose a role.', mappings: `🎮 | ${normalRole.id} | Gamer` }));
      await dispatchInteraction(interaction('admin', `draft:send:${key}`));
      assert(db.get('panel', key).active);
      await dispatchInteraction(interaction('other', `role:${key}:0`));
      await assert.rejects(() => dispatchInteraction(interaction('other', `role:${key}:0`)), /Wait/);
      const grantId = `${guild.id}:other:${normalRole.id}`, grant = db.get('role-grant', grantId);
      grant.unlock = now() - 1; db.put('role-grant', grantId, grant);
      await dispatchInteraction(interaction('other', `role:${key}:0`));
      assert(!members.get('other').roles.cache.has(normalRole.id));
    });
    await asyncTest('application rejection opens a note form and never assigns a role', async () => {
      const a = { id: 'route-reject', guild: guild.id, guildName: guild.name, user: 'other', state: 'pending', log: testChannel.id, message: 'review' };
      db.put('application', a.id, a);
      const open = interaction('admin', `application-reject:${a.id}`); await dispatchInteraction(open);
      assert(open.modal && !open.deferred);
      await assert.rejects(() => dispatchInteraction(formInteraction('admin', open.modal.custom_id, { note: '   ' })), /rejection note/);
      const before = roleAdds;
      await dispatchInteraction(formInteraction('admin', open.modal.custom_id, { note: 'Please explain your experience.' }));
      assert.equal(db.get('application', a.id).state, 'rejected'); assert.equal(roleAdds, before);
      assert(directMessages.at(-1).payload.embeds[0].toJSON().description.includes('Please explain your experience.'));
    });
    await asyncTest('ticket feedback remains valid after the closed channel is deleted', async () => {
      const t = db.all('ticket').find(t => t.state === 'deleted');
      assert(t && t.feedback?.token);
      client.guilds.fetch = async () => guild;
      const feedback = interaction(t.owner, `feedback:${t.id}:${t.feedback.token}`);
      feedback.guild = null; feedback.guildId = null; feedback.values = ['4']; feedback.isStringSelectMenu = () => true;
      await dispatchInteraction(feedback);
      assert.equal(db.get('ticket', t.id).feedback.rating, 4);
      await assert.rejects(() => dispatchInteraction(feedback), /already submitted/);
      client.guilds.fetch = originalGuildFetch;
    });
    await asyncTest('ticket transcript log failure does not leave the ticket stuck closing', async () => {
      const p = { id: 'bad-log-panel', guild: guild.id, log: 'missing-log', categories: [{ name: 'Support', welcome: 'Welcome.' }] };
      await openTicket(interaction('other'), p, 0);
      const t = db.all('ticket').find(t => t.panel === p.id);
      const close = interaction('admin'); close.channelId = t.channel; close.channel = channelMap.get(t.channel);
      await closeTicket(close, t, 'Resolved.');
      const saved = db.get('ticket', t.id);
      assert.equal(saved.state, 'closed'); assert(saved.transcriptError); assert.equal(saved.feedback.dm, 'sent');
    });
    await asyncTest('ticket permission errors are named before channel creation', async () => {
      const permissions = bot.permissions, before = channelsCreated.length;
      bot.permissions = new D.PermissionsBitField([P.ViewChannel, P.SendMessages, P.EmbedLinks]);
      try {
        await assert.rejects(() => openTicket(interaction('other'), { id: 'permissions-panel', categories: [{ name: 'Support', welcome: 'Hi' }] }, 0), /ManageChannels/);
        assert.equal(channelsCreated.length, before);
      } finally { bot.permissions = permissions; }
    });
    await asyncTest('server template selectors and interrupted setup resume route correctly', async () => {
      await dispatchInteraction(commandInteraction('admin', 'server-setup', null));
      const nextPage = interaction('admin', 'template-page:1'); await dispatchInteraction(nextPage);
      assert.equal(nextPage.replies.at(-1).components[0].toJSON().components[0].options.length, 15);
      const pick = interaction('admin', 'template-select'); pick.values = ['2'];
      await dispatchInteraction(pick);
      const create = guild.channels.create; let calls = 0;
      guild.channels.create = async options => { if (++calls === 2) throw Error('Test interrupted setup'); return create(options); };
      try { await dispatchInteraction(interaction('admin', pick.replies.at(-1).components[0].toJSON().components[0].custom_id)); }
      finally { guild.channels.create = create; }
      const job = db.all('setup-job').find(j => j.template === 2 && j.state === 'interrupted'); assert(job);
      const resume = commandInteraction('admin', 'server-setup-resume', null); await dispatchInteraction(resume);
      await dispatchInteraction(interaction('admin', resume.replies.at(-1).components[0].toJSON().components[0].custom_id));
      assert.equal(db.get('setup-job', job.id).state, 'done');
      process.env.SETUP_ENABLED = 'false';
      await assert.rejects(() => buildTemplate(interaction(), 2), /disabled/);
      process.env.SETUP_ENABLED = 'true';
    });
    await asyncTest('moderation log setup is administrator-only and validates its channel', async () => {
      await dispatchInteraction(commandInteraction('admin', 'moderation-log', null, { channel: testChannel.id }));
      assert.equal(db.get('config', guild.id).log, testChannel.id);
      await assert.rejects(() => dispatchInteraction(commandInteraction('user', 'moderation-log', null, { channel: testChannel.id })), /permission/);
      db.del('config', guild.id);
    });
    await asyncTest('actual SDK modal serializer accepts the generated raw label payload', async () => {
      const open = commandInteraction('admin', 'ticket', 'setup', { channel: testChannel.id }); await dispatchInteraction(open);
      const originalPost = client.rest.post; let request;
      client.rest.post = async (route, payload) => { request = payload; return {}; };
      const nativeLike = { client, id: '123456789012345678', token: 'test-interaction-token', deferred: false, replied: false };
      try { await D.ChatInputCommandInteraction.prototype.showModal.call(nativeLike, open.modal); }
      finally { client.rest.post = originalPost; }
      assert.equal(request.body.type, 9); assert.equal(request.body.data.components.length, 4); assert(nativeLike.replied);
      assert.equal(request.auth, false);
    });
    await asyncTest('published ticket and application panels edit without losing their message IDs', async () => {
      for (const kind of ['ticket', 'application']) {
        const p = db.all('panel').find(p => p.guild === guild.id && p.kind === kind && p.active);
        assert(p && p.message);
        const edit = commandInteraction('admin', kind, 'edit', { 'message-id': p.message, 'clear-staff': true });
        await dispatchInteraction(edit); assert(edit.modal && !edit.deferred);
        const values = { title: `${kind} updated`, text: 'Updated Markdown **text**.', button: 'Open' };
        if (kind === 'ticket') values.welcome = 'Updated welcome.';
        await dispatchInteraction(formInteraction('admin', edit.modal.custom_id, values));
        await dispatchInteraction(interaction('admin', `draft:send:${p.id}`));
        const saved = db.get('panel', p.id);
        assert.equal(saved.message, p.message); assert.equal(saved.title, values.title); assert(saved.active);
        if (kind === 'application') assert(saved.questions.length >= 60);
      }
    });
    await asyncTest('giveaway cancel consumes confirmation and blocks late entries', async () => {
      const g = { id: 'cancel-route', guild: guild.id, channel: testChannel.id, message: 'cancel-message', prize: 'LD',
        count: 1, ends: now() + 60000, state: 'active', entries: [] };
      db.put('giveaway', g.id, g);
      const cancel = commandInteraction('admin', 'giveaway', 'cancel', { 'message-id': g.message });
      await dispatchInteraction(cancel);
      const key = cancel.replies.at(-1).components[0].toJSON().components[0].custom_id;
      await dispatchInteraction(interaction('admin', key));
      assert.equal(db.get('giveaway', g.id).state, 'cancelled');
      await assert.rejects(() => dispatchInteraction(interaction('user', `giveaway-enter:${g.id}`)), /no longer accepting/);
      await assert.rejects(() => dispatchInteraction(interaction('admin', key)), /expired|belongs/);
    });
    await asyncTest('failed application decision DMs can be retried without changing the decision', async () => {
      const a = db.get('application', 'closed-dm-app'); assert.equal(a.state, 'rejected');
      const retry = commandInteraction('admin', 'application', 'retry-dm', { 'submission-id': a.id });
      await dispatchInteraction(retry);
      assert.equal(db.get('application', a.id).dm, 'sent'); assert.equal(db.get('application', a.id).state, 'rejected');
      await assert.rejects(() => dispatchInteraction(commandInteraction('admin', 'application', 'retry-dm', { 'submission-id': a.id })), /already sent/);
    });
    await asyncTest('long application questions are shown in full without label truncation', async () => {
      const panel = db.all('panel').find(p => p.kind === 'application' && p.active);
      const q = 'Why do you want to join the staff team at LD GIVEAWAYS?';
      assert(q.length > 45 && q.length <= 100); assert.equal(questions(q)[0], q);
      const a = draft({ user: { id: 'other' }, guildId: guild.id }, 'application-entry', { panel: panel.id, questions: [q], answers: [], page: 0 });
      const i = interaction('other', `application-next:${a.id}`); await dispatchInteraction(i);
      assert.equal(i.modal.components[0].description, q); assert.equal(i.modal.components[0].label, 'Question 1');
    });
    await asyncTest('private modal wizards update in place and public panel forms stay private', async () => {
      const d = draft({ user: { id: 'admin' }, guildId: guild.id }, 'application', { channel: testChannel.id, questions: ['Why apply?'] });
      for (const privateSource of [true, false]) {
        const i = formInteraction('admin', `panel-form:${d.id}`, { title: 'Application', text: 'Apply here.', button: 'Apply' });
        i.isFromMessage = () => true;
        i.message.flags = { has: () => privateSource };
        assert.equal(interactionMode(i), privateSource ? 'update' : 'reply');
        await dispatchInteraction(i);
        assert.equal(i.ldResponseMode, privateSource ? 'update' : 'reply');
        assert.equal(i.replies.at(-1).embeds.length, 2);
      }
    });
    await asyncTest('announcement channels accept exact text without requiring embed permission', async () => {
      const c = fakeChannel('news-channel', 'announcements', CT.GuildAnnouncement);
      c.permissionsFor = () => new D.PermissionsBitField([P.ViewChannel, P.SendMessages]);
      channelMap.set(c.id, c);
      await dispatchInteraction(commandInteraction('admin', 'announcement', null, { channel: c.id, text: '**Exact news**' }));
      assert.equal(messagesSent.at(-1).content, '**Exact news**');
      await assert.rejects(() => textChannel(guild, c.id), /EmbedLinks/);
    });
  } finally {
    client.user = originalUser; client.users.fetch = originalFetch;
    client.guilds.fetch = originalGuildFetch;
    if (originalSetupEnabled === undefined) delete process.env.SETUP_ENABLED;
    else process.env.SETUP_ENABLED = originalSetupEnabled;
  }
  db.db.close(); client.destroy(); console.log(`\n${count} self-tests passed. Discord live integration is not tested by this command.`);
}
if (require.main === module) {
  (SELF_TEST ? selfTest() : start()).catch(e => { console.error('Fatal:', safeError(e)); process.exit(1); });
}
