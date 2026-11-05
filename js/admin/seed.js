// Demo history for the owner panel: customers, two weeks of orders, reviews.
// Seeded so it reads the same every time; clearly labelled "demo data" in the UI.
import { MENU, BRANCHES } from "../data.js";

export function rng(seed = 7) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(1405);
const pick = (a) => a[Math.floor(R() * a.length)];
const wpick = (a, w) => { const s = w.reduce((x, y) => x + y, 0); let r = R() * s; for (let i = 0; i < a.length; i++) { r -= w[i]; if (r <= 0) return a[i]; } return a[a.length - 1]; };

const NAMES = [["Sara", "سارا"], ["Ali", "علی"], ["Nazanin", "نازنین"], ["Reza", "رضا"], ["Maryam", "مریم"], ["Amir", "امیر"], ["Elham", "الهام"], ["Hossein", "حسین"], ["Niloufar", "نیلوفر"], ["Mehdi", "مهدی"], ["Shirin", "شیرین"], ["Arash", "آرش"], ["Parisa", "پریسا"], ["Kian", "کیان"], ["Yasaman", "یاسمن"], ["Babak", "بابک"], ["Ayda", "آیدا"], ["Farhad", "فرهاد"], ["Ladan", "لادن"], ["Navid", "نوید"], ["Golnaz", "گلناز"], ["Pouya", "پویا"], ["Tara", "تارا"], ["Siavash", "سیاوش"], ["Mahsa", "مهسا"], ["Behnam", "بهنام"], ["Sepideh", "سپیده"], ["Kaveh", "کاوه"], ["Roya", "رویا"], ["Omid", "امید"], ["Aylin", "آیلین"], ["Arman", "آرمان"], ["Hasti", "هستی"], ["Sina", "سینا"], ["Donya", "دنیا"], ["Pedram", "پدرام"], ["Mina", "مینا"], ["Ramin", "رامین"], ["Setareh", "ستاره"], ["Ehsan", "احسان"]];
const LAST = [["Ahmadi", "احمدی"], ["Rezaei", "رضایی"], ["Hosseini", "حسینی"], ["Karimi", "کریمی"], ["Tabrizi", "تبریزی"], ["Moradi", "مرادی"], ["Jafari", "جعفری"], ["Rahimi", "رحیمی"], ["Azizi", "عزیزی"], ["Sadeghi", "صادقی"], ["Nazari", "نظری"], ["Ebrahimi", "ابراهیمی"]];
const TAGS = [["Oat milk", "شیر جو"], ["Remote worker", "دورکار"], ["Student", "دانشجو"], ["Sweet tooth", "عاشق شیرینی"], ["Morning regular", "مشتری صبح"], ["Event-goer", "اهل رویداد"], ["Delivery only", "فقط ارسال"]];
const COMMENTS = [
  [5, "Best Con Panna in Tabriz, the cream is unreal.", "بهترین کن‌پانای تبریز، خامه‌اش فوق‌العاده است."],
  [5, "Fast pickup, my order was waiting when I arrived.", "تحویل سریع؛ وقتی رسیدم سفارشم آماده بود."],
  [4, "Lovely latte, a bit too sweet for me.", "لاته‌ی عالی، فقط برای من کمی شیرین بود."],
  [5, "The Basque cheesecake is dangerous. Coming back.", "چیزکیک باسک خطرناک است! باز هم می‌آیم."],
  [3, "Delivery took longer than the app said.", "ارسال از زمانی که اپ گفته بود طول کشید."],
  [5, "Staff at Aseman are so friendly.", "کارکنان شعبه‌ی آسمان خیلی خوش‌برخوردند."],
  [4, "Great spot for working, Wi-Fi is fast.", "برای کار جای خوبی است، وای‌فای سریع است."],
  [2, "Iced latte arrived watery.", "آیس لاته آبکی رسید."],
  [5, "Pistachio Con Panna — instant favourite.", "پسته کن‌پانا؛ از همین اول محبوبم شد."],
  [4, "Good coffee, a bit crowded in the evening.", "قهوه‌ی خوب، عصرها کمی شلوغ است."],
];

const DAY = 864e5;
export function seed() {
  const now = Date.now();
  const customers = Array.from({ length: 86 }, (_, i) => {
    const [fn, fnFa] = NAMES[i % NAMES.length], [ln, lnFa] = pick(LAST);
    const joined = Math.floor(R() * 220) + 1;
    const visits = Math.max(1, Math.round(Math.pow(R(), 1.6) * 46));
    const last = Math.min(joined, Math.floor(Math.pow(R(), 1.8) * 60));
    const spend = visits * (150000 + Math.floor(R() * 220000));
    const points = Math.round(spend / 10000 + visits * 15);
    const fav = wpick(MENU, MENU.map((m) => m.pop * m.pop));
    return {
      id: "C" + (1000 + i), name: `${fn} ${ln}`, name_fa: `${fnFa} ${lnFa}`, phone: `09${pick(["12", "14", "35", "36", "91", "93", "01"])}•••${String(Math.floor(R() * 9000) + 1000)}`,
      branch: wpick(BRANCHES, [36, 22, 28, 14]).id, joined: now - joined * DAY, last: now - last * DAY - Math.floor(R() * DAY / 2), visits, spend, points,
      fav: fav.id, tags: R() > .45 ? [pick(TAGS)] : [], bmonth: Math.floor(R() * 12), referrals: R() > .82 ? Math.ceil(R() * 4) : 0,
    };
  });
  // two weeks of orders, shaped by time of day, branch and channel
  const orders = [];
  for (let d = 13; d >= 0; d--) {
    const dayStart = new Date(now - d * DAY); dayStart.setHours(0, 0, 0, 0);
    const weekend = [4, 5].includes(dayStart.getDay());
    const n = Math.round((52 + R() * 26) * (weekend ? 1.25 : 1) * (d === 0 ? Math.min(1, (new Date().getHours() + 1) / 24) * 1.4 : 1));
    for (let k = 0; k < n; k++) {
      const hour = wpick([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], [3, 6, 5, 4, 5, 6, 5, 4, 5, 6, 8, 10, 10, 8, 5, 2]);
      const at = dayStart.getTime() + hour * 3600e3 + Math.floor(R() * 3600e3);
      if (at > now) continue;
      const c = pick(customers);
      const lines = Array.from({ length: wpick([1, 2, 3, 4], [42, 34, 16, 8]) }, () => { const m = wpick(MENU, MENU.map((x) => x.pop * x.pop)); return { id: m.id, qty: R() > .85 ? 2 : 1, unit: m.price }; });
      const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
      const mode = wpick(["takeaway", "delivery", "dinein"], [46, 30, 24]);
      orders.push({ id: "S" + orders.length, code: String(100 + Math.floor(R() * 900)), at, branch: c.branch, customer: c.id, lines, mode, total: subtotal + (mode === "delivery" ? 45000 : 0), status: "done", rating: R() > .7 ? wpick([5, 4, 3, 2], [55, 30, 10, 5]) : 0 });
    }
  }
  // a few still in progress right now
  const live = [];
  for (let k = 0; k < 4; k++) {
    const c = pick(customers);
    const m1 = wpick(MENU, MENU.map((x) => x.pop * x.pop)), m2 = R() > .5 ? wpick(MENU, MENU.map((x) => x.pop)) : null;
    const lines = [{ id: m1.id, qty: 1, unit: m1.price }, ...(m2 ? [{ id: m2.id, qty: 1, unit: m2.price }] : [])];
    live.push({ id: "L" + k, code: String(100 + Math.floor(R() * 900)), at: now - (k * 3 + 1) * 60e3, branch: c.branch, customer: c.id, lines, mode: pick(["takeaway", "delivery", "dinein"]), total: lines.reduce((s, l) => s + l.unit, 0), status: ["new", "new", "brewing", "ready"][k], table: k === 2 ? "7" : "" });
  }
  const reviews = COMMENTS.map(([r, en, fa], i) => ({ id: "R" + i, rating: r, text: en, text_fa: fa, customer: customers[i * 7 % customers.length].id, branch: customers[i * 7 % customers.length].branch, at: now - Math.floor(R() * 9 * DAY) }));
  return { customers, orders, live, reviews };
}
