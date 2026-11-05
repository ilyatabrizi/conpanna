// Orders: placing one, and its life afterwards. The branch's side is played by
// the admin panel when it's open (it moves the order along), otherwise by the
// clock — so the preview tells the whole story either way.
import { get, set, item, unitPrice, selLabel, totals, addStamps, addPoints, branch, uid, isDrink } from "./store.js";
import { notify } from "./notify.js";
import { getHub, ping } from "./hub.js";
import { L, loc, num, digits } from "./i18n.js";
import { CHALLENGE } from "./data.js";

export const STEPS = {
  delivery: [
    { k: "received", t: "Order received", t_fa: "سفارش دریافت شد", at: 0 },
    { k: "brewing", t: "Brewing", t_fa: "در حال آماده‌سازی", at: 9 },
    { k: "out", t: "On the way", t_fa: "در راه", at: 32 },
    { k: "done", t: "Delivered", t_fa: "تحویل شد", at: 75 },
  ],
  takeaway: [
    { k: "received", t: "Order received", t_fa: "سفارش دریافت شد", at: 0 },
    { k: "brewing", t: "Brewing", t_fa: "در حال آماده‌سازی", at: 9 },
    { k: "ready", t: "Ready to collect", t_fa: "آماده‌ی تحویل", at: 34 },
    { k: "done", t: "Collected", t_fa: "تحویل گرفته شد", at: 240 },
  ],
};
export const stepSub = (o, k) => ({
  received: L(`Conpanna ${branch(o.branch).name} has your order`, `کن‌پانا ${branch(o.branch).name_fa} سفارشتان را گرفت`),
  brewing: L("Your barista is on it", "باریستا مشغول است"),
  out: L("Your courier picked it up", "پیک سفارش را برداشت"),
  ready: L(`Show code ${o.code} at the counter`, `کد ${digits(o.code)} را به صندوق نشان دهید`),
  done: L("Enjoy. Bu tat senin.", "نوش جان. \u2068Bu tat senin.\u2069"),
}[k]);
const MSG = {
  brewing: (o) => [L("Brewing your order", "سفارشتان در حال آماده‌سازی است"), L(`#${o.code} — your barista at ${branch(o.branch).name} is on it.`, `#${digits(o.code)} — باریستای ${branch(o.branch).name_fa} مشغول است.`)],
  out: (o) => [L("On the way", "سفارش در راه است"), L(`#${o.code} left ${branch(o.branch).name}.`, `#${digits(o.code)} از ${branch(o.branch).name_fa} راه افتاد.`)],
  ready: (o) => [L("Ready to collect ☕", "سفارش آماده است ☕"), L(`#${o.code} is waiting at ${branch(o.branch).name}. Show code ${o.code}.`, `#${digits(o.code)} در ${branch(o.branch).name_fa} منتظر شماست. کد ${digits(o.code)} را نشان دهید.`)],
  done: (o) => [o.mode === "delivery" ? L("Delivered", "تحویل شد") : L("Enjoy your coffee", "نوش جان"), L("How was it? Tap to rate your order.", "چطور بود؟ برای امتیاز دادن بزنید.")],
};

export function stageOf(o, now = Date.now()) {
  const steps = STEPS[o.mode];
  if (o.collected) return steps.length - 1;
  const ov = getHub().orderStatus[o.id];
  if (ov != null) return Math.min(steps.length - 1, ov);
  if (!getHub().autoAdvance) return 0;
  const el = (now - o.at) / 1000;
  let i = 0;
  steps.forEach((s, k) => { if (el >= s.at) i = k; });
  return i;
}

export function placeOrder() {
  const s = get();
  const t = totals(s);
  const code = String(Math.floor(100 + Math.random() * 900));
  const lines = s.bag.map((l) => {
    const it = item(l.id);
    return { id: l.id, sel: l.sel, name: it.name, name_fa: it.name_fa, qty: l.qty, opts: selLabel(it, l.sel), unit: unitPrice(it, l.sel) };
  });
  const addr = s.mode === "delivery" ? s.addresses.find((a) => a.id === s.addrId) : null;
  const here = s.current && Date.now() - s.current.at < 4 * 3600e3 ? s.current : null;
  const o = {
    id: uid("O"), code, at: Date.now(), mode: s.mode, branch: s.branch, pickup: s.mode === "takeaway" ? s.pickup : null,
    table: here && here.branch === s.branch ? here.table : "", addr: addr ? `${addr.label} — ${addr.line}` : null, pay: s.pay, note: s.note || "",
    lines, count: lines.reduce((n, l) => n + l.qty, 0), customer: s.user ? { name: s.user.name, phone: s.user.phone } : null,
    subtotal: t.subtotal, reward: t.reward, voucher: t.voucher, discount: t.discount, tierOff: t.tierOff, fee: t.fee, total: t.total, promo: s.promo, rating: 0,
  };
  // challenge: different Con Panna drinks tried this month
  const tried = [...new Set([...(s.tried || []), ...lines.filter((l) => item(l.id).cat === "conpanna").map((l) => l.id)])];
  set((st) => ({
    orders: [o, ...st.orders], bag: [], promo: null, redeem: false, voucherId: null, note: "", tried,
    rewards: st.rewards - (t.reward > 0 ? 1 : 0),
    vouchers: t.voucherObj ? st.vouchers.map((v) => (v.id === t.voucherObj.id ? { ...v, used: true, usedAt: Date.now() } : v)) : st.vouchers,
  }));
  const fresh = addStamps(t.drinks);
  const tierUp = addPoints(t.points);
  let challenge = false;
  if (!get().challengeDone && tried.length >= CHALLENGE.goal) { set({ challengeDone: true }); challenge = true; }
  notify({ title: L(`Order #${code} received`, `سفارش #${digits(code)} ثبت شد`), body: L(`${o.count} items · ${o.mode === "delivery" ? "Delivery" : "Takeaway"} from ${branch(o.branch).name}.`, `${num(o.count)} قلم · ${o.mode === "delivery" ? "ارسال" : "بیرون‌بر"} از ${branch(o.branch).name_fa}.`), cat: "order", url: `#/order/${o.id}`, tag: o.id });
  ping({ type: "order", id: o.id });
  return { order: o, fresh, tierUp, challenge };
}

let last = {};
export function tick() {
  const s = get();
  let changed = false;
  const orders = s.orders.map((o) => {
    const i = stageOf(o);
    if (i !== o.stage) {
      changed = true;
      const prev = o.stage ?? 0;
      const k = STEPS[o.mode][i].k;
      if (i > prev && !last[o.id + k]) {
        last[o.id + k] = 1;
        const m = MSG[k]?.(o);
        if (m && Date.now() - o.at < 6 * 3600e3) notify({ title: m[0], body: m[1], cat: "order", url: `#/order/${o.id}`, tag: o.id });
      }
      return { ...o, stage: i };
    }
    return o;
  });
  if (changed) set({ orders });
}
export const active = () => get().orders.filter((o) => stageOf(o) < STEPS[o.mode].length - 1);
export function collect(id) { set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, collected: true } : o)) })); ping({ type: "app" }); }
export function rate(id, n, tags = []) { set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, rating: n, tags } : o)) })); ping({ type: "app" }); }
export const stepTitle = (s) => loc(s, "t");
