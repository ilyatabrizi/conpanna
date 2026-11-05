// Everything the customer does stays on the phone: one object, saved on change.
import { MENU, OPTION_SETS, PROMOS, DELIVERY, BRANCHES, TIERS, POINTS, VOUCHERS } from "./data.js";
import { priceOf, stampsGoal } from "./hub.js";
import { loc } from "./i18n.js";

const KEY = "conpanna.v1";
const DEFAULTS = () => ({
  theme: "system",
  user: null,
  bag: [], mode: "takeaway", branch: "valiasr",
  addresses: [], addrId: null, pickup: "asap", pay: "online",
  promo: null, redeem: false, voucherId: null, note: "",
  orders: [], tickets: [],
  stamps: 3, rewards: 0, points: 120,
  vouchers: [], referral: null, tried: [], challengeDone: false, gifts: [],
  checkins: [], current: null, favorites: [],
  notif: { order: true, events: true, offers: true, checkin: true, digest: false, quiet: false, qFrom: "23:00", qTo: "08:00" },
  inbox: [], seenBroadcasts: [],
  prefs: { reduceMotion: false, haptics: true, defaultMode: "takeaway" },
});

let state = DEFAULTS();
const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw), d = DEFAULTS();
    state = { ...d, ...saved, notif: { ...d.notif, ...(saved.notif || {}) }, prefs: { ...d.prefs, ...(saved.prefs || {}) } };
  } catch (e) {}
};
load();

const subs = new Set();
let saveT = 0;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }, 40); };
const emit = () => subs.forEach((f) => { try { f(state); } catch (e) { console.error(e); } });
export const get = () => state;
export function set(patch) { state = typeof patch === "function" ? { ...state, ...patch(state) } : { ...state, ...patch }; save(); emit(); }
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export function reset() { state = DEFAULTS(); save(); emit(); }
addEventListener("storage", (e) => { if (e.key === KEY) { load(); emit(); } });
export const flush = () => { clearTimeout(saveT); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

/* ---------------------------------------------------------------- lookups */
export const item = (id) => MENU.find((m) => m.id === id);
export const branch = (id) => BRANCHES.find((b) => b.id === id) || BRANCHES[0];
export const optionsFor = (it) => OPTION_SETS[it.opts] || [];
export const defaultSel = (it) => Object.fromEntries(optionsFor(it).map((g) => [g.id, g.one ? 0 : []]));
export const isDrink = (it) => !["cake", "breakfast"].includes(it.cat);

export function unitPrice(it, sel) {
  let p = priceOf(it);
  for (const g of optionsFor(it)) {
    const v = sel?.[g.id];
    if (g.one) p += g.choices[v ?? 0]?.[2] || 0;
    else (v || []).forEach((i) => { p += g.choices[i]?.[2] || 0; });
  }
  return p;
}
export function selLabel(it, sel) {
  const out = [];
  optionsFor(it).forEach((g) => {
    const v = sel?.[g.id];
    const name = (ch) => loc({ name: ch[0], name_fa: ch[1] });
    if (g.one) { if ((v ?? 0) !== 0) out.push(name(g.choices[v])); }
    else (v || []).forEach((i) => out.push(name(g.choices[i])));
  });
  return out.join(" · ");
}
const lineKey = (id, sel) => id + "|" + JSON.stringify(sel || {});

/* -------------------------------------------------------------------- bag */
export function addToBag(id, sel, qty = 1) {
  const it = item(id);
  const s = sel || defaultSel(it);
  const key = lineKey(id, s);
  const bag = state.bag.map((l) => ({ ...l }));
  const ex = bag.find((l) => l.key === key);
  if (ex) ex.qty = Math.min(20, ex.qty + qty); else bag.push({ key, id, sel: s, qty });
  set({ bag });
}
export function setQty(key, qty) {
  const bag = state.bag.map((l) => (l.key === key ? { ...l, qty } : l)).filter((l) => l.qty > 0);
  set({ bag, ...(bag.length ? {} : { redeem: false, voucherId: null }) });
}
export function replaceLine(key, id, sel, qty) {
  const nk = lineKey(id, sel);
  let bag = state.bag.filter((l) => l.key !== key);
  const ex = bag.find((l) => l.key === nk);
  if (ex) bag = bag.map((l) => (l.key === nk ? { ...l, qty: Math.min(20, l.qty + qty) } : l)); else bag.push({ key: nk, id, sel, qty });
  set({ bag });
}
export const bagCount = () => state.bag.reduce((n, l) => n + l.qty, 0);
export const lineTotal = (l) => unitPrice(item(l.id), l.sel) * l.qty;

/* ------------------------------------------------------------- loyalty */
export const tierOf = (points = state.points) => [...TIERS].reverse().find((t) => points >= t.min) || TIERS[0];
export const nextTier = (points = state.points) => TIERS.find((t) => t.min > points) || null;
export function addPoints(n) {
  const before = tierOf();
  set((s) => ({ points: s.points + Math.round(n) }));
  const after = tierOf();
  return after.id !== before.id ? after : null;
}
export function addStamps(n) {
  const goal = stampsGoal();
  let stamps = state.stamps + n, rewards = state.rewards, earned = 0;
  while (stamps >= goal) { stamps -= goal; rewards++; earned++; }
  set({ stamps, rewards });
  return earned;
}
export function grantVoucher(type, extra = {}) {
  const t = VOUCHERS[type];
  if (!t) return null;
  if (["welcome", "birthday"].includes(type) && state.vouchers.some((v) => v.type === type && !v.used && v.exp > Date.now())) return null;
  const v = { id: uid("V"), type, code: extra.code || ("CP-" + Math.random().toString(36).slice(2, 7).toUpperCase()), at: Date.now(), exp: Date.now() + (extra.days || t.days) * 864e5, used: false, ...extra };
  set((s) => ({ vouchers: [v, ...s.vouchers] }));
  return v;
}
export const activeVouchers = () => state.vouchers.filter((v) => !v.used && v.exp > Date.now());
export const voucherMeta = (v) => ({ ...VOUCHERS[v.type], ...(v.title ? { title: v.title, title_fa: v.title_fa || v.title } : {}), ...(v.value != null ? { value: v.value } : {}), ...(v.kind ? { kind: v.kind } : {}) });

/* ------------------------------------------------------------------ totals */
export function totals(s = state) {
  const lines = s.bag.map((l) => ({ l, it: item(l.id), u: unitPrice(item(l.id), l.sel) }));
  const subtotal = lines.reduce((n, x) => n + x.u * x.l.qty, 0);
  const cheapest = (pred) => { const xs = lines.filter((x) => pred(x.it)).map((x) => x.u); return xs.length ? Math.min(...xs) : 0; };
  // stamp-card reward: the cheapest drink is free
  const reward = s.redeem && s.rewards > 0 ? cheapest(isDrink) : 0;
  // a voucher
  let voucher = 0;
  const v = s.voucherId && s.vouchers.find((x) => x.id === s.voucherId && !x.used && x.exp > Date.now());
  if (v) {
    const m = voucherMeta(v);
    if (m.kind === "pct") voucher = Math.round(((subtotal - reward) * m.value) / 1000) * 1000;
    if (m.kind === "drink") voucher = cheapest((it) => isDrink(it)) - (reward ? 0 : 0);
    if (m.kind === "cake") voucher = cheapest((it) => it.cat === "cake");
  }
  const rate = s.promo ? PROMOS[s.promo] || 0 : 0;
  const base = Math.max(0, subtotal - reward - voucher);
  const discount = Math.round((base * rate) / 1000) * 1000;
  const gold = s.user && tierOf(s.points).id === "gold";
  const tierOff = gold ? Math.round(((base - discount) * 0.1) / 1000) * 1000 : 0;
  const after = Math.max(0, base - discount - tierOff);
  const fee = s.mode === "delivery" && subtotal > 0 && !gold ? (after >= DELIVERY.freeOver ? 0 : DELIVERY.fee) : 0;
  const total = after + fee;
  const drinks = lines.reduce((n, x) => n + (isDrink(x.it) ? x.l.qty : 0), 0);
  return { subtotal, reward, voucher, voucherObj: v || null, discount, tierOff, fee, total, drinks, points: Math.round(total * POINTS.perToman) };
}

export const toggleFav = (id) => {
  const f = state.favorites.includes(id) ? state.favorites.filter((x) => x !== id) : [...state.favorites, id];
  set({ favorites: f });
  return f.includes(id);
};
export function usual() {
  const count = {};
  state.orders.forEach((o) => o.lines.forEach((l) => { count[l.id] = (count[l.id] || 0) + l.qty; }));
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const last = state.orders.find((o) => o.lines.some((l) => l.id === top[0]));
  return { id: top[0], sel: last.lines.find((l) => l.id === top[0]).sel, times: top[1] };
}
export const uid = (p = "") => p + Math.random().toString(36).slice(2, 8).toUpperCase();
export function referralCode() {
  if (state.referral) return state.referral.code;
  const base = (state.user?.name || "FRIEND").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 5) || "CP";
  const code = `${base}${Math.floor(10 + Math.random() * 89)}`;
  set({ referral: { code, invited: 0 } });
  return code;
}
