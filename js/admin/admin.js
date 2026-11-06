// The owner panel. One screen per job: today at a glance, the live order
// board, the menu, customers (CRM), campaigns, automations, loyalty rules,
// events, reviews and branches. It talks to the customer app through hub.js:
// on one device, an order placed in the app lands on the board instantly.
import { $, $$, esc, icon, money, sheet, closeSheet, toast, haptic, sw, seg, segmented, L, loc, num, digits, kmoney, ago, fmtTime, fmtDay, relDay, pct, openState, busy, busyLabel, dayFromToday, tile, art, hhmm } from "../ui.js";
import { applyLang, getLang } from "../i18n.js";
import { applyTheme } from "../theme.js";
import { getHub, setHub, onHub, ping } from "../hub.js";
import { get as appState } from "../store.js";
import { MENU, BRANCHES, CATEGORIES, EVENTS, TIERS } from "../data.js";
import { LOCKUP, MARK } from "../brand.js";
import { stageOf } from "../orders.js";
import { seed } from "./seed.js";

const KEY = "conpanna.admin.v1";
const DEF = () => ({ authed: false, live: false, status: {}, sims: [], notes: {}, tags: {}, campaigns: [], section: "overview", scope: "all" });
let A = DEF();
try { A = { ...DEF(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) {} };
const setA = (p) => { A = { ...A, ...p }; save(); };

const S = seed();
const item = (id) => MENU.find((m) => m.id === id);
const branch = (id) => BRANCHES.find((b) => b.id === id);
const cust = (id) => S.customers.find((c) => c.id === id);
const DAY = 864e5;
const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const kk = (n) => (n >= 1e6 ? kmoney(n) : n >= 1e4 ? digits(Math.round(n / 1000)) + L("K", " هزار") : num(n));
const inScope = (b) => A.scope === "all" || b === A.scope;

/* ------------------------------------------------------------ the data */
const STAT = ["new", "brewing", "ready", "done"];
function boardOrders() {
  const app = appState().orders.filter((o) => o.at > startOfDay() - DAY / 2).map((o) => {
    const st = stageOf(o);
    return { src: "app", id: o.id, code: o.code, at: o.at, branch: o.branch, name: o.customer?.name || L("App guest", "مهمان اپ"), lines: o.lines, mode: o.mode, total: o.total, status: STAT[Math.min(3, st)], table: o.table, note: o.note, pickup: o.pickup, addr: o.addr };
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
function allOrders() { // history (seed) + today's app orders, for numbers
  const app = appState().orders.map((o) => ({ at: o.at, branch: o.branch, total: o.total, lines: o.lines, mode: o.mode, customer: "APP", rating: o.rating }));
  const sims = A.sims.map((o) => ({ ...o }));
  return [...S.orders, ...sims, ...app].filter((o) => inScope(o.branch));
}
function segments() {
  const now = Date.now();
  const cs = S.customers.filter((c) => inScope(c.branch));
  const tierOf = (p) => [...TIERS].reverse().find((t) => p >= t.min);
  const m = new Date().getMonth();
  return {
    all: { n: L("Everyone", "همه"), f: () => true },
    vip: { n: L("Gold Panna", "پانا طلایی"), f: (c) => tierOf(c.points).id === "gold" },
    regular: { n: L("Regulars", "مشتریان ثابت"), f: (c) => c.visits >= 8 && now - c.last < 21 * DAY },
    new: { n: L("New (14 days)", "جدید (۱۴ روز)"), f: (c) => now - c.joined < 14 * DAY },
    risk: { n: L("At risk", "در خطر رفتن"), f: (c) => now - c.last > 21 * DAY && c.visits >= 3 },
    bday: { n: L("Birthdays this month", "متولدین این ماه"), f: (c) => c.bmonth === m },
    list: cs,
    tierOf,
  };
}

/* ----------------------------------------------------------------- sound */
let actx = null;
function ding() {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, actx.currentTime + i * 0.14); g.gain.exponentialRampToValueAtTime(0.18, actx.currentTime + i * 0.14 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i * 0.14 + 0.45); o.connect(g).connect(actx.destination); o.start(actx.currentTime + i * 0.14); o.stop(actx.currentTime + i * 0.14 + 0.5); });
  } catch (e) {}
}

/* ------------------------------------------------------------- charts */
function areaChart(vals, labels, { h = 240, fmt = kmoney } = {}) {
  const w = 1000, pad = 30, max = Math.max(...vals) * 1.12 || 1;
  const rtl = getLang() === "fa";
  const x = (i) => { const v = pad + (i * (w - pad * 2)) / (vals.length - 1); return rtl ? w - v : v; }, y = (v) => h - 26 - (v / max) * (h - 46);
  const pts = vals.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="chart">
    <defs><linearGradient id="ag" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--caramel)" stop-opacity=".45"/><stop offset="1" stop-color="var(--caramel)" stop-opacity="0"/></linearGradient></defs>
    ${[0.25, 0.5, 0.75, 1].map((f) => `<line x1="${pad}" x2="${w - pad}" y1="${y(max * f / 1.12)}" y2="${y(max * f / 1.12)}" class="grid"/>`).join("")}
    <path d="${line}L${x(vals.length - 1)} ${h - 26}L${x(0)} ${h - 26}Z" fill="url(#ag)"/>
    <path d="${line}" class="ln"/>
    ${pts.map((p, i) => `<g class="pt"><circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 5 : 3}"/><title>${labels[i]}: ${fmt(vals[i])}</title></g>`).join("")}
    ${labels.map((l, i) => (i % 2 === (labels.length - 1) % 2 ? `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${l}</text>` : "")).join("")}
  </svg>`;
}
function bars(rows, { max } = {}) {
  const m = max || Math.max(...rows.map((r) => r.v)) || 1;
  return `<div class="hbars">${rows.map((r) => `<div class="hb"><span class="hb-l">${r.l}</span><span class="hb-t"><i style="--w:${(r.v / m) * 100}%;${r.c ? `--c:${r.c}` : ""}"></i></span><span class="hb-v">${r.f || num(r.v)}</span></div>`).join("")}</div>`;
}
function donut(parts) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1; let acc = 0;
  const C = 2 * Math.PI * 40;
  return `<div class="donut"><svg viewBox="0 0 100 100">${parts.map((p) => { const d = (p.v / tot) * C; const s = `<circle cx="50" cy="50" r="40" stroke="${p.c}" stroke-dasharray="${d} ${C - d}" stroke-dashoffset="${-acc}"/>`; acc += d; return s; }).join("")}</svg>
    <div class="donut-l">${parts.map((p) => `<span><i style="background:${p.c}"></i>${p.l}<b>${pct(Math.round((p.v / tot) * 100))}</b></span>`).join("")}</div></div>`;
}
function hourBars(today, avg) {
  const hrs = Array.from({ length: 16 }, (_, i) => i + 8), m = Math.max(...hrs.map((h) => Math.max(today[h] || 0, avg[h] || 0))) || 1, nowH = new Date().getHours();
  return `<div class="hours">${hrs.map((h) => `<div class="hr ${h === nowH ? "now" : ""}"><span class="hr-avg" style="--h:${((avg[h] || 0) / m).toFixed(3)}"></span><span class="hr-t" style="--h:${((today[h] || 0) / m).toFixed(3)}"></span><small>${digits(h)}</small></div>`).join("")}</div>`;
}

/* ------------------------------------------------------------- sections */
const SECTIONS = [
  ["overview", "chart", ["Overview", "داشبورد"]],
  ["orders", "receipt", ["Live orders", "سفارش‌های زنده"]],
  ["menu", "menu", ["Menu", "منو"]],
  ["customers", "users", ["Customers", "مشتریان"]],
  ["campaigns", "mega", ["Campaigns", "کمپین‌ها"]],
  ["automations", "bolt", ["Automations", "خودکارسازی"]],
  ["loyalty", "crown", ["Loyalty", "باشگاه مشتریان"]],
  ["events", "events", ["Events", "رویدادها"]],
  ["reviews", "star", ["Reviews", "نظرات"]],
  ["branches", "pin", ["Branches", "شعبه‌ها"]],
];

function overview() {
  const all = allOrders(), t0 = startOfDay(), y0 = t0 - DAY;
  const today = all.filter((o) => o.at >= t0), yest = all.filter((o) => o.at >= y0 && o.at < t0 && o.at < Date.now() - DAY + 1);
  const yFull = all.filter((o) => o.at >= y0 && o.at < t0);
  const sum = (a) => a.reduce((s, o) => s + o.total, 0);
  const rev = sum(today), revY = sum(yest), ord = today.length, ordY = yest.length;
  const avg = ord ? rev / ord : 0, avgY = ordY ? revY / ordY : 0;
  const seg = segments();
  const newM = seg.list.filter((c) => Date.now() - c.joined < 7 * DAY).length + (appState().user && Date.now() - appState().user.since < 7 * DAY ? 1 : 0);
  const rated = all.filter((o) => o.rating), rating = rated.length ? rated.reduce((s, o) => s + o.rating, 0) / rated.length : 0;
  const delta = (a, b) => { if (!b) return ""; const d = Math.round(((a - b) / b) * 100); return `<span class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${pct(Math.abs(d))}</span>`; };
  const days = Array.from({ length: 14 }, (_, i) => t0 - (13 - i) * DAY);
  const revDays = days.map((d) => sum(all.filter((o) => o.at >= d && o.at < d + DAY)));
  const hoursT = {}, hoursA = {};
  today.forEach((o) => { const h = new Date(o.at).getHours(); hoursT[h] = (hoursT[h] || 0) + 1; });
  all.filter((o) => o.at < t0 && o.at > t0 - 7 * DAY).forEach((o) => { const h = new Date(o.at).getHours(); hoursA[h] = (hoursA[h] || 0) + 1 / 7; });
  const itemCount = {}; all.filter((o) => o.at > t0 - 7 * DAY).forEach((o) => o.lines.forEach((l) => { itemCount[l.id] = (itemCount[l.id] || 0) + l.qty; }));
  const top = Object.entries(itemCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const mix = { takeaway: 0, delivery: 0, dinein: 0 }; all.filter((o) => o.at > t0 - 7 * DAY).forEach((o) => { mix[o.mode] = (mix[o.mode] || 0) + 1; });
  const brRev = BRANCHES.filter((b) => inScope(b.id)).map((b) => ({ l: esc(loc(b)), v: sum(today.filter((o) => o.branch === b.id)), f: kmoney(sum(today.filter((o) => o.branch === b.id))) }));
  const live = boardOrders().filter((o) => o.status !== "done");
  return `
    <div class="kpis">
      <div class="kpi"><span>${L("Revenue today", "فروش امروز")}</span><b>${kmoney(rev)}<small> ${L("T", "تومان")}</small></b>${delta(rev, revY)}<em>${L("vs same time yesterday", "نسبت به همین ساعت دیروز")}</em></div>
      <div class="kpi"><span>${L("Orders", "سفارش‌ها")}</span><b>${num(ord)}</b>${delta(ord, ordY)}<em>${L(`${live.length} in progress now`, `${num(live.length)} سفارش در جریان`)}</em></div>
      <div class="kpi"><span>${L("Average ticket", "میانگین سفارش")}</span><b>${kk(avg)}<small> ${L("T", "تومان")}</small></b>${delta(avg, avgY)}<em>${L("per order", "به ازای هر سفارش")}</em></div>
      <div class="kpi"><span>${L("New members – 7 days", "عضو جدید – ۷ روز")}</span><b>${num(newM)}</b><em>${L(`${num(seg.list.length)} members in total`, `${num(seg.list.length)} عضو در مجموع`)}</em></div>
      <div class="kpi"><span>${L("Rating", "امتیاز مشتریان")}</span><b>${digits(rating.toFixed(1))}<small> / ${digits(5)}</small></b><em>${L(`${num(rated.length)} ratings`, `${num(rated.length)} امتیاز`)}</em></div>
    </div>
    <div class="cards g2">
      <section class="card wide"><div class="card-h"><h3>${L("Revenue – 14 days", "فروش – ۱۴ روز")}</h3><span class="tiny">${L("Toman", "تومان")} – ${kmoney(sum(all.filter((o) => o.at > t0 - 13 * DAY)))}</span></div>${areaChart(revDays, days.map((d) => digits(new Intl.DateTimeFormat(getLang() === "fa" ? "fa-IR-u-ca-persian" : "en-GB", { day: "numeric" }).format(d))))}</section>
      <section class="card"><div class="card-h"><h3>${L("Orders by hour", "سفارش در ساعت‌های روز")}</h3><span class="tiny legend"><i class="lg-t"></i>${L("Today", "امروز")} <i class="lg-a"></i>${L("7-day avg", "میانگین ۷ روز")}</span></div>${hourBars(hoursT, hoursA)}</section>
      <section class="card"><div class="card-h"><h3>${L("How they order – 7 days", "نحوه‌ی سفارش – ۷ روز")}</h3></div>${donut([{ l: L("Takeaway", "بیرون‌بر"), v: mix.takeaway, c: "#45281A" }, { l: L("Delivery", "ارسال"), v: mix.delivery, c: "#C9A57C" }, { l: L("Dine-in", "سالن"), v: mix.dinein, c: "#8A5634" }])}</section>
      <section class="card"><div class="card-h"><h3>${L("Best sellers – 7 days", "پرفروش‌ها – ۷ روز")}</h3></div>${bars(top.map(([id, v]) => ({ l: esc(loc(item(id))), v })))}</section>
      <section class="card"><div class="card-h"><h3>${L("Branches today", "شعبه‌ها امروز")}</h3></div>${bars(brRev, {})}</section>
    </div>
    <section class="card"><div class="card-h"><h3>${L("Happening now", "همین حالا")}</h3><button class="btn btn--sm btn--soft" data-go="orders">${L("Open board", "باز کردن بورد")}</button></div>
      <div class="feed">${live.slice(-5).reverse().map((o) => `<div class="feed-i"><span class="st st-${o.status}"></span><b>#${digits(o.code)}</b><span>${esc(o.name)} – ${esc(loc(branch(o.branch)))}</span><span class="tiny">${ago(o.at)}</span></div>`).join("") || `<p class="small">${L("No orders in progress.", "سفارشی در جریان نیست.")}</p>`}</div></section>
    <p class="tiny demo-note">${L("Demo data for the preview, plus everything done in the customer app on this device.", "داده‌ی نمونه برای پیش‌نمایش، به‌علاوه‌ی هر کاری که در اپ مشتری روی همین دستگاه انجام شود.")}</p>`;
}

function orders() {
  const list = boardOrders();
  const cols = [["new", L("New", "جدید")], ["brewing", L("Brewing", "در حال آماده‌سازی")], ["ready", L("Ready / on the way", "آماده / در راه")], ["done", L("Done today", "تحویل‌شده امروز")]];
  const card = (o) => {
    const late = o.status !== "done" && Date.now() - o.at > 15 * 60e3;
    const next = { new: L("Accept", "پذیرش"), brewing: o.mode === "delivery" ? L("Send out", "ارسال شد") : L("Ready", "آماده شد"), ready: o.mode === "delivery" ? L("Delivered", "تحویل شد") : L("Collected", "تحویل گرفت") }[o.status];
    return `<article class="oc ${o.src === "app" ? "from-app" : ""} ${late ? "late" : ""}" data-id="${o.id}">
      <header><b>#${digits(o.code)}</b><span class="oc-mode">${icon(o.mode === "delivery" ? "scooter" : o.mode === "dinein" ? "table" : "takeaway")}${o.mode === "delivery" ? L("Delivery", "ارسال") : o.mode === "dinein" ? L("Table", "میز") + (o.table ? " " + digits(o.table) : "") : L("Takeaway", "بیرون‌بر")}${o.table && o.mode !== "dinein" ? ` – ${L("table", "میز")} ${digits(o.table)}` : ""}</span><span class="tiny">${ago(o.at)}</span></header>
      <div class="oc-who">${esc(o.name)}${o.src === "app" ? `<span class="app-pill">${L("from the app", "از اپ")}</span>` : ""} – <span class="tiny">${esc(loc(branch(o.branch)))}</span></div>
      <ul>${o.lines.map((l) => `<li><b>${num(l.qty)}×</b> ${esc(loc(item(l.id)) || l.name)}${l.opts ? `<span class="tiny"> – ${esc(l.opts)}</span>` : ""}</li>`).join("")}</ul>
      ${o.note ? `<p class="oc-note">${icon("note")}${esc(o.note)}</p>` : ""}
      <footer>${money(o.total)}${next ? `<button class="btn btn--sm" data-adv="${o.id}">${next}${icon("chev", "chev")}</button>` : `<span class="tiny">${icon("check")}</span>`}</footer>
    </article>`;
  };
  const seedDone = S.orders.filter((o) => o.at > startOfDay() && inScope(o.branch)).slice(-6).map((o) => ({ ...o, src: "seed", name: loc(cust(o.customer)) }));
  const doneToday = [...seedDone, ...list.filter((o) => o.status === "done" && o.at > startOfDay())].sort((a, b) => a.at - b.at).slice(-5).reverse();
  return `
    <div class="board-bar">
      <label class="tgl">${sw("live", A.live, "")}<span><b>${L("Live demo", "دموی زنده")}</b><span class="tiny">${L("New orders arrive every ~30 s", "هر ~۳۰ ثانیه یک سفارش تازه")}</span></span></label>
      <label class="tgl">${sw("auto", getHub().autoAdvance, "")}<span><b>${L("Auto-advance app orders", "جلو بردن خودکار سفارش‌های اپ")}</b><span class="tiny">${L("Off: you move them yourself", "خاموش: خودتان جلو می‌برید")}</span></span></label>
      <button class="btn btn--sm btn--soft" id="sim">${icon("plus")}${L("Simulate an order", "شبیه‌سازی سفارش")}</button>
    </div>
    <div class="board">${cols.map(([k, t]) => { const items = k === "done" ? doneToday : list.filter((o) => o.status === k); return `<section class="col col-${k}"><h3><span class="st st-${k}"></span>${t}<span class="cnt">${num(items.length)}</span></h3>${items.map(card).join("") || `<div class="col-empty">${L("Nothing here", "خالی")}</div>`}</section>`; }).join("")}</div>
    <p class="tiny demo-note">${L("Orders placed in the customer app on this device appear here instantly, marked “from the app”. Move them and the customer sees it — with a notification.", "سفارش‌هایی که در اپ مشتری روی همین دستگاه ثبت شوند فوراً اینجا با برچسب «از اپ» می‌آیند. جلو ببرید تا مشتری همان لحظه با اعلان ببیند.")}</p>`;
}

function menuSec() {
  const hub = getHub(), t0 = startOfDay();
  const sold = {}; allOrders().filter((o) => o.at >= t0).forEach((o) => o.lines.forEach((l) => { sold[l.id] = (sold[l.id] || 0) + l.qty; }));
  return `<p class="small sec-lead">${L("Switch an item off and it shows as sold out in the app straight away. Edit a price and the app updates.", "هر آیتمی را خاموش کنید، فوراً در اپ «تمام شد» نشان داده می‌شود. قیمت را تغییر دهید تا اپ هم به‌روز شود.")}</p>
    ${CATEGORIES.map((c) => `<section class="card"><div class="card-h"><h3>${esc(loc(c))}</h3></div><div class="mlist">${MENU.filter((m) => m.cat === c.id).map((m) => `
      <div class="mrow ${hub.soldOut.includes(m.id) ? "off" : ""}">${tile(m, "sm")}<span class="row-main"><span class="row-t">${esc(loc(m))}</span><span class="row-s">${L(`${num(sold[m.id] || 0)} sold today`, `${num(sold[m.id] || 0)} فروش امروز`)}${hub.prices[m.id] != null ? ` – <span class="link">${L("price edited", "قیمت تغییر کرده")}</span>` : ""}</span></span>
        <label class="price-in"><input type="text" inputmode="numeric" data-price="${m.id}" value="${num(hub.prices[m.id] ?? m.price)}" aria-label="${L("Price", "قیمت")}"><small>${L("T", "تومان")}</small></label>
        <label class="avail">${sw("av-" + m.id, !hub.soldOut.includes(m.id), "")}<span class="tiny">${hub.soldOut.includes(m.id) ? L("Sold out", "تمام شد") : L("Available", "موجود")}</span></label>
      </div>`).join("")}</div></section>`).join("")}`;
}

let cq = "", cseg = "all";
function customers() {
  const seg = segments();
  const me = appState().user;
  const keys = ["all", "vip", "regular", "new", "risk", "bday"];
  const rows = seg.list.filter(seg[cseg].f).filter((c) => !cq || (c.name + c.name_fa + c.phone).toLowerCase().includes(cq.toLowerCase())).sort((a, b) => b.spend - a.spend);
  return `
    <div class="seg-chips">${keys.map((k) => `<button class="chip" data-cseg="${k}" aria-pressed="${cseg === k}">${seg[k].n}<span class="n">${num(seg.list.filter(seg[k].f).length)}</span></button>`).join("")}</div>
    <div class="cbar"><div class="search"><span>${icon("search")}</span><input id="cq" type="search" value="${esc(cq)}" placeholder="${L("Name or phone", "نام یا شماره")}"></div><button class="btn btn--sm btn--soft" id="csv">${icon("dl")}${L("Export CSV", "خروجی CSV")}</button><button class="btn btn--sm" data-go="campaigns">${icon("mega")}${L("Message this group", "پیام به این گروه")}</button></div>
    ${me ? `<button class="crow me-row" data-cust="APP"><span class="cav">${esc(me.name[0])}</span><span class="row-main"><span class="row-t">${esc(me.name)} <span class="app-pill">${L("this phone – live", "همین گوشی – زنده")}</span></span><span class="row-s" dir="ltr">${digits(me.phone)}</span></span><span class="c-num">${num(appState().orders.length)}<small>${L("orders", "سفارش")}</small></span><span class="c-num">${num(appState().points)}<small>${L("points", "امتیاز")}</small></span>${icon("chev", "chev")}</button>` : ""}
    <div class="clist">${rows.slice(0, 60).map((c) => { const t = seg.tierOf(c.points); const days = Math.floor((Date.now() - c.last) / DAY); return `
      <button class="crow" data-cust="${c.id}"><span class="cav" style="--tier:${t.color}">${esc(loc(c)[0])}</span>
        <span class="row-main"><span class="row-t">${esc(loc(c))} <span class="tier-pill" style="--tier:${t.color}">${esc(loc(t))}</span></span><span class="row-s">${esc(loc(branch(c.branch)))} – ${L("last visit", "آخرین بازدید")} ${days ? L(`${days} d ago`, `${num(days)} روز پیش`) : L("today", "امروز")}${(A.tags[c.id] || c.tags).map((tg) => ` – <span class="ctag">${esc(Array.isArray(tg) ? L(tg[0], tg[1]) : tg)}</span>`).join("")}</span></span>
        <span class="c-num cv">${num(c.visits)}<small>${L("visits", "بازدید")}</small></span><span class="c-num">${kmoney(c.spend)}<small>${L("spent", "خرید")}</small></span>${icon("chev", "chev")}</button>`; }).join("")}</div>
    ${rows.length > 60 ? `<p class="tiny demo-note">${L(`Showing 60 of ${rows.length}`, `نمایش ۶۰ از ${num(rows.length)}`)}</p>` : ""}`;
}
function customerSheet(id) {
  const seg = segments();
  if (id === "APP") {
    const s = appState(), u = s.user;
    sheet(`<div class="cs-head"><span class="cav lg">${esc(u.name[0])}</span><div><h2>${esc(u.name)}</h2><p class="small" dir="ltr">${digits(u.phone)}</p></div></div>
      <div class="kpis sm"><div class="kpi"><span>${L("Points", "امتیاز")}</span><b>${num(s.points)}</b></div><div class="kpi"><span>${L("Stamps", "مهر")}</span><b>${num(s.stamps)}</b></div><div class="kpi"><span>${L("Orders", "سفارش")}</span><b>${num(s.orders.length)}</b></div></div>
      <p class="group-label">${L("Quick actions — they reach the app on this device", "اقدام سریع — روی اپ همین دستگاه اعمال می‌شود")}</p>
      <div class="act-grid"><button class="btn btn--soft" data-act="stamps">${icon("coffee")}${L("Gift 2 stamps", "هدیه‌ی ۲ مهر")}</button><button class="btn btn--soft" data-act="voucher">${icon("tag")}${L("Send 15% voucher", "ارسال کوپن ٪۱۵")}</button><button class="btn btn--soft" data-act="points">${icon("crown")}${L("Add 300 points", "افزودن ۳۰۰ امتیاز")}</button></div>`, { label: u.name, onMount(b) {
      $$("[data-act]", b).forEach((x) => x.addEventListener("click", () => {
        const a = x.dataset.act;
        const bc = { id: "B" + Date.now(), at: Date.now(), to: "me",
          title: a === "stamps" ? "2 stamps from Conpanna ☕" : a === "points" ? "300 bonus points" : "A 15% voucher for you", title_fa: a === "stamps" ? "۲ مهر هدیه از کن‌پانا ☕" : a === "points" ? "۳۰۰ امتیاز هدیه" : "یک کوپن ٪۱۵ برای شما",
          body: "Thanks for being a regular.", body_fa: "ممنون که همیشه به ما سر می‌زنید.",
          ...(a === "stamps" ? { stamps: 2 } : a === "points" ? { points: 300 } : { offer: { kind: "pct", value: 0.15, title: "15% off — from the team", title_fa: "٪۱۵ تخفیف — از طرف تیم" }, code: "THANKS15" }) };
        setHub((h) => ({ broadcasts: [...h.broadcasts, bc].slice(-40) }));
        toast(L("Sent — check the app", "ارسال شد؛ اپ را ببینید"), "send"); haptic(10);
      }));
    } });
    return;
  }
  const c = cust(id); const t = seg.tierOf(c.points);
  const hist = S.orders.filter((o) => o.customer === id).slice(-6).reverse();
  const favs = {}; S.orders.filter((o) => o.customer === id).forEach((o) => o.lines.forEach((l) => { favs[l.id] = (favs[l.id] || 0) + l.qty; }));
  const favTop = Object.entries(favs).sort((a, b) => b[1] - a[1]).slice(0, 3);
  sheet(`<div class="cs-head"><span class="cav lg" style="--tier:${t.color}">${esc(loc(c)[0])}</span><div><h2>${esc(loc(c))}</h2><p class="small"><span dir="ltr">${digits(c.phone)}</span> – <span class="tier-pill" style="--tier:${t.color}">${esc(loc(t))}</span></p></div></div>
    <div class="kpis sm"><div class="kpi"><span>${L("Visits", "بازدید")}</span><b>${num(c.visits)}</b></div><div class="kpi"><span>${L("Spent", "خرید")}</span><b>${kmoney(c.spend)}</b></div><div class="kpi"><span>${L("Points", "امتیاز")}</span><b>${num(c.points)}</b></div><div class="kpi"><span>${L("Invited", "دعوت")}</span><b>${num(c.referrals)}</b></div></div>
    <div class="group" style="margin-top:14px">
      <div class="row"><span class="row-ic soft">${icon("heart")}</span><span class="row-main"><span class="row-t">${L("Usually orders", "معمولاً سفارش می‌دهد")}</span><span class="row-s">${favTop.map(([i]) => esc(loc(item(i)))).join(" – ") || esc(loc(item(c.fav)))}</span></span></div>
      <div class="row"><span class="row-ic soft">${icon("pin")}</span><span class="row-main"><span class="row-t">${L("Home branch", "شعبه‌ی اصلی")}</span><span class="row-s">${esc(loc(branch(c.branch)))} – ${L("member since", "عضو از")} ${fmtDay(new Date(c.joined))}</span></span></div>
      <div class="row"><span class="row-ic soft">${icon("cake")}</span><span class="row-main"><span class="row-t">${L("Birthday month", "ماه تولد")}</span><span class="row-s">${new Intl.DateTimeFormat(getLang() === "fa" ? "fa-IR" : "en-GB", { month: "long" }).format(new Date(2026, c.bmonth, 15))}</span></span></div>
    </div>
    <p class="group-label">${L("Recent orders", "سفارش‌های اخیر")}</p>
    <div class="group">${hist.map((o) => `<div class="row plain"><span class="row-main"><span class="row-t">${o.lines.map((l) => esc(loc(item(l.id)))).join("، ")}</span><span class="row-s">${fmtDay(new Date(o.at))} – ${esc(loc(branch(o.branch)))}</span></span><span class="row-v">${money(o.total)}</span></div>`).join("") || `<div class="row plain"><span class="row-s">${L("No orders in the last two weeks", "در دو هفته‌ی اخیر سفارشی نداشته")}</span></div>`}</div>
    <p class="group-label">${L("Note for the team", "یادداشت برای تیم")}</p>
    <textarea class="note-in" id="cnote" rows="2" placeholder="${L("e.g. allergic to nuts, likes window seat", "مثلاً به آجیل حساسیت دارد، میز کنار پنجره را دوست دارد")}">${esc(A.notes[id] || "")}</textarea>
    <div class="act-grid" style="margin-top:14px"><button class="btn btn--soft" data-a="voucher">${icon("tag")}${L("Send voucher", "ارسال کوپن")}</button><button class="btn btn--soft" data-a="stamps">${icon("coffee")}${L("Gift stamps", "هدیه‌ی مهر")}</button><button class="btn btn--soft" data-a="msg">${icon("send")}${L("Message", "پیام")}</button></div>`,
  { label: loc(c), onMount(b) {
    $("#cnote", b).addEventListener("input", (e) => setA({ notes: { ...A.notes, [id]: e.target.value } }));
    $$("[data-a]", b).forEach((x) => x.addEventListener("click", () => { toast(L(`Sent to ${c.name}`, `برای ${c.name_fa} ارسال شد`), "send"); haptic(8); }));
  } });
}

/* campaigns */
const TEMPLATES = [
  { t: "Rainy day? 15% off hot drinks", t_fa: "هوا بارانی است؟ ٪۱۵ تخفیف نوشیدنی گرم", b: "Today only, at every branch. Show this in the app.", b_fa: "فقط امروز، در همه‌ی شعبه‌ها. در اپ نشان دهید.", off: "15" },
  { t: "We miss you ☕", t_fa: "دلمان برایتان تنگ شده ☕", b: "Here's 20% off your next order — this week.", b_fa: "این هفته ٪۲۰ تخفیف روی سفارش بعدی‌تان.", off: "20", seg: "risk" },
  { t: "New: Pistachio Con Panna", t_fa: "تازه: پسته کن‌پانا", b: "Crushed Ahmad Aghaei pistachios on hand-whipped cream. Try it this week.", b_fa: "پسته‌ی احمدآقایی روی خامه‌ی دست‌زده. این هفته امتحانش کنید.", off: "" },
  { t: "Acoustic Night is tomorrow", t_fa: "شب آکوستیک فرداست", b: "Free entry with any order at Aseman. Save your seat in the app.", b_fa: "ورود با هر سفارش در شعبه‌ی آسمان رایگان است. از اپ جا رزرو کنید.", off: "" },
];
function campaigns() {
  const seg = segments();
  const keys = ["all", "vip", "regular", "new", "risk", "bday"];
  return `<div class="cards g2 camp">
    <section class="card"><div class="card-h"><h3>${L("New campaign", "کمپین جدید")}</h3></div>
      <p class="group-label" style="margin-top:0">${L("Start from", "شروع از الگو")}</p>
      <div class="tpls">${TEMPLATES.map((t, i) => `<button class="chip" data-tpl="${i}">${esc(L(t.t, t.t_fa))}</button>`).join("")}</div>
      <label class="field"><span>${L("Audience", "مخاطبان")}</span><select id="c-seg">${keys.map((k) => `<option value="${k}">${seg[k].n} – ${num(seg.list.filter(seg[k].f).length)}</option>`).join("")}</select></label>
      <label class="field"><span>${L("Channel", "کانال")}</span></label>${seg ? `<div class="seg" id="c-ch" role="group"><span class="seg-thumb"></span><button type="button" data-v="push" aria-pressed="true">${icon("bell")}<span>${L("Push", "اعلان")}</span></button><button type="button" data-v="sms" aria-pressed="false">${icon("phone")}<span>${L("SMS", "پیامک")}</span></button></div>` : ""}
      <label class="field"><span>${L("Title", "عنوان")}</span><input id="c-t" maxlength="60" value=""></label>
      <label class="field"><span>${L("Message", "متن پیام")}</span><textarea id="c-b" rows="3" maxlength="160"></textarea></label>
      <label class="field"><span>${L("Offer", "پیشنهاد")}</span><select id="c-o"><option value="">${L("No offer", "بدون پیشنهاد")}</option><option value="10">${L("10% off", "٪۱۰ تخفیف")}</option><option value="15">${L("15% off", "٪۱۵ تخفیف")}</option><option value="20">${L("20% off", "٪۲۰ تخفیف")}</option><option value="drink">${L("A free drink", "یک نوشیدنی رایگان")}</option></select></label>
      <label class="field"><span>${L("When", "زمان ارسال")}</span><select id="c-w"><option value="now">${L("Now", "همین حالا")}</option><option value="eve">${L("Today 18:00", "امروز ساعت ۱۸")}</option><option value="tmr">${L("Tomorrow 10:00", "فردا ساعت ۱۰")}</option></select></label>
      <button class="btn btn--block" id="c-send" style="margin-top:16px">${icon("send")}${L("Send campaign", "ارسال کمپین")}</button>
      <p class="tiny" style="margin-top:8px">${L("In the preview, the customer app on this device receives every campaign so you can watch it arrive.", "در این نمونه، اپ مشتری روی همین دستگاه همه‌ی کمپین‌ها را دریافت می‌کند تا رسیدنش را ببینید.")}</p>
    </section>
    <section class="card phone-card"><div class="card-h"><h3>${L("Preview", "پیش‌نمایش")}</h3><span class="tiny" id="c-reach"></span></div>
      <div class="phone"><div class="ph-time" dir="ltr">${fmtTime(new Date())}</div><div class="ph-note"><span class="ph-ic">${MARK}</span><div><b id="pv-t">${L("Your title", "عنوان شما")}</b><p id="pv-b">${L("Your message appears here.", "متن پیام اینجا نمایش داده می‌شود.")}</p></div><span class="tiny">${L("now", "اکنون")}</span></div></div>
    </section></div>
    <section class="card"><div class="card-h"><h3>${L("Sent campaigns", "کمپین‌های ارسال‌شده")}</h3></div>
      ${A.campaigns.length ? `<div class="ctable">${A.campaigns.slice().reverse().map((c) => `<div class="ct-row"><span class="row-main"><span class="row-t">${esc(c.title)}</span><span class="row-s">${esc(c.segN)} – ${c.ch === "sms" ? L("SMS", "پیامک") : L("Push", "اعلان")} – ${fmtDay(new Date(c.at))} ${fmtTime(new Date(c.at))}${c.when !== "now" ? ` – ${L("scheduled", "زمان‌بندی‌شده")}` : ""}</span></span><span class="c-num">${num(c.reach)}<small>${L("reached", "دریافت")}</small></span><span class="c-num">${pct(c.open)}<small>${L("opened", "باز شده")}</small></span><span class="c-num">${num(c.redeem)}<small>${L("redeemed", "استفاده")}</small></span></div>`).join("")}</div><p class="tiny demo-note">${L("Open and redemption figures are simulated in the preview.", "آمار بازشدن و استفاده در این نمونه شبیه‌سازی شده است.")}</p>`
      : `<p class="small">${L("Nothing sent yet. Try a template above.", "هنوز چیزی ارسال نشده. یکی از الگوها را امتحان کنید.")}</p>`}
    </section>`;
}
function wireCampaigns(el) {
  const seg = segments();
  const pv = () => { $("#pv-t", el).textContent = $("#c-t", el).value || L("Your title", "عنوان شما"); $("#pv-b", el).textContent = $("#c-b", el).value || L("Your message appears here.", "متن پیام اینجا نمایش داده می‌شود."); const k = $("#c-seg", el).value; $("#c-reach", el).textContent = L(`Reach: ${num(seg.list.filter(seg[k].f).length)} people`, `دسترسی: ${num(seg.list.filter(seg[k].f).length)} نفر`); };
  let ch = "push";
  segmented($("#c-ch", el), (v) => { ch = v; });
  ["#c-t", "#c-b", "#c-seg"].forEach((s) => $(s, el).addEventListener("input", pv));
  $$("[data-tpl]", el).forEach((x) => x.addEventListener("click", () => { const t = TEMPLATES[+x.dataset.tpl]; $("#c-t", el).value = L(t.t, t.t_fa); $("#c-b", el).value = L(t.b, t.b_fa); $("#c-o", el).value = t.off; if (t.seg) $("#c-seg", el).value = t.seg; pv(); haptic(5); }));
  pv();
  $("#c-send", el).addEventListener("click", () => {
    const title = $("#c-t", el).value.trim(), body = $("#c-b", el).value.trim();
    if (!title) { toast(L("Add a title", "عنوان را بنویسید"), "info"); $("#c-t", el).focus(); return; }
    const off = $("#c-o", el).value, k = $("#c-seg", el).value, when = $("#c-w", el).value;
    const reach = seg.list.filter(seg[k].f).length;
    const offer = off === "drink" ? { kind: "drink", title: "A free drink", title_fa: "یک نوشیدنی رایگان" } : off ? { kind: "pct", value: +off / 100, title: `${off}% off`, title_fa: `٪${digits(off)} تخفیف` } : null;
    const code = offer ? "CP" + Math.random().toString(36).slice(2, 6).toUpperCase() : null;
    if (when === "now") setHub((h) => ({ broadcasts: [...h.broadcasts, { id: "B" + Date.now(), at: Date.now(), title, title_fa: title, body, body_fa: body, offer, code, to: k }].slice(-40) }));
    const open = 38 + Math.floor(Math.random() * 18);
    setA({ campaigns: [...A.campaigns, { title, segN: seg[k].n, ch, at: Date.now(), when, reach, open, redeem: offer ? Math.round(reach * (0.08 + Math.random() * 0.07)) : 0 }] });
    toast(when === "now" ? L(`Sent to ${reach} people`, `برای ${num(reach)} نفر ارسال شد`) : L("Scheduled", "زمان‌بندی شد"), "send");
    haptic(15); render();
  });
}

function automations() {
  const j = getHub().journeys;
  const J = [
    ["welcome", "gift", L("Welcome", "خوش‌آمد"), L("When someone joins → 20% off their first order", "وقتی کسی عضو می‌شود ← ٪۲۰ تخفیف اولین سفارش"), 142, 61],
    ["winback", "trend", L("Win-back", "بازگرداندن مشتری"), L("No visit in 21 days → “We miss you” + 15% off", "۲۱ روز بدون بازدید ← «دلمان تنگ شده» + ٪۱۵ تخفیف"), 58, 22],
    ["birthday", "cake", L("Birthday", "تولد"), L("Birthday week → a drink on us (Gold: a cake)", "هفته‌ی تولد ← یک نوشیدنی مهمان ما (طلایی: کیک)"), 23, 74],
    ["review", "star", L("Review request", "درخواست نظر"), L("30 min after an order → ask for a rating", "۳۰ دقیقه بعد از سفارش ← درخواست امتیاز"), 610, 34],
    ["stamp", "coffee", L("One stamp to go", "یک مهر تا جایزه"), L("7 of 8 stamps → nudge with a reminder", "۷ مهر از ۸ ← یادآوری کوتاه"), 39, 47],
  ];
  return `<p class="small sec-lead">${L("Messages that send themselves at the right moment. Switch any of them off.", "پیام‌هایی که در لحظه‌ی درست خودشان ارسال می‌شوند. هرکدام را می‌توانید خاموش کنید.")}</p>
    <div class="cards g3">${J.map(([k, ic, t, d, sent, conv]) => `<section class="card auto ${j[k] ? "" : "off"}"><div class="auto-h"><span class="row-ic" style="--c:var(--primary)">${icon(ic)}</span><b>${t}</b>${sw("j-" + k, j[k], t)}</div><p class="small">${d}</p><div class="auto-s"><span><b>${num(sent)}</b>${L("sent – 30 days", "ارسال – ۳۰ روز")}</span><span><b>${pct(conv)}</b>${L("came back", "برگشتند")}</span></div></section>`).join("")}</div>
    <p class="tiny demo-note">${L("Figures are illustrative in the preview. The welcome journey really runs: join in the app and the voucher appears.", "آمار در این نمونه نمایشی است. مسیر خوش‌آمد واقعاً کار می‌کند: در اپ عضو شوید تا کوپن ظاهر شود.")}</p>`;
}

function loyalty() {
  const seg = segments(), hub = getHub();
  const dist = TIERS.map((t) => ({ l: esc(loc(t)), v: seg.list.filter((c) => seg.tierOf(c.points).id === t.id).length, c: t.color }));
  return `<div class="cards g2">
    <section class="card"><div class="card-h"><h3>${L("Stamp card", "کارت مهر")}</h3></div>
      <p class="small">${L("How many drinks before one is free. Changes reach the app instantly.", "چند نوشیدنی تا یکی رایگان شود. تغییر فوراً به اپ می‌رسد.")}</p>
      <div style="margin-top:14px">${seg ? `<div class="seg big" id="stampseg"><span class="seg-thumb"></span>${[6, 8, 10].map((n) => `<button type="button" data-v="${n}" aria-pressed="${hub.loyalty.stamps === n}"><span>${L(`${n} stamps`, `${num(n)} مهر`)}</span></button>`).join("")}</div>` : ""}</div>
      <div class="group" style="margin-top:16px"><div class="row plain"><span class="row-main"><span class="row-t">${L("Points", "امتیاز")}</span><span class="row-s">${L("1 per 10,000 T – 15 per check-in – 100 per referral", "هر ۱۰ هزار تومان ۱ – هر ورود ۱۵ – هر دعوت ۱۰۰")}</span></span></div></div>
    </section>
    <section class="card"><div class="card-h"><h3>${L("Members by tier", "اعضا بر اساس سطح")}</h3></div>${bars(dist)}
      <div class="tiers mini">${TIERS.map((t) => `<div class="tier" style="--tier:${t.color}"><div class="tier-top"><span class="tier-dot"></span><b>${esc(loc(t))}</b><span class="tiny">${t.min ? L(`${num(t.min)}+ pts`, `از ${num(t.min)} امتیاز`) : L("Start", "شروع")}</span></div><ul>${L(t.perks, t.perks_fa).slice(0, 3).map((p) => `<li>${icon("check")}${esc(p)}</li>`).join("")}</ul></div>`).join("")}</div>
    </section></div>`;
}

function eventsSec() {
  const tix = appState().tickets;
  return `<div class="cards g2">${EVENTS.map((e) => { const mine = tix.filter((t) => t.event === e.id).reduce((s, t) => s + t.seats, 0); const taken = e.taken + mine; const d = dayFromToday(e.day, e.time); return `
    <section class="card ev-adm" style="--h:${e.hue}"><div class="card-h"><h3>${esc(loc(e, "title"))}</h3><span class="tiny">${esc(relDay(d))} – ${hhmm(e.time)}</span></div>
      <p class="small">${esc(loc(branch(e.branch)))} – ${esc(loc(e, "kind"))} – ${e.price ? money(e.price) : L("Free", "رایگان")}</p>
      <div class="seats big"><i style="--w:${(taken / e.seats) * 100}%"></i></div>
      <div class="auto-s"><span><b>${num(taken)}/${num(e.seats)}</b>${L("booked", "رزرو")}</span><span><b>${kmoney(taken * e.price)}</b>${L("ticket revenue", "درآمد بلیت")}</span>${mine ? `<span><b>${num(mine)}</b>${L("from this phone", "از همین گوشی")}</span>` : ""}</div>
    </section>`; }).join("")}</div>`;
}

function reviews() {
  const appR = appState().orders.filter((o) => o.rating).map((o) => ({ id: o.id, rating: o.rating, text: (o.tags || []).join(" – ") || "—", text_fa: (o.tags || []).join(" – ") || "—", app: true, name: o.customer?.name || "", at: o.at, branch: o.branch }));
  const list = [...appR, ...S.reviews.map((r) => ({ ...r, name: loc(cust(r.customer)) }))].filter((r) => inScope(r.branch)).sort((a, b) => b.at - a.at);
  const avg = list.reduce((s, r) => s + r.rating, 0) / (list.length || 1);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ l: "★".repeat(n), v: list.filter((r) => r.rating === n).length, c: n >= 4 ? "#3C9560" : n === 3 ? "#C9A57C" : "#B4392F" }));
  const rep = getHub().replies;
  return `<div class="cards g2"><section class="card"><div class="card-h"><h3>${L("Average rating", "میانگین امتیاز")}</h3></div><div class="big-num">${digits(avg.toFixed(1))}<small>/ ${digits(5)}</small></div>${bars(dist)}</section>
    <section class="card"><div class="card-h"><h3>${L("Latest", "تازه‌ترین‌ها")}</h3></div><div class="rlist">${list.slice(0, 12).map((r) => `<div class="rv-i"><div class="rv-top"><span class="stars">${"★".repeat(r.rating)}<i>${"★".repeat(5 - r.rating)}</i></span><b>${esc(r.name)}</b>${r.app ? `<span class="app-pill">${L("from the app", "از اپ")}</span>` : ""}<span class="tiny">${ago(r.at)} – ${esc(loc(branch(r.branch)))}</span></div><p>${esc(L(r.text, r.text_fa))}</p>${rep[r.id] ? `<p class="reply">${icon("send")}${esc(rep[r.id])}</p>` : `<button class="link sm" data-reply="${r.id}">${L("Reply", "پاسخ")}</button>`}</div>`).join("")}</div></section></div>`;
}

function branchesSec() {
  const hub = getHub(), t0 = startOfDay();
  return `<div class="cards g2">${BRANCHES.map((b) => { const o = openState(b), v = busy(b), paused = hub.paused[b.id] > Date.now(); const today = allOrders().filter((x) => x.branch === b.id && x.at >= t0); return `
    <section class="card br-card"><div class="card-h"><h3>${esc(loc(b))} <span class="tiny">– ${esc(loc(b, "city"))}</span></h3><span class="state-pill ${paused ? "bad" : o.isOpen ? "ok" : ""}">${paused ? L("Paused", "متوقف") : o.isOpen ? L("Open", "باز") : L("Closed", "بسته")}</span></div>
      <div class="auto-s"><span><b>${num(today.length)}</b>${L("orders today", "سفارش امروز")}</span><span><b>${kmoney(today.reduce((s, x) => s + x.total, 0))}</b>${L("revenue", "فروش")}</span><span><b>${busyLabel(v)}</b>${L("right now", "همین حالا")}</span></div>
      <p class="small" style="margin-top:12px">${paused ? L(`Online orders paused until ${fmtTime(new Date(hub.paused[b.id]))}. The app tells customers to pick another branch.`, `سفارش آنلاین تا ساعت ${fmtTime(new Date(hub.paused[b.id]))} متوقف است. اپ به مشتری‌ها شعبه‌ی دیگری پیشنهاد می‌دهد.`) : L("Too busy? Pause online orders for a while — the app updates instantly.", "خیلی شلوغ است؟ سفارش آنلاین را موقتاً متوقف کنید؛ اپ فوراً به‌روز می‌شود.")}</p>
      <div class="act-grid">${paused ? `<button class="btn btn--sm" data-resume="${b.id}">${icon("bolt")}${L("Resume orders", "ادامه‌ی سفارش‌ها")}</button>` : [15, 30, 60].map((m) => `<button class="btn btn--sm btn--soft" data-pause="${b.id}" data-m="${m}">${icon("pause")}${L(`${m} min`, `${num(m)} دقیقه`)}</button>`).join("")}</div>
    </section>`; }).join("")}</div>`;
}

/* ---------------------------------------------------------------- shell */
function shell() {
  document.body.innerHTML = `
  <div class="adm" id="adm">
    <aside class="side" id="side">
      <div class="side-top"><a class="side-logo" href="index.html">${LOCKUP}</a><span class="side-k">${L("Owner panel", "پنل مدیریت")}</span></div>
      <nav class="side-nav">${SECTIONS.map(([k, ic, t]) => `<button class="nav-i" data-sec="${k}" aria-current="${A.section === k}">${icon(ic)}<span>${L(...t)}</span>${k === "orders" ? `<i class="nav-badge" id="nb"></i>` : ""}</button>`).join("")}</nav>
      <div class="side-foot">
        <select id="scope" aria-label="${L("Branch", "شعبه")}"><option value="all">${L("All branches", "همه‌ی شعبه‌ها")}</option>${BRANCHES.map((b) => `<option value="${b.id}" ${A.scope === b.id ? "selected" : ""}>${esc(loc(b))}</option>`).join("")}</select>
        <div class="side-row"><button class="icon-btn" id="theme" aria-label="theme">${icon("moon")}</button><a class="icon-btn" href="index.html" aria-label="${L("Open the app", "باز کردن اپ")}">${icon("coffee")}</a><button class="icon-btn" id="logout" aria-label="${L("Sign out", "خروج")}">${icon("out")}</button></div>
        <a class="alpha-sig" href="https://alphaa.agency" target="_blank" rel="noopener" dir="ltr" lang="en"><span>Powered by Alpha Agency</span><img class="sig-light" src="assets/brand/alpha-black.png" alt="Alpha Agency" width="48"><img class="sig-dark" src="assets/brand/alpha-white.png" alt="Alpha Agency" width="48"></a>
      </div>
    </aside>
    <div class="scrim-side" id="scrim-side"></div>
    <main class="amain">
      <header class="ahead"><button class="icon-btn menu-btn" id="menu-btn" aria-label="menu">${icon("grid")}</button><div><p class="eyebrow" id="a-eyebrow"></p><h1 id="a-title"></h1></div><span class="live-dot" id="live-dot" hidden><span class="dot pulse"></span>${L("Live", "زنده")}</span></header>
      <div id="sec" class="sec-body"></div>
    </main>
  </div>
  <div id="sheet-root"></div><div id="toast-root" aria-live="polite"></div>`;
  $$(".nav-i").forEach((b) => b.addEventListener("click", () => go(b.dataset.sec)));
  $("#scope").addEventListener("change", (e) => { setA({ scope: e.target.value }); render(); });
  $("#theme").addEventListener("click", () => { const d = document.documentElement.dataset.mode === "dark"; applyTheme(d ? "light" : "dark", true); try { const s = JSON.parse(localStorage.getItem("conpanna.v1") || "{}"); s.theme = d ? "light" : "dark"; localStorage.setItem("conpanna.v1", JSON.stringify(s)); } catch (e) {} });
  $("#logout").addEventListener("click", () => { setA({ authed: false }); login(); });
  $("#menu-btn").addEventListener("click", () => $("#adm").classList.toggle("nav-open"));
  $("#scrim-side").addEventListener("click", () => $("#adm").classList.remove("nav-open"));
}
function go(sec) { setA({ section: sec }); $("#adm").classList.remove("nav-open"); render(); scrollTo(0, 0); $(".amain")?.scrollTo?.(0, 0); }

let lastCount = -1;
function render() {
  if (!A.authed) return;
  const el = $("#sec"); if (!el) return;
  const [, , t] = SECTIONS.find((s) => s[0] === A.section) || SECTIONS[0];
  $("#a-title").textContent = L(...t);
  $("#a-eyebrow").textContent = `${A.scope === "all" ? L("All branches", "همه‌ی شعبه‌ها") : loc(branch(A.scope))} – ${fmtDay(new Date())}`;
  $$(".nav-i").forEach((b) => b.setAttribute("aria-current", b.dataset.sec === A.section));
  const live = boardOrders().filter((o) => o.status === "new").length;
  $("#nb").textContent = live ? digits(live) : ""; $("#nb").classList.toggle("on", !!live);
  $("#live-dot").hidden = !A.live;
  const keepY = scrollY;
  el.innerHTML = { overview, orders, menu: menuSec, customers, campaigns, automations, loyalty, events: eventsSec, reviews, branches: branchesSec }[A.section]();
  scrollTo(0, keepY);
  wire(el);
}
function wire(el) {
  $$("[data-go]", el).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  $$("[data-adv]", el).forEach((b) => b.addEventListener("click", () => { const o = boardOrders().find((x) => x.id === b.dataset.adv); if (o) { advance(o); toast(L(`#${o.code} moved on`, `#${digits(o.code)} جلو رفت`), "check"); } }));
  $('input[name="live"]', el)?.addEventListener("change", (e) => { setA({ live: e.target.checked }); if (e.target.checked) { simOrder(); } render(); });
  $('input[name="auto"]', el)?.addEventListener("change", (e) => { setHub({ autoAdvance: e.target.checked }); });
  $("#sim", el)?.addEventListener("click", () => simOrder());
  $$("[data-price]", el).forEach((inp) => inp.addEventListener("change", () => { const v = +inp.value.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/\D/g, ""); const id = inp.dataset.price; if (!v) return; setHub((h) => ({ prices: { ...h.prices, [id]: v === item(id).price ? undefined : v } })); toast(L("Price updated in the app", "قیمت در اپ به‌روز شد"), "tag"); }));
  $$('input[name^="av-"]', el).forEach((inp) => inp.addEventListener("change", () => { const id = inp.name.slice(3); setHub((h) => ({ soldOut: inp.checked ? h.soldOut.filter((x) => x !== id) : [...h.soldOut, id] })); toast(inp.checked ? L(`${item(id).name} is back`, `${item(id).name_fa} دوباره موجود شد`) : L(`${item(id).name} marked sold out`, `${item(id).name_fa} تمام شد`), inp.checked ? "check" : "info"); }));
  $$("[data-cseg]", el).forEach((b) => b.addEventListener("click", () => { cseg = b.dataset.cseg; render(); }));
  $("#cq", el)?.addEventListener("input", (e) => { cq = e.target.value; const pos = e.target.selectionStart; render(); const n = $("#cq"); n.focus(); n.setSelectionRange(pos, pos); });
  $$("[data-cust]", el).forEach((b) => b.addEventListener("click", () => customerSheet(b.dataset.cust)));
  $("#csv", el)?.addEventListener("click", exportCsv);
  if (A.section === "campaigns") wireCampaigns(el);
  $$('input[name^="j-"]', el).forEach((inp) => inp.addEventListener("change", () => { const k = inp.name.slice(2); setHub((h) => ({ journeys: { ...h.journeys, [k]: inp.checked } })); render(); }));
  if ($("#stampseg", el)) segmented($("#stampseg", el), (v) => { setHub((h) => ({ loyalty: { ...h.loyalty, stamps: +v } })); toast(L(`Stamp card: ${v} drinks`, `کارت مهر: ${num(+v)} نوشیدنی`), "coffee"); });
  $$("[data-pause]", el).forEach((b) => b.addEventListener("click", () => { setHub((h) => ({ paused: { ...h.paused, [b.dataset.pause]: Date.now() + +b.dataset.m * 60e3 } })); toast(L("Online orders paused", "سفارش آنلاین متوقف شد"), "pause"); render(); }));
  $$("[data-resume]", el).forEach((b) => b.addEventListener("click", () => { setHub((h) => ({ paused: { ...h.paused, [b.dataset.resume]: 0 } })); toast(L("Orders resumed", "سفارش‌ها ادامه یافت"), "bolt"); render(); }));
  $$("[data-reply]", el).forEach((b) => b.addEventListener("click", () => {
    sheet(`<h2>${L("Reply", "پاسخ")}</h2><textarea class="note-in" id="rp" rows="3" style="margin-top:14px">${L("Thank you! We'd love to see you again soon.", "ممنون از شما! منتظر دیدار دوباره‌تان هستیم.")}</textarea><button class="btn btn--block" id="rps" style="margin-top:14px">${icon("send")}${L("Send reply", "ارسال پاسخ")}</button>`, { label: "reply", onMount(s) { $("#rps", s).addEventListener("click", () => { setHub((h) => ({ replies: { ...h.replies, [b.dataset.reply]: $("#rp", s).value } })); closeSheet(); toast(L("Reply sent", "پاسخ ارسال شد"), "send"); render(); }); } });
  }));
}
function exportCsv() {
  const seg = segments();
  const rows = [["id", "name", "phone", "branch", "tier", "visits", "spend_toman", "points", "last_visit"], ...seg.list.filter(seg[cseg].f).map((c) => [c.id, c.name, c.phone, c.branch, seg.tierOf(c.points).name, c.visits, c.spend, c.points, new Date(c.last).toISOString().slice(0, 10)])];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
  a.download = `conpanna-customers-${cseg}.csv`; document.body.appendChild(a); a.click(); a.remove();
  toast(L("CSV downloaded", "فایل CSV دانلود شد"), "dl");
}

function simOrder() {
  const c = S.customers[Math.floor(Math.random() * S.customers.length)];
  const pickM = () => MENU[Math.floor(Math.random() * MENU.length)];
  const lines = [pickM(), ...(Math.random() > .5 ? [pickM()] : [])].map((m) => ({ id: m.id, qty: 1, unit: m.price }));
  const o = { id: "X" + Date.now(), src: "sim", code: String(100 + Math.floor(Math.random() * 900)), at: Date.now(), branch: A.scope === "all" ? c.branch : A.scope, customer: c.id, lines, mode: ["takeaway", "delivery", "dinein"][Math.floor(Math.random() * 3)], total: lines.reduce((s, l) => s + l.unit, 0), status: "new", table: Math.random() > .6 ? String(1 + Math.floor(Math.random() * 20)) : "" };
  setA({ sims: [...A.sims.filter((x) => Date.now() - x.at < 6 * 3600e3), o].slice(-60) });
  ding(); toast(L(`New order #${o.code}`, `سفارش تازه #${digits(o.code)}`), "receipt");
  render();
}

/* ---------------------------------------------------------------- login */
function login() {
  document.body.innerHTML = `<div class="login"><div class="login-card">
    <div class="lp-mark">${LOCKUP}</div><h1>${L("Owner panel", "پنل مدیریت")}</h1><p class="small">${L("Enter your staff PIN", "رمز کارکنان را وارد کنید")}</p>
    <div class="pin" id="pin" dir="ltr">${[0, 1, 2, 3].map(() => "<i></i>").join("")}</div>
    <div class="pad" dir="ltr">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k) => k === "" ? "<span></span>" : `<button type="button" data-k="${k}">${typeof k === "number" ? digits(k) : k}</button>`).join("")}</div>
    <p class="tiny">${L("Demo PIN: 1234", "رمز نمونه: ۱۲۳۴")}</p>
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
applyLang();
applyTheme();
if (A.authed) { shell(); render(); } else login();
let prevNew = boardOrders().filter((o) => o.status === "new").map((o) => o.id);
onHub((h, msg) => {
  if (!A.authed) return;
  const nowNew = boardOrders().filter((o) => o.status === "new").map((o) => o.id);
  if (nowNew.some((id) => !prevNew.includes(id))) { ding(); toast(L("New order from the app", "سفارش تازه از اپ"), "receipt"); }
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
