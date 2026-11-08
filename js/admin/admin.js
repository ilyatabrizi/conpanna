// پنل مدیرعامل — the owner's panel. Today at a glance, alerts, the live order
// board, money (sales, P&L, goals), the menu and customers, and running the
// place (branches, store room, staff, service, checklists), plus reports and
// access. It talks to the customer app through hub.js: on one device, an order
// placed in the app lands on the board instantly.
import { $, $$, esc, icon, money, sheet, closeSheet, toast, haptic, sw, segmented, loc, num, digits, kmoney, ago, fmtTime, fmtDay, relDay, pct, dayFromToday, tile, hhmm, netWatch } from "../ui.js";
import { applyLang } from "../i18n.js";
import { applyTheme } from "../theme.js";
import { getHub, setHub, onHub } from "../hub.js";
import { get as appState } from "../store.js";
import { MENU, BRANCHES, CATEGORIES, EVENTS, TIERS } from "../data.js";
import { LOCKUP, MARK } from "../brand.js";
import { stageOf } from "../orders.js";
import { seed, costOf } from "./seed.js";
import { initCeo, CEO, wireCeo, alerts, barsH } from "./ceo.js";
import { initOps, OPS, wireOps, csvExport } from "./ops.js";
import { initCrm, CRM, wireCrm, openCustomer, crmTitle } from "./crm.js";
import { initExtra, EXTRA, wireExtra, extraTitle, openBell, tvMode, extraAlerts } from "./extra.js";
import { initMore, MORE, wireMore, annCard, compareCard, openPalette, helpSheet, cfg } from "./more.js";

const KEY = "conpanna.admin.v1";
const DEF = () => ({ authed: false, live: false, status: {}, sims: [], notes: {}, campaigns: [], section: "overview", scope: "all",
  period: 30, targets: {}, expenses: [], pos: [], received: {}, waste: [], alertRules: {}, alertCh: null, dismissed: [], shifts: {}, checks: {}, maintDone: {}, todos: [], perms: null, reports: {}, log: [], sim: null,
  cid: null, cnotes: {}, ctags: {}, cflags: {}, clog: {}, cmsg: {}, recentC: [], cfg: {}, closes: [], petty: [], ann: [], cmp: null, compact: false, collapsed: false });
let A = DEF();
try { A = { ...DEF(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) {}
if (![7, 30, 60].includes(A.period)) A.period = 30;
// notes used to be one line per customer; now they're a list
if (A.notes && Object.keys(A.notes).length) { Object.entries(A.notes).forEach(([id, t]) => { if (t && t.trim()) A.cnotes = { ...A.cnotes, [id]: [...(A.cnotes[id] || []), { at: Date.now(), t }] }; }); A.notes = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) {} };
const setA = (p) => { A = { ...A, ...p }; save(); };

const S = seed();
const item = (id) => MENU.find((m) => m.id === id);
const branch = (id) => BRANCHES.find((b) => b.id === id);
const cust = (id) => S.customers.find((c) => c.id === id);
const DAY = 864e5;
const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const inScope = (b) => A.scope === "all" || b === A.scope;
const log = (what) => setA({ log: [...A.log, { who: "me", what, at: Date.now() }].slice(-80) });

/* ------------------------------------------------------------ the data */
const STAT = ["new", "brewing", "ready", "done"];
function boardOrders() {
  const app = appState().orders.filter((o) => o.at > startOfDay() - DAY / 2).map((o) => {
    const st = stageOf(o);
    return { src: "app", id: o.id, code: o.code, at: o.at, branch: o.branch, name: o.customer?.name || "مهمون اپ", lines: o.lines, mode: "takeaway", total: o.total, status: STAT[Math.min(3, st)], table: o.table, note: o.note, pickup: o.pickup };
  });
  const local = [...S.live, ...A.sims].map((o) => ({ ...o, src: o.src || "seed", name: loc(cust(o.customer) || {}) || o.name, status: A.status[o.id] || o.status }));
  return [...app, ...local].filter((o) => inScope(o.branch)).sort((a, b) => a.at - b.at);
}
function advance(o, to) {
  const idx = to != null ? to : STAT.indexOf(o.status) + 1;
  if (idx > 3) return;
  if (o.src === "app") setHub((h) => ({ orderStatus: { ...h.orderStatus, [o.id]: idx } }));
  else setA({ status: { ...A.status, [o.id]: STAT[idx] } });
  haptic(8);
  render();
}
// one shape for every order: four months of history + simulated + this phone's
let memo = null;
function orders() {
  const app = appState().orders, t0 = startOfDay();
  const k = [A.scope, A.sims.length, A.sims.at(-1)?.id, JSON.stringify(A.status).length, app.length, app[0]?.id, app[0]?.rating, t0].join("|");
  if (memo && memo.k === k) return memo.v;
  const norm = (o, src) => {
    const lines = o.lines.map((l) => { const m = item(l.id); return { id: l.id, qty: l.qty, unit: l.unit ?? m?.price ?? 0, cost: m ? costOf(m) : 0, oat: /oat|جو/i.test(l.opts || "") }; });
    const subtotal = o.subtotal ?? lines.reduce((s, l) => s + l.unit * l.qty, 0);
    return { id: o.id, code: o.code, at: o.at, day: Math.max(0, Math.round((t0 - startOfDay(o.at)) / DAY)), hour: new Date(o.at).getHours(), branch: o.branch,
      customer: src === "app" ? "APP" : o.customer, lines, qty: lines.reduce((s, l) => s + l.qty, 0), mode: o.mode === "dinein" ? "dinein" : "takeaway",
      channel: src === "app" ? "app" : "counter", pay: src === "app" ? (o.pay === "cash" ? "cash" : "online") : "card", promo: o.discount ? "promo" : null, discount: o.discount || 0,
      subtotal, total: o.total, cost: lines.reduce((s, l) => s + l.cost * l.qty, 0), status: "done", prep: 240 + 60 * lines.length, staff: null, rating: o.rating || 0 };
  };
  const sims = A.sims.filter((o) => (A.status[o.id] || o.status) === "done").map((o) => norm(o, "sim"));
  const v = [...S.orders, ...sims, ...app.map((o) => norm(o, "app"))].filter((o) => inScope(o.branch));
  memo = { k, v };
  return v;
}
function stock() {
  return S.stock.filter((s) => inScope(s.branch)).map((s) => ({ ...s, qty: s.qty + (A.received[s.branch + "|" + s.item] || 0) }));
}
function checklist(b) {
  const c = A.checks[b];
  return c && c.day === new Date().toDateString() ? S.checklist[b].map((x, i) => ({ ...x, done: !!c.v[i] })) : S.checklist[b];
}
function segments() {
  const now = Date.now();
  const cs = S.customers.filter((c) => inScope(c.branch));
  const tierOf = (p) => [...TIERS].reverse().find((t) => p >= t.min);
  const m = new Date().getMonth();
  return {
    all: { n: "همه", f: () => true },
    vip: { n: "پانا طلایی", f: (c) => tierOf(c.points).id === "gold" },
    regular: { n: "مشتری ثابت", f: (c) => c.visits >= 8 && now - c.last < 21 * DAY },
    new: { n: "تازه‌واردها (۱۴ روز)", f: (c) => now - c.joined < 14 * DAY },
    risk: { n: "دارن می‌رن", f: (c) => now - c.last > 21 * DAY && c.visits >= 3 },
    bday: { n: "تولد این ماه", f: (c) => c.bmonth === m },
    list: cs,
    tierOf,
  };
}

/* ----------------------------------------------------------------- sound */
let actx = null;
function ding() {
  if (!cfg().sound) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, actx.currentTime + i * 0.14); g.gain.exponentialRampToValueAtTime(0.18, actx.currentTime + i * 0.14 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i * 0.14 + 0.45); o.connect(g).connect(actx.destination); o.start(actx.currentTime + i * 0.14); o.stop(actx.currentTime + i * 0.14 + 0.5); });
  } catch (e) {}
}

/* ------------------------------------------------------------- sections */
const GROUPS = [
  ["امروز", [["brief", "sun", "خلاصه‌ی امروز"], ["overview", "chart", "داشبورد"], ["alerts", "bell", "هشدارها"], ["orders", "receipt", "سفارش‌های زنده"], ["cash", "cash", "صندوق و بستن روز"]]],
  ["پول", [["sales", "trend", "فروش"], ["finance", "card", "سود و زیان"], ["cashflow", "layers", "نقدینگی و پرداخت‌ها"], ["pricing", "tag", "آزمایشگاه قیمت"], ["goals", "flame", "هدف و پیش‌بینی"]]],
  ["مشتری‌ها", [["customers", "users", "پرونده‌ی مشتری‌ها"], ["insights", "heart", "تحلیل مشتری"], ["tickets", "info", "شکایت و پیگیری"], ["marketing", "trend", "بازاریابی و جذب"], ["campaigns", "mega", "کمپین"], ["automations", "bolt", "پیام خودکار"], ["loyalty", "crown", "باشگاه مشتری"], ["reviews", "star", "نظرها"], ["events", "events", "رویدادها"]]],
  ["منو", [["products", "sparkle", "تحلیل منو"], ["basket", "bag", "سبد و ترکیب‌ها"], ["menu", "menu", "منو و قیمت"]]],
  ["اداره‌ی کافه", [["branches", "pin", "شعبه‌ها"], ["leaderboard", "crown", "رتبه‌بندی"], ["inventory", "layers", "انبار و خرید"], ["assets", "gear", "تجهیزات"], ["staff", "profile", "پرسنل و شیفت"], ["staffing", "clock", "نیرو و شلوغی"], ["service", "clock", "کیفیت سرویس"], ["tasks", "check", "اطلاعیه و چک‌لیست"]]],
  ["مدیریت", [["calendar", "calPlus", "تقویم"], ["docs", "shield", "مجوزها و قراردادها"], ["reports", "dl", "گزارش و خروجی"], ["access", "shield", "دسترسی‌ها"], ["settings", "gear", "تنظیمات"]]],
];
const SECTIONS = GROUPS.flatMap(([, s]) => s);
const LEAD = {
  overview: "", alerts: "چیزایی که الان باید بهشون برسی.", orders: "", sales: "", finance: "درآمد و خرج و سودت، با همه‌ی جزئیات.", goals: "هدف بذار، ببین کجایی، ببین آخر ماه به کجا می‌رسی.",
  products: "کدوم آیتم‌ها پول درمیارن و کدوم فقط جا گرفتن.", insights: "مشتری‌ها کی‌ان، چقدر برمی‌گردن و کی دارن می‌رن.", inventory: "", staff: "", service: "", tasks: "", reports: "", access: "",
  brief: "", cashflow: "پول از کجا میاد و کِی باید بره؛ موجودی حساب تو دو ماه آینده.", pricing: "", basket: "", tickets: "هر نظر بد یه پرونده می‌شه تا وقتی حل بشه.", staffing: "", leaderboard: "", assets: "", docs: "قبل از این‌که بازرس بیاد، بدون چی داره منقضی می‌شه.", calendar: "تعطیلی‌ها، پرداخت‌ها، رویدادها و انقضاها همه یه جا.", item: "", person: "", branch: "",
  cash: "آخر شب صندوق رو بشمر و ببند؛ کسری و اضافه همین‌جا معلوم می‌شه.", marketing: "هر تومنی که برای آوردن مشتری خرج می‌کنی، چقدر برمی‌گرده.", customers: "همه‌ی اعضای باشگاه، با هر چی ازشون می‌دونیم.", settings: "", customer: "",
};

function orderBoard() {
  const list = boardOrders();
  const cols = [["new", "تازه"], ["brewing", "دارن درستش می‌کنن"], ["ready", "آماده‌ست"], ["done", "امروز تحویل شد"]];
  const oc = (o) => {
    const late = o.status !== "done" && Date.now() - o.at > 15 * 60e3;
    const next = { new: "قبول", brewing: "آماده شد", ready: "تحویل دادیم" }[o.status];
    return `<article class="oc ${o.src === "app" ? "from-app" : ""} ${late ? "late" : ""}" data-id="${o.id}">
      <header><b>#${digits(o.code)}</b><span class="oc-mode">${icon(o.mode === "dinein" ? "table" : "takeaway")}${o.mode === "dinein" ? "سالن" + (o.table ? ` – میز ${digits(o.table)}` : "") : "بیرون‌بر"}</span><span class="tiny">${ago(o.at)}</span></header>
      <div class="oc-who">${esc(o.name)}${o.src === "app" ? `<span class="app-pill">از اپ</span>` : ""} – <span class="tiny">${esc(loc(branch(o.branch)))}</span></div>
      <ul>${o.lines.map((l) => `<li><b>${num(l.qty)}×</b> ${esc(loc(item(l.id)) || l.name)}${l.opts ? `<span class="tiny"> – ${esc(l.opts)}</span>` : ""}</li>`).join("")}</ul>
      ${o.note ? `<p class="oc-note">${icon("note")}${esc(o.note)}</p>` : ""}
      <footer>${money(o.total)}${next ? `<button class="btn btn--sm" data-adv="${o.id}">${next}${icon("chev", "chev")}</button>` : `<span class="tiny">${icon("check")}</span>`}</footer>
    </article>`;
  };
  const seedDone = S.orders.filter((o) => o.at > startOfDay() && o.status === "done" && inScope(o.branch)).slice(-6).map((o) => ({ ...o, src: "seed", name: loc(cust(o.customer)) || "مهمون" }));
  const doneToday = [...seedDone, ...list.filter((o) => o.status === "done" && o.at > startOfDay())].sort((a, b) => a.at - b.at).slice(-5).reverse();
  return `
    <div class="board-bar">
      <label class="tgl">${sw("live", A.live, "")}<span><b>دموی زنده</b><span class="tiny">هر نیم دقیقه یه سفارش تازه میاد</span></span></label>
      <label class="tgl">${sw("auto", getHub().autoAdvance, "")}<span><b>سفارش‌های اپ خودشون جلو برن</b><span class="tiny">خاموش باشه، خودت جلو می‌بری</span></span></label>
      <button class="btn btn--sm btn--soft" id="sim">${icon("plus")}یه سفارش آزمایشی</button>
    </div>
    <div class="board">${cols.map(([k, t]) => { const items = k === "done" ? doneToday : list.filter((o) => o.status === k); return `<section class="col col-${k}"><h3><span class="st st-${k}"></span>${t}<span class="cnt">${num(items.length)}</span></h3>${items.map(oc).join("") || `<div class="col-empty">خالیه</div>`}</section>`; }).join("")}</div>
    <p class="tiny demo-note">سفارشی که تو اپ مشتری روی همین گوشی ثبت بشه، همون لحظه اینجا با برچسب «از اپ» میاد. جلو ببریش، مشتری همون لحظه با اعلان می‌بینه.</p>`;
}

function menuSec() {
  const hub = getHub();
  const sold = {}; orders().filter((o) => o.day === 0).forEach((o) => o.lines.forEach((l) => { sold[l.id] = (sold[l.id] || 0) + l.qty; }));
  return `<p class="small sec-lead">هر آیتمی رو خاموش کنی، تو اپ «تموم شد» می‌خوره. قیمت رو عوض کنی، اپ هم همون لحظه عوض می‌شه.</p>
    ${CATEGORIES.map((c) => `<section class="card"><div class="card-h"><h3>${esc(loc(c))}</h3></div><div class="mlist">${MENU.filter((m) => m.cat === c.id).map((m) => `
      <div class="mrow ${hub.soldOut.includes(m.id) ? "off" : ""}">${tile(m, "sm")}<span class="row-main"><span class="row-t">${esc(loc(m))}</span><span class="row-s">امروز ${num(sold[m.id] || 0)} تا فروخته – سود هر عدد ${kmoney((hub.prices[m.id] ?? m.price) - costOf(m))}${hub.prices[m.id] != null ? ` – <span class="link">قیمتش عوض شده</span>` : ""}</span></span>
        <label class="price-in"><input type="text" inputmode="numeric" data-price="${m.id}" value="${num(hub.prices[m.id] ?? m.price)}" aria-label="قیمت"><small>تومان</small></label>
        <label class="avail">${sw("av-" + m.id, !hub.soldOut.includes(m.id), "")}<span class="tiny">${hub.soldOut.includes(m.id) ? "تموم شد" : "موجوده"}</span></label>
      </div>`).join("")}</div></section>`).join("")}`;
}

/* campaigns */
const TEMPLATES = [
  { t: "هوا بارونیه؟ ٪۱۵ تخفیف نوشیدنی گرم", b: "فقط امروز، تو همه‌ی شعبه‌ها. تو اپ نشونش بده.", off: "15" },
  { t: "دلمون برات تنگ شده ☕", b: "این هفته ٪۲۰ تخفیف رو سفارش بعدیت.", off: "20", seg: "risk" },
  { t: "تازه رسید: پسته کن‌پانا", b: "پسته‌ی احمدآقایی روی خامه‌ی دست‌زده. این هفته امتحانش کن.", off: "" },
  { t: "شب آکوستیک فرداست", b: "با هر سفارش تو شعبه‌ی آسمان ورود رایگانه. از اپ جات رو رزرو کن.", off: "" },
  { t: "تولدت مبارک 🎂", b: "این هفته یه نوشیدنی مهمون ما باش.", off: "drink", seg: "bday" },
];
function campaigns() {
  const seg = segments();
  const keys = ["all", "vip", "regular", "new", "risk", "bday"];
  return `<div class="cards g2 camp">
    <section class="card"><div class="card-h"><h3>کمپین جدید</h3></div>
      <p class="group-label" style="margin-top:0">از یه الگو شروع کن</p>
      <div class="tpls">${TEMPLATES.map((t, i) => `<button class="chip" data-tpl="${i}">${esc(t.t)}</button>`).join("")}</div>
      <label class="field"><span>برای کی</span><select id="c-seg">${keys.map((k) => `<option value="${k}">${seg[k].n} – ${num(seg.list.filter(seg[k].f).length)} نفر</option>`).join("")}</select></label>
      <label class="field"><span>از چه راهی</span></label><div class="seg" id="c-ch" role="group"><span class="seg-thumb"></span><button type="button" data-v="push" aria-pressed="true">${icon("bell")}<span>اعلان اپ</span></button><button type="button" data-v="sms" aria-pressed="false">${icon("phone")}<span>پیامک</span></button></div>
      <label class="field"><span>عنوان</span><input id="c-t" maxlength="60" value=""></label>
      <label class="field"><span>متن پیام</span><textarea id="c-b" rows="3" maxlength="160"></textarea></label>
      <label class="field"><span>پیشنهاد</span><select id="c-o"><option value="">بدون پیشنهاد</option><option value="10">٪۱۰ تخفیف</option><option value="15">٪۱۵ تخفیف</option><option value="20">٪۲۰ تخفیف</option><option value="drink">یه نوشیدنی مجانی</option></select></label>
      <label class="field"><span>کِی بره</span><select id="c-w"><option value="now">همین الان</option><option value="eve">امروز ساعت ۱۸</option><option value="tmr">فردا ساعت ۱۰</option></select></label>
      <button class="btn btn--block" id="c-send" style="margin-top:16px">${icon("send")}بفرست</button>
      <p class="tiny" style="margin-top:8px">تو این نسخه‌ی نمایشی، اپ مشتری روی همین گوشی همه‌ی کمپین‌ها رو می‌گیره که ببینی چطور می‌رسه.</p>
    </section>
    <section class="card phone-card"><div class="card-h"><h3>پیش‌نمایش</h3><span class="tiny" id="c-reach"></span></div>
      <div class="phone"><div class="ph-time" dir="ltr">${fmtTime(new Date())}</div><div class="ph-note"><span class="ph-ic">${MARK}</span><div><b id="pv-t">عنوانت</b><p id="pv-b">متن پیامت اینجا میاد.</p></div><span class="tiny">الان</span></div></div>
    </section></div>
    <section class="card"><div class="card-h"><h3>کمپین‌هایی که فرستادی</h3></div>
      ${A.campaigns.length ? `<div class="ctable">${A.campaigns.slice().reverse().map((c) => `<div class="ct-row"><span class="row-main"><span class="row-t">${esc(c.title)}</span><span class="row-s">${esc(c.segN)} – ${c.ch === "sms" ? "پیامک" : "اعلان"} – ${fmtDay(new Date(c.at))} ${fmtTime(new Date(c.at))}${c.when !== "now" ? " – زمان‌بندی‌شده" : ""}</span></span><span class="c-num">${num(c.reach)}<small>رسید</small></span><span class="c-num">${pct(c.open)}<small>باز کردن</small></span><span class="c-num">${num(c.redeem)}<small>استفاده کردن</small></span><span class="c-num">${kmoney(c.redeem * 340000)}<small>فروش آورد</small></span></div>`).join("")}</div><p class="tiny demo-note">آمار باز کردن و استفاده تو این نسخه شبیه‌سازی شده.</p>`
      : `<p class="small">هنوز چیزی نفرستادی. یکی از الگوهای بالا رو امتحان کن.</p>`}
    </section>`;
}
function wireCampaigns(el) {
  const seg = segments();
  const pv = () => { $("#pv-t", el).textContent = $("#c-t", el).value || "عنوانت"; $("#pv-b", el).textContent = $("#c-b", el).value || "متن پیامت اینجا میاد."; const k = $("#c-seg", el).value; $("#c-reach", el).textContent = `به ${num(seg.list.filter(seg[k].f).length)} نفر می‌رسه`; };
  let ch = "push";
  segmented($("#c-ch", el), (v) => { ch = v; });
  ["#c-t", "#c-b", "#c-seg"].forEach((s) => $(s, el).addEventListener("input", pv));
  $$("[data-tpl]", el).forEach((x) => x.addEventListener("click", () => { const t = TEMPLATES[+x.dataset.tpl]; $("#c-t", el).value = t.t; $("#c-b", el).value = t.b; $("#c-o", el).value = t.off; if (t.seg) $("#c-seg", el).value = t.seg; pv(); haptic(5); }));
  pv();
  $("#c-send", el).addEventListener("click", () => {
    const title = $("#c-t", el).value.trim(), body = $("#c-b", el).value.trim();
    if (!title) { toast("یه عنوان بنویس", "info"); $("#c-t", el).focus(); return; }
    const off = $("#c-o", el).value, k = $("#c-seg", el).value, when = $("#c-w", el).value;
    const reach = seg.list.filter(seg[k].f).length;
    const offer = off === "drink" ? { kind: "drink", title: "A free drink", title_fa: "یه نوشیدنی مجانی" } : off ? { kind: "pct", value: +off / 100, title: `${off}% off`, title_fa: `٪${digits(off)} تخفیف` } : null;
    const code = offer ? "CP" + Math.random().toString(36).slice(2, 6).toUpperCase() : null;
    if (when === "now") setHub((h) => ({ broadcasts: [...h.broadcasts, { id: "B" + Date.now(), at: Date.now(), title, title_fa: title, body, body_fa: body, offer, code, to: k }].slice(-40) }));
    const open = 38 + Math.floor(Math.random() * 18);
    setA({ campaigns: [...A.campaigns, { title, segN: seg[k].n, ch, at: Date.now(), when, reach, open, redeem: offer ? Math.round(reach * (0.08 + Math.random() * 0.07)) : 0 }] });
    log(`کمپین «${title}» رو ${when === "now" ? "فرستاد" : "زمان‌بندی کرد"}`);
    toast(when === "now" ? `برای ${num(reach)} نفر رفت` : "زمان‌بندی شد", "send");
    haptic(15); render();
  });
}

function automations() {
  const j = getHub().journeys;
  const J = [
    ["welcome", "gift", "خوش‌اومد", "تا کسی عضو شد ← ٪۲۰ تخفیف اولین سفارش", 142, 61],
    ["winback", "trend", "برگردوندن مشتری", "۲۱ روز نیومده ← «دلمون برات تنگ شده» + ٪۱۵ تخفیف", 58, 22],
    ["birthday", "cake", "تولد", "هفته‌ی تولدش ← یه نوشیدنی مهمون ما (طلایی‌ها: کیک)", 23, 74],
    ["review", "star", "نظرخواهی", "۳۰ دقیقه بعد از سفارش ← ازش امتیاز می‌خوایم", 610, 34],
    ["stamp", "coffee", "یه مهر تا جایزه", "۷ مهر از ۸ ← یه یادآوری کوچیک", 39, 47],
  ];
  return `<p class="small sec-lead">پیام‌هایی که سر وقتش خودشون فرستاده می‌شن. هر کدوم رو خواستی خاموش کن.</p>
    <div class="cards g3">${J.map(([k, ic, t, d, sent, conv]) => `<section class="card auto ${j[k] ? "" : "off"}"><div class="auto-h"><span class="row-ic" style="--c:var(--primary)">${icon(ic)}</span><b>${t}</b>${sw("j-" + k, j[k], t)}</div><p class="small">${d}</p><div class="auto-s"><span><b>${num(sent)}</b>تو ۳۰ روز فرستاده شده</span><span><b>${pct(conv)}</b>برگشتن</span></div></section>`).join("")}</div>
    <p class="tiny demo-note">آمارها نمایشیه. ولی پیام خوش‌اومد واقعاً کار می‌کنه: تو اپ عضو شو، کوپنش میاد.</p>`;
}

function loyalty() {
  const seg = segments(), hub = getHub();
  const dist = TIERS.map((t) => ({ l: esc(loc(t)), v: seg.list.filter((c) => seg.tierOf(c.points).id === t.id).length, c: t.color }));
  const pts = sum0(seg.list, (c) => c.points);
  return `<div class="kpis k4"><div class="kpi"><span>کل اعضا</span><b>${num(seg.list.length)}</b></div><div class="kpi"><span>امتیازهای خرج‌نشده</span><b>${num(pts)}</b><em>حدود ${kmoney(pts * 1000)} تومان تعهد</em></div><div class="kpi"><span>طلایی‌ها</span><b>${num(dist[2].v)}</b></div><div class="kpi"><span>کارت مهر</span><b>${num(hub.loyalty.stamps)}<small> نوشیدنی</small></b></div></div>
    <div class="cards g2">
    <section class="card"><div class="card-h"><h3>کارت مهر</h3></div>
      <p class="small">چند تا نوشیدنی بخره تا یکی مجانی بشه. عوضش کنی همون لحظه تو اپ عوض می‌شه.</p>
      <div style="margin-top:14px"><div class="seg big" id="stampseg"><span class="seg-thumb"></span>${[6, 8, 10].map((n) => `<button type="button" data-v="${n}" aria-pressed="${hub.loyalty.stamps === n}"><span>${num(n)} مهر</span></button>`).join("")}</div></div>
      <div class="group" style="margin-top:16px"><div class="row plain"><span class="row-main"><span class="row-t">امتیاز</span><span class="row-s">هر ۱۰ هزار تومان ۱ امتیاز – هر بار اومدن ۱۵ – هر دعوت ۱۰۰</span></span></div></div>
    </section>
    <section class="card"><div class="card-h"><h3>اعضا تو هر سطح</h3></div>${barsH(dist)}
      <div class="tiers mini">${TIERS.map((t) => `<div class="tier" style="--tier:${t.color}"><div class="tier-top"><span class="tier-dot"></span><b>${esc(loc(t))}</b><span class="tiny">${t.min ? `از ${num(t.min)} امتیاز` : "شروع"}</span></div><ul>${t.perks_fa.slice(0, 3).map((p) => `<li>${icon("check")}${esc(p)}</li>`).join("")}</ul></div>`).join("")}</div>
    </section></div>`;
}
const sum0 = (a, f) => a.reduce((s, x) => s + f(x), 0);

function eventsSec() {
  const tix = appState().tickets;
  return `<div class="cards g2">${EVENTS.map((e) => { const mine = tix.filter((t) => t.event === e.id).reduce((s, t) => s + t.seats, 0); const taken = e.taken + mine; const d = dayFromToday(e.day, e.time); return `
    <section class="card ev-adm" style="--h:${e.hue}"><div class="card-h"><h3>${esc(loc(e, "title"))}</h3><span class="tiny">${esc(relDay(d))} – ${hhmm(e.time)}</span></div>
      <p class="small">${esc(loc(branch(e.branch)))} – ${esc(loc(e, "kind"))} – ${e.price ? money(e.price) : "رایگان"}</p>
      <div class="seats big"><i style="--w:${(taken / e.seats) * 100}%"></i></div>
      <div class="auto-s"><span><b>${num(taken)}/${num(e.seats)}</b>رزرو شده</span><span><b>${kmoney(taken * e.price)}</b>فروش بلیت</span>${mine ? `<span><b>${num(mine)}</b>از همین گوشی</span>` : ""}</div>
    </section>`; }).join("")}</div>`;
}

let rf = "all";
function reviews() {
  const appR = appState().orders.filter((o) => o.rating).map((o) => ({ id: o.id, rating: o.rating, text_fa: (o.tags || []).join(" – ") || "—", app: true, name: o.customer?.name || "", at: o.at, branch: o.branch }));
  const rep = getHub().replies;
  const all = [...appR, ...S.reviews.map((r) => ({ ...r, name: loc(cust(r.customer)) || "مهمون" }))].filter((r) => inScope(r.branch)).sort((a, b) => b.at - a.at);
  const list = all.filter((r) => rf === "all" || (rf === "bad" ? r.rating <= 2 : !rep[r.id]));
  const avg = all.reduce((s, r) => s + r.rating, 0) / (all.length || 1);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ l: "★".repeat(n), v: all.filter((r) => r.rating === n).length, c: n >= 4 ? "#3C9560" : n === 3 ? "#C9A57C" : "#B4392F" }));
  return `<div class="cards g2"><section class="card"><div class="card-h"><h3>میانگین امتیاز</h3></div><div class="big-num">${digits(avg.toFixed(1)).replace(".", "٫")}<small>از ${digits(5)}</small></div>${barsH(dist)}</section>
    <section class="card"><div class="card-h"><h3>تازه‌ترین‌ها</h3><div class="chips-row tight">${[["all", "همه"], ["bad", "بدها"], ["open", "بی‌جواب"]].map(([k, t]) => `<button class="chip sm" data-rf="${k}" aria-pressed="${rf === k}">${t}</button>`).join("")}</div></div><div class="rlist">${list.slice(0, 14).map((r) => `<div class="rv-i"><div class="rv-top"><span class="stars">${"★".repeat(r.rating)}<i>${"★".repeat(5 - r.rating)}</i></span><b>${esc(r.name)}</b>${r.app ? `<span class="app-pill">از اپ</span>` : ""}<span class="tiny">${ago(r.at)} – ${esc(loc(branch(r.branch)))}</span></div><p>${esc(r.text_fa)}</p>${rep[r.id] ? `<p class="reply">${icon("send")}${esc(rep[r.id])}</p>` : `<button class="link sm" data-reply="${r.id}" data-bad="${r.rating <= 2 ? 1 : ""}">جواب بده</button>`}</div>`).join("") || `<p class="small muted-empty">چیزی نیست 👌</p>`}</div></section></div>`;
}

/* ---------------------------------------------------------------- shell */
const VIEWS = { orders: orderBoard, menu: menuSec, campaigns, automations, loyalty, events: eventsSec, reviews, ...CEO, ...OPS, ...CRM, ...MORE,
  tasks: () => annCard() + OPS.tasks(), branches: () => CEO.branches() + compareCard(), ...EXTRA };
function shell() {
  document.body.innerHTML = `
  <div class="adm" id="adm">
    <aside class="side" id="side">
      <div class="side-top"><a class="side-logo" href="index.html">${LOCKUP}</a><span class="side-k">پنل مدیرعامل</span><button class="icon-btn sm side-col" id="side-col" aria-label="جمع کردن منو" data-tip="جمع کردن منو  [">${icon("back")}</button></div>
      <nav class="side-nav">${GROUPS.map(([g, s]) => `<p class="nav-g">${g}</p>${s.map(([k, ic, t]) => `<button class="nav-i" data-sec="${k}" data-tip="${t}" aria-current="${A.section === k}">${icon(ic)}<span>${t}</span>${k === "orders" ? `<i class="nav-badge" id="nb"></i>` : k === "alerts" ? `<i class="nav-badge warn" id="nb-al"></i>` : ""}</button>`).join("")}`).join("")}</nav>
      <div class="side-foot">
        <select id="scope" aria-label="شعبه"><option value="all">همه‌ی شعبه‌ها</option>${BRANCHES.map((b) => `<option value="${b.id}" ${A.scope === b.id ? "selected" : ""}>${esc(loc(b))}</option>`).join("")}</select>
        <div class="side-row"><button class="icon-btn" id="theme" aria-label="تم">${icon("moon")}</button><a class="icon-btn" href="index.html" aria-label="باز کردن اپ">${icon("coffee")}</a><button class="icon-btn" id="logout" aria-label="خروج">${icon("out")}</button></div>
        <a class="alpha-sig" href="https://alphaa.agency" target="_blank" rel="noopener" dir="ltr" lang="en"><span>Powered by Alpha Agency</span><img class="sig-light" src="assets/brand/alpha-black.png" alt="Alpha Agency" width="48"><img class="sig-dark" src="assets/brand/alpha-white.png" alt="Alpha Agency" width="48"></a>
      </div>
    </aside>
    <div class="scrim-side" id="scrim-side"></div>
    <main class="amain">
      <header class="ahead"><button class="icon-btn menu-btn" id="menu-btn" aria-label="منو">${icon("grid")}</button><div class="ah-t"><p class="eyebrow" id="a-eyebrow"></p><h1 id="a-title"></h1></div><span class="live-dot" id="live-dot" hidden><span class="dot pulse"></span>زنده</span>
        <div class="ah-acts"><button class="ah-search" id="ah-search" aria-label="جست‌وجو">${icon("search")}<span>جست‌وجو…</span><kbd dir="ltr">⌘K</kbd></button><button class="icon-btn ah-bell" id="ah-bell" aria-label="هشدارها" data-tip="هشدارها">${icon("bell")}<i id="ah-bd"></i></button></div></header>
      <p class="small sec-lead" id="a-lead" hidden></p>
      <div id="sec" class="sec-body" tabindex="-1"></div>
    </main>
  </div>
  <div id="print-root" aria-hidden="true"></div>
  <div id="sheet-root"></div><div id="toast-root" aria-live="polite"></div>`;
  $$(".nav-i").forEach((b) => b.addEventListener("click", () => go(b.dataset.sec)));
  $("#scope").addEventListener("change", (e) => { setA({ scope: e.target.value }); render(); });
  $("#theme").addEventListener("click", () => { const d = document.documentElement.dataset.mode === "dark"; applyTheme(d ? "light" : "dark", true); try { const s = JSON.parse(localStorage.getItem("conpanna.v1") || "{}"); s.theme = d ? "light" : "dark"; localStorage.setItem("conpanna.v1", JSON.stringify(s)); } catch (e) {} });
  $("#logout").addEventListener("click", () => { setA({ authed: false }); login(); });
  $("#menu-btn").addEventListener("click", () => $("#adm").classList.toggle("nav-open"));
  $("#side-col").addEventListener("click", toggleSide);
  $("#ah-search").addEventListener("click", openPalette);
  $("#ah-bell").addEventListener("click", (e) => openBell(e.currentTarget));
  sortable($("#sec"));
  applyUi();
  $("#scrim-side").addEventListener("click", () => $("#adm").classList.remove("nav-open"));
}
function go(sec) { if (!VIEWS[sec]) sec = "overview"; setA({ section: sec }); $("#adm").classList.remove("nav-open"); render(); scrollTo(0, 0); $("#sec")?.focus({ preventScroll: true }); }

let shown = "";
const skel = () => `<div class="kpis k4">${'<div class="kpi sk-card"><i class="sk w40"></i><i class="sk w70 h24"></i><i class="sk w55"></i></div>'.repeat(4)}</div><div class="cards g2">${'<section class="card sk-card"><i class="sk w30"></i><i class="sk h160"></i><i class="sk w55"></i></section>'.repeat(2)}</div>`;
function render() {
  if (!A.authed) return;
  const el = $("#sec"); if (!el) return;
  if (!VIEWS[A.section]) A.section = "overview";
  const t = A.section === "customer" ? crmTitle() : ["item", "person", "branch"].includes(A.section) ? extraTitle(A.section) : SECTIONS.find((s) => s[0] === A.section)[2];
  $("#a-title").textContent = t;
  document.title = `${t} · پنل کن‌پانا`;
  $("#a-eyebrow").textContent = `${A.scope === "all" ? "همه‌ی شعبه‌ها" : loc(branch(A.scope))} – ${fmtDay(new Date())}`;
  $("#a-lead").hidden = !LEAD[A.section]; $("#a-lead").textContent = LEAD[A.section] || "";
  $$(".nav-i").forEach((b) => b.setAttribute("aria-current", b.dataset.sec === A.section));
  const live = boardOrders().filter((o) => o.status === "new").length;
  $("#nb").textContent = live ? digits(live) : ""; $("#nb").classList.toggle("on", !!live);
  const al = alerts().filter((a) => a.k !== "info").length;
  $("#nb-al").textContent = al ? digits(al) : ""; $("#nb-al").classList.toggle("on", !!al);
  $("#ah-bd").classList.toggle("on", !!al);
  $("#live-dot").hidden = !A.live;
  $$(".nav-i").forEach((b) => b.toggleAttribute("data-near", b.dataset.sec === "customers" && A.section === "customer"));
  const key = A.section + "|" + ({ customer: A.cid, item: A.iid, person: A.pid, branch: A.bid }[A.section] || "");
  if (key === shown) { const y = scrollY; el.innerHTML = VIEWS[A.section](); scrollTo(0, y); wire(el); return; }
  // a new section: show its outline at once, then fill it in
  shown = key;
  el.classList.remove("sec-in");
  el.innerHTML = skel();
  requestAnimationFrame(() => setTimeout(() => {
    if (shown !== key) return;
    el.innerHTML = VIEWS[A.section]();
    wire(el);
    void el.offsetWidth; el.classList.add("sec-in");
  }, 0));
}
function wire(el) {
  $$("[data-go]", el).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  $$("[data-csv]", el).forEach((b) => b.addEventListener("click", () => csvExport(b.dataset.csv)));
  $$("[data-adv]", el).forEach((b) => b.addEventListener("click", () => { const o = boardOrders().find((x) => x.id === b.dataset.adv); if (o) { advance(o); toast(`#${digits(o.code)} رفت مرحله‌ی بعد`, "check"); } }));
  $('input[name="live"]', el)?.addEventListener("change", (e) => { setA({ live: e.target.checked }); if (e.target.checked) { simOrder(); } render(); });
  $('input[name="auto"]', el)?.addEventListener("change", (e) => { setHub({ autoAdvance: e.target.checked }); });
  $("#sim", el)?.addEventListener("click", () => simOrder());
  $$("[data-price]", el).forEach((inp) => inp.addEventListener("change", () => { const v = +inp.value.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/\D/g, ""); const id = inp.dataset.price; if (!v) return; setHub((h) => ({ prices: { ...h.prices, [id]: v === item(id).price ? undefined : v } })); log(`قیمت ${item(id).name_fa} رو کرد ${num(v)} تومان`); toast("قیمت تو اپ هم عوض شد", "tag"); }));
  $$('input[name^="av-"]', el).forEach((inp) => inp.addEventListener("change", () => { const id = inp.name.slice(3); setHub((h) => ({ soldOut: inp.checked ? h.soldOut.filter((x) => x !== id) : [...h.soldOut, id] })); log(`${item(id).name_fa} رو ${inp.checked ? "دوباره موجود" : "«تموم شد»"} زد`); toast(inp.checked ? `${item(id).name_fa} دوباره موجود شد` : `${item(id).name_fa} تموم شد`, inp.checked ? "check" : "info"); }));
  $$("[data-rf]", el).forEach((b) => b.addEventListener("click", () => { rf = b.dataset.rf; render(); }));
  $$("[data-cust]", el).filter((b) => !b.closest("#crm-list")).forEach((b) => b.addEventListener("click", () => openCustomer(b.dataset.cust)));
  if (A.section === "campaigns") wireCampaigns(el);
  $$('input[name^="j-"]', el).forEach((inp) => inp.addEventListener("change", () => { const k = inp.name.slice(2); setHub((h) => ({ journeys: { ...h.journeys, [k]: inp.checked } })); render(); }));
  if ($("#stampseg", el)) segmented($("#stampseg", el), (v) => { setHub((h) => ({ loyalty: { ...h.loyalty, stamps: +v } })); log(`کارت مهر رو کرد ${num(+v)} تایی`); toast(`کارت مهر: ${num(+v)} نوشیدنی`, "coffee"); });
  $$("[data-pause]", el).forEach((b) => b.addEventListener("click", () => { setHub((h) => ({ paused: { ...h.paused, [b.dataset.pause]: Date.now() + +b.dataset.m * 60e3 } })); log(`سفارش آنلاین ${loc(branch(b.dataset.pause))} رو ${num(+b.dataset.m)} دقیقه نگه داشت`); toast("سفارش آنلاین نگه داشته شد", "pause"); render(); }));
  $$("[data-resume]", el).forEach((b) => b.addEventListener("click", () => { setHub((h) => ({ paused: { ...h.paused, [b.dataset.resume]: 0 } })); log(`سفارش آنلاین ${loc(branch(b.dataset.resume))} رو باز کرد`); toast("سفارش‌ها دوباره باز شد", "bolt"); render(); }));
  $$("[data-reply]", el).forEach((b) => b.addEventListener("click", () => {
    const txt = b.dataset.bad ? "ببخشید که این‌جوری شد 🙏 دفعه‌ی بعد مهمون ما باش؛ یه کوپن برات فرستادیم." : "مرسی که نوشتی! زود بیا دوباره ببینیمت ☕";
    sheet(`<h2>جواب</h2><textarea class="note-in" id="rp" rows="3" style="margin-top:14px">${txt}</textarea><button class="btn btn--block" id="rps" style="margin-top:14px">${icon("send")}بفرست</button>`, { label: "جواب", onMount(s) { $("#rps", s).addEventListener("click", () => { setHub((h) => ({ replies: { ...h.replies, [b.dataset.reply]: $("#rp", s).value } })); closeSheet(); log("به یه نظر جواب داد"); toast("جوابت رفت", "send"); render(); }); } });
  }));

  wireCeo(el);
  wireOps(el);
  wireCrm(el);
  wireMore(el);
  wireExtra(el);
}

/* ------------------------------------------------- small things, everywhere */
function applyUi() {
  document.body.classList.toggle("compact", !!A.compact);
  const h = $(".ahead"); if (h) document.documentElement.style.setProperty("--ahead-h", h.offsetHeight + "px");
  $("#adm")?.classList.toggle("collapsed", !!A.collapsed);
  const c = $("#side-col"); if (c) { c.setAttribute("aria-label", A.collapsed ? "باز کردن منو" : "جمع کردن منو"); c.dataset.tip = A.collapsed ? "باز کردن منو  [" : "جمع کردن منو  ["; }
}
function toggleSide() { setA({ collapsed: !A.collapsed }); applyUi(); if (A.section === "settings") render(); }
function resetAll() { A = { ...DEF(), authed: true, section: "overview" }; save(); memo = null; applyUi(); go("overview"); }

// click a column title to sort; numbers in Persian, with units, sort as numbers
function cellVal(t) {
  const s = t.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٬,]/g, "").replace(/٫/g, ".");
  const m = s.match(/[−-]?\d+(\.\d+)?/); if (!m) return t.trim();
  let v = parseFloat(m[0].replace("−", "-"));
  if (/میلیارد/.test(s)) v *= 1e9; else if (/میلیون/.test(s)) v *= 1e6; else if (/هزار/.test(s)) v *= 1e3;
  if (/کسری/.test(s)) v = -Math.abs(v);
  return v;
}
function sortable(root) {
  root.addEventListener("click", (e) => {
    const th = e.target.closest(".tbl thead th"); if (!th || !th.textContent.trim()) return;
    const table = th.closest("table"), tb = table.tBodies[0]; if (!tb || tb.rows.length < 2 || table.classList.contains("nosort")) return;
    const i = [...th.parentNode.children].indexOf(th);
    const dir = th.getAttribute("aria-sort") === "descending" ? "ascending" : "descending";
    $$("th", table).forEach((x) => x.removeAttribute("aria-sort")); th.setAttribute("aria-sort", dir);
    const rows = [...tb.rows].map((r) => [r, cellVal(r.cells[i]?.textContent || "")]);
    rows.sort((a, b) => { const c = typeof a[1] === "number" && typeof b[1] === "number" ? a[1] - b[1] : typeof a[1] === "number" ? -1 : typeof b[1] === "number" ? 1 : String(a[1]).localeCompare(String(b[1]), "fa"); return dir === "ascending" ? c : -c; });
    rows.forEach(([r]) => tb.appendChild(r));
    haptic(4);
  });
}

// one floating tooltip for anything with data-tip; chart parts follow the pointer
function tips() {
  const tip = document.createElement("div"); tip.className = "tipx"; tip.setAttribute("role", "tooltip");
  let cur = null, follow = false, hideT = 0;
  const place = (x, y, r) => {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = r ? r.left + r.width / 2 - w / 2 : x - w / 2, top = r ? r.top - h - 8 : y - h - 14;
    if (top < 6) top = r ? r.bottom + 8 : y + 18;
    tip.style.transform = `translate(${Math.round(Math.max(8, Math.min(innerWidth - w - 8, left)))}px, ${Math.round(top)}px)`;
  };
  const hide = () => { tip.classList.remove("on"); cur = null; };
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest?.("[data-tip]");
    if (t === cur) return;
    cur = t;
    if (!t || !t.dataset.tip || (t.classList.contains("nav-i") && !document.querySelector(".adm.collapsed"))) { tip.classList.remove("on"); return; }
    if (!tip.isConnected) document.body.appendChild(tip);
    tip.textContent = t.dataset.tip; tip.classList.add("on");
    follow = t instanceof SVGElement;
    follow ? place(e.clientX, e.clientY) : place(0, 0, t.getBoundingClientRect());
    clearTimeout(hideT); if (e.pointerType === "touch") hideT = setTimeout(hide, 1800);
  });
  document.addEventListener("pointermove", (e) => { if (cur && follow) place(e.clientX, e.clientY); }, { passive: true });
  addEventListener("scroll", hide, { passive: true, capture: true });
  addEventListener("pointerdown", (e) => { if (e.pointerType !== "touch") hide(); }, { passive: true });
}

addEventListener("resize", () => { const h = $(".ahead"); if (h) document.documentElement.style.setProperty("--ahead-h", h.offsetHeight + "px"); }, { passive: true });

// keys: ⌘K or / to search, [ for the sidebar, ? for help, G then a letter to jump
let gAt = 0;
addEventListener("keydown", (e) => {
  if (!A.authed || !$("#adm")) return;
  if ((e.metaKey || e.ctrlKey) && e.code === "KeyK") { e.preventDefault(); openPalette(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input,textarea,select,[contenteditable]")) return;
  if (document.querySelector(".sheet-wrap,.pal-wrap")) return;
  if (e.code === "Slash" && !e.shiftKey) { e.preventDefault(); openPalette(); }
  else if (e.code === "Slash" && e.shiftKey) helpSheet();
  else if (e.code === "BracketLeft" || e.code === "BracketRight") toggleSide();
  else if (e.code === "KeyG") gAt = Date.now();
  else if (Date.now() - gAt < 1000) { const to = { KeyO: "orders", KeyC: "customers", KeyD: "overview", KeyA: "alerts", KeyS: "sales", KeyF: "finance", KeyI: "inventory", KeyM: "marketing", KeyB: "brief", KeyL: "calendar", KeyP: "pricing" }[e.code]; gAt = 0; if (to) { e.preventDefault(); go(to); } }
});
// one printable pack for a meeting: dashboard, P&L and branches
function printPack() {
  const pr = $("#print-root");
  pr.innerHTML = `<div class="pr-head">${LOCKUP}<div><h1>گزارش مدیرعامل</h1><p class="small">${A.scope === "all" ? "همه‌ی شعبه‌ها" : esc(loc(branch(A.scope)))} – ${fmtDay(new Date())} – بازه‌ی ${num(A.period)} روز</p></div></div>
    <h2>داشبورد</h2>${CEO.overview()}<h2>سود و زیان</h2>${CEO.finance()}<h2>شعبه‌ها</h2>${CEO.branches()}`;
  document.body.classList.add("print-pack");
  const done = () => { document.body.classList.remove("print-pack"); pr.innerHTML = ""; removeEventListener("afterprint", done); };
  addEventListener("afterprint", done);
  setTimeout(() => { print(); setTimeout(done, 1500); }, 60);
}

function simOrder() {
  const c = S.customers[Math.floor(Math.random() * S.customers.length)];
  const pickM = () => MENU[Math.floor(Math.random() * MENU.length)];
  const lines = [pickM(), ...(Math.random() > .5 ? [pickM()] : [])].map((m) => ({ id: m.id, qty: 1, unit: m.price }));
  const dine = Math.random() < .35;
  const o = { id: "X" + Date.now(), src: "sim", code: String(100 + Math.floor(Math.random() * 900)), at: Date.now(), branch: A.scope === "all" ? c.branch : A.scope, customer: c.id, lines, mode: dine ? "dinein" : "takeaway", total: lines.reduce((s, l) => s + l.unit, 0), status: "new", table: dine ? String(1 + Math.floor(Math.random() * 20)) : "" };
  setA({ sims: [...A.sims.filter((x) => Date.now() - x.at < 6 * 3600e3), o].slice(-60) });
  ding(); toast(`سفارش تازه #${digits(o.code)}`, "receipt");
  render();
}

/* ---------------------------------------------------------------- login */
function login() {
  document.body.innerHTML = `<div class="login"><div class="login-card">
    <div class="lp-mark">${LOCKUP}</div><h1>پنل مدیرعامل</h1><p class="small">رمزت رو بزن</p>
    <div class="pin" id="pin" dir="ltr">${[0, 1, 2, 3].map(() => "<i></i>").join("")}</div>
    <div class="pad" dir="ltr">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k) => k === "" ? "<span></span>" : `<button type="button" data-k="${k}">${typeof k === "number" ? digits(k) : k}</button>`).join("")}</div>
    <p class="tiny">رمز نمونه: ۱۲۳۴</p>
    <a class="alpha-sig" href="https://alphaa.agency" target="_blank" rel="noopener" dir="ltr" lang="en"><span>Powered by Alpha Agency</span><img class="sig-light" src="assets/brand/alpha-black.png" alt="Alpha Agency" width="48"><img class="sig-dark" src="assets/brand/alpha-white.png" alt="Alpha Agency" width="48"></a>
  </div></div><div id="sheet-root"></div><div id="toast-root"></div>`;
  let v = "";
  const paint = () => $$("#pin i").forEach((d, i) => d.classList.toggle("on", i < v.length));
  const press = (k) => {
    if (k === "⌫") v = v.slice(0, -1); else if (v.length < 4) v += k;
    paint(); haptic(4);
    if (v.length === 4) {
      if (v === "1234") { setA({ authed: true }); setTimeout(() => { shell(); render(); }, 180); }
      else { $("#pin").classList.remove("bad"); void $("#pin").offsetWidth; $("#pin").classList.add("bad"); v = ""; setTimeout(paint, 300); }
    }
  };
  $$(".pad button").forEach((b) => b.addEventListener("click", () => press(String(b.dataset.k))));
  addEventListener("keydown", function onKey(e) { if (A.authed) { removeEventListener("keydown", onKey); return; } if (/^\d$/.test(e.key)) press(e.key); if (e.key === "Backspace") press("⌫"); });
}

/* ----------------------------------------------------------------- boot */
const ctx = { S, A: () => A, setA, render: () => render(), go, inScope, orders, boardOrders, log, stock, checklist, app: appState, printPack,
  cfg: () => cfg(), extraAlerts: () => extraAlerts(), setScope: (b) => { setA({ scope: b }); const sc = $("#scope"); if (sc) sc.value = b; render(); }, tv: () => tvMode(), sections: () => GROUPS.flatMap(([g, s]) => s.map((x) => [...x, g])), simOrder: () => simOrder(), toggleSide, csvExport, reset: resetAll, applyUi };
initCeo(ctx); initOps(ctx); initCrm(ctx); initMore(ctx); initExtra(ctx);
applyLang();
applyTheme();
tips();
netWatch();
if (A.authed) { shell(); render(); } else login();
let prevNew = boardOrders().filter((o) => o.status === "new").map((o) => o.id);
onHub(() => {
  if (!A.authed) return;
  const nowNew = boardOrders().filter((o) => o.status === "new").map((o) => o.id);
  if (nowNew.some((id) => !prevNew.includes(id))) { ding(); toast("سفارش تازه از اپ", "receipt"); }
  prevNew = nowNew;
  if (!document.querySelector(".sheet-wrap") && !document.activeElement?.matches?.("input,textarea,select")) render();
});
setInterval(() => {
  if (!A.authed) return;
  if (A.live && Math.random() < 1 / 30) simOrder();
  // in the demo, untouched simulated orders finish on their own after a while
  const st = { ...A.status }; let ch = false;
  A.sims.forEach((o) => { const s = st[o.id] || o.status; const age = (Date.now() - o.at) / 1000; if (A.live && s === "ready" && age > 240) { st[o.id] = "done"; ch = true; } });
  if (ch) { setA({ status: st }); render(); }
}, 1000);
