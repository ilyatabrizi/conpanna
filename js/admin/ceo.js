// CEO panel — the numbers: today, alerts, sales, profit and loss, goals and
// forecast, products and menu engineering, customer insight, and branches side
// by side. All in plain, spoken Persian, the way an owner would say it.
import { $, $$, esc, icon, toast, num, digits, pct, kmoney, fmtDay, fmtTime, ago, loc, tile, openState, busy, busyLabel, sw } from "../ui.js";
import { fmtDayNum } from "../i18n.js";
import { MENU, BRANCHES, CATEGORIES } from "../data.js";
import { getHub, setHub } from "../hub.js";
import { DAY, T, kk, sum, avg, fa1, mins, delta, kpi, card, pill, empty, periodBar, table, meter, spark, lines, gbars, heat, quad, ring, jalali } from "./kit.js";
import { STOCK, TOPICS, OPENED } from "./seed.js";

let X;
export function initCeo(ctx) { X = ctx; }
const A = () => X.A();
const done = (a) => a.filter((o) => o.status === "done");
const per = () => A().period || 30;
const brs = () => BRANCHES.filter((b) => X.inScope(b.id));
const item = (id) => MENU.find((m) => m.id === id);
const bname = (id) => loc(BRANCHES.find((b) => b.id === id) || {});
const dlabel = (d) => fmtDayNum(new Date(X.S.today0 - d * DAY));
const dtip = (d) => fmtDay(new Date(X.S.today0 - d * DAY));
const WD = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const WEEK = [6, 0, 1, 2, 3, 4, 5]; // Saturday first
const range = (all, days, off = 0) => all.filter((o) => o.day >= off && o.day < off + days);
const series = (list, from, n) => { const v = Array(n).fill(0); list.forEach((o) => { const k = o.day - from; if (k >= 0 && k < n) v[n - 1 - k] += o.total; }); return v; };

/* ---------------------------------------------------------------- targets */
export function targets() {
  const t = { ...(A().targets || {}) };
  BRANCHES.forEach((b) => {
    if (t[b.id]) return;
    const r30 = sum(done(X.S.orders.filter((o) => o.branch === b.id && o.day < 30)));
    t[b.id] = Math.round((r30 * 1.08) / 1e8) * 1e8 || 1e9;
  });
  return t;
}

/* ----------------------------------------------------------------- alerts */
export function alerts() {
  const out = [], now = Date.now();
  const lowS = X.stock().map((s) => ({ s, left: s.qty / s.daily, it: STOCK.find((x) => x.id === s.item) })).filter((x) => x.left < X.cfg().low).sort((a, b) => a.left - b.left);
  lowS.filter((x) => x.left < 1).forEach(({ s, it }) => out.push({ r: "stock", k: "bad", ic: "layers", t: `${it.n} – ${bname(s.branch)}`, s: "کمتر از یه روز دیگه تموم می‌شه", act: ["سفارش بده", "inventory"] }));
  const soon = lowS.filter((x) => x.left >= 1);
  if (soon.length) out.push({ r: "stock", k: "warn", ic: "layers", t: `${num(soon.length)} قلم دیگه تا دو سه روز دیگه تموم می‌شن`, s: soon.slice(0, 4).map(({ s, it }) => `${it.n} (${bname(s.branch)})`).join("، ") + (soon.length > 4 ? "، …" : ""), act: ["لیست خرید", "inventory"] });
  X.S.maint.forEach((m) => {
    const dn = (A().maintDone || {})[m.id] || m.last, due = dn + m.every * DAY;
    if (now > due) out.push({ r: "maint", k: "bad", ic: "gear", t: m.what, s: `${bname(m.branch)} – ${num(Math.floor((now - due) / DAY))} روزه عقب افتاده`, act: ["چک‌لیست", "tasks"] });
    else if (due - now < 4 * DAY) out.push({ r: "maint", k: "warn", ic: "gear", t: m.what, s: `${bname(m.branch)} – تا ${num(Math.ceil((due - now) / DAY))} روز دیگه`, act: ["چک‌لیست", "tasks"] });
  });
  const late = X.boardOrders().filter((o) => o.status !== "done" && now - o.at > 15 * 60e3);
  if (late.length) out.push({ r: "late", k: "bad", ic: "clock", t: `${num(late.length)} سفارش بیشتر از ۱۵ دقیقه‌ست منتظره`, s: late.map((o) => `#${digits(o.code)}`).join("، "), act: ["بورد سفارش‌ها", "orders"] });
  const rep = getHub().replies || {};
  const bad = X.S.reviews.filter((r) => X.inScope(r.branch) && r.rating <= 2 && now - r.at < 3 * DAY && !rep[r.id]);
  if (bad.length) out.push({ r: "review", k: "warn", ic: "star", t: `${num(bad.length)} نظر بد بی‌جواب مونده`, s: "سه روز اخیر – زود جواب بدی بهتره", act: ["نظرها", "reviews"] });
  const all = X.orders(), h = new Date().getHours();
  const todayRev = sum(done(all.filter((o) => o.day === 0)));
  const same = [7, 14, 21, 28].map((d) => sum(done(all.filter((o) => o.day === d && o.hour < h))));
  const exp = avg(same, (x) => x);
  if (h >= 11 && exp && todayRev < exp * 0.82) out.push({ r: "pace", k: "warn", ic: "trend", t: "فروش امروز از روزای مشابه عقب‌تره", s: `${pct(Math.round((1 - todayRev / exp) * 100))} کمتر از میانگین همین ساعت تو ۴ هفته‌ی اخیر`, act: ["گزارش فروش", "sales"] });
  const hub = getHub();
  brs().forEach((b) => { if (hub.paused[b.id] > now) out.push({ k: "info", ic: "pause", t: `سفارش آنلاین ${loc(b)} نگه داشته شده`, s: `تا ساعت ${fmtTime(new Date(hub.paused[b.id]))}`, act: ["شعبه‌ها", "branches"] }); });
  if (h >= 10) brs().forEach((b) => { const cl = X.checklist(b.id), n = cl.filter((c) => !c.done).length; if (n) out.push({ k: "warn", ic: "check", t: `چک‌لیست صبح ${loc(b)} کامل نشده`, s: `${num(n)} مورد مونده`, act: ["چک‌لیست", "tasks"] }); });
  brs().forEach((b) => { const p = avg(done(all.filter((o) => o.branch === b.id && o.day < 7)), (o) => o.prep); if (p > X.cfg().sla * 60) out.push({ r: "late", k: "info", ic: "clock", t: `آماده‌سازی تو ${loc(b)} کُنده`, s: `میانگین ${mins(p)} تو هفته‌ی اخیر`, act: ["کیفیت سرویس", "service"] }); });
  const lateP = X.S.staff.filter((p) => X.inScope(p.branch) && p.late30 >= 4);
  if (lateP.length) out.push({ r: "staff", k: "info", ic: "users", t: `${num(lateP.length)} نفر این ماه ۴ بار یا بیشتر دیر اومدن`, s: lateP.slice(0, 4).map((p) => `${p.name_fa} (${bname(p.branch)})`).join("، ") + (lateP.length > 4 ? "، …" : ""), act: ["پرسنل", "staff"] });
  const tk = new Date().toDateString();
  (A().closes || []).filter((c) => c.day === tk && X.inScope(c.branch) && Math.abs(c.diff) >= X.cfg().tol).forEach((c) => out.push({ r: "cash", k: "warn", ic: "cash", t: `اختلاف صندوق ${bname(c.branch)}`, s: `${c.diff < 0 ? "کسری" : "اضافه"} ${kmoney(Math.abs(c.diff))} تومان موقع بستن صندوق`, act: ["صندوق", "cash"] }));
  const fl = A().cflags || {}, eod = new Date().setHours(23, 59, 59, 999), fu = Object.values(fl).filter((f) => f.follow && f.follow <= eod).length;
  if (fu) out.push({ r: "crm", k: "info", ic: "users", t: `${num(fu)} مشتری امروز پیگیری می‌خوان`, s: "یادآوری‌هایی که خودت گذاشتی", act: ["مشتری‌ها", "customers"] });
  const ord = { bad: 0, warn: 1, info: 2 };
  const R = A().alertRules || {}, DEFR = { staff: false };
  return out.filter((a) => !a.r || (R[a.r] ?? DEFR[a.r] ?? true)).filter((a) => !(A().dismissed || []).includes(a.t)).sort((a, b) => ord[a.k] - ord[b.k]);
}
const alertRow = (a, close = false) => `<div class="al al-${a.k}"><span class="al-ic">${icon(a.ic)}</span><span class="row-main"><span class="row-t">${esc(a.t)}</span><span class="row-s">${esc(a.s)}</span></span>${a.act ? `<button class="btn btn--sm btn--soft" data-go="${a.act[1]}">${a.act[0]}</button>` : ""}${close ? `<button class="icon-btn al-x" data-dismiss="${esc(a.t)}" aria-label="بستن">${icon("close")}</button>` : ""}</div>`;

/* ---------------------------------------------------------------- overview */
function overview() {
  const all = X.orders(), now = Date.now();
  const today = done(all.filter((o) => o.day === 0)), yest = done(all.filter((o) => o.day === 1 && o.at <= now - DAY));
  const rev = sum(today), revY = sum(yest), ord = today.length, ordY = yest.length;
  const gp = rev - sum(today, (o) => o.cost), gpY = revY - sum(yest, (o) => o.cost);
  const rated = done(all.filter((o) => o.day < 30 && o.rating));
  const rating = avg(rated, (o) => o.rating);
  const members7 = X.S.customers.filter((c) => X.inScope(c.branch) && now - c.joined < 7 * DAY).length + (X.app().user && now - X.app().user.since < 7 * DAY ? 1 : 0);
  const live = X.boardOrders().filter((o) => o.status !== "done");
  const J = jalali(), tg = targets(), target = sum(brs(), (b) => tg[b.id]);
  const mtd = sum(done(all.filter((o) => o.day < J.d)));
  const avgDay = sum(done(all.filter((o) => o.day >= 1 && o.day <= 28))) / 28;
  const elapsed = J.d - 1 + Math.min(1, rev / (avgDay || 1));
  const proj = elapsed > 0.3 ? (mtd / elapsed) * J.len : 0;
  const al = alerts();
  const d14 = series(done(all), 1, 14), p14 = series(done(all), 15, 14);
  const hrsT = {}, hrsA = {};
  today.forEach((o) => { hrsT[o.hour] = (hrsT[o.hour] || 0) + 1; });
  done(all.filter((o) => o.day >= 1 && o.day <= 7)).forEach((o) => { hrsA[o.hour] = (hrsA[o.hour] || 0) + 1 / 7; });
  const cnt = {}; done(range(all, 7)).forEach((o) => o.lines.forEach((l) => { cnt[l.id] = (cnt[l.id] || 0) + l.qty; }));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `
    <div class="kpis k6">
      ${kpi("فروش امروز", T(rev), "نسبت به همین ساعت دیروز", delta(rev, revY))}
      ${kpi("سفارش‌ها", num(ord), `${num(live.length)} تا الان در جریانه`, delta(ord, ordY))}
      ${kpi("میانگین هر فاکتور", `${kk(ord ? rev / ord : 0)}<small> تومان</small>`, "به ازای هر سفارش", delta(ord ? rev / ord : 0, ordY ? revY / ordY : 0))}
      ${kpi("سود ناخالص امروز", T(gp), `حاشیه‌ی سود ${pct(Math.round(rev ? (gp / rev) * 100 : 0))}`, delta(gp, gpY))}
      ${kpi("عضو جدید این هفته", num(members7), `${num(X.S.customers.filter((c) => X.inScope(c.branch)).length)} عضو در کل`)}
      ${kpi("رضایت مشتری", `${fa1(rating)}<small> از ۵</small>`, `${num(rated.length)} امتیاز تو ۳۰ روز`)}
    </div>
    <div class="cards g3">
      ${card(`هدف ${J.name}`, `<div class="goal-box">${ring(mtd / target, pct(Math.round((mtd / target) * 100)), "از هدف")}<div class="goal-txt"><p><b>${T(mtd)}</b> فروختی از <b>${T(target)}</b></p><p class="small">با این روند آخر ماه می‌رسی به <b>${kmoney(proj)}</b> تومان – ${proj >= target ? pill("رو روالیم", "ok") : pill(`${pct(Math.round((1 - proj / target) * 100))} عقبیم`, "warn")}</p><p class="tiny">${num(J.len - J.d)} روز تا آخر ماه مونده</p></div></div>`, { extra: `<button class="link sm" data-go="goals">هدف‌ها</button>` })}
      ${card("هشدارها", al.length ? `<div class="al-list">${al.slice(0, 4).map((a) => alertRow(a)).join("")}</div>` : empty("همه‌چی مرتبه، هشداری نداریم 👌"), { extra: al.length ? `<button class="link sm" data-go="alerts">همه (${num(al.length)})</button>` : "", cls: "al-card" })}
      ${card("همین الان", `<div class="feed">${live.slice(-5).reverse().map((o) => `<div class="feed-i"><span class="st st-${o.status}"></span><b>#${digits(o.code)}</b><span>${esc(o.name)} – ${esc(bname(o.branch))}</span><span class="tiny">${ago(o.at)}</span></div>`).join("") || empty("الان سفارشی تو جریان نیست.")}</div>`, { extra: `<button class="btn btn--sm btn--soft" data-go="orders">بورد سفارش‌ها</button>` })}
    </div>
    <div class="cards g2">
      ${card("فروش ۱۴ روز گذشته", lines([{ vals: d14, label: "۱۴ روز گذشته" }, { vals: p14, label: "۱۴ روز قبلش", cls: "dash" }], Array.from({ length: 14 }, (_, i) => dlabel(14 - i)), { tips: Array.from({ length: 14 }, (_, i) => dtip(14 - i)) }), { cls: "wide", extra: `<span class="tiny">${kmoney(sum(d14, (x) => x))} تومان – ${delta(sum(d14, (x) => x), sum(p14, (x) => x))}</span>` })}
      ${card("سفارش تو ساعت‌های روز", hourBars(hrsT, hrsA), { extra: `<span class="tiny legend"><i class="lg-t"></i>امروز <i class="lg-a"></i>میانگین ۷ روز</span>` })}
      ${card("پرفروش‌های این هفته", barsH(top.map(([id, v]) => ({ l: esc(loc(item(id))), v }))))}
      ${card("شعبه‌ها امروز", barsH(brs().map((b) => { const v = sum(today.filter((o) => o.branch === b.id)); return { l: esc(loc(b)), v, f: kmoney(v) }; })), { extra: `<button class="link sm" data-go="branches">مقایسه</button>` })}
      ${card("از کجا سفارش میاد – امروز", donutH([{ l: "اپ (بیرون‌بر)", v: today.filter((o) => o.channel === "app").length, c: "#C9A57C" }, { l: "صندوق – بیرون‌بر", v: today.filter((o) => o.channel !== "app" && o.mode === "takeaway").length, c: "#45281A" }, { l: "صندوق – سالن", v: today.filter((o) => o.mode === "dinein").length, c: "#8A5634" }]))}
    </div>
    <p class="tiny demo-note">${icon("info")}داده‌ها نمونه‌ان (۴ ماه سابقه‌ی ساختگی) به‌علاوه‌ی هر کاری که تو اپ مشتری روی همین گوشی انجام بشه.</p>`;
}
export function hourBars(today, avgH) {
  const hrs = Array.from({ length: 16 }, (_, i) => i + 8), m = Math.max(...hrs.map((h) => Math.max(today[h] || 0, avgH[h] || 0))) || 1, nowH = new Date().getHours();
  return `<div class="hours">${hrs.map((h) => `<div class="hr ${h === nowH ? "now" : ""}"><span class="hr-avg" style="--h:${((avgH[h] || 0) / m).toFixed(3)}"></span><span class="hr-t" style="--h:${((today[h] || 0) / m).toFixed(3)}"></span><small>${digits(h)}</small></div>`).join("")}</div>`;
}
export function barsH(rows, { max } = {}) {
  const m = max || Math.max(...rows.map((r) => r.v)) || 1;
  return `<div class="hbars">${rows.map((r) => `<div class="hb"><span class="hb-l">${r.l}</span><span class="hb-t"><i style="--w:${(Math.max(0, r.v) / m) * 100}%;${r.c ? `--c:${r.c}` : ""}"></i></span><span class="hb-v">${r.f || num(r.v)}</span></div>`).join("")}</div>`;
}
export function donutH(parts) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1; let acc = 0; const C = 2 * Math.PI * 40;
  return `<div class="donut"><svg viewBox="0 0 100 100">${parts.map((p) => { const d = (p.v / tot) * C; const s = `<circle cx="50" cy="50" r="40" stroke="${p.c}" stroke-dasharray="${d} ${C - d}" stroke-dashoffset="${-acc}"/>`; acc += d; return s; }).join("")}</svg>
    <div class="donut-l">${parts.map((p) => `<span><i style="background:${p.c}"></i>${p.l}<b>${pct(Math.round((p.v / tot) * 100))}</b></span>`).join("")}</div></div>`;
}

/* ------------------------------------------------------------ alerts page */
function alertsSec() {
  const al = alerts(), R = A().alertRules || {};
  const rule = (k, t, s, on = true) => `<label class="row plain tgl-row"><span class="row-main"><span class="row-t">${t}</span><span class="row-s">${s}</span></span>${sw("ar-" + k, R[k] ?? on, t)}</label>`;
  const ch = A().alertCh || { telegram: true, sms: true, push: true, email: false };
  return `<div class="kpis k4">${kpi("فوری", num(al.filter((a) => a.k === "bad").length))}${kpi("حواست باشه", num(al.filter((a) => a.k === "warn").length))}${kpi("خبر", num(al.filter((a) => a.k === "info").length))}${kpi("بسته‌شده", num((A().dismissed || []).length), (A().dismissed || []).length ? `<button class="link sm" id="undismiss">برگردون</button>` : "")}</div>
    <div class="cards g2">
      ${card("الان چی‌کار کنیم", al.length ? `<div class="al-list">${al.map((a) => alertRow(a, true)).join("")}</div>` : empty("هیچ هشداری نداریم. ☕"), { cls: "wide" })}
      ${card("کِی خبرم کنی", `<div class="group flat">${rule("stock", "موجودی کم", "وقتی یه قلم تا دو سه روز دیگه تموم بشه")}${rule("late", "سفارش دیرشده", "سفارشی که بیشتر از ۱۵ دقیقه منتظر بمونه")}${rule("review", "نظر بد", "امتیاز ۱ یا ۲ از مشتری")}${rule("pace", "فروش عقب", "وقتی فروش روز ٪۲۰ از روزای مشابه کمتره")}${rule("maint", "سرویس دستگاه‌ها", "سه روز قبل از موعد")}${rule("cash", "اختلاف صندوق", "وقتی شمارش آخر شب با سیستم نخونه")}${rule("staff", "غیبت و تأخیر", "وقتی کسی زیاد دیر بیاد یا غیبت کنه", false)}</div>`)}
      ${card("از کجا خبرم کنی", `<div class="ch-grid">${[["telegram", "تلگرام", "send"], ["sms", "پیامک", "phone"], ["push", "اعلان گوشی", "bell"], ["email", "ایمیل", "mega"]].map(([k, t, ic]) => `<label class="ch-opt ${ch[k] ? "on" : ""}">${icon(ic)}<span>${t}</span>${sw("ac-" + k, ch[k], t)}</label>`).join("")}</div>
        <p class="small" style="margin-top:14px">هر شب ساعت ۲۳:۳۰ هم خلاصه‌ی روز برات میاد. متنش رو تو <button class="link sm" data-go="reports">گزارش‌ها</button> ببین.</p>`)}
    </div>`;
}

/* -------------------------------------------------------------------- sales */
function sales() {
  const P = per(), all = X.orders();
  const cur = range(all, P), prev = range(all, P, P);
  const c = done(cur), p = done(prev);
  const rev = sum(c), revP = sum(p), disc = sum(c, (o) => o.discount || 0), discP = sum(p, (o) => o.discount || 0);
  const canc = cur.filter((o) => o.status !== "done"), cancP = prev.filter((o) => o.status !== "done");
  const items = sum(c, (o) => o.qty || 1);
  const vals = series(done(all), 1, P), pvals = series(done(all), P + 1, P);
  const m = WEEK.map(() => Array(16).fill(0));
  c.forEach((o) => { const r = WEEK.indexOf(new Date(o.at).getDay()), h = o.hour - 8; if (h >= 0 && h < 16) m[r][h]++; });
  const payN = (k) => c.filter((o) => o.pay === k).length;
  const dtypes = [["voucher", "کوپن"], ["promo", "کد تخفیف"], ["gold", "٪۱۰ پانا طلایی"], ["free", "نوشیدنی رایگان (کارت مهر)"]].map(([k, l]) => ({ l, v: sum(c.filter((o) => o.promo === k), (o) => o.discount), f: kmoney(sum(c.filter((o) => o.promo === k), (o) => o.discount)) }));
  const bs = [1, 2, 3, 4].map((n) => ({ l: n === 4 ? "۴ قلم و بیشتر" : `${num(n)} قلم`, v: c.filter((o) => (n === 4 ? (o.qty || 1) >= 4 : (o.qty || 1) === n)).length }));
  const days = Array.from({ length: Math.min(P, 14) }, (_, i) => i);
  return `${periodBar(P, `<span class="tiny">مقایسه با ${num(P)} روز قبلش</span>`)}
    <div class="kpis k6">
      ${kpi("فروش", T(rev), "", delta(rev, revP))}
      ${kpi("سفارش", num(c.length), "", delta(c.length, p.length))}
      ${kpi("میانگین فاکتور", `${kk(rev / (c.length || 1))}<small> تومان</small>`, "", delta(rev / (c.length || 1), revP / (p.length || 1)))}
      ${kpi("قلم تو هر سفارش", fa1(items / (c.length || 1)), "", delta(items / (c.length || 1), sum(p, (o) => o.qty || 1) / (p.length || 1)))}
      ${kpi("تخفیف‌ها", T(disc), `${pct(Math.round((disc / (rev + disc || 1)) * 100))} از فروش`, delta(disc, discP, { inverse: true }))}
      ${kpi("لغو و مرجوعی", num(canc.length), `${T(sum(canc))} از دست رفت`, delta(canc.length, cancP.length, { inverse: true }))}
    </div>
    <div class="cards g2">
      ${card(`فروش روزانه – ${num(P)} روز گذشته`, lines([{ vals, label: "این دوره" }, { vals: pvals, label: "دوره‌ی قبل", cls: "dash" }], Array.from({ length: P }, (_, i) => dlabel(P - i)), { tips: Array.from({ length: P }, (_, i) => dtip(P - i)) }), { cls: "wide" })}
      ${card("کِی شلوغه؟ (سفارش در روز و ساعت)", heat(WEEK.map((w) => WD[w]), Array.from({ length: 16 }, (_, i) => digits(i + 8)), m), { cls: "wide" })}
      ${card("روش پرداخت", donutH([{ l: "کارت‌خوان", v: payN("card"), c: "#45281A" }, { l: "آنلاین (اپ)", v: payN("online"), c: "#C9A57C" }, { l: "نقد", v: payN("cash"), c: "#8A5634" }]))}
      ${card("کانال فروش", donutH([{ l: "اپ", v: c.filter((o) => o.channel === "app").length, c: "#C9A57C" }, { l: "صندوق – بیرون‌بر", v: c.filter((o) => o.channel !== "app" && o.mode === "takeaway").length, c: "#45281A" }, { l: "صندوق – سالن", v: c.filter((o) => o.mode === "dinein").length, c: "#8A5634" }]))}
      ${card("خرج تخفیف‌ها", barsH(dtypes))}
      ${card("اندازه‌ی سبد", barsH(bs))}
    </div>
    ${card("روز به روز", table(["روز", "سفارش", "فروش", "میانگین فاکتور", "تخفیف", "لغو"], days.map((d) => { const a = done(cur.filter((o) => o.day === d)), x = cur.filter((o) => o.day === d && o.status !== "done"); return [fmtDay(new Date(X.S.today0 - d * DAY)), num(a.length), kmoney(sum(a)), kk(sum(a) / (a.length || 1)), kmoney(sum(a, (o) => o.discount || 0)), num(x.length)]; })), { extra: `<button class="btn btn--sm btn--soft" data-csv="sales">${icon("dl")}خروجی اکسل</button>` })}`;
}

/* ------------------------------------------------------------ profit & loss */
export function pnl(list, days, branchIds) {
  const c = done(list);
  const gross = sum(c, (o) => o.subtotal ?? o.total), disc = sum(c, (o) => o.discount || 0), net = gross - disc;
  const cf = X.cfg(), vat = Math.round((net * cf.vat) / (100 + cf.vat)), afterVat = net - vat;
  const cogs = sum(c, (o) => o.cost || 0);
  const f = days / 30;
  const staff = X.S.staff.filter((p) => branchIds.includes(p.branch));
  const wages = sum(staff, (p) => p.wage * 8 * 26) * f;
  const rent = sum(branchIds, (b) => X.S.fixed[b].rent) * f, util = sum(branchIds, (b) => X.S.fixed[b].util) * f;
  const share = branchIds.length / BRANCHES.length;
  const mkt = X.S.shared.marketing * f * share, soft = (X.S.shared.software + X.S.shared.accounting) * f * share;
  const waste = sum(X.S.waste.filter((w) => branchIds.includes(w.branch)), (w) => w.qty * STOCK.find((s) => s.id === w.item).cost) * (days / 7);
  const fees = Math.round(sum(c.filter((o) => o.pay !== "cash"), (o) => o.total) * (X.cfg().fee / 100));
  const extra = sum((A().expenses || []).filter((e) => branchIds.includes(e.branch) && Date.now() - e.at < days * DAY), (e) => e.amount);
  const opex = wages + rent + util + mkt + soft + waste + fees + extra;
  const gp = afterVat - cogs, np = gp - opex;
  return { gross, disc, net, vat, afterVat, cogs, gp, wages, rent, util, mkt, soft, waste, fees, extra, opex, np };
}
function finance() {
  const P = per(), all = X.orders(), ids = brs().map((b) => b.id);
  const r = pnl(range(all, P), P, ids), rp = pnl(range(all, P, P), P, ids);
  const line = (t, v, { k = "", pctOf = r.afterVat, sub = false } = {}) => `<div class="pl-row ${k} ${sub ? "sub" : ""}"><span>${t}</span><span class="pl-p">${pctOf ? pct(Math.abs(Math.round((v / pctOf) * 100))) : ""}</span><b>${!sub && v < 0 ? "−" : ""}${kmoney(Math.abs(v))}</b></div>`;
  const months = [3, 2, 1, 0].map((k) => { const x = pnl(range(all, 30, k * 30), 30, ids); return { l: k ? `${num(k)} ماه پیش` : "این ماه", v: [x.afterVat, x.cogs + x.opex, x.np] }; });
  const brRows = brs().map((b) => { const x = pnl(range(all, P).filter((o) => o.branch === b.id), P, [b.id]); return { b, x }; });
  const fixedDay = (sum(ids, (b) => X.S.fixed[b].rent + X.S.fixed[b].util) + sum(X.S.staff.filter((p) => ids.includes(p.branch)), (p) => p.wage * 8 * 26)) / 30;
  const gm = r.gp / (r.afterVat || 1), breakEven = fixedDay / (gm || 1);
  const cashToday = sum(done(all.filter((o) => o.day === 0 && o.pay === "cash"))), cardToday = sum(done(all.filter((o) => o.day === 0 && o.pay === "card"))), onlineToday = sum(done(all.filter((o) => o.day === 0 && o.pay === "online")));
  return `${periodBar(P)}
    <div class="kpis k5">
      ${kpi("درآمد بعد از مالیات", T(r.afterVat), "", delta(r.afterVat, rp.afterVat))}
      ${kpi("سود ناخالص", T(r.gp), `حاشیه ${pct(Math.round(gm * 100))}`, delta(r.gp, rp.gp))}
      ${kpi("هزینه‌های جاری", T(r.opex), "", delta(r.opex, rp.opex, { inverse: true }))}
      ${kpi("سود خالص", T(r.np), `حاشیه ${pct(Math.round((r.np / (r.afterVat || 1)) * 100))}`, delta(r.np, rp.np))}
      ${kpi("نقطه‌ی سر به سر", `${kmoney(breakEven)}<small> در روز</small>`, "فروش روزانه‌ای که خرج‌ها رو درمیاره")}
    </div>
    <div class="cards g2">
      ${card(`صورت سود و زیان – ${num(P)} روز`, `<div class="pl">
        ${line("فروش ناخالص", r.gross, { pctOf: 0 })}${line("تخفیف‌ها", -r.disc, { sub: true, pctOf: 0 })}${line("فروش خالص", r.net, { k: "tot", pctOf: 0 })}
        ${line(`مالیات بر ارزش افزوده (${pct(X.cfg().vat)})`, -r.vat, { sub: true, pctOf: 0 })}${line("درآمد بعد از مالیات", r.afterVat, { k: "tot" })}
        ${line("بهای مواد اولیه و بسته‌بندی", -r.cogs, { sub: true })}${line("سود ناخالص", r.gp, { k: "tot" })}
        ${line("حقوق و دستمزد", -r.wages, { sub: true })}${line("اجاره", -r.rent, { sub: true })}${line("آب و برق و گاز", -r.util, { sub: true })}${line("بازاریابی", -r.mkt, { sub: true })}${line("نرم‌افزار و حسابداری", -r.soft, { sub: true })}${line("ضایعات", -r.waste, { sub: true })}${line("کارمزد بانکی", -r.fees, { sub: true })}${r.extra ? line("هزینه‌های ثبت‌شده‌ی تو", -r.extra, { sub: true }) : ""}
        ${line("سود خالص", r.np, { k: "tot big " + (r.np >= 0 ? "pos" : "neg") })}</div>`)}
      ${card("چهار ماه اخیر", gbars(months, [{ l: "درآمد", c: "#C9A57C" }, { l: "هزینه‌ها", c: "#8A5634" }, { l: "سود", c: "#3C9560" }]))}
      ${card("سود و زیان هر شعبه", table(["شعبه", "فروش", "مواد اولیه", "حقوق", "اجاره", "سود خالص", "حاشیه"], brRows.map(({ b, x }) => [esc(loc(b)) + (OPENED[b.id] ? ` ${pill("تازه", "info")}` : ""), kmoney(x.afterVat), pct(Math.round((x.cogs / (x.afterVat || 1)) * 100)), kmoney(x.wages), kmoney(x.rent), `<b class="${x.np >= 0 ? "pos" : "neg"}">${x.np < 0 ? "−" : ""}${kmoney(Math.abs(x.np))}</b>`, pct(Math.round((x.np / (x.afterVat || 1)) * 100))])), { cls: "wide" })}
      ${card("صندوق امروز", `<div class="cash-grid"><div><span>نقد تو صندوق</span><b>${T(cashToday)}</b></div><div><span>کارت‌خوان (تسویه فردا)</span><b>${T(cardToday)}</b></div><div><span>آنلاین (درگاه)</span><b>${T(onlineToday)}</b></div></div><p class="tiny" style="margin-top:12px">شمارش آخر شب رو مدیر شعبه ثبت می‌کنه و اگه با سیستم نخونه هشدار میاد.</p>`)}
      ${card("ثبت هزینه", `<div class="inline-form"><input id="ex-t" placeholder="مثلاً تعمیر یخچال"><input id="ex-a" inputmode="numeric" placeholder="مبلغ (تومان)"><select id="ex-b">${brs().map((b) => `<option value="${b.id}">${esc(loc(b))}</option>`).join("")}</select><button class="btn btn--sm" id="ex-add">${icon("plus")}ثبت</button></div>
        ${(A().expenses || []).length ? table(["هزینه", "شعبه", "مبلغ", ""], (A().expenses || []).slice().reverse().slice(0, 6).map((e) => [esc(e.title), esc(bname(e.branch)), kmoney(e.amount), `<span class="tiny">${ago(e.at)}</span>`])) : `<p class="tiny" style="margin-top:10px">هر هزینه‌ای ثبت کنی همون لحظه تو سود و زیان حساب می‌شه.</p>`}`)}
    </div>`;
}

/* ------------------------------------------------------------- goals & forecast */
function goals() {
  const all = X.orders(), J = jalali(), tg = targets();
  const rows = brs().map((b) => {
    const mtd = sum(done(all.filter((o) => o.branch === b.id && o.day < J.d)));
    const d28 = sum(done(all.filter((o) => o.branch === b.id && o.day >= 1 && o.day <= 28))) / 28;
    const today = sum(done(all.filter((o) => o.branch === b.id && o.day === 0)));
    const el = J.d - 1 + Math.min(1, today / (d28 || 1));
    const proj = el > 0.3 ? (mtd / el) * J.len : 0;
    return { b, mtd, proj, t: tg[b.id] };
  });
  // next 7 days: the same weekday over the last four weeks, nudged by the trend
  const fc = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(X.S.today0 + (i + 1) * DAY), wd = day.getDay();
    const past = [1, 2, 3, 4].map((w) => 7 * w - (i + 1)).filter((d) => d >= 1).map((d) => sum(done(all.filter((o) => o.day === d))));
    const trend = sum(done(range(all, 28, 1))) / (sum(done(range(all, 28, 29))) || 1);
    return { l: WD[wd], v: [avg(past, (x) => x) * Math.min(1.15, Math.max(0.9, Math.sqrt(trend)))] };
  });
  const sim = A().sim || { drinks: 5, cakes: 0 };
  const P = 30, cur = done(range(all, P));
  const drinkRev = sum(cur, (o) => sum(o.lines.filter((l) => !["cake", "breakfast"].includes(item(l.id)?.cat)), (l) => l.unit * l.qty));
  const cakeRev = sum(cur, (o) => sum(o.lines.filter((l) => ["cake", "breakfast"].includes(item(l.id)?.cat)), (l) => l.unit * l.qty));
  const el = -0.35;
  const dRev = drinkRev * ((1 + sim.drinks / 100) * (1 + (el * sim.drinks) / 100) - 1) + cakeRev * ((1 + sim.cakes / 100) * (1 + (el * sim.cakes) / 100) - 1);
  const dVol = drinkRev * ((el * sim.drinks) / 100) + cakeRev * ((el * sim.cakes) / 100);
  return `<div class="cards g2">
    ${card(`هدف فروش ${J.name} هر شعبه`, `<div class="goals">${rows.map((r) => `<div class="goal-r"><div class="goal-top"><b>${esc(loc(r.b))}</b>${r.proj >= r.t ? pill("رو روالیم", "ok") : pill("عقبیم", "warn")}</div>${meter(r.mtd / r.t, r.proj >= r.t ? "ok" : "warn")}<div class="goal-n"><span>${kmoney(r.mtd)} از</span><label class="t-in"><input data-target="${r.b.id}" inputmode="numeric" value="${num(Math.round(r.t / 1e6))}"><small>میلیون</small></label><span class="tiny">پیش‌بینی: ${kmoney(r.proj)}</span></div></div>`).join("")}</div><p class="tiny" style="margin-top:12px">عدد هدف رو هر وقت خواستی عوض کن، همه‌جای پنل حساب می‌شه.</p>`)}
    ${card("پیش‌بینی فروش ۷ روز آینده", `${gbars(fc, [{ l: "فروش پیش‌بینی‌شده", c: "#C9A57C" }], { h: 180 })}<p class="small" style="margin-top:10px">جمع هفته‌ی آینده حدود <b>${kmoney(sum(fc, (x) => x.v[0]))}</b> تومان. بر اساس همون روز هفته تو ۴ هفته‌ی اخیر و روند رشد.</p>`)}
    ${card("اگه قیمت‌ها رو عوض کنیم چی می‌شه؟", `<div class="sim">
      <label class="sim-r"><span>نوشیدنی‌ها</span><input type="range" min="-10" max="25" step="1" id="sim-d" value="${sim.drinks}"><b id="sim-dv">${sim.drinks >= 0 ? "+" : "−"}${pct(Math.abs(sim.drinks))}</b></label>
      <label class="sim-r"><span>کیک و صبحونه</span><input type="range" min="-10" max="25" step="1" id="sim-c" value="${sim.cakes}"><b id="sim-cv">${sim.cakes >= 0 ? "+" : "−"}${pct(Math.abs(sim.cakes))}</b></label>
      <div class="sim-out"><div><span>تغییر فروش ماهانه</span><b class="${dRev >= 0 ? "pos" : "neg"}">${dRev >= 0 ? "+" : "−"}${kmoney(Math.abs(dRev))}</b></div><div><span>تغییر تعداد فروش</span><b class="${dVol >= 0 ? "pos" : "neg"}">${dVol >= 0 ? "+" : "−"}${pct(Math.abs(Math.round((dVol / (drinkRev + cakeRev || 1)) * 100)))}</b></div></div>
      <p class="tiny">فرض: هر ٪۱۰ گرون‌تر، حدود ٪۳٫۵ کمتر می‌فروشیم. تخمینه، نه قول.</p></div>`)}
    ${card("هدف‌های کیفی", table(["شاخص", "الان", "هدف", ""], [
      ["میانگین فاکتور", kk(sum(cur) / (cur.length || 1)), kk(380000), meter(sum(cur) / (cur.length || 1) / 380000)],
      ["رضایت مشتری", fa1(avg(cur.filter((o) => o.rating), (o) => o.rating)), "۴٫۵", meter(avg(cur.filter((o) => o.rating), (o) => o.rating) / 4.5)],
      ["زمان آماده‌سازی", mins(avg(cur, (o) => o.prep || 300)), "۵ دقیقه", meter(300 / avg(cur, (o) => o.prep || 300))],
      ["سهم فروش اپ", pct(Math.round((cur.filter((o) => o.channel === "app").length / (cur.length || 1)) * 100)), "٪۳۵", meter(cur.filter((o) => o.channel === "app").length / (cur.length || 1) / 0.35)],
      ["عضو جدید در ماه", num(X.S.customers.filter((c) => Date.now() - c.joined < 30 * DAY).length), "۱۵۰", meter(X.S.customers.filter((c) => Date.now() - c.joined < 30 * DAY).length / 150)],
    ]))}
  </div>`;
}

/* ------------------------------------------------------------------ products */
function products() {
  const P = per(), all = X.orders(), c = done(range(all, P)), p = done(range(all, P, P));
  const agg = (list) => { const m = {}; list.forEach((o) => o.lines.forEach((l) => { const x = (m[l.id] ||= { u: 0, rev: 0, cost: 0 }); x.u += l.qty; x.rev += l.unit * l.qty; x.cost += (l.cost ?? 0) * l.qty; })); return m; };
  const a = agg(c), b = agg(p);
  const rows = MENU.map((m) => ({ m, ...(a[m.id] || { u: 0, rev: 0, cost: 0 }), pu: (b[m.id] || {}).u || 0 })).filter((r) => r.u).sort((x, y) => y.rev - x.rev);
  const totRev = sum(rows, (r) => r.rev);
  const pts = rows.map((r) => ({ x: r.u, y: (r.rev - r.cost) / r.u, l: loc(r.m), m: r.m }));
  const mu = [...pts].sort((x, y) => x.x - y.x)[Math.floor(pts.length / 2)].x, my = [...pts].sort((x, y) => x.y - y.y)[Math.floor(pts.length / 2)].y;
  const kind = (q) => (q.x >= mu ? (q.y >= my ? "star" : "horse") : q.y >= my ? "puzzle" : "dog");
  const KC = { star: "#3C9560", horse: "#C9A57C", puzzle: "#3C7E9A", dog: "#B4392F" };
  const KN = { star: "ستاره‌ها – پرفروش و پرسود", horse: "اسب‌های کاری – پرفروش، سود کم", puzzle: "معماها – پرسود، کم‌فروش", dog: "ضعیف‌ها – کم‌فروش و کم‌سود" };
  const KT = { star: "نگهشون دار، جای خوب منو بذارشون.", horse: "قیمت رو کمی ببر بالا یا هزینه‌ی مواد رو کم کن.", puzzle: "بیشتر معرفیشون کن: پیشنهاد باریستا، کمپین، عکس بهتر.", dog: "یا بازطراحی یا حذف از منو." };
  const cats = CATEGORIES.map((ct) => ({ l: esc(loc(ct)), v: sum(rows.filter((r) => r.m.cat === ct.id), (r) => r.rev) }));
  const coffee = c.filter((o) => o.lines.some((l) => !["cake", "breakfast"].includes(item(l.id)?.cat)));
  const attach = coffee.filter((o) => o.lines.some((l) => ["cake", "breakfast"].includes(item(l.id)?.cat))).length / (coffee.length || 1);
  const milkLines = c.flatMap((o) => o.lines.filter((l) => item(l.id)?.opts === "milk"));
  const oat = milkLines.filter((l) => l.oat).length / (milkLines.length || 1);
  const pairs = {}; c.forEach((o) => { const ids = o.lines.map((l) => l.id).sort(); for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const k = ids[i] + "|" + ids[j]; pairs[k] = (pairs[k] || 0) + 1; } });
  const topPairs = Object.entries(pairs).sort((x, y) => y[1] - x[1]).slice(0, 5);
  return `${periodBar(P)}
    <div class="kpis k4">${kpi("اقلام فروخته‌شده", num(sum(rows, (r) => r.u)))}${kpi("حاشیه‌ی سود منو", pct(Math.round((1 - sum(rows, (r) => r.cost) / (totRev || 1)) * 100)))}${kpi("قهوه + کیک با هم", pct(Math.round(attach * 100)), "از سفارش‌های قهوه، کیک هم دارن")}${kpi("سهم شیر جو", pct(Math.round(oat * 100)), "از نوشیدنی‌های شیری")}</div>
    <div class="cards g2">
      ${card("مهندسی منو", quad(pts.map((q) => ({ ...q, c: KC[kind(q)] })), { xl: "تعداد فروش", yl: "سود هر عدد", names: ["ستاره‌ها", "معماها", "اسب‌های کاری", "ضعیف‌ها"] }), { cls: "wide" })}
      ${["star", "horse", "puzzle", "dog"].map((k) => { const l = pts.filter((q) => kind(q) === k); return card(`<span class="dotc" style="--c:${KC[k]}"></span>${KN[k]}`, `<p class="small">${KT[k]}</p><div class="chips-row tight">${l.map((q) => `<span class="chip sm static">${esc(q.l)}</span>`).join("") || "<span class=\"tiny\">—</span>"}</div>`); }).join("")}
      ${card("سهم هر دسته از فروش", barsH(cats.map((x) => ({ ...x, f: pct(Math.round((x.v / (totRev || 1)) * 100)) }))))}
      ${card("بیشتر با هم سفارش می‌دن", barsH(topPairs.map(([k, v]) => ({ l: k.split("|").map((id) => esc(loc(item(id)))).join(" + "), v }))))}
    </div>
    ${card("همه‌ی آیتم‌ها", table(["آیتم", "تعداد", "فروش", "سهم", "هزینه‌ی مواد", "سود هر عدد", "حاشیه", "روند"], rows.map((r) => { const d = r.pu ? Math.round(((r.u - r.pu) / r.pu) * 100) : 0; return [`<span class="it-cell">${tile(r.m, "sm")}${esc(loc(r.m))}</span>`, num(r.u), kmoney(r.rev), pct(Math.round((r.rev / (totRev || 1)) * 100)), pct(Math.round((r.cost / (r.rev || 1)) * 100)), kk((r.rev - r.cost) / r.u), pct(Math.round(((r.rev - r.cost) / (r.rev || 1)) * 100)), `<span class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${pct(Math.abs(d))}</span>`]; }), { cls: "itbl" }), { extra: `<button class="btn btn--sm btn--soft" data-csv="items">${icon("dl")}خروجی اکسل</button>` })}`;
}

/* ------------------------------------------------------------ customer insight */
function insights() {
  const now = Date.now(), cs = X.S.customers.filter((c) => X.inScope(c.branch)), all = X.orders();
  const active30 = cs.filter((c) => now - c.last < 30 * DAY && c.visits).length;
  const rep = cs.filter((c) => c.visits >= 2), churned = rep.filter((c) => now - c.last > 30 * DAY).length;
  const ltv = avg(cs.filter((c) => c.visits), (c) => c.spend);
  const c30 = done(range(all, 30)), mem = c30.filter((o) => o.customer);
  // cohorts by month of joining: who came back in month 1, 2, 3
  const days = {}; all.forEach((o) => { if (o.customer && o.status === "done") (days[o.customer] ||= []).push(o.day); });
  const coh = [4, 3, 2, 1].map((k) => {
    const g = cs.filter((c) => c.joinedAgo >= k * 30 && c.joinedAgo < (k + 1) * 30 && c.visits);
    const back = [1, 2, 3].map((m) => { if (m > k) return null; const lo = (k - m + 1) * 30, hi = (k - m) * 30; return g.filter((c) => (days[c.id] || []).some((d) => d < lo && d >= hi)).length / (g.length || 1); });
    return { l: `${num(k)} ماه پیش`, n: g.length, back };
  });
  // RFM: recency, frequency, money
  const seg = (c) => { const r = (now - c.last) / DAY, f = c.visits;
    if (!f) return "sleep"; if (r <= 14 && f >= 20) return "champ"; if (r <= 30 && f >= 8) return "loyal"; if (now - c.joined < 30 * DAY) return "new"; if (r <= 30) return "promise"; if (r <= 60 && f >= 6) return "risk"; if (r <= 60) return "sleep"; return "lost"; };
  const RN = { champ: ["قهرمان‌ها", "زیاد میان، تازه اومدن، خوب خرج می‌کنن", "#3C9560"], loyal: ["وفادارها", "مرتب سر می‌زنن", "#5E7A3C"], promise: ["امیدوارکننده‌ها", "تازه‌ها که داره پاشون باز می‌شه", "#C9A57C"], new: ["تازه‌واردها", "این ماه عضو شدن", "#3C7E9A"], risk: ["در خطر", "قبلاً زیاد میومدن، الان کم", "#B4682F"], sleep: ["خواب‌رفته‌ها", "یکی دو ماهه خبری نیست", "#94653A"], lost: ["از دست‌رفته‌ها", "بیشتر از دو ماهه نیومدن", "#B4392F"] };
  const groups = {}; cs.forEach((c) => { const k = seg(c); (groups[k] ||= []).push(c); });
  const freqB = [[1, 1], [2, 3], [4, 7], [8, 15], [16, 30], [31, 999]].map(([lo, hi]) => ({ l: hi === 999 ? `${num(lo)}+ بار` : lo === hi ? `${num(lo)} بار` : `${num(lo)}–${num(hi)} بار`, v: cs.filter((c) => c.visits >= lo && c.visits <= hi).length }));
  const top = [...cs].sort((a, b) => b.spend - a.spend).slice(0, 8);
  const wk = Array.from({ length: 8 }, (_, i) => { const lo = (7 - i) * 7; const w = done(all.filter((o) => o.day >= lo && o.day < lo + 7)); const firsts = new Set(cs.filter((c) => c.first && Math.floor((X.S.today0 - c.first) / DAY) >= lo && Math.floor((X.S.today0 - c.first) / DAY) < lo + 7).map((c) => c.id)); return { l: i === 7 ? "این هفته" : `${num(7 - i)} هفته قبل`, v: [w.filter((o) => o.customer && !firsts.has(o.customer)).length, w.filter((o) => firsts.has(o.customer)).length, w.filter((o) => !o.customer).length] }; });
  return `<div class="kpis k6">
      ${kpi("کل اعضا", num(cs.length))}${kpi("فعال ۳۰ روز اخیر", num(active30), pct(Math.round((active30 / (cs.length || 1)) * 100)) + " از اعضا")}
      ${kpi("ریزش", pct(Math.round((churned / (rep.length || 1)) * 100)), "مشتری‌های تکراری که ۳۰ روزه نیومدن")}${kpi("ارزش هر عضو", T(ltv), "میانگین کل خریدش تا امروز")}
      ${kpi("سهم اعضا از فروش", pct(Math.round((sum(mem) / (sum(c30) || 1)) * 100)), "۳۰ روز اخیر")}${kpi("هر عضو ماهی چند بار", fa1(mem.length / (active30 || 1)), "میاد")}
    </div>
    <div class="cards g2">
      ${card("گروه‌بندی مشتری‌ها", `<div class="rfm">${Object.keys(RN).map((k) => { const g = groups[k] || []; return `<div class="rfm-c" style="--c:${RN[k][2]}"><b>${RN[k][0]}</b><span class="rfm-n">${num(g.length)}</span><span class="tiny">${RN[k][1]}</span><span class="tiny">${kmoney(sum(g, (c) => c.spend))} تومان خرید</span>${["risk", "sleep", "lost"].includes(k) ? `<button class="link sm" data-go="campaigns">یه پیام بفرست</button>` : ""}</div>`; }).join("")}</div>`, { cls: "wide" })}
      ${card("برگشت مشتری‌ها بعد از عضویت", `<div class="tbl-wrap"><table class="tbl cohort"><thead><tr><th>عضو شده</th><th>نفر</th><th>ماه اول</th><th>ماه دوم</th><th>ماه سوم</th></tr></thead><tbody>${coh.map((r) => `<tr><td>${r.l}</td><td>${num(r.n)}</td>${r.back.map((v) => (v == null ? "<td></td>" : `<td><span class="coh" style="--a:${v.toFixed(2)}">${pct(Math.round(v * 100))}</span></td>`)).join("")}</tr>`).join("")}</tbody></table></div><p class="tiny" style="margin-top:8px">مثلاً «ماه اول»: چند درصدشون تو ۳۰ روز بعد از عضو شدن دوباره خرید کردن.</p>`)}
      ${card("دفعات خرید", barsH(freqB))}
      ${card("سفارش‌ها: قدیمی‌ها، تازه‌ها، مهمون‌ها", gbars(wk, [{ l: "اعضای قدیمی", c: "#45281A" }, { l: "اولین خرید", c: "#C9A57C" }, { l: "مهمون (بدون عضویت)", c: "#D9CBBB" }], { fmt: num, h: 170 }), { cls: "wide" })}
      ${card("بهترین مشتری‌ها", table(["مشتری", "شعبه", "دفعات", "کل خرید", "آخرین بار"], top.map((c) => [`<button class="link" data-cust="${c.id}">${esc(c.name_fa)}</button>`, esc(bname(c.branch)), num(c.visits), kmoney(c.spend), ago(c.last)])), { cls: "wide" })}
    </div>`;
}

/* --------------------------------------------------------------- branches */
function branches() {
  const P = per(), all = X.orders(), hub = getHub();
  const rows = brs().map((b) => {
    const c = done(range(all, P).filter((o) => o.branch === b.id)), x = pnl(range(all, P).filter((o) => o.branch === b.id), P, [b.id]);
    const st = X.S.staff.filter((p) => p.branch === b.id), hours = st.length * 8 * 26 * (P / 30);
    const r = c.filter((o) => o.rating);
    return { b, c, rev: sum(c), x, staff: st.length, perSeat: sum(c) / b.seats / P, perHour: sum(c) / (hours || 1), rating: avg(r, (o) => o.rating), prep: avg(c, (o) => o.prep || 300), spark: series(c, 1, Math.min(P, 30) - 1) };
  });
  const best = [...rows].sort((a, b) => b.x.np - a.x.np)[0];
  return `${periodBar(P)}
    ${card("مقایسه‌ی شعبه‌ها", table(["شعبه", "فروش", "روند", "سفارش", "میانگین فاکتور", "رضایت", "آماده‌سازی", "پرسنل", "فروش هر صندلی در روز", "فروش هر نفر‌ساعت", "سود خالص"],
      rows.map((r) => [`<b>${esc(loc(r.b))}</b>${r.b.id === best?.b.id ? ` ${pill("بهترین", "ok")}` : ""}${OPENED[r.b.id] ? ` ${pill("تازه افتتاح", "info")}` : ""}`, kmoney(r.rev), spark(r.spark), num(r.c.length), kk(r.rev / (r.c.length || 1)), fa1(r.rating), mins(r.prep), num(r.staff), kk(r.perSeat), kk(r.perHour), `<b class="${r.x.np >= 0 ? "pos" : "neg"}">${kmoney(r.x.np)}</b>`])), { extra: `<button class="btn btn--sm btn--soft" data-csv="branches">${icon("dl")}خروجی اکسل</button>` })}
    <div class="cards g2">${brs().map((b) => { const o = openState(b), v = busy(b), paused = hub.paused[b.id] > Date.now(); const today = done(all.filter((x) => x.branch === b.id && x.day === 0)); const ci = X.S.checkins[`0|${b.id}`] || 0; return `
      <section class="card br-card"><div class="card-h"><h3>${esc(loc(b))} <span class="tiny">– ${esc(loc(b, "city"))}${OPENED[b.id] ? ` – ${num(OPENED[b.id])} روزه باز شده` : ""}</span></h3><span class="state-pill ${paused ? "bad" : o.isOpen ? "ok" : ""}">${paused ? "سفارش آنلاین بسته" : o.isOpen ? "بازه" : "بسته‌ست"}</span></div>
        <div class="auto-s"><span><b>${num(today.length)}</b>سفارش امروز</span><span><b>${kmoney(sum(today))}</b>فروش</span><span><b>${num(ci)}</b>ورود به کافه</span><span><b>${busyLabel(v)}</b>الان</span></div>
        <p class="small" style="margin-top:12px">${paused ? `سفارش آنلاین تا ساعت ${fmtTime(new Date(hub.paused[b.id]))} بسته‌ست. اپ به مشتری‌ها یه شعبه‌ی دیگه پیشنهاد می‌ده.` : "زیادی شلوغه؟ سفارش آنلاین رو یه مدت نگه دار؛ اپ همون لحظه آپدیت می‌شه."}</p>
        <div class="act-grid">${paused ? `<button class="btn btn--sm" data-resume="${b.id}">${icon("bolt")}باز کن</button>` : [15, 30, 60].map((m) => `<button class="btn btn--sm btn--soft" data-pause="${b.id}" data-m="${m}">${icon("pause")}${num(m)} دقیقه</button>`).join("")}</div>
      </section>`; }).join("")}</div>`;
}

export const CEO = { overview, alerts: alertsSec, sales, finance, goals, products, insights, branches };

/* ------------------------------------------------------------------- wiring */
export function wireCeo(el) {
  $$("[data-period]", el).forEach((b) => b.addEventListener("click", () => { X.setA({ period: +b.dataset.period }); X.render(); }));
  $$("[data-dismiss]", el).forEach((b) => b.addEventListener("click", () => { X.setA({ dismissed: [...(A().dismissed || []), b.dataset.dismiss] }); X.render(); }));
  $("#undismiss", el)?.addEventListener("click", () => { X.setA({ dismissed: [] }); X.render(); });
  $$('input[name^="ar-"]', el).forEach((i) => i.addEventListener("change", () => { X.setA({ alertRules: { ...(A().alertRules || {}), [i.name.slice(3)]: i.checked } }); toast("ذخیره شد", "check"); X.render(); }));
  $$('input[name^="ac-"]', el).forEach((i) => i.addEventListener("change", () => { X.setA({ alertCh: { ...(A().alertCh || { telegram: true, sms: true, push: true, email: false }), [i.name.slice(3)]: i.checked } }); i.closest(".ch-opt")?.classList.toggle("on", i.checked); toast("ذخیره شد", "check"); }));
  $$("[data-target]", el).forEach((i) => i.addEventListener("change", () => { const v = +i.value.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/\D/g, ""); if (!v) return; X.setA({ targets: { ...(A().targets || {}), [i.dataset.target]: v * 1e6 } }); X.log(`هدف ماه ${bname(i.dataset.target)} رو کرد ${num(v)} میلیون`); toast("هدف ذخیره شد", "check"); X.render(); }));
  const simUp = () => { X.setA({ sim: { drinks: +$("#sim-d", el).value, cakes: +$("#sim-c", el).value } }); X.render(); };
  $("#sim-d", el)?.addEventListener("change", simUp); $("#sim-c", el)?.addEventListener("change", simUp);
  $("#sim-d", el)?.addEventListener("input", (e) => { const v = +e.target.value; $("#sim-dv", el).textContent = `${v >= 0 ? "+" : "−"}${pct(Math.abs(v))}`; });
  $("#sim-c", el)?.addEventListener("input", (e) => { const v = +e.target.value; $("#sim-cv", el).textContent = `${v >= 0 ? "+" : "−"}${pct(Math.abs(v))}`; });
  $("#ex-add", el)?.addEventListener("click", () => {
    const t = $("#ex-t", el).value.trim(), a = +$("#ex-a", el).value.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/\D/g, ""), b = $("#ex-b", el).value;
    if (!t || !a) { toast("عنوان و مبلغ رو بنویس", "info"); return; }
    X.setA({ expenses: [...(A().expenses || []), { title: t, amount: a, branch: b, at: Date.now() }] }); X.log(`هزینه‌ی «${t}» رو ثبت کرد (${kmoney(a)} تومان)`); toast("هزینه ثبت شد", "check"); X.render();
  });
}
