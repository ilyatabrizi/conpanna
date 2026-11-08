// Even more of the owner's desk: a morning brief, cash flow and bills, the
// price lab, what sells together, complaints as tickets, staffing against
// demand, a leaderboard, equipment, licences and contracts, a Persian
// calendar, and a full page for any item, person or branch. Plus a
// notification tray and a TV wall for the back office.
import { $, $$, esc, icon, toast, haptic, sheet, closeSheet, num, digits, pct, kmoney, moneyText, fmtDay, fmtTime, loc, tile } from "../ui.js";
import { MENU, BRANCHES, CATEGORIES, EVENTS } from "../data.js";
import { getHub, setHub } from "../hub.js";
import { DAY, T, kk, sum, avg, fa1, mins, kpi, card, pill, empty, table, meter, lines, heat, periodBar, csv, jalali } from "./kit.js";
import { costOf, STOCK, SUPPLIERS, usage, TOPICS } from "./seed.js";
import { alerts, barsH, donutH, pnl, hourBars } from "./ceo.js";
import { openCustomer, profileOf } from "./crm.js";

let X;
export function initExtra(ctx) { X = ctx; }
const A = () => X.A();
const per = () => A().period || 30;
const done = (a) => a.filter((o) => o.status === "done");
const item = (id) => MENU.find((m) => m.id === id);
const bname = (id) => loc(BRANCHES.find((b) => b.id === id) || {});
const brs = () => BRANCHES.filter((b) => X.inScope(b.id));
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const R01 = (k) => (hash(k) % 10007) / 10007;
const priceOf = (m) => getHub().prices?.[m.id] ?? m.price;
const toNum = (v) => +String(v).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٫]/g, ".").replace(/[^\d.]/g, "") || 0;
const relDays = (t) => { const d = Math.round((t - X.S.today0) / DAY); return d === 0 ? "امروز" : d === 1 ? "فردا" : d === -1 ? "دیروز" : d > 0 ? `${num(d)} روز دیگه` : `${num(-d)} روز پیش`; };
const faDate = (t, o = { day: "numeric", month: "long" }) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", o).format(t);
const person = (id) => X.S.staff.find((p) => p.id === id);
const shiftOf = (p) => (A().shifts || {})[p.id] || p.week;
const WD = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const wdi = (t) => (new Date(t).getDay() + 1) % 7;
const link = (k, id, t) => `<button class="link ${k}-l" data-${k}="${esc(id)}">${t}</button>`;

/* ================================================================ data */
// licences, contracts, insurance and health cards, with deterministic expiries
export function docsAll() {
  const out = [], t0 = X.S.today0;
  BRANCHES.forEach((b) => {
    [["lic", "پروانه‌ی کسب", 720, 50], ["lease", "اجاره‌نامه‌ی ملک", 365, 30], ["ins", "بیمه‌ی آتش‌سوزی و مسئولیت", 365, 25], ["ext", "شارژ کپسول‌های آتش‌نشانی", 365, 40], ["env", "تأییدیه‌ی بهداشت محیط", 180, 20]].forEach(([k, t, span, back]) =>
      out.push({ id: `${k}-${b.id}`, k, t, br: b.id, exp: t0 + Math.round(R01(k + b.id) * span - back) * DAY, span }));
  });
  X.S.staff.forEach((p) => out.push({ id: `hc-${p.id}`, k: "health", t: `کارت بهداشت – ${p.name_fa}`, br: p.branch, who: p.id, exp: t0 + Math.round(R01("hc" + p.id) * 380 - 25) * DAY, span: 365 }));
  (A().docs || []).forEach((d) => out.push({ ...d }));
  const rn = A().docRenew || {};
  out.forEach((d) => { if (rn[d.id]) d.exp = rn[d.id]; d.left = Math.round((d.exp - t0) / DAY); });
  return out.filter((d) => X.inScope(d.br)).sort((a, b) => a.exp - b.exp);
}
const DOCK = { lic: ["پروانه", "ticket"], lease: ["اجاره", "door"], ins: ["بیمه", "shield"], ext: ["ایمنی", "flame"], env: ["بهداشت", "check"], health: ["کارت بهداشت", "profile"], other: ["سایر", "note"] };

// supplier invoices and other bills waiting to be paid
export function billsAll() {
  const AMT = { S1: 186e6, S2: 74e6, S3: 39e6, S4: 52e6, S5: 61e6 };
  const out = [];
  SUPPLIERS.forEach((s, i) => [0, 1].forEach((j) => {
    const off = j === 0 ? (i % 2 ? -3 - i * 2 : 2 + i * 3) : 11 + i * 4;
    out.push({ id: `B-${s.id}-${j}`, sup: s.id, t: `فاکتور ${s.n}`, what: s.what, amt: Math.round((AMT[s.id] * (j ? 1.07 : 1)) / 1e5) * 1e5, due: X.S.today0 + off * DAY, no: `${digits(1405)}/${digits(300 + i * 17 + j)}` });
  }));
  (A().bills || []).forEach((b) => out.push({ ...b }));
  const paid = A().billsPaid || {};
  out.forEach((b) => { b.paid = paid[b.id] || 0; b.left = Math.round((b.due - X.S.today0) / DAY); });
  return out.sort((a, b) => a.due - b.due);
}

// machines and other things that break, age and need servicing
const EQUIP = [
  ["esp", "دستگاه اسپرسوساز سه‌گروپ", 1650e6, 8, 90], ["grd", "آسیاب اسپرسو", 380e6, 6, 120], ["grd2", "آسیاب فیلتر", 160e6, 6, 180],
  ["ice", "یخ‌ساز", 140e6, 7, 120], ["fr", "یخچال ویترینی", 210e6, 10, 180], ["ov", "فر پخت", 260e6, 10, 180], ["pos", "صندوق و کارتخوان", 75e6, 4, 365], ["wf", "دستگاه تصفیه‌ی آب", 48e6, 5, 60],
];
export function assetsAll() {
  const t0 = X.S.today0, out = [], logs = A().svc || {}, br = A().breaks || [];
  BRANCHES.forEach((b) => EQUIP.forEach(([k, n, price, life, every]) => {
    const id = `${k}-${b.id}`, age = Math.round(60 + R01("age" + id) * 1300);
    const last = logs[id] || t0 - Math.round(R01("svc" + id) * every * 1.4) * DAY;
    const value = Math.max(price * 0.1, price * (1 - age / (life * 365)));
    out.push({ id, k, n, br: b.id, price, life, every, bought: t0 - age * DAY, age, last, next: last + every * DAY, value, warranty: t0 - age * DAY + 730 * DAY, breaks: br.filter((x) => x.id === id) });
  }));
  return out.filter((a) => X.inScope(a.br));
}

// complaints: every low rating becomes a ticket, plus the ones you open yourself
export function ticketsAll() {
  const st = A().tk || {}, now = Date.now();
  const auto = X.S.reviews.filter((r) => r.rating <= 2 && now - r.at < 30 * DAY && X.inScope(r.branch)).map((r) => ({ id: "R" + r.id, rev: r.id, at: r.at, br: r.branch, cust: r.customer, t: `${TOPICS[r.topic] || "تجربه"} – ${"★".repeat(r.rating)}`, d: r.text_fa, pr: r.rating === 1 ? "high" : "mid", src: "review" }));
  const man = (A().tickets || []).filter((t) => X.inScope(t.br));
  return [...man, ...auto].map((t) => {
    // older seeded ones have mostly been dealt with already
    const seeded = t.src === "review" && !st[t.id] && now - t.at > 1.5 * DAY ? { st: R01(t.id) < .75 ? "done" : "doing", owner: X.S.staff.find((p) => p.branch === t.br && p.role === "manager")?.id, closed: t.at + (1 + R01("c" + t.id) * 3) * DAY } : null;
    return { ...t, st: "open", ...(seeded || {}), ...(st[t.id] || {}) };
  }).sort((a, b) => b.at - a.at);
}

/* ======================================================== morning brief */
function brief() {
  const all = done(X.orders()), now = new Date(), h = now.getHours();
  const y = all.filter((o) => o.day === 1), lw = all.filter((o) => o.day === 8);
  const t0 = all.filter((o) => o.day === 0), t7 = all.filter((o) => o.day === 7 && o.hour <= h);
  const fc = avg([7, 14, 21, 28], (d) => sum(all.filter((o) => o.day === d)));
  const yv = sum(y), lv = sum(lw), dv = lv ? Math.round(((yv - lv) / lv) * 100) : 0;
  const byB = brs().map((b) => { const a = y.filter((o) => o.branch === b.id), l = lw.filter((o) => o.branch === b.id); return { b, v: sum(a), d: sum(l) ? Math.round(((sum(a) - sum(l)) / sum(l)) * 100) : 0, prep: avg(a, (o) => o.prep), n: a.length }; }).sort((a, b) => b.v - a.v);
  const it = {}; y.forEach((o) => o.lines.forEach((l) => { it[l.id] = (it[l.id] || 0) + l.qty; }));
  const top = Object.entries(it).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const joined = X.S.customers.filter((c) => c.joined >= X.S.today0 - DAY && c.joined < X.S.today0 && X.inScope(c.branch)).length;
  const badR = X.S.reviews.filter((r) => r.at >= X.S.today0 - DAY && r.at < X.S.today0 && r.rating <= 2 && X.inScope(r.branch));
  const slow = [...byB].filter((x) => x.n).sort((a, b) => b.prep - a.prep)[0];
  const al = alerts().slice(0, 4);
  const docs = docsAll().filter((d) => d.left >= -30 && d.left <= 14), bills = billsAll().filter((b) => !b.paid && b.left <= 7);
  const tk = ticketsAll().filter((t) => t.st !== "done");
  const greet = h < 11 ? "صبح بخیر" : h < 16 ? "روز بخیر" : "عصر بخیر";
  const sign = (d) => (d > 0 ? `<span class="pos">٪${digits(d)} بیشتر</span>` : d < 0 ? `<span class="neg">٪${digits(-d)} کمتر</span>` : "همون‌قدر");
  const story = [
    `دیروز ${moneyText(yv)} فروختیم، ${num(y.length)} سفارش؛ نسبت به ${WD[wdi(Date.now() - DAY)]} هفته‌ی قبل ${dv > 0 ? `٪${digits(dv)} بیشتر` : dv < 0 ? `٪${digits(-dv)} کمتر` : "همون‌قدر"}.`,
    byB[0] ? `بهترین شعبه ${bname(byB[0].b.id)} بود${byB.length > 1 ? ` و کم‌فروش‌ترین ${bname(byB.at(-1).b.id)}` : ""}.` : "",
    top[0] ? `پرفروش‌ترین آیتم ${loc(item(top[0][0]))} با ${num(top[0][1])} عدد.` : "",
    slow ? `کندترین آماده‌سازی تو ${bname(slow.b.id)}: میانگین ${mins(slow.prep)}.` : "",
    `${num(joined)} عضو تازه، ${num(badR.length)} نظر منفی.`,
    `${t0.length ? `امروز تا الان ${moneyText(sum(t0))}؛ هفته‌ی پیش همین ساعت ${moneyText(sum(t7))}.` : "امروز هنوز سفارشی ثبت نشده."} پیش‌بینی کل امروز حدود ${moneyText(fc)}.`,
  ].filter(Boolean);
  return `<section class="card brief-hero"><div><p class="eyebrow">${faDate(Date.now(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p><h2>${greet} 👋</h2><p class="brief-txt">${story.join(" ")}</p></div>
      <div class="brief-acts"><button class="btn btn--sm" data-x="copybrief">${icon("copy")}کپی برای تلگرام</button><button class="btn btn--sm btn--soft" data-x="tv">${icon("grid")}حالت تلویزیون</button></div></section>
    <div class="kpis k4">${kpi("فروش دیروز", kk(yv), sign(dv) + " از هفته‌ی قبل")}${kpi("سفارش دیروز", num(y.length), `میانگین ${kk(y.length ? yv / y.length : 0)}`)}${kpi("امروز تا الان", kk(sum(t0)), sum(t7) ? `${sign(Math.round(((sum(t0) - sum(t7)) / sum(t7)) * 100))} از همین ساعت هفته‌ی پیش` : "")}${kpi("پیش‌بینی امروز", kk(fc), meter(sum(t0) / (fc || 1)))}</div>
    <div class="cards g2">
      ${card("کارهای امروزت", `<div class="todo-l">${[
        ...al.map((a) => [a.k, a.ic, a.t, a.s, a.act?.[1]]),
        ...bills.slice(0, 2).map((b) => [b.left < 0 ? "bad" : "warn", "receipt", `${b.t} – ${kk(b.amt)}`, b.left < 0 ? `${num(-b.left)} روزه سررسیدش گذشته` : `سررسید ${relDays(b.due)}`, "cashflow"]),
        ...docs.slice(0, 2).map((d) => [d.left < 0 ? "bad" : "warn", DOCK[d.k]?.[1] || "note", d.t, d.left < 0 ? `${num(-d.left)} روزه منقضی شده` : `${relDays(d.exp)} تموم می‌شه`, "docs"]),
        ...(tk.length ? [["info", "info", `${num(tk.length)} شکایت باز`, `${num(tk.filter((t) => t.st === "open").length)} تا هنوز کسی برنداشته`, "tickets"]] : []),
      ].map(([k, ic, t, s, go]) => `<button class="todo-i ${k}" ${go ? `data-go="${go}"` : ""}><span class="nba-ic">${icon(ic)}</span><span class="row-main"><span class="row-t">${esc(t)}</span><span class="row-s">${esc(s || "")}</span></span>${icon("chev", "chev")}</button>`).join("")}</div>`)}
      ${card("شعبه‌ها دیروز", `<div class="rank">${byB.map((x, i) => `<button class="rank-i" data-branch="${x.b.id}"><span class="rk">${num(i + 1)}</span><span class="row-main"><span class="row-t">${esc(loc(x.b))}</span><span class="row-s">${num(x.n)} سفارش – آماده‌سازی ${mins(x.prep)}</span></span><span class="rank-v"><b>${kk(x.v)}</b><small class="${x.d >= 0 ? "pos" : "neg"}">${x.d >= 0 ? "▲" : "▼"} ٪${digits(Math.abs(x.d))}</small></span></button>`).join("")}</div>`)}
      ${card("پرفروش‌های دیروز", top.length ? `<div class="favs">${top.map(([id, n]) => `<button class="fav" data-item="${id}">${tile(item(id), "sm")}<span class="row-main"><span class="row-t">${esc(loc(item(id)))}</span><span class="row-s">${num(n)} عدد – ${kk(n * priceOf(item(id)))}</span></span>${meter(n / top[0][1])}</button>`).join("")}</div>` : empty("دیروز فروشی نبود"))}
      ${card("نظرهای منفی دیروز", badR.length ? `<div class="rlist">${badR.map((r) => `<div class="rv-i"><div class="rv-top"><span class="stars">${"★".repeat(r.rating)}<i>${"★".repeat(5 - r.rating)}</i></span><b>${TOPICS[r.topic]}</b><span class="tiny">${esc(bname(r.branch))}</span></div><p>${esc(r.text_fa)}</p>${r.customer ? `<button class="link sm" data-cust="${r.customer}">پرونده‌ی مشتری</button>` : ""}</div>`).join("")}</div>` : `<p class="small">دیروز نظر منفی نداشتیم 🙌</p>`)}
    </div>`;
}
function briefText() {
  const t = $(".brief-txt")?.innerText || "";
  return `☕ گزارش کن‌پانا – ${faDate(Date.now(), { weekday: "long", day: "numeric", month: "long" })}\n\n${t}`;
}

/* ============================================================ TV wall */
let tvT = 0;
export function tvMode() {
  const wrap = document.createElement("div");
  wrap.className = "tv"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-label", "حالت تلویزیون");
  document.body.appendChild(wrap);
  const paint = () => {
    const all = X.orders(), t = done(all.filter((o) => o.day === 0)), w = done(all.filter((o) => o.day === 7 && o.hour <= new Date().getHours()));
    const live = X.boardOrders().filter((o) => o.status !== "done").slice(0, 8);
    const byB = brs().map((b) => ({ b, v: sum(t.filter((o) => o.branch === b.id)), n: t.filter((o) => o.branch === b.id).length })).sort((a, b) => b.v - a.v);
    const max = Math.max(...byB.map((x) => x.v), 1);
    wrap.innerHTML = `<div class="tv-h"><b>Coffee Conpanna</b><span>${faDate(Date.now(), { weekday: "long", day: "numeric", month: "long" })} – ${fmtTime(new Date())}</span><button class="tv-x" aria-label="بستن">${icon("close")}</button></div>
      <div class="tv-k"><div><span>فروش امروز</span><b>${kk(sum(t))}</b><em class="${sum(t) >= sum(w) ? "pos" : "neg"}">${sum(w) ? `${sum(t) >= sum(w) ? "▲" : "▼"} ٪${digits(Math.abs(Math.round(((sum(t) - sum(w)) / sum(w)) * 100)))} نسبت به هفته‌ی پیش` : ""}</em></div>
        <div><span>سفارش</span><b>${num(t.length)}</b><em>میانگین ${kk(t.length ? sum(t) / t.length : 0)}</em></div><div><span>آماده‌سازی</span><b>${fa1(avg(t, (o) => o.prep) / 60)}<small> دقیقه</small></b><em>میانگین امروز</em></div><div><span>در صف</span><b>${num(live.length)}</b><em>سفارش باز</em></div></div>
      <div class="tv-g"><div class="tv-c"><h3>شعبه‌ها</h3>${byB.map((x) => `<div class="tv-b"><span>${esc(loc(x.b))}</span><i style="--w:${(x.v / max) * 100}%"></i><b>${kk(x.v)}</b></div>`).join("")}</div>
        <div class="tv-c"><h3>سفارش‌های باز</h3>${live.length ? live.map((o) => `<div class="tv-o"><b class="lat">#${digits(o.code)}</b><span>${esc(o.name || "")}</span><em>${{ new: "تازه", brewing: "دارن درست می‌کنن", ready: "آماده‌ست" }[o.status] || ""}</em></div>`).join("") : `<p>صف خالیه ☕</p>`}</div></div>
      <p class="tv-f">هر ۱۵ ثانیه تازه می‌شه – Esc برای خروج</p>`;
    $(".tv-x", wrap).addEventListener("click", close);
  };
  const key = (e) => { if (e.key === "Escape") close(); };
  const close = () => { clearInterval(tvT); removeEventListener("keydown", key); document.exitFullscreen?.().catch(() => {}); wrap.remove(); };
  paint(); tvT = setInterval(paint, 15000); addEventListener("keydown", key);
  wrap.requestFullscreen?.().catch(() => {});
}

/* =========================================================== cash flow */
function cashflow() {
  const all = done(X.orders()), d30 = all.filter((o) => o.day >= 1 && o.day <= 30);
  const C = X.cfg(), bank = A().bank ?? 2.6e9;
  const dIn = (sum(d30) - sum(d30, (o) => o.cost) - sum(d30.filter((o) => o.pay !== "cash"), (o) => o.total) * (C.fee / 100)) / 30;
  const ids = brs().map((b) => b.id), J = jalali();
  const toM1 = J.len - J.d + 1, rent = sum(ids, (b) => X.S.fixed[b].rent), util = sum(ids, (b) => X.S.fixed[b].util);
  const wages = sum(X.S.staff.filter((p) => ids.includes(p.branch)), (p) => p.wage * 8 * 26), share = (ids.length / BRANCHES.length) * (X.S.shared.marketing + X.S.shared.software + X.S.shared.accounting);
  const vatM = (sum(d30) * C.vat) / (100 + C.vat);
  const seasonLeft = (3 - ((J.m - 1) % 3)) - 1, toSeason = J.len - J.d + seasonLeft * 30 + 1;
  // the next 60 days of scheduled money going out
  const sched = [];
  for (let k = 0; k < 2; k++) {
    const m1 = toM1 + k * 30;
    sched.push({ d: m1, t: "اجاره‌ی شعبه‌ها", amt: rent, ic: "door", rec: 1 }, { d: m1, t: "تبلیغات، نرم‌افزار و حسابداری", amt: share, ic: "mega", rec: 1 }, { d: m1 - 1, t: "حقوق پرسنل", amt: wages, ic: "users", rec: 1 }, { d: (J.d < 15 ? 15 - J.d : J.len - J.d + 15) + k * 30, t: "قبض آب، برق و گاز", amt: util, ic: "bolt", rec: 1 });
  }
  if (toSeason <= 60) sched.push({ d: toSeason, t: "مالیات بر ارزش افزوده‌ی فصل", amt: vatM * 3, ic: "receipt", rec: 1 });
  const bills = billsAll().filter((b) => !b.paid);
  bills.forEach((b) => sched.push({ d: Math.max(0, b.left), due: b.due, t: b.t, amt: b.amt, ic: "receipt", bill: b.id, late: b.left < 0 }));
  (A().loans || []).forEach((l) => { for (let d = l.day; d <= 60; d += 30) sched.push({ d, t: l.t, amt: l.amt, ic: "card", rec: 1 }); });
  sched.sort((a, b) => a.d - b.d);
  const bal = [], low = { v: Infinity, d: 0 }; let b = bank;
  for (let d = 0; d <= 60; d++) { b += dIn; sched.filter((s) => s.d === d).forEach((s) => { b -= s.amt; }); bal.push(Math.max(0, b)); if (b < low.v) { low.v = b; low.d = d; } }
  const out30 = sum(sched.filter((s) => s.d <= 30), (s) => s.amt), in30 = dIn * 30;
  const burn = (rent + util + wages + share) / 30;
  const allBills = billsAll(), aging = [["سررسید نشده", allBills.filter((x) => !x.paid && x.left >= 0)], ["۱ تا ۷ روز گذشته", allBills.filter((x) => !x.paid && x.left < 0 && x.left >= -7)], ["بیشتر از ۷ روز", allBills.filter((x) => !x.paid && x.left < -7)]];
  return `<div class="kpis k5">${kpi("موجودی حساب", `<button class="kpi-edit" data-x="bank">${kk(bank)}${icon("edit")}</button>`, "بزن تا عوضش کنی")}${kpi("ورودی ۳۰ روز آینده", kk(in30), "سود ناخالص فروش، بعد از کارمزد")}${kpi("خروجی ۳۰ روز آینده", kk(out30), `${num(sched.filter((s) => s.d <= 30).length)} پرداخت`)}
      ${kpi("کمترین موجودی", `<span class="${low.v < burn * 7 ? "neg" : ""}">${kk(Math.max(0, low.v))}</span>`, `${relDays(X.S.today0 + low.d * DAY)}`)}${kpi("اگه فروش صفر بشه", `${num(Math.floor(bank / (burn || 1)))}<small> روز</small>`, "هزینه‌های ثابت رو پوشش می‌ده")}</div>
    ${card("موجودی حساب تو ۶۰ روز آینده", lines([{ vals: bal, label: "موجودی پیش‌بینی‌شده" }], bal.map((_, d) => (d % 10 ? "" : faDate(X.S.today0 + d * DAY))), { tips: bal.map((_, d) => faDate(X.S.today0 + d * DAY, { weekday: "short", day: "numeric", month: "long" })) }), { cls: "wide", extra: `<span class="tiny">پله‌ها یعنی پرداخت</span>` })}
    <div class="cards g2">
      ${card("پرداخت‌های پیش رو", `<div class="pays">${sched.filter((s) => s.d <= 45).map((s) => `<div class="pay-i ${s.late ? "late" : ""}"><span class="nba-ic">${icon(s.ic)}</span><span class="row-main"><span class="row-t">${esc(s.t)}</span><span class="row-s">${s.late ? `<b class="neg">${num(-Math.round((s.due - X.S.today0) / DAY))} روز عقب افتاده</b>` : relDays(X.S.today0 + s.d * DAY)} – ${faDate(s.due || X.S.today0 + s.d * DAY)}</span></span><b>${kk(s.amt)}</b>${s.bill ? `<button class="btn btn--sm btn--soft" data-pay="${s.bill}">پرداخت شد</button>` : `<span class="pill">ثابت</span>`}</div>`).join("")}</div>`, { extra: `<button class="btn btn--sm btn--soft" data-x="addbill">${icon("plus")}پرداختی تازه</button>` })}
      ${card("فاکتورهای تأمین‌کننده‌ها", `<div class="aging">${aging.map(([l, a], i) => `<div class="ag ${["", "warn", "bad"][i]}"><span>${l}</span><b>${kk(sum(a, (x) => x.amt))}</b><small>${num(a.length)} فاکتور</small></div>`).join("")}</div>
        ${table(["تأمین‌کننده", "شماره", "مبلغ", "سررسید", "وضعیت", ""], allBills.filter((x) => x.sup).map((x) => [esc(SUPPLIERS.find((s) => s.id === x.sup).n), `<span class="lat">${x.no}</span>`, kk(x.amt), faDate(x.due), x.paid ? pill("پرداخت شد", "ok") : x.left < 0 ? pill(`${num(-x.left)} روز دیر`, "bad") : pill(relDays(x.due), x.left <= 3 ? "warn" : ""), x.paid ? `<button class="link sm" data-unpay="${x.id}">برگردون</button>` : `<button class="link sm" data-pay="${x.id}">پرداخت</button>`]))}`)}
    </div>
    ${card("وام‌ها و قسط‌ها", `${(A().loans || []).length ? table(["بابت", "قسط ماهانه", "روز پرداخت", ""], A().loans.map((l, i) => [esc(l.t), kk(l.amt), `${num(l.day)} روز دیگه`, `<button class="link sm" data-delloan="${i}">حذف</button>`])) : `<p class="small">قسطی ثبت نشده. اگه وام یا لیزینگ دستگاه داری اینجا بزن تا تو پیش‌بینی بیاد.</p>`}
      <div class="inline-form" style="margin-top:12px"><input id="ln-t" placeholder="مثلاً لیزینگ دستگاه اسپرسو"><input id="ln-a" inputmode="numeric" placeholder="قسط ماهانه (تومان)"><input id="ln-d" inputmode="numeric" placeholder="چند روز دیگه"><button class="btn btn--sm" data-x="addloan">${icon("plus")}اضافه کن</button></div>`, { cls: "wide" })}`;
}

/* =========================================================== price lab */
let draft = {};
function pricing() {
  const P = per(), c = done(X.orders().filter((o) => o.day < P));
  const sold = {}; c.forEach((o) => o.lines.forEach((l) => { sold[l.id] = (sold[l.id] || 0) + l.qty; }));
  const tm = A().tmargin ?? 72, el = A().elastic ?? 0.8, shock = A().shock || {};
  const unitShock = (m) => { const u = usage(m, 1, "takeaway"); return sum(Object.entries(u), ([k, q]) => q * STOCK.find((s) => s.id === k).cost * ((shock[k] || 0) / 100)); };
  const rows = MENU.map((m) => {
    const p = priceOf(m), cst = costOf(m) + unitShock(m), q = (sold[m.id] || 0) / P * 30, np = draft[m.id] || p;
    const nq = q * Math.pow(np / p, -el), mg = 1 - cst / p, tgt = Math.ceil(cst / (1 - tm / 100) / 5000) * 5000;
    return { m, p, cst, q, np, nq, mg, tgt, now: (p - cst) * q, next: (np - cst) * nq };
  });
  const dP = sum(rows, (r) => r.next - r.now), dR = sum(rows, (r) => r.np * r.nq - r.p * r.q);
  const changed = rows.filter((r) => r.np !== r.p);
  const shockCost = sum(rows, (r) => unitShock(r.m) * r.q);
  return `<p class="small sec-lead">قیمت تازه رو بزن تا ببینی سود ماهانه چقدر عوض می‌شه. فرض: با هر ٪۱ گرون‌تر شدن، فروش اون آیتم حدود ٪${fa1(el)} کم می‌شه.</p>
    <div class="kpis k4">${kpi("حاشیه‌ی سود هدف", `<button class="kpi-edit" data-x="tmargin">٪${digits(tm)}${icon("edit")}</button>`)}${kpi("آیتم زیر هدف", num(rows.filter((r) => r.mg * 100 < tm).length), `از ${num(rows.length)} آیتم`)}${kpi("اثر روی سود ماهانه", `<span class="${dP >= 0 ? "pos" : "neg"}">${dP >= 0 ? "+" : "−"}${kk(Math.abs(dP))}</span>`, changed.length ? `${num(changed.length)} قیمت عوض شده` : "هنوز چیزی عوض نکردی")}${kpi("اثر روی فروش ماهانه", `${dR >= 0 ? "+" : "−"}${kk(Math.abs(dR))}`)}</div>
    <div class="cards g2">
      ${card("اگه مواد اولیه گرون بشه", `<div class="shock">${["beans", "milk", "oat", "cups", "cake"].map((k) => { const s = STOCK.find((x) => x.id === k); return `<label class="sh-r"><span>${esc(s.n)}</span><input type="range" min="0" max="80" step="5" value="${shock[k] || 0}" data-shock="${k}"><b>٪${digits(shock[k] || 0)}</b></label>`; }).join("")}</div><p class="small" style="margin-top:12px">${shockCost ? `با این گرونی، ماهانه حدود <b class="neg">${kk(shockCost)}</b> تومان از سودت کم می‌شه، مگه قیمت‌ها رو تنظیم کنی.` : "اسلایدرها رو بکش تا ببینی گرونی هر قلم چقدر از سودت می‌خوره."}</p>`)}
      ${card("پیشنهاد سریع", `<div class="sug">${rows.filter((r) => r.mg * 100 < tm && r.q > 30).sort((a, b) => a.mg - b.mg).slice(0, 5).map((r) => `<div class="sug-i">${tile(r.m, "sm")}<span class="row-main"><span class="row-t">${esc(loc(r.m))}</span><span class="row-s">حاشیه‌ی الان ${pct(Math.round(r.mg * 100))} – برای ٪${digits(tm)} باید ${kk(r.tgt)} بشه</span></span><button class="btn btn--sm btn--soft" data-sugg="${r.m.id}" data-v="${r.tgt}">بذار</button></div>`).join("") || `<p class="small">همه‌ی آیتم‌های پرفروش بالای هدفن 👌</p>`}</div>`)}
    </div>
    ${card("همه‌ی آیتم‌ها", table(["آیتم", "قیمت الان", "بهای تمام‌شده", "حاشیه", "فروش ماهانه", "قیمت تازه", "سود ماهانه الان", "بعد از تغییر"], rows.map((r) => [`<span class="it-cell">${tile(r.m, "sm")}${link("item", r.m.id, esc(loc(r.m)))}</span>`, kk(r.p), kk(r.cst), `<span class="${r.mg * 100 < tm ? "neg" : ""}">${pct(Math.round(r.mg * 100))}</span>`, num(Math.round(r.q)),
      `<span class="money-in xs"><input inputmode="numeric" data-np="${r.m.id}" value="${r.np !== r.p ? num(r.np) : ""}" placeholder="${num(r.p)}"></span>`, kk(r.now), r.np !== r.p ? `<b class="${r.next >= r.now ? "pos" : "neg"}">${kk(r.next)}</b>` : "—"])), { cls: "wide", extra: changed.length ? `<button class="btn btn--sm btn--soft" data-x="pclear">پاک کن</button><button class="btn btn--sm" data-x="papply">${icon("check")}اعمال ${num(changed.length)} قیمت تو اپ</button>` : "" })}`;
}

/* ===================================================== what sells together */
function basket() {
  const P = per(), c = done(X.orders().filter((o) => o.day < P));
  const n = c.length || 1, cnt = {}, pair = {};
  c.forEach((o) => { const ids = [...new Set(o.lines.map((l) => l.id))].sort(); ids.forEach((id) => { cnt[id] = (cnt[id] || 0) + 1; }); for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const k = ids[i] + "|" + ids[j]; pair[k] = (pair[k] || 0) + 1; } });
  const pairs = Object.entries(pair).map(([k, v]) => { const [a, b] = k.split("|"); return { a, b, v, sup: v / n, conf: v / cnt[a], lift: (v / n) / ((cnt[a] / n) * (cnt[b] / n)) }; }).filter((p) => p.v >= 8).sort((x, y) => y.lift * Math.log(y.v) - x.lift * Math.log(x.v));
  const sizes = [1, 2, 3, 4].map((k) => c.filter((o) => (k < 4 ? o.qty === k : o.qty >= 4)).length);
  const isFood = (id) => ["cake", "breakfast"].includes(item(id)?.cat);
  const drinks = c.filter((o) => o.lines.some((l) => !isFood(l.id)));
  const att = (a) => a.filter((o) => o.lines.some((l) => isFood(l.id))).length / (a.length || 1);
  const byH = Array.from({ length: 16 }, (_, i) => i + 8).map((h) => ({ l: digits(h), v: Math.round(att(drinks.filter((o) => o.hour === h)) * 100) }));
  const alone = Object.keys(cnt).map((id) => ({ id, a: c.filter((o) => o.lines.length === 1 && o.lines[0].id === id).length / cnt[id] })).filter((x) => cnt[x.id] > 40).sort((a, b) => b.a - a.a).slice(0, 5);
  const avgT = avg(c, (o) => o.total);
  const combos = pairs.filter((p) => isFood(p.a) !== isFood(p.b)).slice(0, 3);
  return `${periodBar(P)}
    <div class="kpis k4">${kpi("میانگین قلم تو هر سفارش", fa1(avg(c, (o) => o.qty)))}${kpi("سفارش تک‌قلمی", pct(Math.round((sizes[0] / n) * 100)), "فرصت فروش بیشتر")}${kpi("نوشیدنی + خوراکی", pct(Math.round(att(drinks) * 100)), "از سفارش‌های نوشیدنی")}${kpi("میانگین فاکتور", kk(avgT))}</div>
    <div class="cards g2">
      ${card("این‌ها رو با هم می‌خرن", table(["ترکیب", "دفعات", "اگه اولی رو بخره", "قدرت رابطه"], pairs.slice(0, 10).map((p) => [`${link("item", p.a, esc(loc(item(p.a))))} + ${link("item", p.b, esc(loc(item(p.b))))}`, num(p.v), `${pct(Math.round(p.conf * 100))} دومی رو هم می‌گیره`, `<span class="lift">${meter(Math.min(1, p.lift / 3))}<b>${fa1(p.lift)}×</b></span>`])) + `<p class="tiny" style="margin-top:10px">«قدرت رابطه» یعنی چند برابر بیشتر از شانس با هم خریده می‌شن؛ بالای ۱ یعنی واقعاً به هم میان.</p>`, { cls: "wide" })}
      ${card("پیشنهاد منوی ترکیبی", combos.length ? `<div class="combos">${combos.map((p) => { const pr = Math.round(((priceOf(item(p.a)) + priceOf(item(p.b))) * 0.9) / 5000) * 5000; return `<div class="combo"><div class="combo-t">${tile(item(p.a), "sm")}<span>+</span>${tile(item(p.b), "sm")}</div><b>${esc(loc(item(p.a)))} + ${esc(loc(item(p.b)))}</b><p class="small">با هم ${kk(pr)} تومان (٪۱۰ ارزون‌تر). الان ${num(p.v)} بار با هم خریدن؛ اگه فقط ٪۱۰ از تک‌خریدها ترکیب بشن، ماهانه حدود ${kk(((cnt[p.a] - p.v) * 0.1 * pr * 0.35 * 30) / P)} سود اضافه.</p></div>`; }).join("")}</div>` : empty("ترکیب قوی‌ای پیدا نشد"))}
      ${card("چند قلم تو هر سفارش", barsH(["۱ قلم", "۲ قلم", "۳ قلم", "۴ و بیشتر"].map((l, i) => ({ l, v: sizes[i], f: pct(Math.round((sizes[i] / n) * 100)) }))))}
      ${card("خوراکی کنار قهوه، ساعت به ساعت", barsH(byH.map((x) => ({ l: x.l, v: x.v, f: pct(x.v) }))))}
      ${card("بیشتر تنها خریده می‌شن", barsH(alone.map((x) => ({ l: link("item", x.id, esc(loc(item(x.id)))), v: Math.round(x.a * 100), f: pct(Math.round(x.a * 100)) }))) + `<p class="small" style="margin-top:12px">برای این‌ها باریستا یه خوراکی پیشنهاد بده؛ ساده‌ترین راه بزرگ‌تر کردن فاکتوره.</p>`)}
    </div>`;
}

/* ============================================================== tickets */
function tickets() {
  const all = ticketsAll(), now = Date.now(), slaH = 24;
  const col = (st) => all.filter((t) => t.st === st);
  const late = all.filter((t) => t.st === "open" && now - t.at > slaH * 3600e3);
  const closed = all.filter((t) => t.st === "done" && t.closed);
  const avgRes = avg(closed, (t) => (t.closed - t.at) / 3600e3);
  const staffOpt = (t) => `<select data-tko="${t.id}" aria-label="مسئول"><option value="">بی‌مسئول</option>${X.S.staff.filter((p) => p.branch === t.br && ["manager", "cashier"].includes(p.role)).map((p) => `<option value="${p.id}" ${t.owner === p.id ? "selected" : ""}>${esc(p.name_fa)}</option>`).join("")}</select>`;
  const tc = (t) => `<div class="tk ${t.pr} ${t.st === "open" && now - t.at > slaH * 3600e3 ? "late" : ""}"><div class="tk-h"><b>${esc(t.t)}</b>${t.pr === "high" ? pill("فوری", "bad") : ""}</div><p>${esc(t.d || "")}</p>
    <p class="tiny">${esc(bname(t.br))} – ${relDays(new Date(t.at).setHours(0, 0, 0, 0))}${t.cust ? ` – ${link("cust", t.cust, esc(profileOf(t.cust)?.c.name_fa || ""))}` : ""}</p>
    <div class="tk-f">${staffOpt(t)}${t.st !== "open" ? `<button class="icon-btn xs" data-tkm="${t.id}" data-to="${t.st === "done" ? "doing" : "open"}" aria-label="عقب">${icon("chev", "flip")}</button>` : ""}${t.st !== "done" ? `<button class="btn btn--sm btn--soft" data-tkm="${t.id}" data-to="${t.st === "open" ? "doing" : "done"}">${t.st === "open" ? "برمی‌دارم" : "حل شد"}</button>` : `<span class="pill ok">${icon("check")}حل شد</span>`}</div></div>`;
  return `<div class="kpis k4">${kpi("باز", num(col("open").length), late.length ? `<span class="neg">${num(late.length)} تا بیشتر از ۲۴ ساعت</span>` : "همه زیر ۲۴ ساعت")}${kpi("در حال پیگیری", num(col("doing").length))}${kpi("حل‌شده تو ۳۰ روز", num(col("done").length))}${kpi("میانگین زمان حل", `${fa1(avgRes / 24)}<small> روز</small>`)}</div>
    <div class="kanban">${[["open", "باز", "info"], ["doing", "دارن پیگیری می‌کنن", "warn"], ["done", "حل شد", "ok"]].map(([k, l, c]) => `<section class="kb-col"><div class="kb-h"><i class="dot ${c}"></i><b>${l}</b><span class="badge">${num(col(k).length)}</span></div>${col(k).slice(0, k === "done" ? 8 : 40).map(tc).join("") || `<p class="tiny kb-e">چیزی نیست</p>`}</section>`).join("")}</div>
    ${card("ثبت شکایت یا درخواست تازه", `<div class="inline-form"><input id="tk-t" placeholder="عنوان، مثلاً: مشتری گفت شیر ترش بود"><select id="tk-b">${brs().map((b) => `<option value="${b.id}">${esc(loc(b))}</option>`).join("")}</select><select id="tk-p"><option value="mid">معمولی</option><option value="high">فوری</option></select><button class="btn btn--sm" data-x="addtk">${icon("plus")}ثبت</button></div><textarea id="tk-d" class="note-in" rows="2" placeholder="توضیح بیشتر (اختیاری)"></textarea>`, { cls: "wide" })}`;
}

/* ============================================================ staffing */
let sfB = null, sfD = null;
function staffing() {
  const all = done(X.orders()), B = brs(), b = B.find((x) => x.id === sfB) || B[0];
  const dSel = sfD ?? wdi(Date.now());
  const days = [...new Set(all.filter((o) => o.day >= 1 && o.day <= 28 && wdi(X.S.today0 - o.day * DAY) === dSel).map((o) => o.day))];
  const cap = 8, hrs0 = Array.from({ length: 16 }, (_, i) => i + 7);
  const dem0 = hrs0.map((h) => all.filter((o) => o.branch === b.id && days.includes(o.day) && o.hour === h).length / (days.length || 1));
  const hrs = hrs0.filter((_, i) => dem0[i] > 0.2);
  const dem = hrs.map((h) => all.filter((o) => o.branch === b.id && days.includes(o.day) && o.hour === h).length / (days.length || 1));
  const team = X.S.staff.filter((p) => p.branch === b.id && p.role !== "kitchen");
  const on = hrs.map((h) => team.filter((p) => { const s = shiftOf(p)[dSel]; return s === "M" ? h >= 7 && h < 15 : s === "E" ? h >= 15 && h < 23 : false; }).filter((p) => p.role !== "cashier").length);
  const need = dem.map((d) => Math.max(1, Math.ceil(d / cap - 0.15)));
  const under = hrs.filter((_, i) => on[i] < need[i]), over = hrs.filter((_, i) => on[i] > need[i] + 1);
  const mx = Math.max(...need, ...on, 1);
  const P = 30, cur = all.filter((o) => o.day >= 1 && o.day <= P);
  const lab = B.map((x) => { const ps = X.S.staff.filter((p) => p.branch === x.id), rev = sum(cur.filter((o) => o.branch === x.id)), hours = sum(ps, (p) => shiftOf(p).filter((s) => s !== "off").length * 8) * 4.33, cost = sum(ps, (p) => p.wage * shiftOf(p).filter((s) => s !== "off").length * 8) * 4.33; return { x, rev, hours, cost, pct: cost / (rev || 1), splh: rev / (hours || 1) }; });
  return `<p class="small sec-lead">میانگین سفارش هر ساعت تو ۴ ${WD[dSel]} اخیر، کنار تعداد باریستاهایی که طبق برنامه سر شیفتن. هر باریستا حدود ${num(cap)} سفارش در ساعت جواب می‌ده.</p>
    <div class="chips-row tight" style="margin-bottom:10px">${B.map((x) => `<button class="chip sm" data-sfb="${x.id}" aria-pressed="${x.id === b.id}">${esc(loc(x))}</button>`).join("")}</div>
    <div class="chips-row tight" style="margin-bottom:14px">${WD.map((w, i) => `<button class="chip sm" data-sfd="${i}" aria-pressed="${i === dSel}">${w}</button>`).join("")}</div>
    <div class="kpis k4">${kpi("ساعت‌های کم‌نیرو", num(under.length), under.length ? under.map((h) => digits(h)).join("، ") : "هیچی 👌")}${kpi("ساعت‌های پرنیرو", num(over.length), over.length ? over.map((h) => digits(h)).join("، ") : "—")}${kpi("شلوغ‌ترین ساعت", digits(hrs[dem.indexOf(Math.max(...dem))]), `${fa1(Math.max(...dem))} سفارش`)}${kpi("هزینه‌ی نیرو از فروش", pct(Math.round((lab.find((l) => l.x.id === b.id)?.pct || 0) * 100)), "۳۰ روز اخیر")}</div>
    ${card(`${esc(loc(b))} – ${WD[dSel]}`, `<div class="sf">${hrs.map((h, i) => `<div class="sf-c ${on[i] < need[i] ? "under" : on[i] > need[i] + 1 ? "over" : ""}" data-tip="ساعت ${digits(h)}: حدود ${fa1(dem[i])} سفارش، لازم ${num(need[i])} نفر، سر کار ${num(on[i])} نفر"><div class="sf-bars"><i class="need" style="--v:${need[i] / mx}"></i><i class="on" style="--v:${on[i] / mx}"></i></div><small>${digits(h)}</small></div>`).join("")}</div>
      <div class="legend-row"><span class="legend"><i style="background:var(--caramel)"></i>لازم</span><span class="legend"><i style="background:var(--ink-3)"></i>سر شیفت</span><span class="legend"><i style="background:var(--danger)"></i>کم‌نیرو</span></div>
      <p class="small" style="margin-top:12px">${under.length ? `ساعت‌های ${under.map((h) => digits(h)).join("، ")} یه نفر کم داری. از بخش شیفت‌ها یکی رو جابه‌جا کن.` : "برنامه‌ی این روز با شلوغی جوره."} <button class="link sm" data-go="staff">برو سراغ شیفت‌ها</button></p>`, { cls: "wide" })}
    ${card("هزینه‌ی نیرو به تفکیک شعبه (۳۰ روز)", table(["شعبه", "ساعت کار", "هزینه‌ی نیرو", "سهم از فروش", "فروش هر ساعت کار"], lab.map((l) => [link("branch", l.x.id, esc(loc(l.x))), num(Math.round(l.hours)), kk(l.cost), `<span class="${l.pct > 0.3 ? "neg" : ""}">${pct(Math.round(l.pct * 100))}</span>`, kk(l.splh)]), { cls: "sortable" }) + `<p class="tiny" style="margin-top:10px">برای کافه، هزینه‌ی نیرو زیر ٪۲۵ تا ٪۳۰ فروش خوبه.</p>`)}`;
}

/* ========================================================= leaderboard */
let lbK = "sales";
function leaderboard() {
  const P = per(), c = done(X.orders().filter((o) => o.day < P)), p = done(X.orders().filter((o) => o.day >= P && o.day < P * 2));
  const bs = brs().map((b) => { const a = c.filter((o) => o.branch === b.id), q = p.filter((o) => o.branch === b.id), r = a.filter((o) => o.rating); return { b, rev: sum(a), g: sum(q) ? (sum(a) - sum(q)) / sum(q) : 0, prep: avg(a, (o) => o.prep), rate: avg(r, (o) => o.rating), app: a.filter((o) => o.channel === "app").length / (a.length || 1) }; });
  const rk = (k, inv) => { const s = [...bs].sort((x, y) => (inv ? x[k] - y[k] : y[k] - x[k])); return (b) => bs.length - s.indexOf(b); };
  const sc = [rk("g"), rk("prep", true), rk("rate"), rk("app")];
  bs.forEach((b) => { b.score = Math.round((sum(sc, (f) => f(b)) / (sc.length * bs.length)) * 100); });
  bs.sort((a, b) => b.score - a.score);
  const ppl = X.S.staff.filter((x) => X.inScope(x.branch) && x.role !== "kitchen").map((x) => { const a = c.filter((o) => o.staff === x.id), r = a.filter((o) => o.rating); return { x, n: a.length, sales: sum(a), prep: avg(a, (o) => o.prep), rate: r.length >= 5 ? avg(r, (o) => o.rating) : 0, tips: x.tips, late: x.late30 }; }).filter((s) => s.n);
  const K = { sales: ["فروش", (s) => s.sales, kk], orders: ["سفارش", (s) => s.n, num], speed: ["سرعت", (s) => -s.prep, (v) => mins(-v)], rate: ["امتیاز", (s) => s.rate, fa1], tips: ["انعام", (s) => s.tips, kk] };
  const [lbl, f, fmt] = K[lbK];
  const top = [...ppl].sort((a, b) => f(b) - f(a)).slice(0, 10);
  const medal = (i) => ["🥇", "🥈", "🥉"][i] || num(i + 1);
  return `${periodBar(P)}
    <div class="cards g2">
      ${card("رتبه‌ی شعبه‌ها", `<div class="lb">${bs.map((x, i) => `<button class="lb-i" data-branch="${x.b.id}"><span class="md">${medal(i)}</span><span class="row-main"><span class="row-t">${esc(loc(x.b))}</span><span class="row-s">رشد ${x.g >= 0 ? "+" : "−"}٪${digits(Math.abs(Math.round(x.g * 100)))} – ${mins(x.prep)} – ★ ${fa1(x.rate)} – اپ ${pct(Math.round(x.app * 100))}</span></span><span class="lb-s"><b>${num(x.score)}</b><small>امتیاز</small></span></button>`).join("")}</div><p class="tiny" style="margin-top:10px">امتیاز از رشد فروش، سرعت، رضایت مشتری و سهم اپ ساخته می‌شه؛ برای این‌که شعبه‌ی کوچیک هم شانس داشته باشه، حجم فروش حساب نمی‌شه.</p>`)}
      ${card("پرسنل برتر", `<div class="chips-row tight" style="margin-bottom:12px">${Object.entries(K).map(([k, [l]]) => `<button class="chip sm" data-lbk="${k}" aria-pressed="${lbK === k}">${l}</button>`).join("")}</div><div class="lb">${top.map((s, i) => `<button class="lb-i" data-person="${s.x.id}"><span class="md">${medal(i)}</span><span class="cav sm">${esc(s.x.name_fa[0])}</span><span class="row-main"><span class="row-t">${esc(s.x.name_fa)}</span><span class="row-s">${esc(s.x.role_fa)} – ${esc(bname(s.x.branch))}</span></span><span class="lb-s"><b>${fmt(f(s))}</b><small>${lbl}</small></span></button>`).join("")}</div>`)}
    </div>`;
}

/* ============================================================== assets */
let asB = "";
function assets() {
  const all = assetsAll(), t0 = X.S.today0, list = asB ? all.filter((a) => a.br === asB) : all;
  const due = all.filter((a) => a.next <= t0 + 7 * DAY), brk = all.reduce((s, a) => s + a.breaks.length, 0);
  return `<div class="kpis k4">${kpi("ارزش فعلی تجهیزات", kk(sum(all, (a) => a.value)), `قیمت خرید ${kk(sum(all, (a) => a.price))}`)}${kpi("سرویس عقب‌افتاده", num(all.filter((a) => a.next < t0).length), `${num(due.length)} تا تو ۷ روز آینده`)}${kpi("گارانتی دارن", num(all.filter((a) => a.warranty > t0).length), `از ${num(all.length)} دستگاه`)}${kpi("خرابی ثبت‌شده", num(brk))}</div>
    <div class="chips-row tight" style="margin-bottom:12px"><button class="chip sm" data-asb="" aria-pressed="${!asB}">همه</button>${brs().map((b) => `<button class="chip sm" data-asb="${b.id}" aria-pressed="${asB === b.id}">${esc(loc(b))}</button>`).join("")}</div>
    ${card("تجهیزات", table(["دستگاه", "شعبه", "عمر", "ارزش الان", "سرویس بعدی", "گارانتی", ""], list.sort((a, b) => a.next - b.next).map((a) => [`<b>${esc(a.n)}</b>${a.breaks.length ? ` ${pill(`${num(a.breaks.length)} خرابی`, "warn")}` : ""}`, esc(bname(a.br)), `${fa1(a.age / 365)} سال از ${num(a.life)}`, `${kk(a.value)} ${meter(a.value / a.price)}`,
      a.next < t0 ? pill(`${num(Math.round((t0 - a.next) / DAY))} روز عقب`, "bad") : a.next < t0 + 7 * DAY ? pill(relDays(a.next), "warn") : relDays(a.next), a.warranty > t0 ? pill(`تا ${faDate(a.warranty, { month: "long", year: "numeric" })}`, "ok") : "تموم شده",
      `<button class="link sm" data-svc="${a.id}">سرویس شد</button> <button class="link sm" data-brk="${a.id}">خرابی</button>`]), { cls: "sortable" }), { cls: "wide" })}
    ${(A().breaks || []).length ? card("آخرین خرابی‌ها", table(["کِی", "دستگاه", "شعبه", "شرح", "هزینه"], (A().breaks || []).slice().reverse().slice(0, 10).map((x) => { const a = all.find((y) => y.id === x.id) || {}; return [fmtDay(new Date(x.at)), esc(a.n || ""), esc(bname(a.br)), esc(x.d), x.cost ? kk(x.cost) : "—"]; }))) : ""}`;
}

/* ================================================================ docs */
let dF = "soon";
function docs() {
  const all = docsAll(), t0 = X.S.today0;
  const list = all.filter((d) => dF === "all" || (dF === "exp" ? d.left < 0 : dF === "soon" ? d.left >= 0 && d.left <= 45 : d.k === dF));
  return `<div class="kpis k4">${kpi("منقضی شده", `<span class="${all.some((d) => d.left < 0) ? "neg" : ""}">${num(all.filter((d) => d.left < 0).length)}</span>`, "همین الان تمدید کن")}${kpi("تا ۴۵ روز آینده", num(all.filter((d) => d.left >= 0 && d.left <= 45).length))}${kpi("کارت بهداشت پرسنل", num(all.filter((d) => d.k === "health" && d.left >= 0).length) + " / " + num(all.filter((d) => d.k === "health").length), "معتبر")}${kpi("کل مدارک", num(all.length))}</div>
    <div class="chips-row tight" style="margin-bottom:12px">${[["soon", "۴۵ روز آینده"], ["exp", "منقضی"], ["all", "همه"], ...Object.entries(DOCK).filter(([k]) => k !== "other").map(([k, [l]]) => [k, l])].map(([k, l]) => `<button class="chip sm" data-df="${k}" aria-pressed="${dF === k}">${l}</button>`).join("")}</div>
    ${card("مجوزها، قراردادها و کارت‌ها", list.length ? `<div class="docs">${list.map((d) => `<div class="doc ${d.left < 0 ? "bad" : d.left <= 30 ? "warn" : ""}"><span class="nba-ic">${icon(DOCK[d.k]?.[1] || "note")}</span><span class="row-main"><span class="row-t">${esc(d.t)}</span><span class="row-s">${esc(bname(d.br))} – ${d.left < 0 ? `${num(-d.left)} روزه منقضی شده` : `${relDays(d.exp)} – ${faDate(d.exp, { day: "numeric", month: "long", year: "numeric" })}`}</span></span>${d.who ? link("person", d.who, "پرسنل") : ""}<button class="btn btn--sm btn--soft" data-renew="${d.id}" data-span="${d.span || 365}">${icon("check")}تمدید شد</button></div>`).join("")}</div>` : empty("تو این دسته چیزی نیست 👌"), { cls: "wide" })}
    ${card("مدرک تازه", `<div class="inline-form"><input id="dc-t" placeholder="مثلاً: قرارداد تأمین شیر"><select id="dc-b">${brs().map((b) => `<option value="${b.id}">${esc(loc(b))}</option>`).join("")}</select><input id="dc-d" inputmode="numeric" placeholder="چند روز دیگه تموم می‌شه"><button class="btn btn--sm" data-x="adddoc">${icon("plus")}ثبت</button></div>`, { cls: "wide" })}`;
}

/* ============================================================ calendar */
// fixed solar holidays and dates a cafe cares about; lunar ones move each year so we leave them out
const SOLAR = { "1-1": ["نوروز", 1], "1-2": ["نوروز", 1], "1-3": ["نوروز", 1], "1-4": ["نوروز", 1], "1-12": ["روز جمهوری اسلامی", 1], "1-13": ["سیزده‌بدر", 1], "3-14": ["رحلت امام خمینی", 1], "3-15": ["قیام ۱۵ خرداد", 1], "11-22": ["پیروزی انقلاب", 1], "12-29": ["ملی شدن نفت", 1], "9-30": ["شب یلدا", 0], "7-8": ["روز جهانی قهوه", 0], "12-25": ["آخرین چهارشنبه‌ها – پیک خرید عید", 0], "11-26": ["ولنتاین (سپندارمذگان: ۲۹ بهمن)", 0], "11-29": ["سپندارمذگان", 0] };
let calOff = 0, calSel = null;
function calendar() {
  // find the first day of the Jalali month we're looking at
  const J0 = jalali(X.S.today0), target = J0.y * 12 + J0.m - 1 + calOff;
  let t = X.S.today0 + Math.round(calOff * 30.4) * DAY + 12 * 3600e3;
  for (let i = 0; i < 80; i++) { const q = jalali(t), cur = q.y * 12 + q.m - 1; if (cur === target) break; t += (cur < target ? 5 : -5) * DAY; }
  let j = jalali(t); t -= (j.d - 1) * DAY; j = jalali(t); t = new Date(t).setHours(0, 0, 0, 0);
  const days = Array.from({ length: j.len }, (_, i) => new Date(t + i * DAY + 12 * 3600e3).setHours(0, 0, 0, 0));
  const evs = (d) => {
    const jj = jalali(d), out = [], key = `${jj.m}-${jj.d}`;
    if (SOLAR[key]) out.push({ k: SOLAR[key][1] ? "hol" : "sp", t: SOLAR[key][0] });
    if (jj.d === 1) out.push({ k: "pay", t: "اجاره و هزینه‌های ثابت" });
    if (jj.d === jj.len) out.push({ k: "pay", t: "حقوق پرسنل" });
    billsAll().filter((b) => !b.paid && Math.abs(b.due - d) < DAY / 2).forEach((b) => out.push({ k: "bill", t: b.t, go: "cashflow" }));
    docsAll().filter((x) => Math.abs(x.exp - d) < DAY / 2).forEach((x) => out.push({ k: "doc", t: `انقضا: ${x.t}`, go: "docs" }));
    const dd = Math.round((d - X.S.today0) / DAY);
    EVENTS.filter((e) => e.day === dd && X.inScope(e.branch)).forEach((e) => out.push({ k: "ev", t: `${e.title_fa} – ${bname(e.branch)} ${digits(e.time)}`, go: "events" }));
    X.S.customers.filter((c) => c.points >= 1800 && c.bmonth === new Date(d).getMonth() && (hash(c.id) % 28) + 1 === new Date(d).getDate() && X.inScope(c.branch)).slice(0, 3).forEach((c) => out.push({ k: "bd", t: `تولد ${c.name_fa} (طلایی)`, cust: c.id }));
    assetsAll().filter((a) => Math.abs(a.next - d) < DAY / 2).slice(0, 2).forEach((a) => out.push({ k: "svc", t: `سرویس ${a.n} – ${bname(a.br)}`, go: "assets" }));
    (A().cal || []).filter((x) => x.d === d).forEach((x, i) => out.push({ k: "me", t: x.t, mine: x.id }));
    return out;
  };
  const sel = calSel && days.includes(calSel) ? calSel : days.includes(X.S.today0) ? X.S.today0 : days[0];
  const lead = wdi(days[0]);
  const se = evs(sel);
  return `<div class="cal-h"><button class="icon-btn sm" data-cal="-1" aria-label="ماه قبل">${icon("chev", "flip")}</button><h3>${j.name} ${digits(j.y)}</h3><button class="icon-btn sm" data-cal="1" aria-label="ماه بعد">${icon("chev")}</button>${calOff ? `<button class="link sm" data-cal="0">برو به امروز</button>` : ""}</div>
    <div class="cards cal-wrap"><section class="card cal"><div class="cal-g">${WD.map((w) => `<span class="cal-w">${w.slice(0, w.startsWith("سه") ? 2 : 1)}</span>`).join("")}${"<span></span>".repeat(lead)}${days.map((d) => { const e = evs(d), jd = jalali(d).d; return `<button class="cal-d ${d === X.S.today0 ? "today" : ""} ${d === sel ? "sel" : ""} ${e.some((x) => x.k === "hol") || wdi(d) === 6 ? "hol" : ""}" data-day="${d}"><b>${digits(jd)}</b><span class="cal-dots">${[...new Set(e.map((x) => x.k))].slice(0, 4).map((k) => `<i class="k-${k}"></i>`).join("")}</span></button>`; }).join("")}</div>
      <div class="legend-row">${[["hol", "تعطیل"], ["sp", "مناسبت"], ["ev", "رویداد"], ["pay", "پرداخت ثابت"], ["bill", "فاکتور"], ["doc", "انقضای مدرک"], ["svc", "سرویس"], ["bd", "تولد مشتری"], ["me", "یادداشت تو"]].map(([k, l]) => `<span class="legend"><i class="k-${k}"></i>${l}</span>`).join("")}</div></section>
      <section class="card cal-side"><div class="card-h"><h3>${faDate(sel, { weekday: "long", day: "numeric", month: "long" })}</h3><span class="tiny">${relDays(sel)}</span></div>
        ${se.length ? `<div class="cal-l">${se.map((x) => `<div class="cal-e"><i class="k-${x.k}"></i><span>${esc(x.t)}</span>${x.go ? `<button class="link sm" data-go="${x.go}">ببین</button>` : x.cust ? `<button class="link sm" data-cust="${x.cust}">پرونده</button>` : x.mine ? `<button class="icon-btn xs" data-delcal="${x.mine}" aria-label="پاک کردن">${icon("close")}</button>` : ""}</div>`).join("")}</div>` : `<p class="small">برنامه‌ای نیست.</p>`}
        <div class="note-add" style="margin-top:14px"><input id="cal-t" class="note-in" placeholder="یه یادداشت برای این روز"><button class="btn btn--sm" data-x="addcal">${icon("plus")}</button></div></section></div>`;
}

/* ========================================================== drill-downs */
function itemPage() {
  const m = item(A().iid); if (!m) return empty("آیتم پیدا نشد");
  const P = per(), all = done(X.orders()), c = all.filter((o) => o.day < P), p = all.filter((o) => o.day >= P && o.day < P * 2);
  const has = (o) => o.lines.some((l) => l.id === m.id), q = (a) => sum(a, (o) => o.lines.filter((l) => l.id === m.id).reduce((s, l) => s + l.qty, 0));
  const mine = c.filter(has), u = q(c), pu = q(p), price = priceOf(m), cst = costOf(m);
  const daily = Array.from({ length: P }, (_, i) => q(mine.filter((o) => o.day === P - i)));
  const hours = {}; mine.forEach((o) => { hours[o.hour] = (hours[o.hour] || 0) + 1; });
  const avgH = {}; c.forEach((o) => { avgH[o.hour] = (avgH[o.hour] || 0) + 1; }); Object.keys(avgH).forEach((h) => { avgH[h] = (avgH[h] / c.length) * mine.length; });
  const byB = brs().map((b) => ({ l: link("branch", b.id, esc(loc(b))), v: q(mine.filter((o) => o.branch === b.id)) })).sort((a, b) => b.v - a.v);
  const wd = WD.map((w, i) => ({ l: w, v: q(mine.filter((o) => wdi(o.at) === i)) }));
  const with_ = {}; mine.forEach((o) => [...new Set(o.lines.map((l) => l.id))].filter((id) => id !== m.id).forEach((id) => { with_[id] = (with_[id] || 0) + 1; }));
  const pairs = Object.entries(with_).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const buyers = {}; mine.forEach((o) => { if (o.customer) buyers[o.customer] = (buyers[o.customer] || 0) + 1; });
  const topB = Object.entries(buyers).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const raw = Object.entries(usage(m, 1, "takeaway")).map(([k, v]) => { const s = STOCK.find((x) => x.id === k); return { l: s.n, v: v * s.cost }; }), rawT = sum(raw, (x) => x.v) || 1;
  // spread the item's cost over what it's made of, leaving a slice for labour and energy
  const parts = raw.map((x) => ({ ...x, v: (x.v / rawT) * cst * 0.85 }));
  const rank = [...MENU].map((x) => ({ x, u: q(c.filter((o) => o.lines.some((l) => l.id === x.id))) })).sort((a, b) => b.u - a.u).findIndex((r) => r.x.id === m.id) + 1;
  const sold = getHub().soldOut?.includes(m.id);
  return `<div class="c360-top"><button class="back-link" data-go="products">${icon("back")}تحلیل منو</button>${periodBar(P)}</div>
    <section class="card c360-head">${tile(m, "lg")}<div class="ch-main"><h2>${esc(loc(m))}</h2><p class="ch-sub">${esc(loc(CATEGORIES.find((k) => k.id === m.cat) || {}))} ${pill(`رتبه‌ی ${num(rank)} فروش`, "info")} ${sold ? pill("الان تموم شده", "bad") : pill("موجوده", "ok")} ${m.opts === "milk" ? pill("شیر جو هم داره") : ""}</p></div>
      <div class="ch-acts"><button class="btn btn--sm btn--soft" data-go="pricing">${icon("tag")}آزمایشگاه قیمت</button><button class="btn btn--sm btn--soft" data-go="menu">${icon("menu")}منو و موجودی</button></div></section>
    <div class="kpis k4">${kpi("فروخته", num(u), pu ? `${u >= pu ? "▲" : "▼"} ٪${digits(Math.abs(Math.round(((u - pu) / pu) * 100)))} از دوره‌ی قبل` : "")}${kpi("فروش", kk(u * price))}${kpi("قیمت / بهای تمام‌شده", `${kk(price)}<small> / ${kk(cst)}</small>`, `حاشیه ${pct(Math.round((1 - cst / price) * 100))}`)}${kpi("سود این دوره", kk(u * (price - cst)))}</div>
    ${card("فروش روزانه", lines([{ vals: daily, label: "تعداد" }], daily.map((_, i) => digits(new Date(X.S.today0 - (P - i) * DAY).getDate())), { fmt: num, h: 200, tips: daily.map((_, i) => fmtDay(new Date(X.S.today0 - (P - i) * DAY))) }), { cls: "wide" })}
    <div class="cards g2">
      ${card("کی می‌فروشه", hourBars(hours, avgH) + `<p class="tiny" style="margin-top:8px">ستون پررنگ همین آیتم، کم‌رنگ میانگین کل منو.</p>`)}
      ${card("روزهای هفته", barsH(wd))}
      ${card("شعبه‌ها", barsH(byB))}
      ${card("با چی می‌خرن", pairs.length ? barsH(pairs.map(([id, n]) => ({ l: link("item", id, esc(loc(item(id)))), v: n, f: pct(Math.round((n / (mine.length || 1)) * 100)) }))) : empty("بیشتر تنها خریده می‌شه"))}
      ${card("بهای تمام‌شده از چی ساخته شده", parts.length ? donutH(parts.map((x, i) => ({ l: `${esc(x.l)} – ${kk(x.v)}`, v: x.v, c: ["#94653A", "#C9A57C", "#3C9560", "#5B7FA6", "#B4392F", "#8E7AB5"][i % 6] }))) + `<p class="tiny" style="margin-top:8px">بقیه‌ی بهای تمام‌شده (${kk(Math.max(0, cst - sum(parts, (x) => x.v)))}) سهم دستمزد آماده‌سازی، انرژی و ضایعاته.</p>` : empty("—"))}
      ${card("بیشتر کی می‌خره", topB.length ? `<div class="refs">${topB.map(([id, n], i) => `<button class="ref" data-cust="${id}"><span class="rk">${num(i + 1)}</span><span class="cav sm">${esc((profileOf(id)?.c.name_fa || "؟")[0])}</span><span class="row-main"><span class="row-t">${esc(profileOf(id)?.c.name_fa || "")}</span><span class="row-s">${num(n)} بار</span></span>${icon("chev", "chev")}</button>`).join("")}</div>` : empty("—"))}
    </div>`;
}
function personPage() {
  const x = person(A().pid); if (!x) return empty("پیدا نشد");
  const P = per(), all = done(X.orders()), c = all.filter((o) => o.day < P && o.staff === x.id), team = all.filter((o) => o.day < P && o.branch === x.branch && o.staff);
  const r = c.filter((o) => o.rating), tr = team.filter((o) => o.rating);
  const daily = Array.from({ length: P }, (_, i) => c.filter((o) => o.day === P - i).length);
  const hours = {}; c.forEach((o) => { hours[o.hour] = (hours[o.hour] || 0) + 1; });
  const it = {}; c.forEach((o) => o.lines.forEach((l) => { it[l.id] = (it[l.id] || 0) + l.qty; }));
  const top = Object.entries(it).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sh = shiftOf(x), hrs = sh.filter((s) => s !== "off").length * 8, pay = x.wage * hrs * 4.33;
  const notes = ((A().snotes || {})[x.id] || []).slice().reverse();
  const hc = docsAll().find((d) => d.who === x.id);
  const nTeam = new Set(team.map((o) => o.staff)).size || 1;
  return `<div class="c360-top"><button class="back-link" data-go="staff">${icon("back")}پرسنل</button>${periodBar(P)}</div>
    <section class="card c360-head"><span class="cav xl">${esc(x.name_fa[0])}</span><div class="ch-main"><h2>${esc(x.name_fa)}</h2><p class="ch-sub">${pill(esc(x.role_fa), "info")}<span>${link("branch", x.branch, esc(bname(x.branch)))}</span><span>از ${faDate(x.since, { month: "long", year: "numeric" })} – ${fa1((Date.now() - x.since) / DAY / 365)} سال سابقه</span>${hc ? (hc.left < 0 ? pill("کارت بهداشت منقضی", "bad") : pill(`کارت بهداشت تا ${faDate(hc.exp)}`, "ok")) : ""}</p></div>
      <div class="ch-acts"><button class="btn btn--sm" data-pact="bonus">${icon("gift")}پاداش</button><button class="btn btn--sm btn--soft" data-pact="warn">${icon("info")}تذکر</button><button class="btn btn--sm btn--soft" data-go="staffing">${icon("clock")}نیرو و شیفت</button></div></section>
    <div class="kpis k4">${kpi("سفارش", num(c.length), `میانگین تیم ${num(Math.round(team.length / nTeam))}`)}${kpi("فروش", kk(sum(c)))}${kpi("آماده‌سازی", mins(avg(c, (o) => o.prep)), `تیم ${mins(avg(team, (o) => o.prep))}`)}${kpi("امتیاز مشتری", r.length ? `${fa1(avg(r, (o) => o.rating))}<small> از ۵</small>` : "—", `تیم ${fa1(avg(tr, (o) => o.rating))}`)}
      ${kpi("انعام", kk(x.tips))}${kpi("تأخیر ۳۰ روز", num(x.late30), x.sick30 ? `${num(x.sick30)} روز مرخصی استعلاجی` : "بدون مرخصی")}${kpi("ساعت کار هفتگی", num(hrs), hrs > 44 ? pill("اضافه‌کار", "warn") : "")}${kpi("حقوق ماهانه‌ی تقریبی", kk(pay), `ساعتی ${kk(x.wage)}`)}</div>
    ${card("سفارش‌های روزانه", lines([{ vals: daily, label: "سفارش" }], daily.map((_, i) => digits(new Date(X.S.today0 - (P - i) * DAY).getDate())), { fmt: num, h: 180, tips: daily.map((_, i) => fmtDay(new Date(X.S.today0 - (P - i) * DAY))) }), { cls: "wide" })}
    <div class="cards g2">
      ${card("برنامه‌ی این هفته", `<div class="wk">${WD.map((w, i) => `<div class="wk-d ${sh[i]}"><small>${w}</small><b>${{ M: "صبح", E: "عصر", off: "آف" }[sh[i]]}</b></div>`).join("")}</div>`)}
      ${card("ساعت‌های کاری‌اش", hourBars(hours, {}))}
      ${card("بیشتر چی درست کرده", barsH(top.map(([id, n]) => ({ l: link("item", id, esc(loc(item(id)))), v: n }))))}
      ${card("یادداشت مدیر", `<div class="note-add"><textarea class="note-in" id="pn-t" rows="2" placeholder="مثلاً: لاته‌آرتش عالیه، صبح‌ها دیر میاد"></textarea><button class="btn btn--sm" data-pact="note">${icon("plus")}ثبت</button></div>${notes.length ? `<div class="notes">${notes.map((n) => `<div class="note"><p>${esc(n.t)}</p><span class="tiny">${fmtDay(new Date(n.at))}${n.k ? ` – ${n.k === "bonus" ? "پاداش" : "تذکر"}` : ""}</span></div>`).join("")}</div>` : ""}`)}
    </div>`;
}
function branchPage() {
  const b = BRANCHES.find((x) => x.id === A().bid); if (!b) return empty("پیدا نشد");
  const P = per(), all = done(X.orders()), c = all.filter((o) => o.day < P && o.branch === b.id), p = all.filter((o) => o.day >= P && o.day < P * 2 && o.branch === b.id);
  const L = pnl(X.orders().filter((o) => o.day < P && o.branch === b.id), P, [b.id]);
  const daily = Array.from({ length: P }, (_, i) => sum(c.filter((o) => o.day === P - i)));
  const hm = WD.map(() => Array(16).fill(0)); c.forEach((o) => { if (o.hour >= 8 && o.hour < 24) hm[wdi(o.at)][o.hour - 8]++; });
  const it = {}; c.forEach((o) => o.lines.forEach((l) => { it[l.id] = (it[l.id] || 0) + l.qty; }));
  const top = Object.entries(it).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const team = X.S.staff.filter((x) => x.branch === b.id);
  const r = c.filter((o) => o.rating), rv = X.S.reviews.filter((x) => x.branch === b.id && Date.now() - x.at < P * DAY);
  const docs = docsAll().filter((d) => d.br === b.id && d.left <= 45), eq = assetsAll().filter((a) => a.br === b.id && a.next < X.S.today0 + 14 * DAY);
  const low = X.stock().filter((s) => s.branch === b.id && s.qty / s.daily < X.cfg().low);
  return `<div class="c360-top"><button class="back-link" data-go="branches">${icon("back")}شعبه‌ها</button>${periodBar(P)}</div>
    <section class="card c360-head"><span class="cav xl">${esc(loc(b)[0])}</span><div class="ch-main"><h2>شعبه‌ی ${esc(loc(b))}</h2><p class="ch-sub">${pill(`${num(team.length)} نفر پرسنل`, "info")}<span>${num(X.S.customers.filter((x) => x.branch === b.id).length)} عضو باشگاه</span>${low.length ? pill(`${num(low.length)} قلم انبار کمه`, "warn") : ""}</p></div>
      <div class="ch-acts"><button class="btn btn--sm btn--soft" data-x="scope" data-b="${b.id}">${icon("pin")}فقط همین شعبه رو نشون بده</button></div></section>
    <div class="kpis k4">${kpi("فروش", kk(sum(c)), sum(p) ? `${sum(c) >= sum(p) ? "▲" : "▼"} ٪${digits(Math.abs(Math.round(((sum(c) - sum(p)) / sum(p)) * 100)))}` : "")}${kpi("سفارش", num(c.length), `میانگین ${kk(avg(c, (o) => o.total))}`)}${kpi("سود خالص", `<span class="${L.np < 0 ? "neg" : ""}">${kk(Math.abs(L.np))}</span>`, `حاشیه ${pct(Math.round((L.np / (L.net || 1)) * 100))}`)}${kpi("امتیاز مشتری", `${fa1(avg(r, (o) => o.rating))}<small> از ۵</small>`, `${num(rv.length)} نظر`)}</div>
    ${card("فروش روزانه", lines([{ vals: daily, label: "فروش" }], daily.map((_, i) => digits(new Date(X.S.today0 - (P - i) * DAY).getDate())), { h: 200, tips: daily.map((_, i) => fmtDay(new Date(X.S.today0 - (P - i) * DAY))) }), { cls: "wide" })}
    <div class="cards g2">
      ${card("شلوغی هفته", heat(WD, Array.from({ length: 16 }, (_, i) => digits(i + 8)), hm))}
      ${card("سود و زیان خلاصه", `<div class="pl-mini">${[["فروش خالص", L.net], ["مواد اولیه", -L.cogs], ["حقوق", -L.wages], ["اجاره", -L.rent], ["قبوض", -L.util], ["سایر", -(L.mkt + L.soft + L.waste + L.fees + L.extra + L.vat)], ["سود خالص", L.np]].map(([l, v], i, a) => `<div class="${i === a.length - 1 ? "tot" : ""}"><span>${l}</span><b class="${v < 0 ? "neg" : ""}">${kk(Math.abs(v))}</b></div>`).join("")}</div>`)}
      ${card("پرفروش‌ها", barsH(top.map(([id, n]) => ({ l: link("item", id, esc(loc(item(id)))), v: n }))))}
      ${card("تیم", `<div class="refs">${team.map((x) => `<button class="ref" data-person="${x.id}"><span class="rk"></span><span class="cav sm">${esc(x.name_fa[0])}</span><span class="row-main"><span class="row-t">${esc(x.name_fa)}</span><span class="row-s">${esc(x.role_fa)} – ${num(c.filter((o) => o.staff === x.id).length)} سفارش</span></span>${icon("chev", "chev")}</button>`).join("")}</div>`)}
      ${card("باید حواست باشه", [...docs.map((d) => `<div class="cal-e"><i class="k-doc"></i><span>${esc(d.t)} – ${d.left < 0 ? "منقضی" : relDays(d.exp)}</span><button class="link sm" data-go="docs">ببین</button></div>`), ...eq.map((a) => `<div class="cal-e"><i class="k-svc"></i><span>سرویس ${esc(a.n)} – ${relDays(a.next)}</span><button class="link sm" data-go="assets">ببین</button></div>`), ...low.map((s) => `<div class="cal-e"><i class="k-bill"></i><span>${esc(STOCK.find((x) => x.id === s.item)?.n || "")} – ${fa1(s.qty / s.daily)} روز مونده</span><button class="link sm" data-go="inventory">ببین</button></div>`)].join("") || `<p class="small">همه‌چی مرتبه 👌</p>`)}
      ${card("آخرین نظرها", rv.length ? `<div class="rlist">${rv.slice(-4).reverse().map((x) => `<div class="rv-i"><div class="rv-top"><span class="stars">${"★".repeat(x.rating)}<i>${"★".repeat(5 - x.rating)}</i></span><b>${TOPICS[x.topic]}</b></div><p>${esc(x.text_fa)}</p></div>`).join("")}</div>` : empty("—"))}
    </div>`;
}

/* ===================================================== notification tray */
export function openBell(btn) {
  const old = $(".bell-pop"); if (old) { old.remove(); return; }
  const al = alerts().slice(0, 7), r = btn.getBoundingClientRect();
  const pop = document.createElement("div"); pop.className = "bell-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "هشدارها");
  pop.style.top = `${r.bottom + 8}px`; pop.style.left = `${Math.max(8, r.left)}px`;
  pop.innerHTML = `<div class="bp-h"><b>هشدارها</b><span class="tiny">${num(alerts().length)} مورد</span></div>${al.length ? al.map((a) => `<button class="bp-i ${a.k}" data-go="${a.act?.[1] || "alerts"}"><span class="nba-ic">${icon(a.ic)}</span><span class="row-main"><span class="row-t">${esc(a.t)}</span><span class="row-s">${esc(a.s || "")}</span></span></button>`).join("") : `<p class="small" style="padding:16px">همه‌چی آرومه 👌</p>`}<button class="bp-all" data-go="alerts">همه‌ی هشدارها</button>`;
  document.body.appendChild(pop);
  $$("[data-go]", pop).forEach((b) => b.addEventListener("click", () => { pop.remove(); X.go(b.dataset.go); }));
  setTimeout(() => { const off = (e) => { if (!pop.contains(e.target) && e.target !== btn && !btn.contains(e.target)) { pop.remove(); removeEventListener("pointerdown", off, true); } }; addEventListener("pointerdown", off, true); }, 0);
}

// extra alerts the main list should know about
export function extraAlerts() {
  const out = [];
  const exp = docsAll().filter((d) => d.left < 0), soon = docsAll().filter((d) => d.left >= 0 && d.left <= 14);
  if (exp.length) out.push({ r: "docs", k: "bad", ic: "shield", t: `${num(exp.length)} مدرک منقضی شده`, s: exp.slice(0, 2).map((d) => d.t).join("، "), act: ["مدارک", "docs"] });
  if (soon.length) out.push({ r: "docs", k: "warn", ic: "shield", t: `${num(soon.length)} مدرک تا ۲ هفته دیگه تموم می‌شه`, s: soon.slice(0, 2).map((d) => d.t).join("، "), act: ["مدارک", "docs"] });
  const late = billsAll().filter((b) => !b.paid && b.left < 0);
  if (late.length) out.push({ r: "bills", k: "warn", ic: "receipt", t: `${num(late.length)} فاکتور سررسیدش گذشته`, s: `${kmoney(sum(late, (b) => b.amt))} تومان`, act: ["نقدینگی", "cashflow"] });
  const svc = assetsAll().filter((a) => a.next < X.S.today0);
  if (svc.length) out.push({ r: "assets", k: "info", ic: "gear", t: `${num(svc.length)} دستگاه سرویسش عقب افتاده`, s: svc.slice(0, 2).map((a) => `${a.n} – ${bname(a.br)}`).join("، "), act: ["تجهیزات", "assets"] });
  const tk = ticketsAll().filter((t) => t.st === "open" && Date.now() - t.at > 864e5);
  if (tk.length) out.push({ r: "tickets", k: "warn", ic: "info", t: `${num(tk.length)} شکایت بیشتر از ۲۴ ساعته بی‌جواب مونده`, s: "یکی باید برداره", act: ["شکایت‌ها", "tickets"] });
  return out;
}

/* ================================================================ wire */
export function wireExtra(el) {
  const on = (sel, ev, fn) => $$(sel, el).forEach((b) => b.addEventListener(ev, () => fn(b)));
  on("[data-item]", "click", (b) => { X.setA({ iid: b.dataset.item }); X.go("item"); });
  on("[data-person]", "click", (b) => { X.setA({ pid: b.dataset.person }); X.go("person"); });
  on("[data-branch]", "click", (b) => { X.setA({ bid: b.dataset.branch }); X.go("branch"); });
  on("[data-x]", "click", (b) => xAct(b.dataset.x, b, el));
  on("[data-pay]", "click", (b) => { X.setA({ billsPaid: { ...(A().billsPaid || {}), [b.dataset.pay]: Date.now() } }); X.log(`فاکتور ${b.dataset.pay} رو پرداخت کرد`); toast("ثبت شد: پرداخت شد", "check"); X.render(); });
  on("[data-unpay]", "click", (b) => { const p = { ...(A().billsPaid || {}) }; delete p[b.dataset.unpay]; X.setA({ billsPaid: p }); X.render(); });
  on("[data-delloan]", "click", (b) => { X.setA({ loans: (A().loans || []).filter((_, i) => i !== +b.dataset.delloan) }); X.render(); });
  on("[data-np]", "change", (b) => { const v = toNum(b.value); if (v) draft[b.dataset.np] = Math.round(v / 1000) * 1000; else delete draft[b.dataset.np]; X.render(); });
  on("[data-sugg]", "click", (b) => { draft[b.dataset.sugg] = +b.dataset.v; X.render(); });
  on("[data-shock]", "input", (b) => { b.nextElementSibling.textContent = `٪${digits(b.value)}`; });
  on("[data-shock]", "change", (b) => { X.setA({ shock: { ...(A().shock || {}), [b.dataset.shock]: +b.value } }); X.render(); });
  on("[data-tkm]", "click", (b) => { const st = { ...(A().tk || {}) }; st[b.dataset.tkm] = { ...(st[b.dataset.tkm] || {}), st: b.dataset.to, ...(b.dataset.to === "done" ? { closed: Date.now() } : {}) }; X.setA({ tk: st }); X.log(`شکایت ${b.dataset.tkm} → ${b.dataset.to}`); haptic(8); X.render(); });
  on("[data-tko]", "change", (b) => { const st = { ...(A().tk || {}) }; st[b.dataset.tko] = { ...(st[b.dataset.tko] || {}), owner: b.value, st: (st[b.dataset.tko] || {}).st || "doing" }; X.setA({ tk: st }); toast("مسئول تعیین شد", "check"); X.render(); });
  on("[data-sfb]", "click", (b) => { sfB = b.dataset.sfb; X.render(); });
  on("[data-sfd]", "click", (b) => { sfD = +b.dataset.sfd; X.render(); });
  on("[data-lbk]", "click", (b) => { lbK = b.dataset.lbk; X.render(); });
  on("[data-asb]", "click", (b) => { asB = b.dataset.asb; X.render(); });
  on("[data-svc]", "click", (b) => { X.setA({ svc: { ...(A().svc || {}), [b.dataset.svc]: X.S.today0 } }); X.log(`سرویس ${b.dataset.svc} ثبت شد`); toast("سرویس ثبت شد", "check"); X.render(); });
  on("[data-brk]", "click", (b) => {
    sheet(`<h2>ثبت خرابی</h2><label class="field"><span>چی شده</span><input id="bk-d" placeholder="مثلاً: فشار بویلر پایینه"></label><label class="field"><span>هزینه‌ی تعمیر (اختیاری)</span><input id="bk-c" inputmode="numeric"></label><button class="btn btn--block" id="bk-go" style="margin-top:14px">ثبت</button>`, { label: "خرابی", onMount(s) {
      $("#bk-go", s).addEventListener("click", () => { X.setA({ breaks: [...(A().breaks || []), { id: b.dataset.brk, at: Date.now(), d: $("#bk-d", s).value.trim() || "—", cost: toNum($("#bk-c", s).value) }] }); closeSheet(); toast("ثبت شد", "check"); X.render(); });
    } });
  });
  on("[data-df]", "click", (b) => { dF = b.dataset.df; X.render(); });
  on("[data-renew]", "click", (b) => { const span = +b.dataset.span || 365; X.setA({ docRenew: { ...(A().docRenew || {}), [b.dataset.renew]: X.S.today0 + span * DAY } }); X.log(`مدرک ${b.dataset.renew} تمدید شد`); toast("تمدید شد", "check"); X.render(); });
  on("[data-cal]", "click", (b) => { calOff = +b.dataset.cal === 0 ? 0 : calOff + +b.dataset.cal; calSel = null; X.render(); });
  on("[data-day]", "click", (b) => { calSel = +b.dataset.day; X.render(); });
  on("[data-delcal]", "click", (b) => { X.setA({ cal: (A().cal || []).filter((x) => x.id !== b.dataset.delcal) }); X.render(); });
  on("[data-pact]", "click", (b) => {
    const k = b.dataset.pact, id = A().pid, sn = { ...(A().snotes || {}) };
    if (k === "note") { const t = $("#pn-t", el).value.trim(); if (!t) return; sn[id] = [...(sn[id] || []), { at: Date.now(), t }]; X.setA({ snotes: sn }); toast("ثبت شد", "note"); return X.render(); }
    sheet(`<h2>${k === "bonus" ? "پاداش" : "تذکر"} برای ${esc(person(id).name_fa)}</h2><label class="field"><span>${k === "bonus" ? "مبلغ و دلیل" : "دلیل"}</span><textarea id="pa-t" rows="3"></textarea></label><button class="btn btn--block" id="pa-go" style="margin-top:14px">ثبت</button>`, { label: k, onMount(s) {
      $("#pa-go", s).addEventListener("click", () => { const t = $("#pa-t", s).value.trim() || "—"; sn[id] = [...(sn[id] || []), { at: Date.now(), t, k }]; X.setA({ snotes: sn }); X.log(`${k === "bonus" ? "پاداش" : "تذکر"} برای ${person(id).name_fa}`); closeSheet(); toast("ثبت شد", "check"); X.render(); });
    } });
  });
}
function xAct(k, b, el) {
  const ask = (title, val, cb) => sheet(`<h2>${title}</h2><div class="money-in" style="margin-top:14px"><input id="ak-v" inputmode="numeric" value="${val}"></div><button class="btn btn--block" id="ak-go" style="margin-top:14px">ذخیره</button>`, { label: title, onMount(s) { const i = $("#ak-v", s); i.focus(); i.select(); $("#ak-go", s).addEventListener("click", () => { const v = toNum(i.value); if (v >= 0) { cb(v); closeSheet(); X.render(); } }); } });
  if (k === "copybrief") { try { navigator.clipboard.writeText(briefText()); } catch (e) {} toast("کپی شد؛ بفرست تو گروه", "copy"); }
  else if (k === "tv") tvMode();
  else if (k === "bank") ask("موجودی حساب (تومان)", num(A().bank ?? 2.6e9), (v) => { X.setA({ bank: v }); X.log("موجودی حساب رو به‌روز کرد"); });
  else if (k === "tmargin") ask("حاشیه‌ی سود هدف (٪)", digits(A().tmargin ?? 72), (v) => X.setA({ tmargin: Math.min(95, Math.max(10, v)) }));
  else if (k === "pclear") { draft = {}; X.render(); }
  else if (k === "papply") {
    const ch = Object.entries(draft);
    setHub((h) => ({ prices: { ...h.prices, ...Object.fromEntries(ch.map(([id, v]) => [id, v === item(id).price ? undefined : v])) } }));
    X.log(`${num(ch.length)} قیمت رو از آزمایشگاه قیمت عوض کرد`); draft = {}; toast("قیمت‌ها تو اپ عوض شد", "tag"); X.render();
  } else if (k === "addbill") {
    sheet(`<h2>پرداختی تازه</h2><label class="field"><span>بابت</span><input id="ab-t" placeholder="مثلاً تعمیر کولر"></label><label class="field"><span>مبلغ (تومان)</span><input id="ab-a" inputmode="numeric"></label><label class="field"><span>چند روز دیگه</span><input id="ab-d" inputmode="numeric" value="7"></label><button class="btn btn--block" id="ab-go" style="margin-top:14px">ثبت</button>`, { label: "پرداختی", onMount(s) {
      $("#ab-go", s).addEventListener("click", () => { const amt = toNum($("#ab-a", s).value); if (!amt) return; X.setA({ bills: [...(A().bills || []), { id: "U" + Date.now(), t: $("#ab-t", s).value.trim() || "پرداختی", amt, due: X.S.today0 + toNum($("#ab-d", s).value) * DAY }] }); closeSheet(); toast("ثبت شد", "check"); X.render(); });
    } });
  } else if (k === "addloan") { const t = $("#ln-t", el).value.trim(), amt = toNum($("#ln-a", el).value); if (!t || !amt) return; X.setA({ loans: [...(A().loans || []), { t, amt, day: Math.max(0, toNum($("#ln-d", el).value)) }] }); X.render(); }
  else if (k === "addtk") { const t = $("#tk-t", el).value.trim(); if (!t) { $("#tk-t", el).focus(); return; } X.setA({ tickets: [...(A().tickets || []), { id: "T" + Date.now(), at: Date.now(), br: $("#tk-b", el).value, pr: $("#tk-p", el).value, t, d: $("#tk-d", el).value.trim(), src: "manual" }] }); X.log(`شکایت ثبت کرد: ${t}`); toast("ثبت شد", "check"); X.render(); }
  else if (k === "adddoc") { const t = $("#dc-t", el).value.trim(); if (!t) return; X.setA({ docs: [...(A().docs || []), { id: "D" + Date.now(), k: "other", t, br: $("#dc-b", el).value, exp: X.S.today0 + toNum($("#dc-d", el).value || 365) * DAY, span: 365 }] }); toast("ثبت شد", "check"); X.render(); }
  else if (k === "addcal") { const t = $("#cal-t", el).value.trim(); if (!t) return; const d = +($(".cal-d.sel", el)?.dataset.day || X.S.today0); X.setA({ cal: [...(A().cal || []), { id: "C" + Date.now(), d, t }] }); X.render(); }
  else if (k === "scope") { X.setScope?.(b.dataset.b); }
}

export const EXTRA = { brief, cashflow, pricing, basket, tickets, staffing, leaderboard, assets, docs, calendar, item: itemPage, person: personPage, branch: branchPage };
export const extraTitle = (sec) => sec === "item" ? loc(item(A().iid) || {}) : sec === "person" ? person(A().pid)?.name_fa : sec === "branch" ? `شعبه‌ی ${bname(A().bid)}` : "";
