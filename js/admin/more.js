// More of the owner's tools: the command palette (⌘K), closing the till at
// the end of the day, what marketing actually brings in, panel settings,
// announcements to the branches with read receipts, and two branches head to
// head.
import { $, $$, esc, icon, toast, haptic, sheet, closeSheet, num, digits, pct, kmoney, fmtDay, fmtTime, loc, sw } from "../ui.js";
import { MENU, BRANCHES } from "../data.js";
import { applyTheme } from "../theme.js";
import { DAY, T, kk, sum, avg, fa1, mins, kpi, card, pill, empty, table, meter, periodBar } from "./kit.js";
import { rng } from "./seed.js";
import { donutH, barsH } from "./ceo.js";
import { searchCustomers, openCustomer, members, invites, SRC, SOURCES, resetCrmIndex } from "./crm.js";

let X;
export function initMore(ctx) { X = ctx; }
const A = () => X.A();
const brs = () => BRANCHES.filter((b) => X.inScope(b.id));
const bname = (id) => loc(BRANCHES.find((b) => b.id === id) || {});
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const toNum = (v) => +String(v).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[^\d.]/g, "") || 0;
const done = (a) => a.filter((o) => o.status === "done");

/* -------------------------------------------------------------- settings */
export const CFG0 = { vat: 10, fee: 0.4, sla: 8, low: 2.5, tol: 200000, float: 2000000, sound: true };
export const cfg = () => ({ ...CFG0, ...(X.A().cfg || {}) });

/* ------------------------------------------------------------ cash close */
function cashSec() {
  const C = cfg(), all = X.orders(), tkey = new Date().toDateString();
  const today = done(all.filter((o) => o.day === 0));
  const petty = (A().petty || []).filter((p) => new Date(p.at).toDateString() === tkey && X.inScope(p.branch));
  const closes = A().closes || [];
  const rows = brs().map((b) => {
    const t = today.filter((o) => o.branch === b.id);
    const cashS = sum(t.filter((o) => o.pay === "cash")), cardS = sum(t.filter((o) => o.pay === "card")), onl = sum(t.filter((o) => o.pay === "online"));
    const out = sum(petty.filter((p) => p.branch === b.id), (p) => p.amt);
    return { b, n: t.length, cashS, cardS, onl, out, exp: C.float + cashS - out, cl: closes.find((x) => x.day === tkey && x.branch === b.id) };
  });
  // the last two weeks: counted against expected
  const by = {};
  all.forEach((o) => { if (o.day >= 1 && o.day <= 14 && o.status === "done" && o.pay === "cash") by[o.day + "|" + o.branch] = (by[o.day + "|" + o.branch] || 0) + o.total; });
  const hist = [];
  for (let d = 1; d <= 14; d++) brs().forEach((b) => {
    const R = rng(hash(b.id + d)), r = R();
    const diff = r < .62 ? 0 : r < .84 ? Math.round((R() - .5) * 120) * 1000 : r < .95 ? -Math.round(R() * 260 + 40) * 1000 : Math.round(R() * 150 + 20) * 1000;
    const exp = C.float + (by[d + "|" + b.id] || 0);
    const mgr = X.S.staff.find((p) => p.branch === b.id && p.role === "manager");
    hist.push({ d, b, exp, cnt: exp + diff, diff, who: mgr?.name_fa || "" });
  });
  const tot14 = sum(hist, (h) => h.diff), bad = hist.filter((h) => Math.abs(h.diff) >= C.tol).length;
  const diffT = (v) => (v === 0 ? pill("درسته", "ok") : `<b class="${v < 0 ? "neg" : "pos"}">${v < 0 ? "کسری " : "اضافه "}${kk(Math.abs(v))}</b>`);
  return `<div class="kpis k5">${kpi("نقد امروز", kk(sum(rows, (r) => r.cashS)), `${num(sum(rows, (r) => r.n))} سفارش`)}${kpi("کارتخوان امروز", kk(sum(rows, (r) => r.cardS)), "خودش تسویه می‌شه")}${kpi("آنلاین امروز", kk(sum(rows, (r) => r.onl)), "از اپ")}
      ${kpi("جمع اختلاف ۱۴ روز", `<span class="${tot14 < 0 ? "neg" : tot14 > 0 ? "pos" : ""}">${kk(Math.abs(tot14))}</span>`, tot14 < 0 ? "کسری داشتیم" : tot14 > 0 ? "اضافه داشتیم" : "همه‌چی جور بوده")}${kpi("روزهای با اختلاف زیاد", num(bad), `بیشتر از ${kk(C.tol)} تومان`)}</div>
    <div class="cards g3">${rows.map((r) => `<section class="card till ${r.cl ? "closed" : ""}"><div class="card-h"><h3>${esc(loc(r.b))}</h3>${r.cl ? pill("صندوق بسته شد", "ok") : pill("بازه", "info")}</div>
      <div class="till-math"><span>تنخواه اول روز</span><b>${kk(C.float)}</b><span>+ فروش نقد</span><b>${kk(r.cashS)}</b><span>− خرج از صندوق</span><b>${kk(r.out)}</b><span class="eq">باید تو صندوق باشه</span><b class="eq">${T(r.exp)}</b></div>
      ${r.cl ? `<div class="till-res">${r.cl.diff === 0 ? `${icon("check")}<b>دقیقاً جور بود</b>` : `<b class="${r.cl.diff < 0 ? "neg" : "pos"}">${r.cl.diff < 0 ? "کسری" : "اضافه"} ${T(Math.abs(r.cl.diff))}</b>`}<span class="tiny">شمرده شد ${T(r.cl.cnt)} – ساعت ${fmtTime(new Date(r.cl.at))}</span><button class="link sm" data-reopen="${r.b.id}">دوباره باز کن</button></div>`
        : `<label class="field"><span>شمردی، چقدر بود؟</span><div class="money-in"><input inputmode="numeric" data-count="${r.b.id}" placeholder="${num(Math.round(r.exp / 1000) * 1000)}"><small>تومان</small></div></label><p class="tiny till-live" data-live="${r.b.id}"></p><button class="btn btn--sm btn--block" data-close="${r.b.id}" style="margin-top:10px">${icon("check")}بستن صندوق</button>`}
      <p class="tiny" style="margin-top:10px">کارتخوان ${kk(r.cardS)} – آنلاین ${kk(r.onl)}</p></section>`).join("")}</div>
    <div class="cards g2">
      ${card("خرج از صندوق امروز", `<div class="inline-form"><select id="pt-b">${brs().map((b) => `<option value="${b.id}">${esc(loc(b))}</option>`).join("")}</select><input id="pt-a" inputmode="numeric" placeholder="مبلغ"><input id="pt-w" placeholder="بابت چی، مثلاً یخ و نون"><button class="btn btn--sm" id="pt-go">${icon("plus")}ثبت</button></div>
        ${petty.length ? table(["ساعت", "شعبه", "بابت", "مبلغ"], petty.slice().reverse().map((p) => [fmtTime(new Date(p.at)), esc(bname(p.branch)), esc(p.why), `<b>${kk(p.amt)}</b>`])) : empty("امروز چیزی از صندوق برداشته نشده.")}`)}
      ${card("قانون صندوق", `<div class="irs"><div class="ir"><span class="ir-ic">${icon("cash")}</span><span class="ir-t">تنخواه اول روز</span><span class="ir-v">${T(C.float)}</span></div><div class="ir"><span class="ir-ic">${icon("bell")}</span><span class="ir-t">کِی خبرت کنیم</span><span class="ir-v">اختلاف بیشتر از ${T(C.tol)}</span></div></div><button class="link sm" data-go="settings">عوضش کن</button>`)}
    </div>
    ${card("دو هفته‌ی اخیر", table(["روز", ...brs().map((b) => esc(loc(b))), "جمع روز"], Array.from({ length: 14 }, (_, i) => { const d = i + 1, hs = hist.filter((h) => h.d === d); return [fmtDay(new Date(Date.now() - d * DAY)), ...hs.map((h) => `<span data-tip="${esc(h.who)} – باید ${kk(h.exp)} می‌بود، ${kk(h.cnt)} شمرده شد">${diffT(h.diff)}</span>`), diffT(sum(hs, (h) => h.diff))]; }), { cls: "till-t" }), { extra: `<span class="tiny">رو هر خونه بری، جزئیاتش رو می‌بینی</span>` })}`;
}

/* ------------------------------------------------------------- marketing */
const SPEND = { insta: 0.5, sms: 0.2, maps: 0.1, event: 0.2, walkin: 0, friend: 0 };
const PAST = [
  { t: "هوا بارونیه؟ ٪۱۵ تخفیف نوشیدنی گرم", d: 9, ch: "push", reach: 412, open: 46, red: 48 },
  { t: "دلمون برات تنگ شده ☕", d: 17, ch: "sms", reach: 118, open: 61, red: 21 },
  { t: "تازه رسید: پسته کن‌پانا", d: 26, ch: "push", reach: 455, open: 39, red: 0, lift: 64 },
  { t: "شب آکوستیک فرداست", d: 41, ch: "sms", reach: 300, open: 52, red: 37 },
  { t: "یلدا: دو تا بگیر، سومی مهمون ما", d: 55, ch: "sms", reach: 520, open: 58, red: 93 },
];
function marketing() {
  const P = A().period || 30, rows = members(), inv = invites(), months = 120 / 30;
  const mk = X.S.shared.marketing;
  const bySrc = SOURCES.map(([k, n, , c]) => {
    const m = rows.filter((r) => r.e.src === k), spend = sum(m, (r) => r.s.spend), profit = sum(m, (r) => r.s.profit);
    const cost = k === "friend" ? m.length * 100000 : mk * months * SPEND[k];
    return { k, n, c, m: m.length, act: m.filter((r) => r.s.rec <= 30).length, spend, profit, avgS: m.length ? spend / m.length : 0, cost, cac: m.length ? cost / m.length : 0, roi: cost ? profit / cost : 0 };
  });
  const all = X.orders(), cur = done(all.filter((o) => o.day < P)), promo = cur.filter((o) => o.promo), plain = cur.filter((o) => !o.promo);
  const PT = { voucher: "کوپن پیامکی", promo: "کد تخفیف کمپین", gold: "٪۱۰ طلایی‌ها", free: "نوشیدنی مجانی" };
  const ptab = Object.keys(PT).map((k) => { const a = promo.filter((o) => o.promo === k); return [PT[k], num(a.length), kk(sum(a, (o) => o.discount)), kk(sum(a)), kk(avg(a, (o) => o.subtotal))]; });
  const avgT = avg(cur, (o) => o.total);
  const camps = [...(A().campaigns || []).map((c) => ({ t: c.title, d: Math.floor((Date.now() - c.at) / DAY), ch: c.ch, reach: c.reach, open: c.open, red: c.redeem, mine: 1 })), ...PAST];
  const top = [...inv.entries()].map(([id, l]) => ({ c: X.S.customers.find((x) => x.id === id), n: l.length, sp: sum(l.map((i) => rows.find((r) => r.c.id === i)).filter(Boolean), (r) => r.s.spend) })).filter((x) => x.c && X.inScope(x.c.branch)).sort((a, b) => b.n - a.n || b.sp - a.sp).slice(0, 8);
  const totCost = sum(bySrc, (s) => s.cost), totNew = rows.filter((r) => Date.now() - r.c.joined < P * DAY).length;
  return `${periodBar(P)}
    <div class="kpis k5">${kpi("خرج تبلیغات تو ماه", kk(mk), "سهم همه‌ی شعبه‌ها")}${kpi(`عضو تازه تو ${num(P)} روز`, num(totNew))}${kpi("هزینه‌ی جذب هر نفر", kk(totCost / (rows.length || 1)), "میانگین همه‌ی راه‌ها")}
      ${kpi("فروش با کوپن", pct(Math.round((sum(promo) / (sum(cur) || 1)) * 100)), `${num(promo.length)} سفارش`)}${kpi("تخفیفی که دادیم", kk(sum(promo, (o) => o.discount)), `تو ${num(P)} روز`)}</div>
    <div class="cards g2">
      ${card("مشتری‌ها از کجا میان", donutH(bySrc.map((s) => ({ l: s.n, v: s.m, c: s.c }))))}
      ${card("کدوم راه بیشتر می‌ارزه", barsH(bySrc.filter((s) => s.cost).sort((a, b) => b.roi - a.roi).map((s) => ({ l: s.n, v: s.roi, f: `${fa1(s.roi)} برابر`, c: s.c }))) + `<p class="tiny" style="margin-top:12px">سودی که مشتری‌های هر راه آوردن، تقسیم بر خرجش. «از جلوی کافه» خرجی نداره، برای همین اینجا نیست.</p>`)}
    </div>
    ${card("جذب مشتری به تفکیک راه", table(["راه", "مشتری", "هنوز فعالن", "میانگین خرید", "کل خرید", "خرج جذب", "هر نفر", "بازگشت"], bySrc.map((s) => [`<span class="dot-l" style="--c:${s.c}"></span><b>${s.n}</b>`, num(s.m), pct(Math.round((s.act / (s.m || 1)) * 100)), kk(s.avgS), kk(s.spend), s.cost ? kk(s.cost) : "—", s.cost ? kk(s.cac) : "—", s.cost ? `<b class="${s.roi >= 1 ? "pos" : "neg"}">${fa1(s.roi)}×</b>` : "—"]), { cls: "sortable" }))}
    ${card("کمپین‌ها چی آوردن", table(["کمپین", "کِی", "راه", "رسید", "باز کرد", "استفاده", "خرج", "فروش آورد", "بازگشت"], camps.map((c) => { const cost = c.ch === "sms" ? c.reach * 210 : 0, rev = c.red ? c.red * avgT : (c.lift || 0) * avgT; return [`<b>${esc(c.t)}</b>${c.mine ? ` ${pill("تازه", "info")}` : ""}`, c.d ? `${num(c.d)} روز پیش` : "امروز", c.ch === "sms" ? "پیامک" : "اعلان", num(c.reach), pct(c.open), num(c.red || c.lift || 0), cost ? kk(cost) : "رایگان", kk(rev), cost ? `<b class="pos">${fa1(rev / cost)}×</b>` : pill("بی‌خرج", "ok")]; }), { cls: "sortable" }), { extra: `<button class="btn btn--sm btn--soft" data-go="campaigns">${icon("mega")}کمپین تازه</button>` })}
    <div class="cards g2">
      ${card("کوپن‌ها و تخفیف‌ها", table(["نوع", "دفعات", "تخفیف", "فروش", "فاکتور قبل از تخفیف"], ptab) + `<p class="small" style="margin-top:12px">فاکتور با کوپن به‌طور میانگین ${kk(avg(promo, (o) => o.subtotal))} تومانه، بدون کوپن ${kk(avg(plain, (o) => o.subtotal))}. ${avg(promo, (o) => o.subtotal) > avg(plain, (o) => o.subtotal) ? "یعنی کوپن، مشتری رو به خرید بیشتر می‌کشونه." : "کوپن فاکتور رو بزرگ‌تر نکرده؛ شاید حداقل خرید بذاری."}</p>`)}
      ${card("کسایی که بیشترین دوست رو آوردن", top.length ? `<div class="refs">${top.map((x, i) => `<button class="ref" data-cust="${x.c.id}"><span class="rk">${num(i + 1)}</span><span class="cav sm">${esc(x.c.name_fa[0])}</span><span class="row-main"><span class="row-t">${esc(x.c.name_fa)}</span><span class="row-s">${num(x.n)} نفر آورده – اونا ${kk(x.sp)} خرید کردن</span></span>${icon("chev", "chev")}</button>`).join("")}</div>` : empty("هنوز کسی کسی رو نیاورده"))}
    </div>`;
}

/* ------------------------------------------------------------- settings */
function settings() {
  const C = cfg(), dark = document.documentElement.dataset.mode === "dark";
  const f = (k, l, s, unit, step = 1) => `<label class="set-f"><span class="row-main"><span class="row-t">${l}</span><span class="row-s">${s}</span></span><span class="money-in sm"><input inputmode="decimal" data-cfg="${k}" data-step="${step}" value="${k === "tol" || k === "float" ? num(C[k]) : digits(String(C[k])).replace(".", "٫")}"><small>${unit}</small></span></label>`;
  const t = (k, l, s, on) => `<label class="row plain tgl-row"><span class="row-main"><span class="row-t">${l}</span><span class="row-s">${s}</span></span>${sw(k, on, l)}</label>`;
  return `<div class="cards g2">
    ${card("حساب و کتاب", `<div class="sets">${f("vat", "مالیات بر ارزش افزوده", "تو سود و زیان از فروش کم می‌شه", "٪")}${f("fee", "کارمزد کارتخوان و درگاه", "روی فروش غیرنقدی", "٪")}${f("float", "تنخواه اول روز", "پولی که صبح تو صندوقه", "تومان")}${f("tol", "اختلاف صندوق مهمه از", "بیشتر از این، هشدار می‌گیری", "تومان")}</div>`)}
    ${card("سرویس و انبار", `<div class="sets">${f("sla", "سفارش دیر حساب می‌شه بعد از", "برای کیفیت سرویس و هشدارها", "دقیقه")}${f("low", "انبار کمه وقتی کمتر از", "روز مصرف مونده باشه", "روز")}</div>`)}
    ${card("ظاهر پنل", `${t("set-dark", "تم تیره", "برای شب و نور کم", dark)}${t("set-compact", "نمایش فشرده", "اطلاعات بیشتر تو یه صفحه", !!A().compact)}${t("set-col", "منوی کناری جمع", "فقط آیکن‌ها؛ کلید [ هم همین کار رو می‌کنه", !!A().collapsed)}${t("set-sound", "صدای سفارش تازه", "یه دینگ کوچیک", C.sound)}`)}
    ${card("میان‌برهای کیبورد", `<div class="keys">${KEYS.map(([k, l]) => `<div class="key-r"><span>${l}</span><span>${k.map((x) => `<kbd>${x}</kbd>`).join("")}</span></div>`).join("")}</div>`, { cls: "keys-card" })}
    ${card("داده‌های نمایشی", `<p class="small">همه‌ی کارهایی که تو پنل کردی (یادداشت‌ها، کمپین‌ها، صندوق، هدف‌ها و تنظیمات) رو پاک می‌کنه و پنل رو مثل روز اول می‌کنه.</p><button class="btn btn--sm btn--ghost danger" id="set-reset" style="margin-top:14px">${icon("trash")}از اول شروع کن</button>`, { cls: "wide" })}
  </div>`;
}
export const KEYS = [[["⌘", "K"], "جست‌وجو و پرش به هر جا"], [["/"], "جست‌وجو"], [["["], "جمع و باز کردن منو"], [["G", "O"], "سفارش‌های زنده"], [["G", "C"], "مشتری‌ها"], [["G", "D"], "داشبورد"], [["?"], "همین راهنما"], [["Esc"], "بستن پنجره"]];

/* --------------------------------------------------------- announcements */
function annCard() {
  const list = (A().ann || []).filter((a) => a.to === "all" || X.inScope(a.to)).slice().reverse().slice(0, 6), now = Date.now();
  const reads = (a) => (a.to === "all" ? BRANCHES : BRANCHES.filter((b) => b.id === a.to)).map((b) => { const r = a.at + (3 + (hash(a.id + b.id) % 85)) * 60e3; return { b, r, ok: now >= r }; });
  return card("اطلاعیه برای شعبه‌ها", `<div class="ann-form"><textarea id="an-t" rows="2" maxlength="200" placeholder="مثلاً: از فردا لیوان‌های جدید میاد؛ قدیمی‌ها رو اول مصرف کنید."></textarea><div class="inline-form"><select id="an-to"><option value="all">همه‌ی شعبه‌ها</option>${BRANCHES.map((b) => `<option value="${b.id}">${esc(loc(b))}</option>`).join("")}</select><label class="fl-t"><input type="checkbox" id="an-pin"><span>مهمه، سنجاقش کن</span></label><button class="btn btn--sm" id="an-go">${icon("send")}بفرست</button></div></div>
    ${list.length ? `<div class="anns">${list.map((a) => { const r = reads(a), n = r.filter((x) => x.ok).length; return `<div class="ann ${a.pin ? "pin" : ""}"><div class="ann-h">${a.pin ? icon("bolt") : icon("mega")}<b>${esc(a.t)}</b><button class="icon-btn xs" data-delann="${a.id}" aria-label="پاک کردن">${icon("close")}</button></div><p class="tiny">${a.to === "all" ? "همه‌ی شعبه‌ها" : esc(bname(a.to))} – ${fmtTime(new Date(a.at))} ${fmtDay(new Date(a.at))} – ${num(n)} از ${num(r.length)} تا خوندن</p><div class="reads">${r.map((x) => `<span class="${x.ok ? "ok" : ""}" data-tip="${x.ok ? `ساعت ${fmtTime(new Date(x.r))} خوند` : "هنوز ندیده"}">${icon(x.ok ? "check" : "clock")}${esc(loc(x.b))}</span>`).join("")}</div></div>`; }).join("")}</div>` : `<p class="tiny" style="margin-top:12px">اطلاعیه رو مدیر و بچه‌های هر شعبه تو اپ پرسنل می‌بینن، تو هم می‌بینی کی خونده.</p>`}`, { cls: "wide" });
}

/* ------------------------------------------------------ branch vs branch */
function compareCard() {
  const ids = BRANCHES.map((b) => b.id), cm = A().cmp || [ids[0], ids[2]];
  const P = A().period || 30, S = sla();
  const m = (id) => {
    const c = done(X.S.orders.filter((o) => o.branch === id && o.day < P)), r = c.filter((o) => o.rating);
    const cs = X.S.customers.filter((x) => x.branch === id && Date.now() - x.joined < P * DAY).length;
    return [["فروش", sum(c), kk], ["سفارش", c.length, num], ["میانگین فاکتور", sum(c) / (c.length || 1), kk], ["قلم تو هر سفارش", sum(c, (o) => o.qty) / (c.length || 1), fa1],
      ["حاشیه‌ی سود ناخالص", (1 - sum(c, (o) => o.cost) / (sum(c) || 1)) * 100, (v) => pct(Math.round(v))], ["آماده‌سازی", avg(c, (o) => o.prep), mins, 1], ["سفارش زیر " + num(S / 60) + " دقیقه", (c.filter((o) => o.prep <= S).length / (c.length || 1)) * 100, (v) => pct(Math.round(v))],
      ["امتیاز مشتری", avg(r, (o) => o.rating), fa1], ["سهم اپ", (c.filter((o) => o.channel === "app").length / (c.length || 1)) * 100, (v) => pct(Math.round(v))], ["عضو تازه", cs, num], ["لغو", X.S.orders.filter((o) => o.branch === id && o.day < P && o.status !== "done").length, num, 1]];
  };
  const a = m(cm[0]), b = m(cm[1]);
  const sel = (i) => `<select data-cmp="${i}">${BRANCHES.map((x) => `<option value="${x.id}" ${cm[i] === x.id ? "selected" : ""}>${esc(loc(x))}</option>`).join("")}</select>`;
  return card("رودررو: دو شعبه کنار هم", `<div class="vs-h">${sel(0)}<span class="vs">در برابر</span>${sel(1)}</div><div class="vs-t">${a.map(([l, v, f, inv], i) => { const w = b[i][1], win = v === w || f(v) === f(w) ? 0 : (v > w) !== !!inv ? 1 : 2, mx = Math.max(v, w) || 1; return `<div class="vs-r"><span class="vs-a ${win === 1 ? "win" : ""}"><b>${f(v)}</b><i style="--w:${(v / mx) * 100}%"></i></span><span class="vs-l">${l}</span><span class="vs-b ${win === 2 ? "win" : ""}"><i style="--w:${(w / mx) * 100}%"></i><b>${f(w)}</b></span></div>`; }).join("")}</div><p class="tiny" style="margin-top:12px">${num(P)} روز اخیر. سبز یعنی تو اون مورد جلوتره.</p>`, { cls: "wide" });
}
const sla = () => cfg().sla * 60;

/* -------------------------------------------------------- command palette */
let palOpen = false;
export function openPalette() {
  if (palOpen) return; palOpen = true;
  const wrap = document.createElement("div");
  wrap.className = "pal-wrap";
  wrap.innerHTML = `<div class="pal-scrim"></div><div class="pal" role="dialog" aria-modal="true" aria-label="جست‌وجو"><div class="pal-in">${icon("search")}<input id="pal-q" placeholder="بخش، مشتری، آیتم منو، کد سفارش یا اسم پرسنل…" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div><div class="pal-r" id="pal-r" role="listbox"></div><div class="pal-f"><span><kbd>↑</kbd><kbd>↓</kbd> جابه‌جا</span><span><kbd>↵</kbd> باز کن</span><span><kbd>⌘</kbd><kbd>K</kbd> هر جا بودی</span></div></div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("in"));
  const q = $("#pal-q", wrap), out = $("#pal-r", wrap);
  let items = [], cur = 0;
  const close = () => { palOpen = false; wrap.classList.remove("in"); removeEventListener("keydown", key, true); setTimeout(() => wrap.remove(), 200); };
  const run = (it) => { close(); it.run(); };
  const paint = () => {
    items = results(q.value.trim());
    cur = Math.min(cur, Math.max(0, items.length - 1));
    let g = "";
    out.innerHTML = items.length ? items.map((it, i) => `${it.g !== g ? `<p class="pal-g">${(g = it.g)}</p>` : ""}<button class="pal-i ${i === cur ? "on" : ""}" role="option" aria-selected="${i === cur}" data-i="${i}">${icon(it.ic)}<span class="row-main"><span class="row-t">${esc(it.t)}</span>${it.s ? `<span class="row-s">${esc(it.s)}</span>` : ""}</span>${i === cur ? `<kbd>↵</kbd>` : ""}</button>`).join("") : `<div class="pal-empty">${icon("search")}<span>چیزی پیدا نشد</span></div>`;
    $$("[data-i]", out).forEach((b) => { b.addEventListener("click", () => run(items[+b.dataset.i])); b.addEventListener("mousemove", () => { if (cur !== +b.dataset.i) { cur = +b.dataset.i; paint(); } }); });
    $(".pal-i.on", out)?.scrollIntoView({ block: "nearest" });
  };
  const key = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); cur = (cur + 1) % (items.length || 1); paint(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); cur = (cur - 1 + items.length) % (items.length || 1); paint(); }
    else if (e.key === "Enter" && items[cur]) { e.preventDefault(); run(items[cur]); }
  };
  addEventListener("keydown", key, true);
  q.addEventListener("input", () => { cur = 0; paint(); });
  $(".pal-scrim", wrap).addEventListener("click", close);
  paint(); q.focus();
}
function results(qs) {
  const n = (s) => String(s || "").toLowerCase().replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s‌#]/g, "");
  const k = n(qs), has = (s) => !k || n(s).includes(k);
  const out = [];
  const secs = X.sections().filter(([id, , t]) => has(t) || has(id)).map(([id, ic, t, g]) => ({ g: "بخش‌ها", ic, t, s: g, run: () => X.go(id) }));
  const acts = [
    ["سفارش آزمایشی بزن", "plus", () => X.simOrder()], ["تم تیره و روشن", "moon", () => { const d = document.documentElement.dataset.mode === "dark"; applyTheme(d ? "light" : "dark", true); }],
    ["چاپ گزارش جلسه", "receipt", () => X.printPack()], ["جمع و باز کردن منوی کناری", "grid", () => X.toggleSide()], ["خروجی همه‌ی مشتری‌ها", "dl", () => X.csvExport("customers")],
    ["بستن صندوق امروز", "cash", () => X.go("cash")], ["میان‌برهای کیبورد", "info", () => helpSheet()],
  ].filter(([t]) => has(t)).map(([t, ic, run]) => ({ g: "کارها", ic, t, run }));
  if (!k) {
    const rec = (A().recentC || []).map((id) => searchCustomers(id === "APP" ? X.app().user?.name || "" : id, 1)[0]).filter(Boolean);
    rec.forEach((c) => out.push({ g: "مشتری‌هایی که اخیراً دیدی", ic: "profile", t: c.n, s: c.s, run: () => openCustomer(c.id) }));
    return [...out, ...secs.slice(0, 8), ...acts.slice(0, 4)];
  }
  out.push(...secs.slice(0, 5));
  searchCustomers(qs, 5).forEach((c) => out.push({ g: "مشتری‌ها", ic: "profile", t: c.n, s: c.s, run: () => openCustomer(c.id) }));
  MENU.filter((m) => has(m.name_fa) || has(m.name)).slice(0, 4).forEach((m) => out.push({ g: "منو", ic: "coffee", t: m.name_fa, s: `${kmoney(m.price)} تومان`, run: () => X.go("menu") }));
  X.boardOrders().filter((o) => has(o.code)).slice(0, 4).forEach((o) => out.push({ g: "سفارش‌های امروز", ic: "receipt", t: `#${digits(o.code)} – ${o.name}`, s: { new: "تازه", brewing: "دارن درستش می‌کنن", ready: "آماده‌ست", done: "تحویل شد" }[o.status], run: () => X.go("orders") }));
  X.S.staff.filter((p) => X.inScope(p.branch) && (has(p.name_fa) || has(p.name))).slice(0, 4).forEach((p) => out.push({ g: "پرسنل", ic: "users", t: p.name_fa, s: `${p.role_fa} – ${bname(p.branch)}`, run: () => X.go("staff") }));
  out.push(...acts);
  return out;
}
export function helpSheet() {
  sheet(`<h2>میان‌برها</h2><div class="keys" style="margin-top:14px">${KEYS.map(([k, l]) => `<div class="key-r"><span>${l}</span><span>${k.map((x) => `<kbd>${x}</kbd>`).join("")}</span></div>`).join("")}</div>`, { label: "میان‌برها" });
}

/* ------------------------------------------------------------------ wire */
export function wireMore(el) {
  // cash
  $$("[data-count]", el).forEach((i) => i.addEventListener("input", () => {
    const id = i.dataset.count, v = toNum(i.value), live = $(`[data-live="${id}"]`, el);
    i.removeAttribute("aria-invalid");
    if (!v) { live.textContent = ""; return; }
    const d = v - cashRow(id).exp;
    live.innerHTML = d === 0 ? `${icon("check")} دقیقاً جوره` : `<b class="${d < 0 ? "neg" : "pos"}">${d < 0 ? "کسری" : "اضافه"} ${kk(Math.abs(d))} تومان</b>`;
  }));
  $$("[data-close]", el).forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.close, inp = $(`[data-count="${id}"]`, el), v = toNum(inp.value);
    if (!v) { inp.focus(); inp.setAttribute("aria-invalid", "true"); toast("اول بشمر و مبلغ رو بزن", "info"); return; }
    const r = cashRow(id), diff = v - r.exp;
    X.setA({ closes: [...(A().closes || []).filter((x) => !(x.day === new Date().toDateString() && x.branch === id)), { day: new Date().toDateString(), branch: id, exp: r.exp, cnt: v, diff, at: Date.now() }].slice(-200) });
    X.log(`صندوق ${bname(id)} رو بست${diff ? ` – ${diff < 0 ? "کسری" : "اضافه"} ${kk(Math.abs(diff))}` : ""}`);
    toast(diff === 0 ? "صندوق بسته شد؛ جور بود 👌" : `بسته شد – ${diff < 0 ? "کسری" : "اضافه"} ${kk(Math.abs(diff))}`, diff === 0 ? "check" : "info"); haptic(12); X.render();
  }));
  $$("[data-reopen]", el).forEach((b) => b.addEventListener("click", () => { X.setA({ closes: (A().closes || []).filter((x) => !(x.day === new Date().toDateString() && x.branch === b.dataset.reopen)) }); X.render(); }));
  $("#pt-go", el)?.addEventListener("click", () => {
    const amt = toNum($("#pt-a", el).value), why = $("#pt-w", el).value.trim();
    if (!amt) { $("#pt-a", el).focus(); return; }
    X.setA({ petty: [...(A().petty || []), { at: Date.now(), branch: $("#pt-b", el).value, amt, why: why || "—" }].slice(-200) });
    X.log(`${kk(amt)} تومان از صندوق ${bname($("#pt-b", el).value)} برداشت (${why || "—"})`); toast("ثبت شد", "check"); X.render();
  });
  // settings
  $$("[data-cfg]", el).forEach((i) => i.addEventListener("change", () => {
    const k = i.dataset.cfg, v = toNum(String(i.value).replace("٫", "."));
    if (!(v >= 0)) return;
    X.setA({ cfg: { ...(A().cfg || {}), [k]: v } }); X.log("تنظیمات رو عوض کرد"); toast("ذخیره شد", "check"); X.render();
  }));
  $('input[name="set-dark"]', el)?.addEventListener("change", (e) => { applyTheme(e.target.checked ? "dark" : "light", true); try { const s = JSON.parse(localStorage.getItem("conpanna.v1") || "{}"); s.theme = e.target.checked ? "dark" : "light"; localStorage.setItem("conpanna.v1", JSON.stringify(s)); } catch (er) {} });
  $('input[name="set-compact"]', el)?.addEventListener("change", (e) => { X.setA({ compact: e.target.checked }); X.applyUi(); });
  $('input[name="set-col"]', el)?.addEventListener("change", () => X.toggleSide());
  $('input[name="set-sound"]', el)?.addEventListener("change", (e) => { X.setA({ cfg: { ...(A().cfg || {}), sound: e.target.checked } }); });
  $("#set-reset", el)?.addEventListener("click", () => {
    sheet(`<h2>همه‌چی از اول؟</h2><p class="small" style="margin-top:10px">یادداشت‌ها، کمپین‌ها، بستن صندوق‌ها، هدف‌ها و تنظیمات پاک می‌شن. داده‌های فروش نمایشی سر جاشه.</p><div class="act-grid" style="margin-top:16px"><button class="btn btn--soft" id="rs-no">نه، بی‌خیال</button><button class="btn danger-bg" id="rs-yes">${icon("trash")}آره، پاک کن</button></div>`, { label: "از اول", onMount(s) {
      $("#rs-no", s).addEventListener("click", () => closeSheet());
      $("#rs-yes", s).addEventListener("click", () => { closeSheet(); X.reset(); resetCrmIndex(); toast("پنل مثل روز اول شد", "check"); });
    } });
  });
  // announcements
  $("#an-go", el)?.addEventListener("click", () => {
    const t = $("#an-t", el).value.trim(); if (!t) { $("#an-t", el).focus(); return; }
    X.setA({ ann: [...(A().ann || []), { id: "N" + Date.now(), t, to: $("#an-to", el).value, pin: $("#an-pin", el).checked, at: Date.now() }].slice(-40) });
    X.log(`اطلاعیه فرستاد: «${t.slice(0, 40)}»`); toast("اطلاعیه رفت", "send"); haptic(10); X.render();
  });
  $$("[data-delann]", el).forEach((b) => b.addEventListener("click", () => { const old = A().ann || []; X.setA({ ann: old.filter((a) => a.id !== b.dataset.delann) }); X.render(); toast("پاک شد", "trash", { action: "برگردون", onAction: () => { X.setA({ ann: old }); X.render(); } }); }));
  // compare
  $$("[data-cmp]", el).forEach((s) => s.addEventListener("change", () => { const ids = BRANCHES.map((b) => b.id), cm = [...(A().cmp || [ids[0], ids[2]])]; cm[+s.dataset.cmp] = s.value; X.setA({ cmp: cm }); X.render(); }));
}
function cashRow(id) {
  const C = cfg(), t = done(X.orders().filter((o) => o.day === 0 && o.branch === id));
  const out = sum((A().petty || []).filter((p) => p.branch === id && new Date(p.at).toDateString() === new Date().toDateString()), (p) => p.amt);
  return { exp: C.float + sum(t.filter((o) => o.pay === "cash")) - out };
}

export const MORE = { cash: cashSec, marketing, settings };
export { annCard, compareCard };
