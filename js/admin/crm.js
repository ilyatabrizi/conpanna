// پرونده‌ی مشتری — every member and everything we know about them: who they
// are, how they found us, what they drink and when, what they're worth, whether
// they're drifting, and what to do about it. One directory with real filters
// and bulk actions, one profile page per person. Facts the seed doesn't carry
// (source, contact handles, preferences) are filled in deterministically from
// the customer's id, so a person looks the same every time you open them.
import { $, $$, esc, icon, toast, haptic, sheet, closeSheet, num, digits, pct, kmoney, moneyText, fmtDay, fmtTime, loc, tile, segmented } from "../ui.js";
import { MENU, BRANCHES, CATEGORIES, TIERS } from "../data.js";
import { getHub, setHub } from "../hub.js";
import { DAY, T, kk, sum, avg, fa1, kpi, card, pill, empty, table, meter, heat, csv } from "./kit.js";
import { rng, TOPICS } from "./seed.js";
import { referralCode } from "../store.js";
import { barsH } from "./ceo.js";

let X;
export function initCrm(ctx) { X = ctx; }
const A = () => X.A();
const item = (id) => MENU.find((m) => m.id === id);
const bname = (id) => loc(BRANCHES.find((b) => b.id === id) || {});
const tierOf = (p) => [...TIERS].reverse().find((t) => p >= t.min);
const nextTier = (p) => TIERS.find((t) => t.min > p);
const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const relD = (t) => { const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? "امروز" : d === 1 ? "دیروز" : `${num(d)} روز پیش`; };
const sla = () => (X.cfg?.().sla || 8) * 60;
const MILK = new Set(MENU.filter((m) => m.opts === "milk").map((m) => m.id));
const WDF = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const wdi = (t) => (new Date(t).getDay() + 1) % 7;
const PARTS = ["صبح", "ظهر", "عصر", "شب"];
const part = (h) => (h < 11 ? 0 : h < 15 ? 1 : h < 19 ? 2 : 3);
const faBday = (d) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long" }).format(d);
const toBday = (d) => { if (!d) return 999; const n = new Date(); n.setHours(0, 0, 0, 0); const b = new Date(n.getFullYear(), d.getMonth(), d.getDate()); if (b < n) b.setFullYear(n.getFullYear() + 1); return Math.round((b - n) / DAY); };
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const wp = (R, arr, w) => { let r = R() * w.reduce((s, x) => s + x, 0); for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r < 0) return arr[i]; } return arr.at(-1); };
const norm = (s) => String(s || "").toLowerCase().replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[•\s‌@]/g, "");

export const SOURCES = [
  ["insta", "اینستاگرام", 32, "#C9A57C"], ["walkin", "از جلوی کافه", 25, "#94653A"], ["friend", "معرفی دوست", 16, "#3C9560"],
  ["maps", "نقشه (نشان و گوگل)", 13, "#5B7FA6"], ["event", "رویدادها", 7, "#B4392F"], ["sms", "پیامک تبلیغاتی", 7, "#8E7AB5"],
];
export const SRC = Object.fromEntries(SOURCES.map(([k, n, , c]) => [k, { n, c }]));
const HOODS = { valiasr: ["ونک", "جردن", "یوسف‌آباد", "میرداماد"], elahiparast: ["الهیه", "فرشته", "زعفرانیه", "قیطریه"], aseman: ["سعادت‌آباد", "شهرک غرب", "پونک", "دریا"], lalehpark: ["امیرآباد", "فاطمی", "بلوار کشاورز", "یوسف‌آباد"], esfahan: ["چهارباغ", "جلفا", "مرداویج", "نظر"] };
const ALLERGY = ["به بادوم‌زمینی حساسیت داره", "لاکتوز نمی‌تونه بخوره؛ فقط شیر گیاهی", "گلوتن نمی‌خوره", "به دارچین حساسیت داره"];
const SEATS = ["کنار پنجره", "پشت بار، نزدیک باریستا", "حیاط", "میز بزرگ وسط", "گوشه‌ی دنج طبقه‌ی بالا"];
const AGES = [["۱۸ تا ۲۴", 26], ["۲۵ تا ۳۴", 41], ["۳۵ تا ۴۴", 22], ["۴۵ به بالا", 11]];
const CH = { sms: "پیامک", push: "اعلان اپ", email: "ایمیل" };
const MST = { sent: ["رسید", ""], open: ["باز کرد", "info"], used: ["استفاده کرد", "ok"] };

/* ------------------------------------------------------------ the numbers */
function stat(c, list) {
  const now = Date.now();
  const d = list.filter((o) => o.status === "done").sort((a, b) => a.at - b.at);
  const n = d.length;
  const gaps = []; for (let i = 1; i < n; i++) gaps.push((d[i].at - d[i - 1].at) / DAY);
  const g = med(gaps.filter((x) => x > 0.25)); // two orders the same day are one visit
  const last = n ? d[n - 1].at : c.last || c.joined, first = n ? d[0].at : c.joined;
  const rec = (now - last) / DAY, r = rec / Math.max(3, g || 14);
  const risk = Math.round(n < 2 ? Math.min(90, 30 + rec * 1.1) : r <= 1 ? 5 + r * 15 : Math.min(97, 20 + (r - 1) * 24));
  const spend = sum(d), cost = sum(d, (o) => o.cost);
  const monthly = (spend / Math.max(21, (now - first) / DAY)) * 30;
  let milk = 0, oat = 0;
  d.forEach((o) => o.lines.forEach((l) => { if (MILK.has(l.id)) { milk += l.qty; if (l.oat) oat += l.qty; } }));
  const cnt = (f) => d.filter(f).length;
  return { n, list, done: d, cancel: list.length - n, spend, cost, profit: spend - cost, disc: sum(d, (o) => o.discount || 0), promo: cnt((o) => o.promo), avgT: n ? spend / n : 0, items: n ? sum(d, (o) => o.qty) / n : 0,
    gap: g, rec, risk, last, first, next: g ? last + g * DAY : 0, monthly, ltv: monthly * 12 * Math.max(0.05, 1 - risk / 100),
    oat: milk ? oat / milk : 0, app: n ? cnt((o) => o.channel === "app") / n : 0, dine: n ? cnt((o) => o.mode === "dinein") / n : 0,
    pay: { card: cnt((o) => o.pay === "card"), cash: cnt((o) => o.pay === "cash"), online: cnt((o) => o.pay === "online") },
    prep: n ? sum(d, (o) => o.prep) / n : 0, slow: cnt((o) => o.prep > sla()), rated: d.filter((o) => o.rating), top: 1 };
}
function enrich(c, s, refs) {
  const R = rng(hash(c.id));
  const tagIds = c.tags.map((t) => t[0]);
  const handle = c.name.toLowerCase().replace(/[^a-z ]/g, "").trim().split(/\s+/).join(R() < .5 ? "." : "_") + (R() < .45 ? String(Math.floor(R() * 90 + 10)) : "");
  let src = wp(R, SOURCES.map((x) => x[0]), SOURCES.map((x) => x[2])), ref = null;
  if (src === "friend") { const pool = refs.filter((x) => x.id !== c.id && x.joined < c.joined); if (pool.length) ref = pool[Math.floor(R() * pool.length)].id; else src = "walkin"; }
  if (tagIds.includes("Event-goer") && R() < .4) src = "event";
  const appUser = s.app > 0, email = R() < .52 ? `${handle}@${wp(R, ["gmail.com", "yahoo.com", "outlook.com"], [70, 18, 12])}` : null;
  const seatR = R(), tempR = R(), allR = R();
  return {
    handle, src, ref, email, ig: R() < .6 ? handle : null,
    age: tagIds.includes("Student") ? AGES[0][0] : wp(R, AGES.map((a) => a[0]), AGES.map((a) => a[1])),
    allergy: allR < .1 ? ALLERGY[Math.floor(R() * ALLERGY.length)] : null,
    sweet: tagIds.includes("Sweet tooth") ? "شیرین" : wp(R, ["کم‌شیرین", "معمولی", "بدون شکر"], [40, 45, 15]),
    seat: s.dine > 0.3 ? SEATS[Math.floor(seatR * SEATS.length)] : null,
    temp: tempR < .14 ? "نوشیدنی رو خیلی داغ می‌خواد" : tempR < .24 ? "یخ کم بریزید" : null,
    bday: new Date(new Date().getFullYear(), c.bmonth, 1 + Math.floor(R() * 28)),
    hood: (HOODS[c.branch] || HOODS.valiasr)[Math.floor(R() * 4)],
    device: appUser ? (R() < .44 ? "iOS" : "Android") : null, ver: appUser ? wp(R, ["2.4.1", "2.4.0", "2.3.7"], [70, 20, 10]) : null,
    consent: { sms: R() < .86, push: appUser && R() < .8, email: !!email && R() < .55 },
    full: c.phone.replace("•••", String(100 + Math.floor(R() * 900))),
    laptop: tagIds.includes("Remote worker"), oatFan: tagIds.includes("Oat milk"),
  };
}

let IX = null;
function ix() {
  if (IX) return IX;
  const by = new Map(), rv = new Map(), st = new Map(), ex = new Map(), inv = new Map();
  const push = (m, k, v) => { let a = m.get(k); if (!a) m.set(k, (a = [])); a.push(v); };
  X.S.orders.forEach((o) => o.customer && push(by, o.customer, o));
  X.S.reviews.forEach((r) => r.customer && push(rv, r.customer, r));
  const refs = X.S.customers.filter((c) => c.referrals);
  X.S.customers.forEach((c) => st.set(c.id, stat(c, by.get(c.id) || [])));
  X.S.customers.forEach((c) => {
    const e = enrich(c, st.get(c.id), refs); ex.set(c.id, e);
    if (e.ref) push(inv, e.ref, c.id);
    if (e.oatFan) st.get(c.id).oat = Math.max(st.get(c.id).oat, 0.7 + (hash(c.id) % 25) / 100);
  });
  [...X.S.customers].sort((a, b) => b.spend - a.spend).forEach((c, i, all) => { st.get(c.id).top = (i + 1) / all.length; });
  return (IX = { by, rv, st, ex, inv });
}
// the person using the customer app on this very phone, live
function appProfile() {
  const s = X.app(), u = s.user; if (!u) return null;
  const list = X.orders().filter((o) => o.customer === "APP");
  const bc = {}; list.forEach((o) => { bc[o.branch] = (bc[o.branch] || 0) + 1; });
  const bd = u.birthday ? new Date(u.birthday) : null, okB = bd && !isNaN(bd);
  const c = { id: "APP", name: u.name, name_fa: u.name, phone: u.phone, branch: Object.entries(bc).sort((a, b) => b[1] - a[1])[0]?.[0] || s.branch || BRANCHES[0].id,
    joined: u.since || Date.now(), last: 0, spend: sum(list), points: s.points, tags: [], bmonth: okB ? bd.getMonth() : 0, live: true };
  const st = stat(c, list);
  const e = { src: u.invitedBy ? "friend" : "insta", ref: null, refCode: u.invitedBy, email: null, ig: null, age: null, allergy: null, sweet: null, seat: null, temp: null,
    bday: okB ? bd : null, hood: null, device: /iPhone|iPad|Mac/.test(navigator.userAgent) ? "iOS" : "Android", ver: "2.4.1", consent: { sms: true, push: true, email: false }, full: u.phone };
  const reviews = list.filter((o) => o.rating).map((o) => ({ id: o.id, rating: o.rating, topic: null, text_fa: "از اپ امتیاز داد", at: o.at + 20 * 60e3, branch: o.branch }));
  return { c, st, e, reviews };
}
export function profileOf(id) {
  if (id === "APP") return appProfile();
  const c = X.S.customers.find((x) => x.id === id); if (!c) return null;
  const I = ix();
  return { c, st: I.st.get(id), e: I.ex.get(id), reviews: I.rv.get(id) || [] };
}
const nameOf = (id) => (id === "APP" ? X.app().user?.name : X.S.customers.find((c) => c.id === id)?.name_fa) || "";
function status(c, s) {
  if (Date.now() - c.joined < 14 * DAY) return ["تازه‌وارد", "info"];
  if (s.rec > 60) return ["از دست رفته", "bad"];
  if (s.risk >= 60 && s.n >= 2) return ["داره می‌ره", "warn"];
  if (s.n >= 8 && s.rec < 21) return ["مشتری ثابت", "ok"];
  return ["گاه‌به‌گاه", ""];
}
const tagsOf = (c) => [...c.tags.map((t) => t[1]), ...((A().ctags || {})[c.id] || [])];
const riskK = (r) => (r >= 60 ? "bad" : r >= 35 ? "warn" : "ok");

// for the command palette
export function searchCustomers(q, n = 6) {
  const k = norm(q); if (!k) return [];
  const { ex } = ix();
  const me = X.app().user;
  const out = me && norm(me.name + me.phone).includes(k) ? [{ id: "APP", n: me.name, s: "همین گوشی" }] : [];
  for (const c of X.S.customers) {
    if (out.length >= n) break;
    const e = ex.get(c.id);
    if (norm(c.name + c.name_fa + c.phone + e.full + c.id + (e.ig || "")).includes(k)) out.push({ id: c.id, n: c.name_fa, s: `${bname(c.branch)} – ${num(c.visits)} بار` });
  }
  return out;
}
export function openCustomer(id) { X.setA({ cid: id, recentC: [id, ...(A().recentC || []).filter((x) => x !== id)].slice(0, 5) }); tlN = 25; ordN = 12; tlF = "all"; X.go("customer"); }
export const members = () => pool();
export const invites = () => ix().inv;

/* -------------------------------------------------------------- directory */
const F0 = () => ({ q: "", seg: "all", branch: "", tier: "", src: "", last: "", minV: 0, minS: 0, tag: "", oat: false, app: false, sms: false, allergy: false, notes: false, sort: "spend" });
let F = F0(), page = 50, fOpen = false;
const SEL = new Set();
const SEGS = [
  ["all", "همه", () => true],
  ["vip", "طلایی‌ها", (c) => tierOf(c.points).id === "gold"],
  ["regular", "ثابت", (c, s) => s.n >= 8 && s.rec < 21],
  ["new", "تازه‌واردها", (c) => Date.now() - c.joined < 14 * DAY],
  ["risk", "دارن می‌رن", (c, s) => s.risk >= 60 && s.rec <= 60 && s.n >= 2],
  ["lost", "از دست رفته", (c, s) => s.rec > 60],
  ["bday", "تولدشون نزدیکه", (c, s, e) => toBday(e.bday) <= 14],
  ["flag", "پیگیری و ستاره‌دار", (c) => { const f = (A().cflags || {})[c.id]; return !!(f && (f.pin || f.follow)); }],
];
const SORTS = [["spend", "بیشترین خرید"], ["visits", "بیشترین دفعات"], ["last", "تازه‌ترین سر زدن"], ["joined", "تازه‌ترین عضو"], ["risk", "بیشترین ریسک رفتن"], ["avg", "بزرگ‌ترین فاکتور"], ["ltv", "بیشترین ارزش آینده"], ["name", "اسم"]];
const nFilters = () => ["branch", "tier", "src", "last", "minV", "minS", "tag", "oat", "app", "sms", "allergy", "notes"].filter((k) => F[k]).length;

function pool() { const { st, ex } = ix(); return X.S.customers.filter((c) => X.inScope(c.branch)).map((c) => ({ c, s: st.get(c.id), e: ex.get(c.id) })); }
function rowsFor() {
  const q = norm(F.q), seg = SEGS.find((s) => s[0] === F.seg) || SEGS[0];
  const notes = A().cnotes || {}, ct = A().ctags || {};
  const out = pool().filter(({ c, s, e }) => {
    if (!seg[2](c, s, e)) return false;
    if (q && !norm(`${c.name}${c.name_fa}${c.phone}${e.full}${c.id}${e.ig || ""}${e.email || ""}${(ct[c.id] || []).join("")}`).includes(q)) return false;
    if (F.branch && c.branch !== F.branch) return false;
    if (F.tier && tierOf(c.points).id !== F.tier) return false;
    if (F.src && e.src !== F.src) return false;
    if (F.last && (F.last === "60+" ? s.rec <= 60 : s.rec > +F.last)) return false;
    if (F.minV && s.n < F.minV) return false;
    if (F.minS && s.spend < F.minS * 1e6) return false;
    if (F.tag && !tagsOf(c).includes(F.tag)) return false;
    if (F.oat && s.oat < 0.4) return false;
    if (F.app && !s.app) return false;
    if (F.sms && !e.consent.sms) return false;
    if (F.allergy && !e.allergy) return false;
    if (F.notes && !(notes[c.id] || []).length) return false;
    return true;
  });
  const key = { spend: (r) => r.s.spend, visits: (r) => r.s.n, last: (r) => r.s.last, joined: (r) => r.c.joined, risk: (r) => r.s.risk, avg: (r) => r.s.avgT, ltv: (r) => r.s.ltv }[F.sort];
  return key ? out.sort((a, b) => key(b) - key(a)) : out.sort((a, b) => a.c.name_fa.localeCompare(b.c.name_fa, "fa"));
}
function followUps() {
  const fl = A().cflags || {}, end = new Date().setHours(23, 59, 59, 999);
  return Object.entries(fl).filter(([, f]) => f.follow && f.follow <= end).map(([id, f]) => ({ id, f })).filter(({ id }) => id === "APP" ? X.app().user : X.inScope(X.S.customers.find((c) => c.id === id)?.branch));
}

function rowHTML({ c, s, e }) {
  const t = tierOf(c.points), [stT, stK] = status(c, s), fl = (A().cflags || {})[c.id] || {}, tags = tagsOf(c);
  return `<div class="cr ${SEL.has(c.id) ? "sel" : ""}"><label class="ck-sel"><input type="checkbox" data-sel="${c.id}" ${SEL.has(c.id) ? "checked" : ""} aria-label="انتخاب ${esc(c.name_fa)}"><i></i></label>
    <button class="cr-main" data-cust="${c.id}">
      <span class="cav" style="--tier:${t.color}">${esc(c.name_fa[0])}</span>
      <span class="cr-who"><span class="row-t">${esc(c.name_fa)}${fl.pin ? `<span class="pin-ic" aria-label="ستاره‌دار">${icon("starF")}</span>` : ""}${e.allergy ? `<span class="pill bad" data-tip="${esc(e.allergy)}">حساسیت</span>` : ""}</span>
        <span class="row-s"><span class="tier-pill" style="--tier:${t.color}">${esc(loc(t))}</span>${pill(stT, stK)}${tags.slice(0, 2).map((x) => `<span class="ctag">${esc(x)}</span>`).join("")}</span></span>
      <span class="cr-c cr-br">${esc(bname(c.branch))}</span>
      <span class="cr-c">${relD(s.last)}</span>
      <span class="cr-c num">${num(s.n)}</span>
      <span class="cr-c num cr-sp"><b>${kk(s.spend)}</b></span>
      <span class="cr-c cr-risk">${meter(s.risk / 100, riskK(s.risk))}<small>${pct(s.risk)}</small></span>
      ${icon("chev", "chev")}
    </button></div>`;
}
function listHTML(rows) {
  if (!rows.length) return `<div class="empty-st">${icon("search")}<b>کسی با این مشخصات پیدا نشد</b><span>فیلترها رو کمتر کن یا جست‌وجو رو عوض کن.</span><button class="btn btn--sm btn--soft" data-crm="reset">پاک کردن فیلترها</button></div>`;
  return rows.slice(0, page).map(rowHTML).join("") + (rows.length > page ? `<button class="btn btn--soft btn--block more-btn" data-crm="more">${num(Math.min(50, rows.length - page))} نفر دیگه نشون بده<span class="tiny">${num(page)} از ${num(rows.length)}</span></button>` : "");
}
function bulkHTML() {
  return `<div class="bulk ${SEL.size ? "on" : ""}" id="crm-bulk" role="toolbar" aria-label="کار گروهی"><b>${num(SEL.size)} نفر انتخاب شدن</b>
    <button class="btn btn--sm" data-bulk="msg">${icon("send")}پیام</button><button class="btn btn--sm btn--soft" data-bulk="coupon">${icon("tag")}کوپن</button>
    <button class="btn btn--sm btn--soft" data-bulk="tag">${icon("note")}برچسب</button><button class="btn btn--sm btn--soft" data-bulk="csv">${icon("dl")}خروجی</button>
    <button class="icon-btn sm" data-bulk="clear" aria-label="لغو انتخاب">${icon("close")}</button></div>`;
}

function directory() {
  const P = pool(), now = Date.now();
  const act = P.filter((r) => r.s.rec <= 30).length, new30 = P.filter((r) => now - r.c.joined < 30 * DAY).length;
  const risk = P.filter((r) => r.s.risk >= 60 && r.s.rec <= 60 && r.s.n >= 2).length, appN = P.filter((r) => r.s.app > 0).length;
  const fol = followUps(), me = X.app().user;
  const allTags = [...new Set([...P.flatMap((r) => tagsOf(r.c))])];
  const rows = rowsFor();
  const sel = (id, opts, v, lab) => `<label class="fl"><span>${lab}</span><select data-f="${id}">${opts.map(([k, t]) => `<option value="${k}" ${String(v) === String(k) ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
  const tg = (id, t) => `<label class="fl-t"><input type="checkbox" data-f="${id}" ${F[id] ? "checked" : ""}><span>${t}</span></label>`;
  return `<div class="kpis k6">${kpi("کل اعضا", num(P.length), `${num(appN)} نفر اپ دارن – ${pct(Math.round((appN / (P.length || 1)) * 100))}`)}${kpi("فعال تو ۳۰ روز", num(act), pct(Math.round((act / (P.length || 1)) * 100)) + " از کل")}${kpi("تازه‌وارد تو ۳۰ روز", num(new30))}
      ${kpi("دارن می‌رن", num(risk), `<button class="link" data-seg="risk">ببینشون</button>`)}${kpi("میانگین خرید هر نفر", kk(avg(P, (r) => r.s.spend)))}${kpi("ارزش ۱۲ ماه آینده", kk(sum(P, (r) => r.s.ltv)), "اگه همین‌جوری بمونن")}</div>
    ${fol.length ? `<section class="card follow-strip"><div class="card-h"><h3>${icon("clock")}پیگیری‌های امروز</h3><span class="tiny">${num(fol.length)} نفر</span></div><div class="chips-row">${fol.map(({ id, f }) => `<button class="chip sm" data-cust="${id}">${esc(nameOf(id))}${f.why ? `<span class="n">– ${esc(f.why)}</span>` : ""}</button>`).join("")}</div></section>` : ""}
    <div class="crm-bar">
      <div class="search"><span>${icon("search")}</span><input id="crm-q" type="search" value="${esc(F.q)}" placeholder="اسم، شماره، کد، اینستاگرام یا ایمیل" autocomplete="off"></div>
      <label class="sel-in">${icon("trend")}<select id="crm-sort" aria-label="مرتب‌سازی">${SORTS.map(([k, t]) => `<option value="${k}" ${F.sort === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <button class="btn btn--sm btn--soft" data-crm="filters" aria-expanded="${fOpen}">${icon("layers")}فیلترها${nFilters() ? `<span class="badge">${num(nFilters())}</span>` : ""}</button>
      <button class="btn btn--sm btn--soft" data-crm="csv">${icon("dl")}خروجی</button>
    </div>
    <div class="seg-chips">${SEGS.map(([k, t, f]) => `<button class="chip" data-seg="${k}" aria-pressed="${F.seg === k}">${t}<span class="n">${num(P.filter((r) => f(r.c, r.s, r.e)).length)}</span></button>`).join("")}</div>
    <div class="flt ${fOpen ? "open" : ""}" id="crm-flt"><div class="flt-in">
      ${sel("branch", [["", "همه"], ...BRANCHES.filter((b) => X.inScope(b.id)).map((b) => [b.id, loc(b)])], F.branch, "شعبه")}
      ${sel("tier", [["", "همه"], ...TIERS.map((t) => [t.id, loc(t)])], F.tier, "سطح")}
      ${sel("src", [["", "همه"], ...SOURCES.map(([k, n]) => [k, n])], F.src, "از کجا اومده")}
      ${sel("last", [["", "فرقی نداره"], ["7", "تو ۷ روز اخیر"], ["30", "تو ۳۰ روز اخیر"], ["60", "تو ۶۰ روز اخیر"], ["60+", "بیشتر از ۶۰ روز پیش"]], F.last, "آخرین بار")}
      ${sel("minV", [[0, "فرقی نداره"], [3, "حداقل ۳ بار"], [8, "حداقل ۸ بار"], [20, "حداقل ۲۰ بار"]], F.minV, "دفعات")}
      ${sel("minS", [[0, "فرقی نداره"], [2, "بالای ۲ میلیون"], [5, "بالای ۵ میلیون"], [10, "بالای ۱۰ میلیون"]], F.minS, "کل خرید")}
      ${sel("tag", [["", "همه"], ...allTags.map((t) => [t, t])], F.tag, "برچسب")}
      <div class="fl-ts">${tg("oat", "شیر جو می‌خوره")}${tg("app", "اپ داره")}${tg("sms", "پیامک قبول کرده")}${tg("allergy", "حساسیت داره")}${tg("notes", "یادداشت داره")}</div>
      <button class="link sm" data-crm="reset">پاک کردن همه</button>
    </div></div>
    ${me && !F.q && F.seg === "all" ? `<button class="cr me-cr" data-cust="APP"><span class="cav">${esc(me.name[0])}</span><span class="cr-who"><span class="row-t">${esc(me.name)} <span class="app-pill">همین گوشی – زنده</span></span><span class="row-s" dir="ltr">${digits(me.phone)}</span></span><span class="cr-c num">${num(X.app().orders.length)} سفارش</span><span class="cr-c num">${num(X.app().points)} امتیاز</span>${icon("chev", "chev")}</button>` : ""}
    <div class="crm-head"><label class="ck-sel"><input type="checkbox" id="crm-all" aria-label="انتخاب همه"><i></i></label><span>مشتری</span><span class="cr-br">شعبه</span><span>آخرین بار</span><span>دفعات</span><span>کل خرید</span><span>ریسک رفتن</span><span></span></div>
    <p class="tiny crm-count" id="crm-count">${num(rows.length)} نفر</p>
    <div class="clist2" id="crm-list">${listHTML(rows)}</div>
    ${bulkHTML()}`;
}
function paintList(el) {
  const rows = rowsFor();
  $("#crm-list", el).innerHTML = listHTML(rows);
  $("#crm-count", el).textContent = `${num(rows.length)} نفر`;
  $("#crm-bulk", el).outerHTML = bulkHTML();
  wireList(el);
}
function wireList(el) {
  $$("#crm-list [data-cust]", el).forEach((b) => b.addEventListener("click", () => openCustomer(b.dataset.cust)));
  $$("#crm-list [data-sel]", el).forEach((b) => b.addEventListener("change", () => { b.checked ? SEL.add(b.dataset.sel) : SEL.delete(b.dataset.sel); b.closest(".cr").classList.toggle("sel", b.checked); $("#crm-bulk", el).outerHTML = bulkHTML(); wireBulk(el); }));
  $$("#crm-list [data-crm]", el).forEach((b) => b.addEventListener("click", () => crmAct(b.dataset.crm, el)));
  wireBulk(el);
}
function wireBulk(el) {
  $$("#crm-bulk [data-bulk]", el).forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.bulk, ids = [...SEL];
    if (k === "clear") { SEL.clear(); paintList(el); return; }
    if (k === "csv") { exportRows(rowsFor().filter((r) => SEL.has(r.c.id)), "selected"); return; }
    compose(ids, k);
  }));
}
function crmAct(k, el) {
  if (k === "more") { page += 50; paintList(el); return; }
  if (k === "reset") { F = { ...F0(), sort: F.sort }; page = 50; X.render(); return; }
  if (k === "filters") { fOpen = !fOpen; $("#crm-flt", el).classList.toggle("open", fOpen); $('[data-crm="filters"]', el).setAttribute("aria-expanded", fOpen); return; }
  if (k === "csv") exportRows(rowsFor(), F.seg);
}
function exportRows(rows, tag) {
  csv(`conpanna-customers-${tag}`, [["id", "name", "phone", "branch", "tier", "status", "visits", "spend_toman", "avg_ticket", "last_visit", "churn_risk_%", "ltv_12m", "source", "app", "sms_ok", "oat_%", "tags"],
    ...rows.map(({ c, s, e }) => [c.id, c.name, c.phone, c.branch, tierOf(c.points).name, status(c, s)[0], s.n, s.spend, Math.round(s.avgT), new Date(s.last).toISOString().slice(0, 10), s.risk, Math.round(s.ltv), e.src, s.app ? "yes" : "no", e.consent.sms ? "yes" : "no", Math.round(s.oat * 100), tagsOf(c).join(" | ")])]);
  X.log(`لیست ${num(rows.length)} مشتری رو خروجی گرفت`);
  toast("فایل دانلود شد", "dl");
}

/* ---------------------------------------------------------------- profile */
let tlN = 25, ordN = 12, tlF = "all";
const REVEAL = new Set();
const lastBday = (d) => { if (!d) return null; const b = new Date(d); b.setFullYear(new Date().getFullYear()); if (b > Date.now()) b.setFullYear(b.getFullYear() - 1); return b.getTime(); };
function messages(c, s, e) {
  const R = rng(hash(c.id) ^ 0x9e37), out = [];
  if (c.id !== "APP") {
    out.push({ at: c.joined + 6 * 60e3, ch: e.consent.push ? "push" : "sms", t: "خوش‌اومدی! ٪۲۰ تخفیف اولین سفارش", st: s.done[0] && s.done[0].at - c.joined < 7 * DAY ? "used" : "open", auto: 1 });
    for (let i = 1; i < s.done.length; i++) { const g = s.done[i].at - s.done[i - 1].at; if (g > 21 * DAY) out.push({ at: s.done[i - 1].at + 21 * DAY, ch: "sms", t: "دلمون برات تنگ شده ☕ – ٪۱۵ تخفیف", st: g < 28 * DAY ? "used" : "open", auto: 1 }); }
    if (s.rec > 21 && s.n >= 2) out.push({ at: s.last + 21 * DAY, ch: "sms", t: "دلمون برات تنگ شده ☕ – ٪۱۵ تخفیف", st: R() < .5 ? "open" : "sent", auto: 1 });
    const b = lastBday(e.bday); if (b && Date.now() - b < 120 * DAY && b > c.joined) out.push({ at: b - 2 * DAY + 10 * 3600e3, ch: e.consent.push ? "push" : "sms", t: "تولدت مبارک 🎂 یه نوشیدنی مهمون ما", st: R() < .6 ? "used" : "open", auto: 1 });
    s.done.filter((o) => o.channel === "app").slice(-1).forEach((o) => out.push({ at: o.at + 30 * 60e3, ch: "push", t: "سفارشت چطور بود؟ یه امتیاز بده", st: o.rating ? "used" : R() < .5 ? "open" : "sent", auto: 1 }));
  }
  ((A().cmsg || {})[c.id] || []).forEach((m) => out.push(m));
  return out.filter((m) => m.at <= Date.now()).sort((a, b) => b.at - a.at);
}
function timeline(P, msgs) {
  const { c, st: s, e, reviews } = P, ev = [];
  ev.push({ at: c.joined, k: "join", ic: "gift", t: "عضو باشگاه شد", s: `از ${SRC[e.src].n}${e.ref ? ` – معرفش ${nameOf(e.ref)}` : ""}` });
  let pts = 0, ti = 0, firstApp = true;
  s.done.forEach((o) => {
    pts += Math.round(o.total / 10000) + 15;
    ev.push({ at: o.at, k: "order", ic: o.channel === "app" ? "bag" : o.mode === "dinein" ? "table" : "takeaway", t: o.lines.map((l) => `${l.qty > 1 ? num(l.qty) + "× " : ""}${loc(item(l.id) || {})}`).join("، "), s: `${bname(o.branch)} – ${o.channel === "app" ? "از اپ" : o.mode === "dinein" ? "تو سالن" : "بیرون‌بر"} – ${moneyText(o.total)}${o.promo ? " – با کوپن" : ""}` });
    if (o.channel === "app" && firstApp) { firstApp = false; ev.push({ at: o.at + 1, k: "act", ic: "phone", t: "اولین سفارشش با اپ", s: "" }); }
    const nt = TIERS.filter((t) => t.min > 0 && pts >= t.min).length;
    if (nt > ti) { ti = nt; ev.push({ at: o.at + 2, k: "act", ic: "crown", t: `رسید به سطح ${loc(TIERS[nt])}`, s: `${num(pts)} امتیاز` }); }
  });
  s.list.filter((o) => o.status !== "done").forEach((o) => ev.push({ at: o.at, k: "order", ic: "close", t: o.status === "refunded" ? "سفارش مرجوع شد" : "سفارش لغو شد", s: `${bname(o.branch)} – ${moneyText(o.total)}`, bad: 1 }));
  reviews.forEach((r) => ev.push({ at: r.at, k: "review", ic: "star", t: `${"★".repeat(r.rating)}${r.topic ? " – " + TOPICS[r.topic] : ""}`, s: r.text_fa, bad: r.rating <= 2 }));
  msgs.forEach((m) => ev.push({ at: m.at, k: "msg", ic: "send", t: m.t, s: `${CH[m.ch] || "پیام"} – ${MST[m.st]?.[0] || ""}${m.auto ? " – خودکار" : ""}` }));
  ((A().cnotes || {})[c.id] || []).forEach((n) => ev.push({ at: n.at, k: "note", ic: "note", t: "یادداشت گذاشت", s: n.t }));
  ((A().clog || {})[c.id] || []).filter((l) => !l.msg).forEach((l) => ev.push({ at: l.at, k: "act", ic: l.ic || "check", t: l.t, s: "از پنل" }));
  return ev.sort((a, b) => b.at - a.at);
}
function nba(P, inv) {
  const { c, st: s, e, reviews } = P, out = [], nt = nextTier(c.points), tb = toBday(e.bday), rep = getHub().replies || {};
  if (s.rec > 60 && s.n >= 2) out.push(["bad", "trend", "خیلی وقته نیومده", `${num(Math.round(s.rec))} روزه ازش خبری نیست. یه کوپن ٪۲۵ «برگرد پیشمون» شانس برگشتنش رو بالا می‌بره.`, [["کوپن ٪۲۵ بفرست", "coupon:25"]]]);
  else if (s.risk >= 60 && s.n >= 2) out.push(["warn", "trend", "داره ازمون دور می‌شه", `معمولاً هر ${num(Math.max(1, Math.round(s.gap)))} روز یه بار میاد، ولی الان ${num(Math.round(s.rec))} روزه نیومده.`, [["کوپن ٪۱۵ بفرست", "coupon:15"], ["پیام بده", "msg"]]]);
  if (tb <= 14) out.push(["info", "cake", tb === 0 ? "امروز تولدشه!" : `${num(tb)} روز دیگه تولدشه`, tierOf(c.points).id === "gold" ? "طلاییه؛ کیک تولد بهش می‌رسه." : "یه نوشیدنی هدیه‌ی تولد براش بفرست.", [["هدیه‌ی تولد بفرست", "gift:bday"]]]);
  if (nt && nt.min - c.points <= nt.min * 0.15) out.push(["ok", "crown", `${num(nt.min - c.points)} امتیاز تا ${loc(nt)}`, "بهش بگو چقدر مونده؛ معمولاً همین هفته برمی‌گرده.", [["خبرش کن", "msg:tier"]]]);
  const bad = reviews.filter((r) => r.rating <= 2 && Date.now() - r.at < 30 * DAY && !rep[r.id]);
  if (bad.length) out.push(["bad", "star", "یه تجربه‌ی بد داشته", `«${bad[0].text_fa}» – هنوز جوابش رو ندادیم.`, [["عذرخواهی + کوپن ٪۲۰", "coupon:20"], ["زنگ بزن", "call"]]]);
  if (s.top <= 0.05 && s.rec < 30) out.push(["ok", "sparkle", "جزو ٪۵ بهترین مشتری‌هاست", "دعوتش کن به رویداد بعدی یا یه هدیه‌ی کوچیک بده که بدونه دیده می‌شه.", [["دعوت به رویداد", "msg:event"], ["۲ تا مهر هدیه", "stamps:2"]]]);
  if (inv.length >= 2) out.push(["ok", "users", `${num(inv.length)} نفر رو آورده`, "سفیر برندته. یه تشکر کوچیک خیلی اثر داره.", [["تشکر + ۳۰۰ امتیاز", "points:300"]]]);
  if (!s.app && s.n >= 4) out.push(["info", "phone", "هنوز اپ رو نصب نکرده", "با اپ از قبل سفارش می‌ده و دیگه تو صف نمی‌مونه.", [["لینک اپ رو بفرست", "msg:app"]]]);
  if (s.slow >= 3 && s.slow / (s.n || 1) > 0.25) out.push(["warn", "clock", "زیاد منتظر مونده", `${num(s.slow)} بار سفارشش بیشتر از ${num(sla() / 60)} دقیقه طول کشیده.`, [["یه نوشیدنی مهمونش کن", "gift:sorry"]]]);
  if (!out.length) out.push(["ok", "check", "همه‌چی رو به راهه", "مشتری راضی و ثابتیه. فعلاً کاری لازم نیست.", []]);
  return out.slice(0, 4);
}
const ir = (ic, t, v) => `<div class="ir"><span class="ir-ic">${icon(ic)}</span><span class="ir-t">${t}</span><span class="ir-v">${v}</span></div>`;
const yes = (b, t) => `<span class="pill ${b ? "ok" : ""}">${b ? icon("check") : icon("close")}${t}</span>`;

function profile() {
  const P = profileOf(A().cid);
  if (!P) return `<div class="empty-st">${icon("users")}<b>این مشتری پیدا نشد</b><button class="btn btn--sm btn--soft" data-go="customers">برگرد به لیست</button></div>`;
  const { c, st: s, e, reviews } = P, I = ix();
  const t = tierOf(c.points), nt = nextTier(c.points), [stT, stK] = status(c, s), fl = (A().cflags || {})[c.id] || {};
  const inv = c.id === "APP" ? [] : I.inv.get(c.id) || [], msgs = messages(c, s, e);
  const notes = ((A().cnotes || {})[c.id] || []).slice().reverse();
  const shown = REVEAL.has(c.id) || c.live;
  const order = rowsFor().map((r) => r.c.id), at = order.indexOf(c.id);
  // habits
  const wk = Array(18).fill(0); s.done.forEach((o) => { const w = Math.floor((Date.now() - o.at) / (7 * DAY)); if (w < 18) wk[17 - w] += o.total; });
  const wmax = Math.max(...wk, 1);
  const hm = WDF.map(() => [0, 0, 0, 0]); s.done.forEach((o) => { hm[wdi(o.at)][part(new Date(o.at).getHours())]++; });
  const it = {}, cat = {}; s.done.forEach((o) => o.lines.forEach((l) => { it[l.id] = (it[l.id] || 0) + l.qty; const m = item(l.id); if (m) cat[m.cat] = (cat[m.cat] || 0) + l.qty; }));
  const items = Object.entries(it).sort((a, b) => b[1] - a[1]), itot = sum(items, (x) => x[1]) || 1;
  const brc = {}; s.done.forEach((o) => { brc[o.branch] = (brc[o.branch] || 0) + 1; });
  const sf = {}; s.done.forEach((o) => { if (o.staff) sf[o.staff] = (sf[o.staff] || 0) + 1; });
  const staffTop = Object.entries(sf).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ p: X.S.staff.find((p) => p.id === id), n })).filter((x) => x.p);
  const allPrep = avg(X.orders().filter((o) => o.day < 30 && o.status === "done"), (o) => o.prep);
  const rAvg = s.rated.length ? avg(s.rated, (o) => o.rating) : 0;
  const ev = timeline(P, msgs).filter((x) => tlF === "all" || x.k === tlF || (tlF === "note" && x.k === "act"));
  const stamps = c.live ? X.app().stamps : s.n % (getHub().loyalty?.stamps || 8), stampN = getHub().loyalty?.stamps || 8;
  const share = (n) => pct(Math.round((n / (s.n || 1)) * 100));
  const habit = (l, p, sub) => `<div class="hab"><span class="hab-l">${l}</span>${meter(p)}<b>${pct(Math.round(p * 100))}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  const ledger = []; let bal = 0;
  s.done.forEach((o) => { const p = Math.round(o.total / 10000) + 15; bal += p; ledger.push([o.at, `سفارش #${digits(o.code)}`, `+${num(p)}`, num(bal), o.promo ? "با کوپن" : ""]); });
  ((A().clog || {})[c.id] || []).filter((l) => l.pts).forEach((l) => ledger.push([l.at, l.t, `+${num(l.pts)}`, "", "هدیه"]));
  ledger.sort((a, b) => b[0] - a[0]);

  return `<div class="c360-top"><button class="back-link" data-go="customers">${icon("back")}همه‌ی مشتری‌ها</button>
      ${at >= 0 ? `<div class="c360-nav"><span class="tiny">${num(at + 1)} از ${num(order.length)}</span><button class="icon-btn sm" data-cnav="${order[at - 1] || ""}" ${at > 0 ? "" : "disabled"} aria-label="قبلی">${icon("chev", "flip")}</button><button class="icon-btn sm" data-cnav="${order[at + 1] || ""}" ${at < order.length - 1 ? "" : "disabled"} aria-label="بعدی">${icon("chev")}</button></div>` : ""}</div>
    <section class="card c360-head">
      <span class="cav xl" style="--tier:${t.color}">${esc(c.name_fa[0])}</span>
      <div class="ch-main"><h2>${esc(c.name_fa)}${c.live ? ` <span class="app-pill">همین گوشی – زنده</span>` : ""}</h2>
        <p class="ch-sub"><span class="lat" dir="ltr">${c.id === "APP" ? "APP" : c.id}</span><span class="tier-pill" style="--tier:${t.color}">${esc(loc(t))}</span>${pill(stT, stK)}<span>عضو از ${fmtDay(new Date(c.joined))}</span><span>${esc(bname(c.branch))}</span></p>
        <div class="ch-tags">${tagsOf(c).map((x) => `<span class="ctag">${esc(x)}</span>`).join("")}${e.allergy ? `<span class="pill bad">${icon("info")}${esc(e.allergy)}</span>` : ""}<button class="chip sm" data-ca="tag">${icon("plus")}برچسب</button></div></div>
      <div class="ch-acts"><button class="btn btn--sm" data-ca="msg">${icon("send")}پیام</button><button class="btn btn--sm btn--soft" data-ca="coupon">${icon("tag")}کوپن</button><button class="btn btn--sm btn--soft" data-ca="stamps">${icon("coffee")}مهر</button><button class="btn btn--sm btn--soft" data-ca="follow">${icon("clock")}${fl.follow ? "پیگیری: " + relFuture(fl.follow) : "یادم بنداز"}</button>
        <button class="icon-btn" data-ca="pin" aria-pressed="${!!fl.pin}" data-tip="${fl.pin ? "برداشتن ستاره" : "ستاره بزن"}">${icon(fl.pin ? "starF" : "star")}</button><button class="icon-btn" data-ca="csv" data-tip="خروجی سفارش‌هاش">${icon("dl")}</button><button class="icon-btn" data-ca="print" data-tip="چاپ پرونده">${icon("receipt")}</button></div>
    </section>
    <nav class="c360-tabs" aria-label="بخش‌های پرونده">${[["c-sum", "خلاصه"], ["c-hab", "عادت‌ها"], ["c-exp", "تجربه و ترجیحات"], ["c-msg", "پیام و امتیاز"], ["c-tl", "تاریخچه"], ["c-ord", "سفارش‌ها"]].map(([k, t]) => `<button class="chip sm" data-jump="${k}">${t}</button>`).join("")}</nav>

    <div id="c-sum" class="kpis k4">${kpi("کل خرید", kk(s.spend), c.live ? "" : `جزو ٪${digits(Math.max(1, Math.round(s.top * 100)))} اول مشتری‌ها`)}${kpi("دفعات اومدن", num(s.n), s.cancel ? `${num(s.cancel)} سفارش لغو یا مرجوعی` : "بدون لغو")}${kpi("میانگین فاکتور", kk(s.avgT), `${fa1(s.items)} قلم هر بار`)}${kpi("آخرین بار", relD(s.last), fmtDay(new Date(s.last)))}
      ${kpi("معمولاً هر", s.gap ? `${num(Math.max(1, Math.round(s.gap)))}<small> روز</small>` : "—", s.next ? (s.next > Date.now() ? nextTxt(s.next) : Date.now() - s.next < DAY ? "احتمالاً امروز میاد" : `${num(Math.round((Date.now() - s.next) / DAY))} روز دیر کرده`) : "هنوز الگو نداره")}
      ${kpi("احتمال رفتن", pct(s.risk), meter(s.risk / 100, riskK(s.risk)))}${kpi("ارزش ۱۲ ماه آینده", kk(s.ltv), `ماهی حدود ${kk(s.monthly)}`)}${kpi("سودی که برامون داشته", kk(s.profit), s.disc ? `${kk(s.disc)} تخفیف گرفته` : "بدون تخفیف")}</div>

    <div class="cards g2">
      ${card("پیشنهاد برای قدم بعدی", `<div class="nba">${nba(P, inv).map(([k, ic, tt, d, acts]) => `<div class="nba-i ${k}"><span class="nba-ic">${icon(ic)}</span><div><b>${tt}</b><p>${d}</p>${acts.length ? `<div class="nba-a">${acts.map(([l, a]) => `<button class="btn btn--sm btn--soft" data-ca="${a}">${l}</button>`).join("")}</div>` : ""}</div></div>`).join("")}</div>`, { extra: `<span class="tiny">${icon("sparkle")}</span>` })}
      ${card("اطلاعات تماس و هویت", `<div class="irs">
        ${ir("phone", "شماره", `<span dir="ltr" class="lat">${digits(shown ? e.full : c.phone)}</span>${shown ? `<button class="link sm" data-ca="call">کپی</button>` : `<button class="link sm" data-ca="reveal">نشون بده</button>`}`)}
        ${ir("send", "ایمیل", e.email ? `<span dir="ltr" class="lat">${esc(e.email)}</span>` : `<span class="muted">نداده</span>`)}
        ${ir("ig", "اینستاگرام", e.ig ? `<span dir="ltr" class="lat">@${esc(e.ig)}</span>` : `<span class="muted">نداده</span>`)}
        ${ir("cake", "تولد", e.bday ? `${faBday(e.bday)}<span class="tiny">${toBday(e.bday) === 0 ? "امروزه!" : `${num(toBday(e.bday))} روز دیگه`}</span>` : `<span class="muted">نداده</span>`)}
        ${e.age ? ir("profile", "رده‌ی سنی", `${e.age}<span class="tiny">خودش گفته</span>`) : ""}
        ${e.hood ? ir("pin", "محله", e.hood) : ""}
        ${ir("mega", "ما رو از کجا پیدا کرد", `${SRC[e.src].n}${e.ref ? ` – <button class="link sm" data-cust="${e.ref}">معرفش: ${esc(nameOf(e.ref))}</button>` : e.refCode ? ` – <span class="lat">${esc(e.refCode)}</span>` : ""}`)}
        ${ir("phone", "اپ", e.device ? `${e.device} – نسخه‌ی <span class="lat">${digits(e.ver)}</span>` : `<span class="muted">نصب نکرده</span>`)}
        ${ir("bell", "اجازه‌ی پیام", `<span class="pills">${yes(e.consent.sms, "پیامک")}${yes(e.consent.push, "اعلان")}${yes(e.consent.email, "ایمیل")}</span>`)}
        ${ir("ticket", "کد دعوتش", `<span class="lat" dir="ltr">${esc(c.live ? referralCode() : "CP-" + c.id.replace("C", ""))}</span>${inv.length ? `<span class="tiny">${num(inv.length)} نفر باهاش اومدن</span>` : ""}`)}
      </div>`)}
    </div>

    <div class="cards g2" id="c-hab">
      ${card("خرید هفته به هفته", `<div class="wcols">${wk.map((v, i) => `<i style="--v:${(v / wmax).toFixed(3)}" data-tip="${17 - i ? `${num(17 - i)} هفته پیش` : "این هفته"}: ${v ? kmoney(v) + " تومان" : "نیومد"}"></i>`).join("")}</div><div class="wcols-l"><span>۴ ماه پیش</span><span>این هفته</span></div>`, { extra: `<span class="tiny">${kk(sum(wk.slice(-4)))} تو ۴ هفته‌ی اخیر</span>` })}
      ${card("کی میاد", heat(WDF, PARTS, hm).replace('class="heat"', 'class="heat short"'), { extra: `<span class="tiny">بیشتر ${(() => { let b = [0, 0], m = -1; hm.forEach((r, i) => r.forEach((v, j) => { if (v > m) { m = v; b = [i, j]; } })); return m > 0 ? `${WDF[b[0]]}‌ها، ${PARTS[b[1]]}` : "—"; })()}</span>` })}
      ${card("چی می‌خوره", items.length ? `<div class="favs">${items.slice(0, 6).map(([id, n]) => { const m = item(id); return m ? `<div class="fav">${tile(m, "sm")}<span class="row-main"><span class="row-t">${esc(loc(m))}</span><span class="row-s">${num(n)} بار – ${pct(Math.round((n / itot) * 100))}</span></span>${meter(n / items[0][1])}</div>` : ""; }).join("")}</div>
        <p class="group-label">به تفکیک دسته</p>${barsH(CATEGORIES.filter((k) => cat[k.id]).map((k) => ({ l: esc(loc(k)), v: cat[k.id] })).sort((a, b) => b.v - a.v))}` : empty("هنوز چیزی نخریده"))}
      ${card("عادت‌ها", `<div class="habs">${habit("شیر جو", s.oat, e.oatFan ? "همیشه" : "")}${habit("تو سالن می‌شینه", s.dine, `بیرون‌بر ${pct(Math.round((1 - s.dine) * 100))}`)}${habit("از اپ سفارش می‌ده", s.app)}${habit("با کوپن خرید کرده", s.promo / (s.n || 1), `${num(s.promo)} بار`)}</div>
        <p class="group-label">پرداخت</p><div class="pills">${pill(`کارت ${share(s.pay.card)}`)}${pill(`آنلاین ${share(s.pay.online)}`)}${pill(`نقد ${share(s.pay.cash)}`)}</div>
        <p class="group-label">شعبه‌ها</p>${barsH(Object.entries(brc).sort((a, b) => b[1] - a[1]).map(([b, n]) => ({ l: esc(bname(b)), v: n, f: `${num(n)} بار` })))}`)}
    </div>

    <div class="cards g2" id="c-exp">
      ${card("تجربه‌اش از ما", `<div class="kpis sm">${kpi("میانگین انتظار", `${fa1(s.prep / 60)}<small> دقیقه</small>`, `کل شعبه‌ها ${fa1(allPrep / 60)}`)}${kpi("بیشتر از " + num(sla() / 60) + " دقیقه", num(s.slow), share(s.slow) + " از سفارش‌ها")}${kpi("امتیازی که داده", rAvg ? `${fa1(rAvg)}<small> از ۵</small>` : "—", `${num(s.rated.length)} بار امتیاز داده`)}</div>
        ${staffTop.length ? `<p class="group-label">بیشتر کی براش درست کرده</p><div class="staff-mini">${staffTop.map(({ p, n }) => `<span><span class="cav sm">${esc(p.name_fa[0])}</span><b>${esc(p.name_fa)}</b><small>${esc(p.role_fa)} – ${num(n)} بار</small></span>`).join("")}</div>` : ""}
        <p class="group-label">نظرهاش</p>${reviews.length ? `<div class="rlist">${reviews.slice().sort((a, b) => b.at - a.at).slice(0, 4).map((r) => `<div class="rv-i"><div class="rv-top"><span class="stars">${"★".repeat(r.rating)}<i>${"★".repeat(5 - r.rating)}</i></span>${r.topic ? `<b>${TOPICS[r.topic]}</b>` : ""}<span class="tiny">${relD(r.at)} – ${esc(bname(r.branch))}</span></div><p>${esc(r.text_fa)}</p>${getHub().replies?.[r.id] ? `<p class="reply">${icon("send")}${esc(getHub().replies[r.id])}</p>` : ""}</div>`).join("")}</div>` : empty("هنوز نظری ننوشته")}`)}
      ${card("ترجیحات و یادداشت برای بچه‌ها", `${e.allergy ? `<div class="warn-box">${icon("info")}<b>${esc(e.allergy)}</b></div>` : ""}<div class="irs">
        ${e.sweet ? ir("heart", "شیرینی", e.sweet) : ""}${s.oat > .4 ? ir("coffee", "شیر", "شیر جو") : ""}${e.seat ? ir("table", "جای محبوبش", e.seat) : ""}${e.temp ? ir("flame", "دما", e.temp) : ""}${e.laptop ? ir("wifi", "کار", "با لپ‌تاپ میاد؛ وای‌فای و پریز براش مهمه") : ""}${ir("star", "نوشیدنی همیشگی", items[0] ? esc(loc(item(items[0][0]))) : "—")}</div>
        <p class="group-label">یادداشت‌ها</p>
        <div class="note-add"><textarea class="note-in" id="cn-t" rows="2" placeholder="مثلاً: اسپرسو رو دبل می‌خواد، با بچه‌ها رفیقه، یه بار سفارشش اشتباه شد"></textarea><button class="btn btn--sm" data-ca="note">${icon("plus")}ثبت</button></div>
        ${notes.length ? `<div class="notes">${notes.map((n) => `<div class="note"><p>${esc(n.t)}</p><span class="tiny">${relD(n.at)} – ${fmtTime(new Date(n.at))}</span><button class="icon-btn xs" data-delnote="${n.at}" aria-label="پاک کردن">${icon("close")}</button></div>`).join("")}</div>` : `<p class="tiny">هر چی اینجا بنویسی رو باریستاها موقع سفارشش می‌بینن.</p>`}`)}
    </div>

    <div class="cards g2" id="c-msg">
      ${card("پیام‌ها و کمپین‌ها", msgs.length ? `<div class="msgs">${msgs.slice(0, 8).map((m) => `<div class="msg-i"><span class="row-ic soft">${icon(m.ch === "sms" ? "phone" : m.ch === "email" ? "send" : "bell")}</span><span class="row-main"><span class="row-t">${esc(m.t)}</span><span class="row-s">${CH[m.ch] || ""} – ${relD(m.at)}${m.auto ? " – خودکار" : " – دستی"}</span></span>${pill(...(MST[m.st] || MST.sent))}</div>`).join("")}</div>` : empty("هنوز پیامی براش نرفته"), { extra: `<span class="tiny">${num(msgs.filter((m) => m.st === "used").length)} بار جواب داده</span>` })}
      ${card("امتیاز، مهر و دعوت", `<div class="tierbox"><div class="tb-top"><span class="tier-pill" style="--tier:${t.color}">${esc(loc(t))}</span><b>${num(c.points)}<small> امتیاز</small></b></div>${nt ? `${meter((c.points - t.min) / (nt.min - t.min))}<p class="tiny">${num(nt.min - c.points)} امتیاز دیگه تا ${esc(loc(nt))}</p>` : `<p class="tiny">بالاترین سطح باشگاهه.</p>`}
          <div class="stamps-row" aria-label="کارت مهر">${Array.from({ length: stampN }, (_, i) => `<i class="${i < stamps ? "on" : ""}">${icon("coffee")}</i>`).join("")}</div><p class="tiny">${num(stamps)} از ${num(stampN)} مهر – تا حالا ${num(Math.floor(s.n / stampN))} نوشیدنی مجانی گرفته</p></div>
        <p class="group-label">آخرین امتیازها</p>${ledger.length ? table(["کِی", "بابت", "امتیاز", "مانده", ""], ledger.slice(0, 6).map((l) => [relD(l[0]), l[1], `<b class="pos">${l[2]}</b>`, l[3], l[4] ? pill(l[4]) : ""])) : empty("هنوز امتیازی نگرفته")}
        ${inv.length ? `<p class="group-label">کسایی که آورده</p><div class="chips-row">${inv.map((id) => `<button class="chip sm" data-cust="${id}">${esc(nameOf(id))}</button>`).join("")}</div>` : ""}`)}
    </div>

    <section class="card" id="c-tl"><div class="card-h"><h3>تاریخچه‌ی کامل</h3><div class="chips-row tight">${[["all", "همه"], ["order", "سفارش"], ["msg", "پیام"], ["review", "نظر"], ["note", "یادداشت و کارها"]].map(([k, l]) => `<button class="chip sm" data-tlf="${k}" aria-pressed="${tlF === k}">${l}</button>`).join("")}</div></div>
      ${ev.length ? `<ol class="tl">${ev.slice(0, tlN).map((x) => `<li class="${x.bad ? "bad" : ""} k-${x.k}"><span class="tl-ic">${icon(x.ic)}</span><div><b>${esc(x.t)}</b>${x.s ? `<p>${esc(x.s)}</p>` : ""}</div><time>${fmtDay(new Date(x.at))} – ${fmtTime(new Date(x.at))}</time></li>`).join("")}</ol>${ev.length > tlN ? `<button class="btn btn--soft btn--block more-btn" data-ca="tlmore">بیشتر<span class="tiny">${num(tlN)} از ${num(ev.length)}</span></button>` : ""}` : empty("چیزی نیست")}
    </section>

    <section class="card" id="c-ord"><div class="card-h"><h3>همه‌ی سفارش‌ها</h3><span class="tiny">${num(s.list.length)} سفارش – ${T(s.spend)}</span></div>
      ${s.list.length ? table(["تاریخ", "ساعت", "شعبه", "چی گرفت", "نوع", "پرداخت", "مبلغ", "وضعیت"], s.list.slice().sort((a, b) => b.at - a.at).slice(0, ordN).map((o) => [fmtDay(new Date(o.at)), fmtTime(new Date(o.at)), esc(bname(o.branch)), `<span class="clip">${o.lines.map((l) => `${l.qty > 1 ? num(l.qty) + "× " : ""}${esc(loc(item(l.id) || {}))}`).join("، ")}</span>`, o.channel === "app" ? "اپ" : o.mode === "dinein" ? "سالن" : "بیرون‌بر", { card: "کارت", cash: "نقد", online: "آنلاین" }[o.pay] || "", `<b>${kk(o.total)}</b>${o.discount ? ` <small class="pos">−${kk(o.discount)}</small>` : ""}`, o.status === "done" ? pill("تحویل شد", "ok") : pill(o.status === "refunded" ? "مرجوعی" : "لغو", "bad")]), { cls: "sortable" })
        + (s.list.length > ordN ? `<button class="btn btn--soft btn--block more-btn" data-ca="ordmore">بیشتر<span class="tiny">${num(ordN)} از ${num(s.list.length)}</span></button>` : "") : empty("هنوز سفارشی نداده")}
    </section>`;
}
function nextTxt(t) { const d = Math.round((t - Date.now()) / DAY); return d <= 0 ? "احتمالاً امروز میاد" : d === 1 ? "احتمالاً فردا میاد" : `حدود ${num(d)} روز دیگه میاد`; }
function relFuture(t) { const d = Math.round((t - Date.now()) / DAY); return d <= 0 ? "امروز" : d === 1 ? "فردا" : `${num(d)} روز دیگه`; }

/* ---------------------------------------------------------------- actions */
function record(ids, t, ic, { msg = null, pts = 0 } = {}) {
  const clog = { ...(A().clog || {}) }, cmsg = { ...(A().cmsg || {}) }, at = Date.now();
  ids.forEach((id) => {
    clog[id] = [...(clog[id] || []), { at, t, ic, pts, msg: !!msg }].slice(-60);
    if (msg) cmsg[id] = [...(cmsg[id] || []), { at, ch: msg.ch, t: msg.t, st: "sent" }].slice(-40);
  });
  X.setA({ clog, cmsg });
  // the person on this phone gets it for real
  if (ids.includes("APP")) {
    const extra = msg?.offer ? { offer: msg.offer, code: msg.code } : msg?.stamps ? { stamps: msg.stamps } : pts ? { points: pts } : {};
    setHub((h) => ({ broadcasts: [...h.broadcasts, { id: "B" + Date.now(), at, to: "me", title: msg?.t || t, title_fa: msg?.t || t, body: msg?.b || "", body_fa: msg?.b || "", ...extra }].slice(-40) }));
  }
  X.log(ids.length === 1 ? `${nameOf(ids[0])}: ${t}` : `${num(ids.length)} مشتری: ${t}`);
}
const TPL = {
  "": "", tier: "فقط {n} امتیاز دیگه مونده تا سطح بعدی باشگاه 👀 این هفته منتظرتیم.", event: "یه شب آکوستیک داریم و دلمون می‌خواد تو هم باشی. از اپ جات رو رزرو کن 🎶",
  app: "اپ کن‌پانا رو نصب کن: از قبل سفارش بده، تو صف نمون و مهرهات رو جمع کن ☕", sorry: "ببخشید که این چند بار منتظر موندی 🙏 دفعه‌ی بعد یه نوشیدنی مهمون ما باش.",
  hi: "سلام! خیلی وقته ندیدیمت؛ دلمون برات تنگ شده ☕", bday: "تولدت مبارک 🎂 این هفته یه نوشیدنی مهمون ما باش.",
};
function compose(ids, kind, preset = "") {
  const one = ids.length === 1 ? profileOf(ids[0]) : null, who = one ? one.c.name_fa : `${num(ids.length)} نفر`;
  const nt = one && nextTier(one.c.points);
  const fill = (s) => s.replace("{n}", nt ? num(nt.min - one.c.points) : "چند");
  const done = (t) => { closeSheet(); toast(t, "send"); haptic(10); X.render(); };
  if (kind === "msg") {
    sheet(`<h2>پیام به ${esc(who)}</h2>
      <div class="seg" id="m-ch" role="group" style="margin-top:14px"><span class="seg-thumb"></span><button type="button" data-v="sms" aria-pressed="true">${icon("phone")}<span>پیامک</span></button><button type="button" data-v="push" aria-pressed="false">${icon("bell")}<span>اعلان اپ</span></button><button type="button" data-v="email" aria-pressed="false">${icon("send")}<span>ایمیل</span></button></div>
      <div class="tpls" style="margin-top:14px">${[["hi", "دلمون تنگ شده"], ["tier", "تا سطح بعد"], ["event", "دعوت به رویداد"], ["app", "لینک اپ"], ["sorry", "عذرخواهی"]].map(([k, l]) => `<button class="chip sm" data-t="${k}">${l}</button>`).join("")}</div>
      <label class="field"><span>متن</span><textarea id="m-b" rows="4" maxlength="160">${esc(fill(TPL[preset] || ""))}</textarea></label><p class="tiny" id="m-n" style="text-align:end"></p>
      <button class="btn btn--block" id="m-go" style="margin-top:12px">${icon("send")}بفرست</button>`, { label: "پیام", onMount(b) {
      let ch = "sms"; segmented($("#m-ch", b), (v) => { ch = v; });
      const ta = $("#m-b", b), cnt = () => { $("#m-n", b).textContent = `${num(ta.value.length)} از ۱۶۰`; };
      ta.addEventListener("input", cnt); cnt();
      $$("[data-t]", b).forEach((x) => x.addEventListener("click", () => { ta.value = fill(TPL[x.dataset.t]); cnt(); ta.focus(); }));
      $("#m-go", b).addEventListener("click", () => { const v = ta.value.trim(); if (!v) { ta.focus(); ta.setAttribute("aria-invalid", "true"); return; } record(ids, `${CH[ch]} فرستاد: «${v.slice(0, 40)}${v.length > 40 ? "…" : ""}»`, "send", { msg: { ch, t: v, b: "" } }); done(`برای ${who} رفت`); });
    } });
  } else if (kind === "coupon") {
    sheet(`<h2>کوپن برای ${esc(who)}</h2><div class="opt-grid" id="cp" style="margin-top:14px">${[["10", "٪۱۰"], ["15", "٪۱۵"], ["20", "٪۲۰"], ["25", "٪۲۵"], ["drink", "یه نوشیدنی"]].map(([v, l], i) => `<button class="chip" data-v="${v}" aria-pressed="${(preset || "15") === v || (!preset && i === 1)}">${l}</button>`).join("")}</div>
      <label class="field"><span>تا کی اعتبار داره</span><select id="cp-x"><option value="7">یه هفته</option><option value="14" selected>دو هفته</option><option value="30">یه ماه</option></select></label>
      <button class="btn btn--block" id="cp-go" style="margin-top:16px">${icon("tag")}بفرست</button>`, { label: "کوپن", onMount(b) {
      let v = preset || "15";
      $$("#cp [data-v]", b).forEach((x) => x.addEventListener("click", () => { v = x.dataset.v; $$("#cp [data-v]", b).forEach((y) => y.setAttribute("aria-pressed", y === x)); }));
      $("#cp-go", b).addEventListener("click", () => { const l = v === "drink" ? "یه نوشیدنی مجانی" : `٪${digits(v)} تخفیف`; const code = "CP" + Math.random().toString(36).slice(2, 6).toUpperCase(); record(ids, `کوپن ${l} فرستاد (${num(+$("#cp-x", b).value)} روزه)`, "tag", { msg: { ch: "sms", t: `یه کوپن ${l} مال تو 🎁`, offer: v === "drink" ? { kind: "drink", title: "A free drink", title_fa: "یه نوشیدنی مجانی" } : { kind: "pct", value: +v / 100, title: `${v}% off`, title_fa: l }, code } }); done(`کوپن برای ${who} رفت`); });
    } });
  } else if (kind === "tag") {
    const ct = A().ctags || {}, mine = one ? ct[one.c.id] || [] : [];
    const all = [...new Set([...Object.values(ct).flat(), "مهمون ویژه", "اینفلوئنسر", "همسایه", "شرکتی", "عکاس"])];
    sheet(`<h2>برچسب برای ${esc(who)}</h2><div class="chips-row" id="tg" style="margin-top:14px">${all.map((x) => `<button class="chip sm" data-v="${esc(x)}" aria-pressed="${mine.includes(x)}">${esc(x)}</button>`).join("")}</div>
      <label class="field"><span>یا یه برچسب تازه</span><input id="tg-n" maxlength="24" placeholder="مثلاً: تیم فوتبال محله"></label><button class="btn btn--block" id="tg-go" style="margin-top:16px">${icon("check")}ذخیره</button>`, { label: "برچسب", onMount(b) {
      const on = new Set(mine);
      $$("#tg [data-v]", b).forEach((x) => x.addEventListener("click", () => { const v = x.dataset.v; on.has(v) ? on.delete(v) : on.add(v); x.setAttribute("aria-pressed", on.has(v)); }));
      $("#tg-go", b).addEventListener("click", () => {
        const n = $("#tg-n", b).value.trim(); if (n) on.add(n);
        const next = { ...ct }; ids.forEach((id) => { next[id] = one ? [...on] : [...new Set([...(next[id] || []), ...on])]; });
        X.setA({ ctags: next }); X.log(`برچسب ${[...on].join("، ") || "—"} برای ${who}`); closeSheet(); toast("برچسب‌ها ذخیره شد", "check"); X.render();
      });
    } });
  } else if (kind === "stamps") {
    sheet(`<h2>مهر هدیه برای ${esc(who)}</h2><div class="opt-grid" id="st" style="margin-top:14px">${[1, 2, 3].map((n) => `<button class="chip" data-v="${n}" aria-pressed="${n === 2}">${num(n)} مهر</button>`).join("")}</div><button class="btn btn--block" id="st-go" style="margin-top:16px">${icon("coffee")}بفرست</button>`, { label: "مهر", onMount(b) {
      let v = 2; $$("#st [data-v]", b).forEach((x) => x.addEventListener("click", () => { v = +x.dataset.v; $$("#st [data-v]", b).forEach((y) => y.setAttribute("aria-pressed", y === x)); }));
      $("#st-go", b).addEventListener("click", () => { record(ids, `${num(v)} مهر هدیه داد`, "coffee", { msg: { ch: "push", t: `${num(v)} تا مهر هدیه از کن‌پانا ☕`, stamps: v } }); done("مهرها رفت"); });
    } });
  } else if (kind === "follow") {
    const f = ((A().cflags || {})[ids[0]] || {});
    sheet(`<h2>کِی یادت بندازم؟</h2><div class="opt-grid" id="fw" style="margin-top:14px">${[[1, "فردا"], [3, "۳ روز دیگه"], [7, "یه هفته دیگه"], [30, "یه ماه دیگه"]].map(([d, l], i) => `<button class="chip" data-v="${d}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div>
      <label class="field"><span>برای چی</span><input id="fw-w" maxlength="40" value="${esc(f.why || "")}" placeholder="مثلاً: زنگ بزن ببین مشکلش حل شد"></label>
      <button class="btn btn--block" id="fw-go" style="margin-top:16px">${icon("clock")}ذخیره</button>${f.follow ? `<button class="btn btn--block btn--ghost" id="fw-x" style="margin-top:8px">پیگیری انجام شد</button>` : ""}`, { label: "پیگیری", onMount(b) {
      let d = 1; $$("#fw [data-v]", b).forEach((x) => x.addEventListener("click", () => { d = +x.dataset.v; $$("#fw [data-v]", b).forEach((y) => y.setAttribute("aria-pressed", y === x)); }));
      const put = (v) => { const fl = { ...(A().cflags || {}) }; ids.forEach((id) => { fl[id] = { ...(fl[id] || {}), ...v }; }); X.setA({ cflags: fl }); };
      $("#fw-go", b).addEventListener("click", () => { const at = new Date(); at.setDate(at.getDate() + d); at.setHours(9, 0, 0, 0); put({ follow: at.getTime(), why: $("#fw-w", b).value.trim() }); record(ids, "یادآوری پیگیری گذاشت", "clock"); closeSheet(); toast("یادت می‌ندازم", "clock"); X.render(); });
      $("#fw-x", b)?.addEventListener("click", () => { put({ follow: 0, why: "" }); record(ids, "پیگیری رو انجام داد", "check"); closeSheet(); toast("انجام شد", "check"); X.render(); });
    } });
  }
}
function act(id, a) {
  const P = profileOf(id); if (!P) return;
  const [k, v] = a.split(":");
  if (k === "msg" || k === "tag" || k === "follow") return compose([id], k, v || "");
  if (k === "coupon") return v ? (record([id], `کوپن ٪${digits(v)} فرستاد`, "tag", { msg: { ch: "sms", t: `یه کوپن ٪${digits(v)} مال تو 🎁`, offer: { kind: "pct", value: +v / 100, title: `${v}% off`, title_fa: `٪${digits(v)} تخفیف` }, code: "CP" + digits(v) } }), toast(`کوپن ٪${digits(v)} رفت`, "tag"), X.render()) : compose([id], "coupon");
  if (k === "stamps") return v ? (record([id], `${num(+v)} مهر هدیه داد`, "coffee", { msg: { ch: "push", t: `${num(+v)} تا مهر هدیه ☕`, stamps: +v } }), toast("مهرها رفت", "coffee"), X.render()) : compose([id], "stamps");
  if (k === "gift") { const t = v === "bday" ? "تولدت مبارک 🎂 یه نوشیدنی مهمون ما" : "ببخشید که منتظر موندی؛ یه نوشیدنی مهمون ما"; record([id], v === "bday" ? "هدیه‌ی تولد فرستاد" : "یه نوشیدنی عذرخواهی هدیه داد", "gift", { msg: { ch: "push", t, offer: { kind: "drink", title: "A free drink", title_fa: "یه نوشیدنی مجانی" }, code: "GIFT" } }); toast("هدیه رفت", "gift"); return X.render(); }
  if (k === "points") { record([id], `${num(+v)} امتیاز هدیه داد`, "crown", { pts: +v, msg: { ch: "push", t: `${num(+v)} امتیاز هدیه، مرسی که دوستات رو آوردی 💛` } }); toast("امتیاز رفت", "crown"); return X.render(); }
  if (k === "reveal") { REVEAL.add(id); X.log(`شماره‌ی کامل ${P.c.name_fa} رو دید`); toast("دیدنش تو سابقه‌ی دسترسی ثبت شد", "shield"); return X.render(); }
  if (k === "call") { try { navigator.clipboard?.writeText(P.e.full.replace(/\D/g, "")); } catch (e) {} record([id], "شماره رو برای تماس برداشت", "phone"); toast("شماره کپی شد", "copy"); return; }
  if (k === "pin") { const fl = { ...(A().cflags || {}) }; fl[id] = { ...(fl[id] || {}), pin: !fl[id]?.pin }; X.setA({ cflags: fl }); toast(fl[id].pin ? "ستاره خورد" : "ستاره برداشته شد", "star"); return X.render(); }
  if (k === "note") { const ta = $("#cn-t"); const t = ta?.value.trim(); if (!t) { ta?.focus(); return; } const cn = { ...(A().cnotes || {}) }; cn[id] = [...(cn[id] || []), { at: Date.now(), t }]; X.setA({ cnotes: cn }); X.log(`برای ${P.c.name_fa} یادداشت گذاشت`); toast("یادداشت ثبت شد", "note"); return X.render(); }
  if (k === "tlmore") { tlN += 40; return X.render(); }
  if (k === "ordmore") { ordN += 30; return X.render(); }
  if (k === "csv") { csv(`conpanna-${id}-orders`, [["date", "time", "branch", "items", "mode", "channel", "pay", "subtotal", "discount", "total", "status", "prep_sec", "rating"], ...P.st.list.map((o) => [new Date(o.at).toISOString().slice(0, 10), new Date(o.at).toTimeString().slice(0, 5), o.branch, o.lines.map((l) => `${l.qty}x ${l.id}`).join(" "), o.mode, o.channel, o.pay, o.subtotal, o.discount || 0, o.total, o.status, o.prep, o.rating || ""])]); X.log(`سفارش‌های ${P.c.name_fa} رو خروجی گرفت`); toast("فایل دانلود شد", "dl"); return; }
  if (k === "print") { const pr = $("#print-root"); pr.innerHTML = `<div class="pr-head"><div><h1>پرونده‌ی مشتری</h1><p class="small">${esc(P.c.name_fa)} – ${fmtDay(new Date())}</p></div></div>${$("#sec").innerHTML}`; document.body.classList.add("print-pack"); const end = () => { document.body.classList.remove("print-pack"); pr.innerHTML = ""; removeEventListener("afterprint", end); }; addEventListener("afterprint", end); setTimeout(() => { print(); setTimeout(end, 1500); }, 60); }
}

/* ---------------------------------------------------------------- wiring */
export function wireCrm(el) {
  if ($("#crm-list", el)) {
    let t = 0;
    $("#crm-q", el).addEventListener("input", (e) => { F.q = e.target.value; page = 50; clearTimeout(t); t = setTimeout(() => paintList(el), 120); });
    $("#crm-sort", el).addEventListener("change", (e) => { F.sort = e.target.value; paintList(el); });
    $$("[data-seg]", el).forEach((b) => b.addEventListener("click", () => { F.seg = b.dataset.seg; page = 50; X.render(); }));
    $$("[data-f]", el).forEach((x) => x.addEventListener("change", () => { const k = x.dataset.f; F[k] = x.type === "checkbox" ? x.checked : ["minV", "minS"].includes(k) ? +x.value : x.value; page = 50; const n = nFilters(); const btn = $('[data-crm="filters"]', el); btn.innerHTML = `${icon("layers")}فیلترها${n ? `<span class="badge">${num(n)}</span>` : ""}`; paintList(el); }));
    $$(".crm-bar [data-crm], .flt [data-crm]", el).forEach((b) => b.addEventListener("click", () => crmAct(b.dataset.crm, el)));
    $("#crm-all", el).addEventListener("change", (e) => { const ids = rowsFor().slice(0, page).map((r) => r.c.id); ids.forEach((id) => (e.target.checked ? SEL.add(id) : SEL.delete(id))); paintList(el); });
    wireList(el);
  }
  if ($(".c360-head", el)) {
    const id = A().cid;
    $$("[data-ca]", el).forEach((b) => b.addEventListener("click", () => act(id, b.dataset.ca)));
    $$("[data-cnav]", el).forEach((b) => b.addEventListener("click", () => b.dataset.cnav && openCustomer(b.dataset.cnav)));
    $$("[data-jump]", el).forEach((b) => b.addEventListener("click", () => { const t = $("#" + b.dataset.jump); if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - 92, behavior: "smooth" }); }));
    $$("[data-tlf]", el).forEach((b) => b.addEventListener("click", () => { tlF = b.dataset.tlf; tlN = 25; X.render(); }));
    $$("[data-delnote]", el).forEach((b) => b.addEventListener("click", () => { const at = +b.dataset.delnote, cn = { ...(A().cnotes || {}) }; const old = cn[id] || []; cn[id] = old.filter((n) => n.at !== at); X.setA({ cnotes: cn }); X.render(); toast("یادداشت پاک شد", "trash", { action: "برگردون", onAction: () => { X.setA({ cnotes: { ...(A().cnotes || {}), [id]: old } }); X.render(); } }); }));
    $("#cn-t", el)?.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) act(id, "note"); });
  }
}
export const CRM = { customers: directory, customer: profile };
export const crmTitle = () => { const P = profileOf(A().cid); return P ? P.c.name_fa : "پرونده‌ی مشتری"; };
export const resetCrmIndex = () => { IX = null; };
