// Demo history for the CEO panel: four months of orders across five branches,
// members, staff and shifts, stock and suppliers, expenses, check-ins,
// maintenance and reviews. Seeded, so it reads the same every time, and
// labelled "demo data" in the UI. A real server replaces this file.
import { MENU, BRANCHES } from "../data.js";

export function rng(seed = 7) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(1405);
const pick = (a) => a[Math.floor(R() * a.length)];
const wpick = (a, w) => { const s = w.reduce((x, y) => x + y, 0); let r = R() * s; for (let i = 0; i < a.length; i++) { r -= w[i]; if (r <= 0) return a[i]; } return a[a.length - 1]; };

const NAMES = [["Sara", "سارا"], ["Ali", "علی"], ["Nazanin", "نازنین"], ["Reza", "رضا"], ["Maryam", "مریم"], ["Amir", "امیر"], ["Elham", "الهام"], ["Hossein", "حسین"], ["Niloufar", "نیلوفر"], ["Mehdi", "مهدی"], ["Shirin", "شیرین"], ["Arash", "آرش"], ["Parisa", "پریسا"], ["Kian", "کیان"], ["Yasaman", "یاسمن"], ["Babak", "بابک"], ["Ayda", "آیدا"], ["Farhad", "فرهاد"], ["Ladan", "لادن"], ["Navid", "نوید"], ["Golnaz", "گلناز"], ["Pouya", "پویا"], ["Tara", "تارا"], ["Siavash", "سیاوش"], ["Mahsa", "مهسا"], ["Behnam", "بهنام"], ["Sepideh", "سپیده"], ["Kaveh", "کاوه"], ["Roya", "رویا"], ["Omid", "امید"], ["Aylin", "آیلین"], ["Arman", "آرمان"], ["Hasti", "هستی"], ["Sina", "سینا"], ["Donya", "دنیا"], ["Pedram", "پدرام"], ["Mina", "مینا"], ["Ramin", "رامین"], ["Setareh", "ستاره"], ["Ehsan", "احسان"]];
const LAST = [["Ahmadi", "احمدی"], ["Rezaei", "رضایی"], ["Hosseini", "حسینی"], ["Karimi", "کریمی"], ["Tabrizi", "تبریزی"], ["Moradi", "مرادی"], ["Jafari", "جعفری"], ["Rahimi", "رحیمی"], ["Azizi", "عزیزی"], ["Sadeghi", "صادقی"], ["Nazari", "نظری"], ["Ebrahimi", "ابراهیمی"], ["Asadi", "اسدی"], ["Farahani", "فراهانی"]];
const TAGS = [["Oat milk", "شیر جو"], ["Remote worker", "دورکار"], ["Student", "دانشجو"], ["Sweet tooth", "عاشق شیرینی"], ["Morning regular", "مشتری صبح"], ["Event-goer", "اهل رویداد"], ["Always takeaway", "همیشه بیرون‌بر"]];

// review text by topic; the panel groups them into what people talk about
export const TOPICS = { taste: "طعم", speed: "سرعت", staff: "برخورد پرسنل", price: "قیمت", ambience: "فضا", clean: "تمیزی" };
const COMMENTS = [
  [5, "taste", "Best Con Panna in Tabriz, the cream is unreal.", "بهترین کن‌پانای تبریزه، خامه‌ش محشره."],
  [5, "speed", "My order was waiting when I arrived.", "رسیدم دیدم سفارشم آماده‌ست، عالی."],
  [4, "taste", "Lovely latte, a bit too sweet for me.", "لاته‌ش خیلی خوب بود، فقط یه کم شیرین بود برام."],
  [5, "taste", "The Basque cheesecake is dangerous. Coming back.", "چیزکیک باسکش خطرناکه! بازم میام."],
  [3, "speed", "Pickup took longer than the app said.", "آماده شدنش از چیزی که اپ گفته بود بیشتر طول کشید."],
  [5, "staff", "Staff at Aseman are so friendly.", "بچه‌های شعبه‌ی آسمان خیلی خوش‌برخوردن."],
  [4, "ambience", "Great spot for working, Wi-Fi is fast.", "برای کار کردن جای خوبیه، وای‌فایش هم سریعه."],
  [2, "taste", "Iced latte was watery.", "آیس لاته‌م آبکی بود."],
  [5, "taste", "Pistachio Con Panna — instant favourite.", "پسته کن‌پانا از همون اول شد محبوبم."],
  [4, "ambience", "Good coffee, a bit crowded in the evening.", "قهوه‌ش خوبه، فقط عصرها یه کم شلوغه."],
  [2, "price", "Prices went up again.", "باز قیمت‌ها رفت بالا."],
  [5, "staff", "The barista remembered my order. Love it.", "باریستا سفارشم رو یادش بود، خیلی حال داد."],
  [3, "clean", "Tables weren't wiped when we sat down.", "وقتی نشستیم میزها تمیز نشده بود."],
  [4, "speed", "Quick even at lunchtime.", "حتی ظهر هم سریع بودن."],
  [5, "ambience", "Laleh Park branch is a lovely break from shopping.", "شعبه‌ی لاله پارک وسط خرید یه استراحت درست‌وحسابیه."],
  [1, "staff", "Nobody greeted us, waited ages.", "هیچ‌کس تحویلمون نگرفت، کلی منتظر موندیم."],
  [4, "price", "Not cheap but worth it.", "ارزون نیست ولی می‌ارزه."],
  [5, "clean", "Spotless, as always.", "مثل همیشه تمیز و مرتب."],
];

// what each sale costs, and what it uses from the store room
const COST = { conpanna: 0.27, hot: 0.24, cold: 0.26, tea: 0.22, cake: 0.38, breakfast: 0.42 };
export const costOf = (m) => Math.round((m.price * (COST[m.cat] ?? 0.3) + (m.sig ? 4000 : 0)) / 1000) * 1000;
export const STOCK = [
  { id: "beans", n: "دون قهوه (میکس خونه)", u: "کیلو", cost: 2600000, sup: "S1" },
  { id: "milk", n: "شیر پرچرب", u: "لیتر", cost: 62000, sup: "S2" },
  { id: "oat", n: "شیر جو", u: "لیتر", cost: 310000, sup: "S2" },
  { id: "cream", n: "خامه‌ی صبحانه", u: "لیتر", cost: 290000, sup: "S2" },
  { id: "caramel", n: "سس کارامل", u: "کیلو", cost: 480000, sup: "S5" },
  { id: "choc", n: "شکلات تلخ", u: "کیلو", cost: 1150000, sup: "S5" },
  { id: "pistachio", n: "کرم پسته", u: "کیلو", cost: 3900000, sup: "S5" },
  { id: "matcha", n: "پودر ماچا", u: "کیلو", cost: 9800000, sup: "S5" },
  { id: "cups", n: "لیوان کاغذی ۱۲ اونس", u: "عدد", cost: 5200, sup: "S3" },
  { id: "cold", n: "لیوان سرد با درب", u: "عدد", cost: 7800, sup: "S3" },
  { id: "lids", n: "درب لیوان داغ", u: "عدد", cost: 1900, sup: "S3" },
  { id: "cake", n: "کیک (برش)", u: "برش", cost: 68000, sup: "S4" },
  { id: "pastry", n: "کروسان و نون", u: "عدد", cost: 42000, sup: "S4" },
];
export const SUPPLIERS = [
  { id: "S1", n: "رست‌خونه‌ی آذر", what: "قهوه", phone: "041-3355••••", lead: 2, onTime: 96 },
  { id: "S2", n: "لبنیات پگاه آذربایجان", what: "شیر و خامه", phone: "041-3272••••", lead: 1, onTime: 91 },
  { id: "S3", n: "بسته‌بندی سپهر", what: "لیوان و درب", phone: "041-3445••••", lead: 4, onTime: 84 },
  { id: "S4", n: "شیرینی‌پزی سحر", what: "کیک و نون", phone: "041-3330••••", lead: 1, onTime: 98 },
  { id: "S5", n: "بازرگانی طعم‌آفرین", what: "سس و پودرها", phone: "021-8876••••", lead: 5, onTime: 79 },
];
export function usage(m, qty, mode) {
  const u = {}, add = (k, v) => { u[k] = (u[k] || 0) + v * qty; };
  const drink = !["cake", "breakfast"].includes(m.cat);
  if (drink && !["matcha", "chai", "black-tea", "hot-chocolate"].includes(m.id)) add("beans", m.id === "cold-brew" ? 0.025 : m.id === "v60" ? 0.02 : 0.018);
  if (m.opts === "milk" || m.id === "iced-latte") { add("milk", m.id === "flat-white" ? 0.14 : 0.21); add("oat", 0.02); }
  if (m.cat === "conpanna") add("cream", 0.05);
  if (m.id.includes("caramel")) add("caramel", 0.02);
  if (m.id.includes("mocha") || m.id === "hot-chocolate") add("choc", 0.03);
  if (m.id.includes("pistachio")) add("pistachio", 0.025);
  if (m.id === "matcha") add("matcha", 0.004);
  if (drink && mode !== "dinein") { if (m.cat === "cold" || m.art?.k === "glass") add("cold", 1); else { add("cups", 1); add("lids", 1); } }
  if (m.cat === "cake") add("cake", 1);
  if (m.cat === "breakfast") add("pastry", 1);
  return u;
}

export const ROLES = { manager: "مدیر شعبه", barista: "باریستا", cashier: "صندوق‌دار", kitchen: "آشپزخونه" };
const WAGE = { manager: 125000, barista: 78000, cashier: 62000, kitchen: 70000 };

const DAY = 864e5;
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const HW = [3, 6, 5, 4, 5, 6, 5, 4, 5, 6, 8, 10, 10, 8, 5, 2];
const BASE = { valiasr: 92, elahiparast: 56, aseman: 74, lalehpark: 58, esfahan: 54 };
export const OPENED = { lalehpark: 72 }; // days ago — the newest branch
export const DAYS = 120;

export function seed() {
  const now = Date.now();
  const t0 = new Date(now); t0.setHours(0, 0, 0, 0);
  const today0 = t0.getTime();

  // members: join date, how often they come, and whether they drift away
  const customers = Array.from({ length: 640 }, (_, i) => {
    const [fn, fnFa] = NAMES[i % NAMES.length], [ln, lnFa] = LAST[(i * 7 + Math.floor(i / NAMES.length)) % LAST.length];
    const joinedAgo = Math.floor(Math.pow(R(), 0.85) * 175);
    const br = wpick(BRANCHES, [30, 18, 24, 15, 13]).id;
    return {
      id: "C" + (1000 + i), name: `${fn} ${ln}`, name_fa: `${fnFa} ${lnFa}`, phone: `09${pick(["12", "14", "35", "36", "91", "93", "01"])}•••${String(Math.floor(R() * 9000) + 1000)}`,
      branch: OPENED[br] && joinedAgo > OPENED[br] ? "valiasr" : br, joinedAgo, joined: today0 - joinedAgo * DAY + Math.floor(R() * DAY * 0.6),
      freq: Math.pow(R(), 2.2) * 0.9 + 0.02, churnAgo: R() < 0.32 ? Math.floor(R() * Math.min(joinedAgo, 90)) : -1,
      tags: R() > .5 ? [pick(TAGS)] : [], bmonth: Math.floor(R() * 12), referrals: R() > .84 ? Math.ceil(R() * 4) : 0,
      visits: 0, spend: 0, last: 0, first: 0, points: 0, favs: {},
    };
  });

  // staff, per branch
  const staff = [];
  let si = 0;
  BRANCHES.forEach((b) => {
    const roles = ["manager", "barista", "barista", "barista", "cashier", ...(b.id === "valiasr" || b.id === "aseman" ? ["barista", "kitchen"] : ["kitchen"])];
    roles.forEach((role) => {
      const [fn, fnFa] = NAMES[(si * 11 + 5) % NAMES.length], [ln, lnFa] = LAST[(si * 5 + 3) % LAST.length];
      staff.push({ id: "P" + (100 + si), name: `${fn} ${ln}`, name_fa: `${fnFa} ${lnFa}`, role, role_fa: ROLES[role], branch: b.id, wage: WAGE[role] + Math.round(R() * 8) * 2500,
        since: today0 - Math.floor(60 + R() * 900) * DAY, late30: Math.floor(Math.pow(R(), 2) * 6), sick30: R() > .8 ? 1 : 0, orders: 0, prepSum: 0, prepN: 0, rateSum: 0, rateN: 0, tips: 0, sales: 0,
        week: Array.from({ length: 7 }, () => wpick(["M", "E", "off"], role === "manager" ? [5, 2, 1] : [3, 3, 1.4])) });
      si++;
    });
  });
  const baristas = (b) => staff.filter((p) => p.branch === b && (p.role === "barista" || p.role === "manager"));

  const orders = [];
  const reviews = [];
  const checkins = {}; // `${daysAgo}|${branch}` → Wi-Fi / app check-ins
  let oc = 0;
  const menuW = MENU.map((x) => x.pop * x.pop);
  const mcum = []; let macc = 0; menuW.forEach((w) => { macc += w; mcum.push(macc); });
  const pickMenu = () => { const r = R() * macc; let i = 0; while (mcum[i] < r) i++; return MENU[i]; };
  const nowH = new Date().getHours() + new Date().getMinutes() / 60;
  const todayFrac = (() => { let a = 0, s = 0; HOURS.forEach((x, i) => { s += HW[i]; if (x + 1 <= nowH) a += HW[i]; else if (x <= nowH) a += HW[i] * (nowH - x); }); return a / s; })();
  for (let d = DAYS - 1; d >= 0; d--) {
    const dayStart = today0 - d * DAY;
    const wd = new Date(dayStart).getDay();
    const weekend = wd === 4 || wd === 5;
    const pool = customers.filter((c) => c.joinedAgo >= d && (c.churnAgo < 0 || d > c.churnAgo));
    const cum = []; let acc = 0; pool.forEach((c) => { acc += c.freq; cum.push(acc); });
    const pickMember = () => { const r = R() * acc; let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; } return pool[lo]; };
    BRANCHES.forEach((b) => {
      if (OPENED[b.id] && d > OPENED[b.id]) return;
      const ramp = OPENED[b.id] ? Math.min(1, 0.45 + (OPENED[b.id] - d) / 60) : 1;
      const growth = 1 + (DAYS - d) * 0.0016;
      const n = Math.round(BASE[b.id] * growth * ramp * (weekend ? 1.22 : 1) * (0.88 + R() * 0.24) * (d === 0 ? todayFrac : 1));
      const oh = +b.open.split(":")[0], ch = +b.close.split(":")[0];
      const bar = baristas(b.id);
      checkins[`${d}|${b.id}`] = Math.round(n * (0.34 + R() * 0.1));
      for (let k = 0; k < n; k++) {
        let hour = wpick(HOURS, HW), tries = 0;
        while ((hour < oh || (ch !== 24 && hour >= ch)) && tries++ < 8) hour = wpick(HOURS, HW);
        if (hour < oh) hour = oh; if (ch !== 24 && hour >= ch) hour = ch - 1;
        let at = dayStart + hour * 3600e3 + Math.floor(R() * 3600e3);
        if (at > now) at = now - Math.floor(R() * 900e3);
        const c = R() < 0.42 && pool.length ? pickMember() : null;
        const app = c ? R() < 0.58 : R() < 0.06;
        const mode = app ? "takeaway" : R() < 0.62 ? "dinein" : "takeaway";
        const nl = wpick([1, 2, 3, 4], [40, 35, 17, 8]);
        const lines = [];
        for (let j = 0; j < nl; j++) { const m = pickMenu(); const ex = lines.find((l) => l.id === m.id); if (ex) ex.qty++; else lines.push({ id: m.id, qty: R() > .88 ? 2 : 1, unit: m.price, cost: costOf(m), oat: m.opts === "milk" && R() < .12 }); }
        const qty = lines.reduce((s, l) => s + l.qty, 0);
        const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
        const cost = lines.reduce((s, l) => s + l.cost * l.qty, 0);
        const promo = c && R() < 0.13 ? wpick(["voucher", "promo", "gold", "free"], [40, 25, 25, 10]) : null;
        const discount = promo === "free" ? Math.min(subtotal, 150000) : promo ? Math.round(subtotal * (promo === "gold" ? 0.1 : 0.15) / 1000) * 1000 : 0;
        const pay = app ? "online" : wpick(["card", "cash", "online"], [80, 13, 7]);
        const status = R() < 0.016 ? "cancelled" : R() < 0.006 ? "refunded" : "done";
        const peak = [12, 13, 18, 19, 20].includes(hour) ? 1 : 0;
        const prep = Math.round(110 + 62 * qty + peak * (60 + R() * 140) + (b.id === "lalehpark" ? 45 : 0) + R() * 120);
        const p = bar.length ? pick(bar) : null;
        const rating = app && status === "done" && R() < 0.33 ? Math.max(1, wpick([5, 4, 3, 2, 1], [56, 27, 10, 5, 2]) - (prep > 560 && R() < .4 ? 1 : 0)) : 0;
        const o = { id: "S" + oc, code: String(100 + Math.floor(R() * 900)), at, day: d, hour, branch: b.id, customer: c ? c.id : null, lines, qty, mode, channel: app ? "app" : "counter", pay, promo, discount,
          subtotal, total: subtotal - discount, cost, status, prep, staff: p?.id || null, rating };
        orders.push(o); oc++;
        if (status === "done") {
          if (c) { c.visits++; c.spend += o.total; c.last = Math.max(c.last, at); c.first = c.first ? Math.min(c.first, at) : at; lines.forEach((l) => { c.favs[l.id] = (c.favs[l.id] || 0) + l.qty; }); }
          if (p) { p.orders++; p.sales += o.total; p.prepSum += prep; p.prepN++; if (rating) { p.rateSum += rating; p.rateN++; } p.tips += R() < .08 ? 20000 : 0; }
        }
        if (rating && R() < 0.5) {
          const pool2 = COMMENTS.filter((x) => x[0] === rating);
          const cm = pool2.length ? pick(pool2) : pick(COMMENTS);
          reviews.push({ id: "R" + reviews.length, rating, topic: cm[1], text: cm[2], text_fa: cm[3], customer: c?.id, branch: b.id, at: at + 30 * 60e3 });
        }
      }
    });
  }
  orders.sort((a, b) => a.at - b.at);
  customers.forEach((c) => {
    c.points = Math.round(c.spend / 10000 + c.visits * 15);
    c.fav = Object.entries(c.favs).sort((a, b) => b[1] - a[1])[0]?.[0] || "latte";
    if (!c.last) c.last = c.joined;
  });

  // a few in progress right now
  const live = [];
  const regulars = customers.filter((x) => x.visits > 2);
  for (let k = 0; k < 4; k++) {
    const c = pick(regulars);
    const m1 = wpick(MENU, menuW), m2 = R() > .5 ? wpick(MENU, MENU.map((x) => x.pop)) : null;
    const lines = [{ id: m1.id, qty: 1, unit: m1.price }, ...(m2 ? [{ id: m2.id, qty: 1, unit: m2.price }] : [])];
    live.push({ id: "L" + k, code: String(100 + Math.floor(R() * 900)), at: now - (k * 3 + 1) * 60e3, branch: c.branch, customer: c.id, lines, mode: k === 2 ? "dinein" : "takeaway", total: lines.reduce((s, l) => s + l.unit, 0), status: ["new", "new", "brewing", "ready"][k], table: k === 2 ? "7" : "" });
  }

  // stock on hand: a week of usage tells us how long it lasts
  const use7 = {};
  orders.forEach((o) => { if (o.day >= 7 || o.status !== "done") return; o.lines.forEach((l) => { const u = usage(MENU.find((m) => m.id === l.id), l.qty, o.mode); for (const k in u) { const key = `${o.branch}|${k}`; use7[key] = (use7[key] || 0) + u[k]; } }); });
  const stock = [];
  BRANCHES.forEach((b) => STOCK.forEach((s) => {
    const daily = (use7[`${b.id}|${s.id}`] || 0) / 7;
    if (!daily) return;
    let days = 2.2 + R() * 7;
    if ((b.id === "aseman" && s.id === "oat") || (b.id === "valiasr" && s.id === "cream") || (b.id === "lalehpark" && s.id === "cold")) days = 0.6 + R() * 0.5;
    if ((b.id === "elahiparast" && s.id === "beans") || (b.id === "esfahan" && s.id === "pistachio")) days = 1.6 + R() * 0.4;
    stock.push({ branch: b.id, item: s.id, daily, qty: daily * days, par: daily * 7 });
  }));

  const waste = [
    { at: now - 1 * DAY, branch: "aseman", item: "milk", qty: 6, why: "تاریخش گذشته بود" },
    { at: now - 2 * DAY, branch: "valiasr", item: "cake", qty: 4, why: "آخر شب فروش نرفت" },
    { at: now - 3 * DAY, branch: "lalehpark", item: "pastry", qty: 7, why: "آخر شب فروش نرفت" },
    { at: now - 4 * DAY, branch: "elahiparast", item: "beans", qty: 0.4, why: "کالیبره کردن آسیاب" },
    { at: now - 5 * DAY, branch: "esfahan", item: "cream", qty: 1.5, why: "ترش شد" },
    { at: now - 6 * DAY, branch: "valiasr", item: "milk", qty: 4, why: "ریخت" },
  ];

  // fixed monthly costs (Toman)
  const fixed = { valiasr: { rent: 95e6, util: 24e6 }, elahiparast: { rent: 60e6, util: 16e6 }, aseman: { rent: 120e6, util: 28e6 }, lalehpark: { rent: 85e6, util: 19e6 }, esfahan: { rent: 70e6, util: 17e6 } };
  const shared = { marketing: 42e6, software: 7e6, accounting: 12e6 };

  const maint = [
    { id: "M1", branch: "valiasr", what: "بک‌فلاش و رسوب‌زدایی دستگاه اسپرسو", every: 30, last: now - 33 * DAY },
    { id: "M2", branch: "valiasr", what: "عوض کردن تیغه‌ی آسیاب", every: 180, last: now - 120 * DAY },
    { id: "M3", branch: "elahiparast", what: "عوض کردن فیلتر آب", every: 60, last: now - 58 * DAY },
    { id: "M4", branch: "aseman", what: "بک‌فلاش و رسوب‌زدایی دستگاه اسپرسو", every: 30, last: now - 12 * DAY },
    { id: "M5", branch: "aseman", what: "سرویس کولر و تهویه", every: 90, last: now - 95 * DAY },
    { id: "M6", branch: "lalehpark", what: "کالیبره کردن ترازو و آسیاب", every: 14, last: now - 9 * DAY },
    { id: "M7", branch: "esfahan", what: "شارژ کپسول آتش‌نشانی", every: 365, last: now - 340 * DAY },
    { id: "M8", branch: "esfahan", what: "عوض کردن فیلتر آب", every: 60, last: now - 20 * DAY },
  ];
  const CHECK = ["روشن کردن دستگاه و گرم شدنش", "شات تست و کالیبره کردن آسیاب", "چک کردن تاریخ شیر و خامه", "تمیزکاری میزها و سرویس", "شمردن صندوق اول روز", "چیدن ویترین کیک"];
  const checklist = {};
  BRANCHES.forEach((b, i) => { checklist[b.id] = CHECK.map((t, k) => ({ t, done: b.id === "valiasr" || (k + i) % 5 !== 4 })); });

  const audit = [
    ["P100", "قیمت آیس لاته رو از ۱۵۵ به ۱۶۰ هزار تومان تغییر داد", 3],
    ["P107", "سفارش #۴۱۲ رو مرجوع کرد", 5],
    ["P114", "کیک شکلاتی رو «تموم شد» زد", 7],
    ["P121", "سفارش آنلاین لاله پارک رو ۳۰ دقیقه نگه داشت", 26],
    ["P100", "کمپین «دلمون برات تنگ شده» رو فرستاد", 50],
    ["P128", "۲ کیلو دون قهوه از رست‌خونه‌ی آذر سفارش داد", 75],
    ["P107", "شیفت فردای یکی از باریستاها رو عوض کرد", 130],
    ["P114", "به نظر ۲ ستاره‌ی یه مشتری جواب داد", 190],
  ].map(([who, what, mins]) => ({ who, what, at: now - mins * 60e3 }));

  return { customers, orders, live, reviews, staff, stock, waste, fixed, shared, maint, checklist, audit, checkins, today0 };
}
