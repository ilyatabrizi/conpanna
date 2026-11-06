// CEO panel — running the place: store room and suppliers, people and shifts,
// service quality, daily checklists and maintenance, reports and exports, and
// who is allowed to do what (with an audit log).
import { $, $$, esc, icon, toast, haptic, num, digits, pct, kmoney, fmtDay, ago, loc, sw, sheet, closeSheet } from "../ui.js";
import { fmtDayNum } from "../i18n.js";
import { MENU, BRANCHES } from "../data.js";
import { DAY, T, kk, sum, avg, fa1, mins, kpi, card, pill, empty, periodBar, table, meter, lines, gbars, heat, csv } from "./kit.js";
import { STOCK, SUPPLIERS, TOPICS } from "./seed.js";
import { alerts, pnl } from "./ceo.js";

let X;
export function initOps(ctx) { X = ctx; }
const A = () => X.A();
const done = (a) => a.filter((o) => o.status === "done");
const per = () => A().period || 30;
const brs = () => BRANCHES.filter((b) => X.inScope(b.id));
const bname = (id) => loc(BRANCHES.find((b) => b.id === id) || {});
const sItem = (id) => STOCK.find((s) => s.id === id);
const sup = (id) => SUPPLIERS.find((s) => s.id === id);
const range = (all, days, off = 0) => all.filter((o) => o.day >= off && o.day < off + days);
const WD = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const WEEK = [6, 0, 1, 2, 3, 4, 5];
const SH = { M: ["صبح", "۸ تا ۱۶"], E: ["عصر", "۱۵ تا ۲۴"], off: ["آف", ""] };
const amount = (v, u) => (u === "عدد" || u === "برش" ? num(v) : fa1(v));
const toNum = (s) => +String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[^\d.]/g, "");

/* ---------------------------------------------------------------- inventory */
let invAll = false;
function inventory() {
  const st = X.stock(), pos = (A().pos || []).filter((p) => X.inScope(p.branch));
  const open = pos.filter((p) => p.status === "sent");
  const low = st.filter((s) => s.qty / s.daily < 2.5);
  const value = sum(st, (s) => s.qty * sItem(s.item).cost);
  const wasteAll = [...X.S.waste, ...(A().waste || [])].filter((w) => X.inScope(w.branch) && Date.now() - w.at < 7 * DAY);
  const wasteV = sum(wasteAll, (w) => w.qty * sItem(w.item).cost);
  const all = [...st].sort((a, b) => a.qty / a.daily - b.qty / b.daily);
  const rows = invAll ? all : all.filter((s) => s.qty / s.daily < 4);
  const sugg = (s) => Math.max(0, s.par - s.qty);
  return `<div class="kpis k4">
      ${kpi("دارن تموم می‌شن", num(low.length), "کمتر از ۲٫۵ روز دووم میارن")}
      ${kpi("ارزش موجودی انبار", T(value))}
      ${kpi("سفارش‌های خرید باز", num(open.length), open.length ? `${T(sum(open, (p) => p.qty * sItem(p.item).cost))}` : "")}
      ${kpi("ضایعات این هفته", T(wasteV), `${num(wasteAll.length)} مورد`)}
    </div>
    ${card("موجودی انبار", table(["قلم", "شعبه", "موجودی", "مصرف روزانه", "چند روز دیگه", "", "پیشنهاد خرید", ""], rows.map((s) => {
      const it = sItem(s.item), left = s.qty / s.daily, k = left < 1 ? "bad" : left < 2.5 ? "warn" : "ok";
      return [`<b>${esc(it.n)}</b>`, esc(bname(s.branch)), `${amount(s.qty, it.u)} ${it.u}`, `${amount(s.daily, it.u)} ${it.u}`, `<b class="${k === "ok" ? "" : k === "bad" ? "neg" : "warn-t"}">${fa1(left)} روز</b>`, meter(left / 7, k), sugg(s) > 0 ? `${amount(Math.ceil(sugg(s) * (it.u === "عدد" || it.u === "برش" ? 1 : 10)) / (it.u === "عدد" || it.u === "برش" ? 1 : 10), it.u)} ${it.u}` : "—", sugg(s) > 0 ? `<button class="btn btn--sm btn--soft" data-po="${s.branch}|${s.item}">${icon("send")}سفارش</button>` : ""];
    }), { cls: "stock" }) + (rows.length ? "" : empty("همه‌چی تا چند روز آینده هست 👌")), { extra: `<div class="chips-row tight"><button class="chip sm" data-inv="0" aria-pressed="${!invAll}">زیر ۴ روز (${num(all.filter((s) => s.qty / s.daily < 4).length)})</button><button class="chip sm" data-inv="1" aria-pressed="${invAll}">همه (${num(all.length)})</button><button class="btn btn--sm" id="po-all">${icon("bolt")}سفارش همه‌ی کم‌ها</button></div>` })}
    <div class="cards g2">
      ${card("سفارش‌های خرید", pos.length ? table(["قلم", "شعبه", "مقدار", "تأمین‌کننده", "مبلغ", "وضعیت", ""], pos.slice().reverse().slice(0, 12).map((p) => { const it = sItem(p.item); return [esc(it.n), esc(bname(p.branch)), `${amount(p.qty, it.u)} ${it.u}`, esc(sup(it.sup).n), kmoney(p.qty * it.cost), p.status === "sent" ? pill(`فرستاده شد – ${ago(p.at)}`, "warn") : pill("رسید", "ok"), p.status === "sent" ? `<button class="btn btn--sm btn--soft" data-recv="${p.id}">${icon("check")}رسید</button>` : ""]; })) : empty("هنوز سفارش خریدی نزدی. از جدول بالا، کنار هر قلم «سفارش» رو بزن."), { cls: "wide" })}
      ${card("تأمین‌کننده‌ها", table(["تأمین‌کننده", "چی می‌ده", "تحویل", "به‌موقع", "تلفن"], SUPPLIERS.map((s) => [`<b>${esc(s.n)}</b>`, esc(s.what), `${num(s.lead)} روزه`, `${meter(s.onTime / 100, s.onTime >= 90 ? "ok" : s.onTime >= 82 ? "warn" : "bad")} ${pct(s.onTime)}`, `<span dir="ltr" class="lat">${esc(s.phone)}</span>`])), { cls: "wide" })}
      ${card("ثبت ضایعات", `<div class="inline-form"><select id="w-i">${STOCK.map((s) => `<option value="${s.id}">${esc(s.n)}</option>`).join("")}</select><select id="w-b">${brs().map((b) => `<option value="${b.id}">${esc(loc(b))}</option>`).join("")}</select><input id="w-q" inputmode="decimal" placeholder="مقدار"><input id="w-r" placeholder="چرا؟ مثلاً تاریخش گذشته"><button class="btn btn--sm" id="w-add">${icon("plus")}ثبت</button></div>
        ${table(["قلم", "شعبه", "مقدار", "ضرر", "چرا", ""], [...wasteAll].sort((a, b) => b.at - a.at).slice(0, 8).map((w) => { const it = sItem(w.item); return [esc(it.n), esc(bname(w.branch)), `${amount(w.qty, it.u)} ${it.u}`, kmoney(w.qty * it.cost), esc(w.why), `<span class="tiny">${ago(w.at)}</span>`]; }))}`, { cls: "wide" })}
    </div>`;
}

/* -------------------------------------------------------------------- staff */
const shiftOf = (p) => (A().shifts || {})[p.id] || p.week;
function onShiftNow(p) {
  const h = new Date().getHours(), s = shiftOf(p)[WEEK.indexOf(new Date().getDay())];
  return (s === "M" && h >= 8 && h < 16) || (s === "E" && h >= 15);
}
let shiftB = "";
function staff() {
  const P = per(), all = done(range(X.orders(), P));
  const people = X.S.staff.filter((p) => X.inScope(p.branch));
  const stats = people.map((p) => { const mine = all.filter((o) => o.staff === p.id); const r = mine.filter((o) => o.rating); return { p, n: mine.length, sales: sum(mine), prep: avg(mine, (o) => o.prep), rating: avg(r, (o) => o.rating), rn: r.length }; });
  const hours = (p) => shiftOf(p).filter((s) => s !== "off").length * 8;
  const payroll = brs().map((b) => { const ps = people.filter((p) => p.branch === b.id); const base = sum(ps, (p) => p.wage * hours(p) * 4.33); const ot = sum(ps, (p) => Math.max(0, hours(p) - 44) * p.wage * 1.4 * 4.33); const tips = sum(ps, (p) => p.tips); return { b, ps, base, ot, tips, tot: base + ot }; });
  const now = people.filter(onShiftNow);
  const best = stats.filter((s) => s.p.role !== "manager" && s.rn >= 5).sort((a, b) => b.rating * 1e9 + b.sales - (a.rating * 1e9 + a.sales))[0];
  const rev = sum(all), totPay = sum(payroll, (r) => r.tot);
  const groups = brs().map((b) => ({ b, ps: people.filter((p) => p.branch === b.id) }));
  const sb = groups.some((g) => g.b.id === shiftB) ? shiftB : groups[0].b.id;
  return `${periodBar(P)}
    <div class="kpis k5">
      ${kpi("پرسنل", num(people.length), `${num(groups.length)} شعبه`)}
      ${kpi("الان سر شیفت", num(now.length), now.slice(0, 3).map((p) => p.name_fa.split(" ")[0]).join("، ") + (now.length > 3 ? "، …" : ""))}
      ${kpi("حقوق این ماه", T(totPay), `${pct(Math.round((totPay / ((rev / P) * 30 || 1)) * 100))} از فروش ماه`)}
      ${kpi("تأخیر ۳۰ روز اخیر", num(sum(people, (p) => p.late30)), `${num(people.filter((p) => p.late30 >= 3).length)} نفر ۳ بار و بیشتر`)}
      ${kpi("فروش هر نفر در روز", `${kk(rev / (people.length || 1) / P)}<small> تومان</small>`)}
    </div>
    <div class="cards g2">
      ${best ? card("باریستای ماه 🏆", `<div class="star-staff"><span class="cav lg">${esc(best.p.name_fa[0])}</span><div><b>${esc(best.p.name_fa)}</b><p class="small">${esc(best.p.role_fa)} – ${esc(bname(best.p.branch))}</p><p class="small">امتیاز ${fa1(best.rating)} از ${num(best.rn)} رأی – ${num(best.n)} سفارش – ${kmoney(best.sales)} فروش</p></div></div><button class="btn btn--sm btn--soft" id="cheer" style="margin-top:12px">${icon("gift")}یه پاداش بده</button>`) : ""}
      ${card("الان کی سر کاره", now.length ? `<div class="who-now">${now.map((p) => `<span class="chip sm static"><i class="dot ok"></i>${esc(p.name_fa)}<small> – ${esc(p.role_fa)}، ${esc(bname(p.branch))}</small></span>`).join("")}</div>` : empty("الان کسی سر شیفت نیست."))}
    </div>
    ${card("عملکرد پرسنل", table(["اسم", "نقش", "شعبه", "سفارش", "فروش", "آماده‌سازی", "امتیاز", "تأخیر", "مرخصی", "انعام"], stats.sort((a, b) => b.sales - a.sales).map((s) => [`<b>${esc(s.p.name_fa)}</b>`, esc(s.p.role_fa), esc(bname(s.p.branch)), num(s.n), kmoney(s.sales), s.n ? mins(s.prep) : "—", s.rn ? `${fa1(s.rating)} <span class="tiny">(${num(s.rn)})</span>` : "—", s.p.late30 >= 3 ? `<b class="neg">${num(s.p.late30)}</b>` : num(s.p.late30), num(s.p.sick30), kmoney(s.p.tips)])), { extra: `<button class="btn btn--sm btn--soft" data-csv="staff">${icon("dl")}خروجی اکسل</button>` })}
    ${card("برنامه‌ی شیفت این هفته", `<p class="small" style="margin-bottom:10px">روی هر خونه بزن تا بین صبح، عصر و آف عوض بشه. همون لحظه ذخیره می‌شه.</p>${groups.filter((g) => g.b.id === sb).map((g) => `<div class="shift-grp"><p class="group-label">${esc(loc(g.b))}</p><div class="tbl-wrap"><table class="tbl shifts"><thead><tr><th></th>${WEEK.map((w) => `<th>${WD[w]}</th>`).join("")}<th>ساعت</th></tr></thead><tbody>${g.ps.map((p) => `<tr><td><b>${esc(p.name_fa)}</b><span class="tiny"> – ${esc(p.role_fa)}</span></td>${shiftOf(p).map((s, i) => `<td><button class="sh sh-${s}" data-shift="${p.id}" data-i="${i}">${SH[s][0]}</button></td>`).join("")}<td>${num(hours(p))}</td></tr>`).join("")}
      <tr class="cover"><td class="tiny">چند نفر صبح / عصر</td>${WEEK.map((_, i) => { const m = g.ps.filter((p) => shiftOf(p)[i] === "M").length, e = g.ps.filter((p) => shiftOf(p)[i] === "E").length; return `<td class="${m < 2 || e < 2 ? "neg" : ""}">${num(m)} / ${num(e)}</td>`; }).join("")}<td></td></tr></tbody></table></div></div>`).join("")}`, { cls: "wide", extra: groups.length > 1 ? `<div class="chips-row tight">${groups.map((g) => `<button class="chip sm" data-sb="${g.b.id}" aria-pressed="${g.b.id === sb}">${esc(loc(g.b))}</button>`).join("")}</div>` : "" })}
    ${card("حقوق و دستمزد این ماه", table(["شعبه", "نفر", "حقوق پایه", "اضافه‌کاری", "انعام‌ها", "جمع"], payroll.map((r) => [esc(loc(r.b)), num(r.ps.length), kmoney(r.base), r.ot ? kmoney(r.ot) : "—", kmoney(r.tips), `<b>${kmoney(r.tot)}</b>`]), { foot: ["جمع کل", num(people.length), kmoney(sum(payroll, (r) => r.base)), kmoney(sum(payroll, (r) => r.ot)), kmoney(sum(payroll, (r) => r.tips)), `<b>${kmoney(totPay)}</b>`] }) + `<p class="tiny" style="margin-top:8px">حساب بر اساس ساعت‌های شیفت بالا. بیشتر از ۴۴ ساعت در هفته، اضافه‌کاری با ضریب ۱٫۴ حساب می‌شه.</p>`)}`;
}

/* ------------------------------------------------------------------ service */
function service() {
  const P = per(), all = range(X.orders(), P), c = done(all);
  const sla = 480, onTime = c.filter((o) => o.prep <= sla).length / (c.length || 1);
  const late = c.filter((o) => o.prep > 600);
  const canc = all.filter((o) => o.status !== "done");
  const p90 = (a) => { const s = a.map((o) => o.prep).sort((x, y) => x - y); return s[Math.floor(s.length * 0.9)] || 0; };
  const byHour = Array.from({ length: 16 }, (_, i) => { const h = i + 8, a = c.filter((o) => o.hour === h); return { l: digits(h), v: [avg(a, (o) => o.prep) / 60] }; });
  const d14 = Array.from({ length: 14 }, (_, i) => 14 - i);
  const ci = d14.map((d) => sum(brs(), (b) => X.S.checkins[`${d}|${b.id}`] || 0));
  const ord = d14.map((d) => X.orders().filter((o) => o.day === d && o.status === "done").length);
  // seats used: dine-in orders × ~40 minutes, over seats, per branch and hour
  const occ = brs().map((b) => Array.from({ length: 16 }, (_, i) => { const n = c.filter((o) => o.branch === b.id && o.mode === "dinein" && o.hour === i + 8).length / P; return Math.min(1, (n * 1.6 * (40 / 60)) / b.seats); }));
  const revs = X.S.reviews.filter((r) => X.inScope(r.branch) && Date.now() - r.at < P * DAY);
  const topics = Object.keys(TOPICS).map((k) => { const a = revs.filter((r) => r.topic === k); return { k, n: a.length, r: avg(a, (x) => x.rating) }; }).sort((a, b) => b.n - a.n);
  const rated = c.filter((o) => o.rating);
  return `${periodBar(P)}
    <div class="kpis k6">
      ${kpi("میانگین آماده‌سازی", mins(avg(c, (o) => o.prep)), `٪۹۰ زیر ${mins(p90(c))}`)}
      ${kpi("زیر ۸ دقیقه", pct(Math.round(onTime * 100)), "هدف: ٪۹۰")}
      ${kpi("سفارش‌های دیرشده", num(late.length), "بیشتر از ۱۰ دقیقه")}
      ${kpi("لغو و مرجوعی", pct(Math.round((canc.length / (all.length || 1)) * 1000) / 10), `${num(canc.length)} سفارش – ${kmoney(sum(canc))} تومان`)}
      ${kpi("رضایت", `${fa1(avg(rated, (o) => o.rating))}<small> از ۵</small>`, `${num(rated.length)} امتیاز`)}
      ${kpi("شاخص وفاداری", num(Math.round(((rated.filter((o) => o.rating === 5).length - rated.filter((o) => o.rating <= 3).length) / (rated.length || 1)) * 100)), "۵ ستاره‌ها منهای ۳ و کمتر")}
    </div>
    <div class="cards g2">
      ${card("سرعت هر شعبه", table(["شعبه", "میانگین", "٪۹۰ زیر", "زیر ۸ دقیقه", "", "دیرشده", "لغو"], brs().map((b) => { const a = c.filter((o) => o.branch === b.id), x = all.filter((o) => o.branch === b.id && o.status !== "done"), ot = a.filter((o) => o.prep <= sla).length / (a.length || 1); return [`<b>${esc(loc(b))}</b>`, mins(avg(a, (o) => o.prep)), mins(p90(a)), pct(Math.round(ot * 100)), meter(ot, ot >= 0.9 ? "ok" : ot >= 0.8 ? "warn" : "bad"), num(a.filter((o) => o.prep > 600).length), num(x.length)]; })), { cls: "wide" })}
      ${card("آماده‌سازی تو ساعت‌های روز (دقیقه)", gbars(byHour, [{ l: "میانگین دقیقه", c: "#C9A57C" }], { fmt: (v) => fa1(v), h: 170 }))}
      ${card("ورود به کافه و سفارش‌ها – ۱۴ روز", lines([{ vals: ord, label: "سفارش" }, { vals: ci, label: "ورود به کافه (وای‌فای و اپ)", cls: "dash" }], d14.map((d) => fmtDayNum(new Date(X.S.today0 - d * DAY))), { fmt: num, h: 200 }))}
      ${card("پر بودن سالن (تخمینی)", heat(brs().map((b) => esc(loc(b))), Array.from({ length: 16 }, (_, i) => digits(i + 8)), occ.map((r) => r.map((v) => Math.round(v * 100)))) + `<p class="tiny" style="margin-top:8px">از روی سفارش‌های سالن و تعداد صندلی هر شعبه.</p>`, { cls: "wide" })}
      ${card("مشتری‌ها درباره‌ی چی حرف می‌زنن", `<div class="topics">${topics.map((t) => `<div class="topic"><b>${TOPICS[t.k]}</b><span class="tiny">${num(t.n)} نظر</span>${meter(t.r / 5, t.r >= 4 ? "ok" : t.r >= 3 ? "warn" : "bad")}<span class="${t.r >= 4 ? "pos" : t.r >= 3 ? "" : "neg"}">${fa1(t.r)} ★</span></div>`).join("")}</div><button class="link sm" data-go="reviews" style="margin-top:10px">همه‌ی نظرها</button>`)}
      ${card("آخرین سفارش‌های دیرشده", table(["سفارش", "شعبه", "کِی", "طول کشید", "اقلام", "باریستا"], [...late].sort((a, b) => b.at - a.at).slice(0, 7).map((o) => [`<b>#${digits(o.code)}</b>`, esc(bname(o.branch)), `<span class="tiny">${ago(o.at)}</span>`, `<b class="neg">${mins(o.prep)}</b>`, num(o.qty), esc(X.S.staff.find((p) => p.id === o.staff)?.name_fa || "—")])))}
    </div>`;
}

/* -------------------------------------------------------------------- tasks */
function tasks() {
  const now = Date.now();
  const md = A().maintDone || {};
  const ms = X.S.maint.filter((m) => X.inScope(m.branch)).map((m) => { const last = md[m.id] || m.last, due = last + m.every * DAY; return { ...m, last, due, left: Math.ceil((due - now) / DAY) }; }).sort((a, b) => a.due - b.due);
  const todos = (A().todos || []).filter((t) => t.branch === "all" || X.inScope(t.branch));
  return `<div class="cards g3">
    ${brs().map((b) => { const cl = X.checklist(b.id), n = cl.filter((c) => c.done).length; return card(`چک‌لیست صبح – ${esc(loc(b))}`, `${meter(n / cl.length, n === cl.length ? "ok" : "warn")}<div class="checks">${cl.map((c, i) => `<label class="ck ${c.done ? "on" : ""}"><input type="checkbox" data-ck="${b.id}" data-i="${i}" ${c.done ? "checked" : ""}><span class="ck-box">${icon("check")}</span><span>${esc(c.t)}</span></label>`).join("")}</div>`, { extra: `<span class="tiny">${num(n)} از ${num(cl.length)}</span>` }); }).join("")}
    ${card("کارهای من", `<div class="inline-form"><input id="td-t" placeholder="مثلاً با تأمین‌کننده‌ی لیوان صحبت کنم"><select id="td-b"><option value="all">همه‌ی شعبه‌ها</option>${BRANCHES.map((b) => `<option value="${b.id}">${esc(loc(b))}</option>`).join("")}</select><button class="btn btn--sm" id="td-add">${icon("plus")}اضافه کن</button></div>
      <div class="checks">${todos.map((t) => `<label class="ck ${t.done ? "on" : ""}"><input type="checkbox" data-todo="${t.id}" ${t.done ? "checked" : ""}><span class="ck-box">${icon("check")}</span><span>${esc(t.t)} <span class="tiny">– ${t.branch === "all" ? "همه" : esc(bname(t.branch))}</span></span><button class="icon-btn sm" data-tdel="${t.id}" aria-label="پاک کن">${icon("trash")}</button></label>`).join("") || empty("لیستت خالیه.")}</div>`)}
  </div>
  <div class="cards g2">
    ${card("سرویس و تعمیرات", table(["کار", "شعبه", "هر چند وقت", "آخرین بار", "موعد", ""], ms.map((m) => [`<b>${esc(m.what)}</b>`, esc(bname(m.branch)), `${num(m.every)} روز`, fmtDay(new Date(m.last)), m.left < 0 ? pill(`${num(-m.left)} روز عقبه`, "bad") : m.left <= 3 ? pill(`${num(m.left)} روز دیگه`, "warn") : `<span class="tiny">${num(m.left)} روز دیگه</span>`, `<button class="btn btn--sm btn--soft" data-mdone="${m.id}">${icon("check")}انجام شد</button>`])), { cls: "wide" })}

  </div>`;
}

/* ------------------------------------------------------------------ reports */
export function dailyText() {
  const all = X.orders(), t = done(all.filter((o) => o.day === 0)), y = done(all.filter((o) => o.day === 7 && o.at <= Date.now() - 7 * DAY));
  const by = brs().map((b) => ({ b, v: sum(t.filter((o) => o.branch === b.id)) })).sort((a, b) => b.v - a.v);
  const cnt = {}; t.forEach((o) => o.lines.forEach((l) => { cnt[l.id] = (cnt[l.id] || 0) + l.qty; }));
  const topId = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0];
  const top = MENU.find((m) => m.id === topId);
  const rev = sum(t), d = sum(y) ? Math.round(((rev - sum(y)) / sum(y)) * 100) : 0;
  const al = alerts();
  return [
    `☕ خلاصه‌ی امروز کن‌پانا – ${fmtDay(new Date())}`,
    ``,
    `💰 فروش: ${kmoney(rev)} تومان (${d >= 0 ? "+" : "−"}${pct(Math.abs(d))} نسبت به همین ساعت هفته‌ی پیش)`,
    `🧾 سفارش: ${num(t.length)} تا – میانگین فاکتور ${kk(rev / (t.length || 1))} تومان`,
    `📈 سود ناخالص: ${kmoney(rev - sum(t, (o) => o.cost))} تومان`,
    `🏆 بهترین شعبه: ${by[0] ? loc(by[0].b) : "—"} (${kmoney(by[0]?.v || 0)})`,
    `⭐ پرفروش امروز: ${top ? loc(top) : "—"} – ${num(cnt[topId] || 0)} تا`,
    `⏱ میانگین آماده‌سازی: ${mins(avg(t, (o) => o.prep))}`,
    al.length ? `⚠️ ${num(al.length)} تا هشدار داریم؛ مهم‌ترینش: ${al[0].t}` : `✅ هشداری نداریم`,
  ].join("\n");
}
function reports() {
  const R = A().reports || {};
  const sched = [["daily", "خلاصه‌ی هر شب", "ساعت ۲۳:۳۰ – تلگرام", true], ["weekly", "گزارش هفتگی", "شنبه‌ها ساعت ۹ صبح – ایمیل و تلگرام", true], ["monthly", "سود و زیان ماهانه", "روز اول هر ماه – PDF برای حسابدار", true], ["stock", "لیست خرید", "هر روز ساعت ۸ صبح برای مدیر شعبه‌ها", false], ["staff", "کارکرد پرسنل", "آخر هر ماه – برای حسابداری", false]];
  const ex = [["orders", "همه‌ی سفارش‌ها", "receipt"], ["sales", "فروش روزانه", "chart"], ["items", "فروش هر آیتم", "menu"], ["branches", "مقایسه‌ی شعبه‌ها", "pin"], ["pnl", "سود و زیان", "trend"], ["customers", "مشتری‌ها", "users"], ["staff", "پرسنل", "users"], ["stock", "موجودی انبار", "layers"]];
  return `<div class="cards g2">
    ${card("خلاصه‌ی امشب – همونی که برات میاد", `<pre class="report-pre" id="daily-pre">${esc(dailyText())}</pre><div class="act-grid"><button class="btn btn--sm" id="copy-daily">${icon("copy")}کپی</button><button class="btn btn--sm btn--soft" id="send-daily">${icon("send")}الان بفرست</button></div>`)}
    ${card("گزارش‌های خودکار", `<div class="group flat">${sched.map(([k, t, s, on]) => `<label class="row plain tgl-row"><span class="row-main"><span class="row-t">${t}</span><span class="row-s">${s}</span></span>${sw("rp-" + k, R[k] ?? on, t)}</label>`).join("")}</div>`)}
    ${card("خروجی اکسل", `<p class="small" style="margin-bottom:12px">بازه‌ی خروجی همون بازه‌ایه که بالای صفحه‌ها انتخاب کردی (${num(per())} روز).</p><div class="ex-grid">${ex.map(([k, t, ic]) => `<button class="ex-b" data-csv="${k}">${icon(ic)}<span>${t}</span>${icon("dl", "dl")}</button>`).join("")}</div>`)}
    ${card("نسخه‌ی چاپی", `<p class="small">یه گزارش یک‌صفحه‌ای از داشبورد، سود و زیان و مقایسه‌ی شعبه‌ها برای جلسه.</p><button class="btn btn--sm" id="print" style="margin-top:12px">${icon("receipt")}چاپ یا PDF</button>`)}
  </div>`;
}

/* ------------------------------------------------------------------- access */
export const PERMS = [["sales", "دیدن فروش"], ["pnl", "دیدن سود و زیان"], ["menu", "عوض کردن منو و قیمت"], ["refund", "لغو و مرجوعی سفارش"], ["campaign", "فرستادن کمپین"], ["stock", "انبار و سفارش خرید"], ["shifts", "چیدن شیفت"], ["export", "خروجی گرفتن"]];
export const ROLE_LIST = [["owner", "مدیرعامل"], ["accountant", "حسابدار"], ["manager", "مدیر شعبه"], ["barista", "باریستا"], ["cashier", "صندوق‌دار"]];
const DEF_PERMS = { owner: PERMS.map((p) => p[0]), accountant: ["sales", "pnl", "export"], manager: ["sales", "menu", "refund", "stock", "shifts"], barista: ["stock"], cashier: ["refund"] };
const perms = () => A().perms || DEF_PERMS;
function access() {
  const pm = perms();
  const mgrs = X.S.staff.filter((p) => p.role === "manager" && X.inScope(p.branch));
  const log = [...(A().log || []), ...X.S.audit].sort((a, b) => b.at - a.at).slice(0, 30);
  const who = (id) => (id === "me" ? "تو" : X.S.staff.find((p) => p.id === id)?.name_fa || id);
  return `<div class="cards g2">
    ${card("کی به چی دسترسی داره", `<div class="tbl-wrap"><table class="tbl perms"><thead><tr><th></th>${ROLE_LIST.map(([, t]) => `<th>${t}</th>`).join("")}</tr></thead><tbody>${PERMS.map(([k, t]) => `<tr><td>${t}</td>${ROLE_LIST.map(([r]) => `<td><label class="pchk"><input type="checkbox" data-perm="${r}|${k}" ${pm[r].includes(k) ? "checked" : ""} ${r === "owner" ? "disabled" : ""}><span class="ck-box">${icon("check")}</span></label></td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="tiny" style="margin-top:8px">دسترسی مدیرعامل همیشه کامله.</p>`, { cls: "wide" })}
    ${card("رمز مدیر شعبه‌ها", `<div class="group flat">${mgrs.map((p) => `<div class="row plain"><span class="cav">${esc(p.name_fa[0])}</span><span class="row-main"><span class="row-t">${esc(p.name_fa)}</span><span class="row-s">${esc(bname(p.branch))} – رمز: <span class="lat" dir="ltr">••••</span></span></span><button class="btn btn--sm btn--soft" data-pin="${p.id}">${icon("shield")}رمز جدید</button></div>`).join("")}</div>`)}
    ${card("دستگاه‌هایی که وارد شدن", `<div class="group flat">${[["آیفون مدیرعامل", "همین الان", "phone", true], ["تبلت صندوق ولیعصر", "۲ دقیقه پیش", "card"], ["لپ‌تاپ حسابدار", "دیروز", "chart"], ["تبلت صندوق لاله پارک", "۱۰ دقیقه پیش", "card"]].map(([t, s, ic, me], i) => `<div class="row plain"><span class="row-ic soft">${icon(ic)}</span><span class="row-main"><span class="row-t">${t}${me ? ` ${pill("همین دستگاه", "info")}` : ""}</span><span class="row-s">آخرین فعالیت: ${s}</span></span>${me ? "" : `<button class="btn btn--sm btn--soft" data-kick="${i}">${icon("out")}بیرونش کن</button>`}</div>`).join("")}</div>`)}
    ${card("کی چی‌کار کرد", `<div class="audit">${log.map((l) => `<div class="au"><span class="cav sm">${esc(who(l.who)[0])}</span><span class="row-main"><span class="row-t"><b>${esc(who(l.who))}</b> ${esc(l.what)}</span><span class="row-s">${ago(l.at)}</span></span></div>`).join("")}</div>`, { cls: "wide" })}
  </div>`;
}

export const OPS = { inventory, staff, service, tasks, reports, access };

/* ------------------------------------------------------------------ exports */
export function csvExport(kind) {
  const P = per(), all = range(X.orders(), P), c = done(all);
  const day = (o) => new Date(o.at).toISOString().slice(0, 10);
  const rows = {
    orders: () => [["id", "date", "time", "branch", "mode", "channel", "pay", "items", "subtotal", "discount", "total", "cost", "status", "prep_sec", "rating"], ...all.map((o) => [o.id, day(o), new Date(o.at).toTimeString().slice(0, 5), o.branch, o.mode, o.channel, o.pay, o.lines.map((l) => `${l.qty}x ${l.id}`).join(" + "), o.subtotal, o.discount || 0, o.total, o.cost, o.status, o.prep, o.rating || ""])],
    sales: () => { const m = {}; c.forEach((o) => { const k = day(o); (m[k] ||= { n: 0, r: 0, d: 0, c: 0 }); m[k].n++; m[k].r += o.total; m[k].d += o.discount || 0; m[k].c += o.cost; }); return [["date", "orders", "revenue", "discounts", "cogs", "avg_ticket"], ...Object.entries(m).sort().map(([k, v]) => [k, v.n, v.r, v.d, v.c, Math.round(v.r / v.n)])]; },
    items: () => { const m = {}; c.forEach((o) => o.lines.forEach((l) => { (m[l.id] ||= { u: 0, r: 0, c: 0 }); m[l.id].u += l.qty; m[l.id].r += l.unit * l.qty; m[l.id].c += (l.cost || 0) * l.qty; })); return [["item", "name", "units", "revenue", "cogs", "margin_pct"], ...Object.entries(m).sort((a, b) => b[1].r - a[1].r).map(([k, v]) => [k, MENU.find((x) => x.id === k)?.name, v.u, v.r, v.c, Math.round((1 - v.c / v.r) * 100)])]; },
    branches: () => [["branch", "orders", "revenue", "cogs", "wages", "rent", "net_profit"], ...brs().map((b) => { const x = pnl(all.filter((o) => o.branch === b.id), P, [b.id]); return [b.name, c.filter((o) => o.branch === b.id).length, Math.round(x.afterVat), Math.round(x.cogs), Math.round(x.wages), Math.round(x.rent), Math.round(x.np)]; })],
    pnl: () => { const x = pnl(all, P, brs().map((b) => b.id)); return [["line", "toman"], ...Object.entries(x).map(([k, v]) => [k, Math.round(v)])]; },
    customers: () => [["id", "name", "phone", "branch", "visits", "spend", "points", "joined", "last_visit"], ...X.S.customers.filter((x) => X.inScope(x.branch)).map((x) => [x.id, x.name, x.phone, x.branch, x.visits, x.spend, x.points, new Date(x.joined).toISOString().slice(0, 10), new Date(x.last).toISOString().slice(0, 10)])],
    staff: () => [["id", "name", "role", "branch", "wage_per_hour", "orders_total", "sales_total", "late_30d", "tips"], ...X.S.staff.filter((p) => X.inScope(p.branch)).map((p) => [p.id, p.name, p.role, p.branch, p.wage, p.orders, p.sales, p.late30, p.tips])],
    stock: () => [["branch", "item", "unit", "on_hand", "daily_use", "days_left", "par"], ...X.stock().map((s) => [s.branch, s.item, sItem(s.item).u, s.qty.toFixed(2), s.daily.toFixed(2), (s.qty / s.daily).toFixed(1), s.par.toFixed(1)])],
  }[kind];
  if (!rows) return;
  csv(`conpanna-${kind}-${new Date().toISOString().slice(0, 10)}`, rows());
  X.log(`خروجی «${kind}» گرفت`);
  toast("فایل دانلود شد", "dl");
}

/* ------------------------------------------------------------------- wiring */
function makePO(branch, it) {
  const s = X.stock().find((x) => x.branch === branch && x.item === it);
  if (!s) return null;
  const unitStep = ["عدد", "برش"].includes(sItem(it).u) ? 1 : 0.5;
  const qty = Math.max(unitStep, Math.ceil(Math.max(0, s.par - s.qty) / unitStep) * unitStep);
  return { id: "PO" + Date.now() + Math.floor(Math.random() * 1000), branch, item: it, qty, at: Date.now(), status: "sent" };
}
export function wireOps(el) {
  $$("[data-sb]", el).forEach((b) => b.addEventListener("click", () => { shiftB = b.dataset.sb; X.render(); }));
  $$("[data-inv]", el).forEach((b) => b.addEventListener("click", () => { invAll = b.dataset.inv === "1"; X.render(); }));
  $$("[data-po]", el).forEach((b) => b.addEventListener("click", () => {
    const [br, it] = b.dataset.po.split("|"), po = makePO(br, it); if (!po) return;
    X.setA({ pos: [...(A().pos || []), po] }); X.log(`${amount(po.qty, sItem(it).u)} ${sItem(it).u} ${sItem(it).n} برای ${bname(br)} سفارش داد`);
    toast(`سفارش رفت برای ${sup(sItem(it).sup).n}`, "send"); haptic(8); X.render();
  }));
  $("#po-all", el)?.addEventListener("click", () => {
    const open = new Set((A().pos || []).filter((p) => p.status === "sent").map((p) => p.branch + "|" + p.item));
    const list = X.stock().filter((s) => s.qty / s.daily < 2.5 && !open.has(s.branch + "|" + s.item)).map((s) => makePO(s.branch, s.item)).filter(Boolean);
    if (!list.length) { toast("چیزی برای سفارش نمونده", "info"); return; }
    X.setA({ pos: [...(A().pos || []), ...list] }); X.log(`${num(list.length)} قلم کم رو یه‌جا سفارش داد`);
    toast(`${num(list.length)} سفارش خرید رفت`, "send"); X.render();
  });
  $$("[data-recv]", el).forEach((b) => b.addEventListener("click", () => {
    const p = (A().pos || []).find((x) => x.id === b.dataset.recv); if (!p) return;
    const k = p.branch + "|" + p.item, rc = { ...(A().received || {}) }; rc[k] = (rc[k] || 0) + p.qty;
    X.setA({ pos: A().pos.map((x) => (x.id === p.id ? { ...x, status: "received", recvAt: Date.now() } : x)), received: rc });
    X.log(`رسید ${sItem(p.item).n} تو ${bname(p.branch)} رو زد`); toast("رفت تو انبار", "check"); X.render();
  }));
  $("#w-add", el)?.addEventListener("click", () => {
    const q = toNum($("#w-q", el).value), it = $("#w-i", el).value, br = $("#w-b", el).value, why = $("#w-r", el).value.trim() || "—";
    if (!q) { toast("مقدار رو بنویس", "info"); return; }
    X.setA({ waste: [...(A().waste || []), { at: Date.now(), branch: br, item: it, qty: q, why }] }); X.log(`ضایعات ${sItem(it).n} تو ${bname(br)} ثبت کرد`); toast("ثبت شد", "check"); X.render();
  });
  $$("[data-shift]", el).forEach((b) => b.addEventListener("click", () => {
    const p = X.S.staff.find((x) => x.id === b.dataset.shift), w = [...shiftOf(p)], i = +b.dataset.i;
    w[i] = { M: "E", E: "off", off: "M" }[w[i]];
    X.setA({ shifts: { ...(A().shifts || {}), [p.id]: w } }); haptic(4); X.render();
  }));
  $("#cheer", el)?.addEventListener("click", () => { toast("پاداش ثبت شد و بهش خبر دادیم 🎉", "gift"); X.log("به باریستای ماه پاداش داد"); });
  $$("[data-ck]", el).forEach((c) => c.addEventListener("change", () => {
    const b = c.dataset.ck, i = +c.dataset.i, cur = X.checklist(b).map((x) => x.done); cur[i] = c.checked;
    X.setA({ checks: { ...(A().checks || {}), [b]: { day: new Date().toDateString(), v: cur } } }); haptic(4); X.render();
  }));
  $$("[data-mdone]", el).forEach((b) => b.addEventListener("click", () => {
    X.setA({ maintDone: { ...(A().maintDone || {}), [b.dataset.mdone]: Date.now() } }); const m = X.S.maint.find((x) => x.id === b.dataset.mdone);
    X.log(`«${m.what}» تو ${bname(m.branch)} رو انجام‌شده زد`); toast("ثبت شد؛ موعد بعدی حساب شد", "check"); X.render();
  }));
  $("#td-add", el)?.addEventListener("click", () => {
    const t = $("#td-t", el).value.trim(); if (!t) { $("#td-t", el).focus(); return; }
    X.setA({ todos: [...(A().todos || []), { id: "T" + Date.now(), t, branch: $("#td-b", el).value, done: false }] }); X.render();
  });
  $("#td-t", el)?.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#td-add", el).click(); });
  $$("[data-todo]", el).forEach((c) => c.addEventListener("change", () => { X.setA({ todos: A().todos.map((t) => (t.id === c.dataset.todo ? { ...t, done: c.checked } : t)) }); X.render(); }));
  $$("[data-tdel]", el).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); X.setA({ todos: A().todos.filter((t) => t.id !== b.dataset.tdel) }); X.render(); }));
  $("#copy-daily", el)?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(dailyText()); toast("کپی شد", "copy"); } catch (e) { toast("کپی نشد؛ دستی انتخاب کن", "info"); } });
  $("#send-daily", el)?.addEventListener("click", () => { toast("برات فرستاده شد (تو نسخه‌ی نمایشی)", "send"); X.log("خلاصه‌ی روز رو دستی فرستاد"); });
  $$('input[name^="rp-"]', el).forEach((i) => i.addEventListener("change", () => { X.setA({ reports: { ...(A().reports || {}), [i.name.slice(3)]: i.checked } }); toast(i.checked ? "روشن شد" : "خاموش شد", "check"); }));
  $("#print", el)?.addEventListener("click", () => X.printPack());
  $$("[data-perm]", el).forEach((c) => c.addEventListener("change", () => {
    const [r, k] = c.dataset.perm.split("|"), pm = JSON.parse(JSON.stringify(perms()));
    pm[r] = c.checked ? [...new Set([...pm[r], k])] : pm[r].filter((x) => x !== k);
    X.setA({ perms: pm }); X.log(`دسترسی «${PERMS.find((p) => p[0] === k)[1]}» رو برای ${ROLE_LIST.find((x) => x[0] === r)[1]} ${c.checked ? "باز کرد" : "بست"}`); toast("ذخیره شد", "check");
  }));
  $$("[data-pin]", el).forEach((b) => b.addEventListener("click", () => {
    const p = X.S.staff.find((x) => x.id === b.dataset.pin), pin = String(1000 + Math.floor(Math.random() * 9000));
    sheet(`<h2>رمز جدید ${esc(p.name_fa)}</h2><p class="small" style="margin-top:6px">این رمز رو حضوری بهش بده. بعد از اولین ورود باید عوضش کنه.</p><div class="big-pin lat" dir="ltr">${digits(pin)}</div><button class="btn btn--block" id="pin-ok">${icon("check")}باشه</button>`, { label: "PIN", onMount(s) { $("#pin-ok", s).addEventListener("click", () => closeSheet()); } });
    X.log(`برای ${p.name_fa} رمز جدید ساخت`);
  }));
  $$("[data-kick]", el).forEach((b) => b.addEventListener("click", () => { b.closest(".row").remove(); toast("از اون دستگاه خارج شد", "out"); X.log("یه دستگاه رو از پنل بیرون کرد"); }));
}
