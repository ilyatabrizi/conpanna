// Shared pieces: tiny DOM helpers, icons, money and dates, the sheet, the toast,
// haptics, the menu illustrations and the QR code.
import { get } from "./store.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const reduced = () => get().prefs.reduceMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ icons */
const P = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.5H5.5A1.5 1.5 0 0 1 4 19z"/>',
  homeF: '<path fill="currentColor" stroke="none" d="M11.4 3.5a1 1 0 0 1 1.2 0l8 6.4a1 1 0 0 1 .4.8V19a2 2 0 0 1-2 2h-3.5a.5.5 0 0 1-.5-.5V15a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.5a.5.5 0 0 1-.5.5H5a2 2 0 0 1-2-2v-8.3a1 1 0 0 1 .4-.8z"/>',
  menu: '<path d="M5 9h11v5.5A5.5 5.5 0 0 1 10.5 20h0A5.5 5.5 0 0 1 5 14.5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/>',
  menuF: '<path fill="currentColor" d="M5 9h11v5.5A5.5 5.5 0 0 1 10.5 20h0A5.5 5.5 0 0 1 5 14.5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/>',
  checkin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><path d="m9.3 10 1.9 1.9 3.6-3.7"/>',
  checkinF: '<path fill="currentColor" stroke="none" d="M12 2.5A7.5 7.5 0 0 0 4.5 10c0 6 6.9 11.8 7.2 12a.5.5 0 0 0 .6 0c.3-.2 7.2-6 7.2-12A7.5 7.5 0 0 0 12 2.5z"/><path stroke="var(--tab-cut, #fff)" d="m9.3 10 1.9 1.9 3.6-3.7"/>',
  events: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none"/>',
  eventsF: '<path fill="currentColor" stroke="none" d="M7 3a1 1 0 0 1 1 1v.5h8V4a1 1 0 1 1 2 0v.5h.5A3 3 0 0 1 21.5 7.5v1.5h-19V7.5A3 3 0 0 1 5.5 4.5H6V4a1 1 0 0 1 1-1zM2.5 10.5h19v7.5a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3z"/><circle cx="12" cy="15.5" r="1.6" fill="var(--tab-cut, #fff)" stroke="none"/>',
  profile: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"/>',
  profileF: '<circle cx="12" cy="8.5" r="4.5" fill="currentColor" stroke="none"/><path fill="currentColor" stroke="none" d="M12 14c4.2 0 7.4 2.5 8.2 6.4a.5.5 0 0 1-.5.6H4.3a.5.5 0 0 1-.5-.6C4.6 16.5 7.8 14 12 14z"/>',
  bag: '<path d="M5.5 8h13l-1 11.2a1.5 1.5 0 0 1-1.5 1.3H8a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  back: '<path d="m14.5 5-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  heartF: '<path fill="currentColor" d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".9" fill="currentColor" stroke="none"/>',
  chev: '<path d="m9.5 6 6 6-6 6"/>',
  chevD: '<path d="m6 9.5 6 6 6-6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  wifi: '<path d="M3 9.5a13 13 0 0 1 18 0M6 13a8 8 0 0 1 12 0M9 16.4a3.6 3.6 0 0 1 6 0"/><circle cx="12" cy="19.3" r="1" fill="currentColor" stroke="none"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  gift: '<rect x="4" y="9" width="16" height="11.5" rx="2"/><path d="M3 9h18M12 9v11.5M12 9c-1.5-3.5-6-4-6-1.3C6 9 8.5 9 12 9zm0 0c1.5-3.5 6-4 6-1.3C18 9 15.5 9 12 9z"/>',
  star: '<path d="m12 4 2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.7l-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/>',
  starF: '<path fill="currentColor" d="m12 4 2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.7l-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/>',
  scooter: '<circle cx="6.5" cy="17" r="2.5"/><circle cx="17.5" cy="17" r="2.5"/><path d="M9 17h6l2-7h-3M14 5h2.5l1 5M4 13h6"/>',
  takeaway: '<path d="M6.5 7h11l-1.3 12.6a1.5 1.5 0 0 1-1.5 1.4H9.3a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M5.5 7h13M8 7l.8-3.5h6.4L16 7M7.2 12h9.6"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v.01M18 15v.01"/>',
  ticket: '<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4z"/><path d="M14.5 6v12" stroke-dasharray="1.6 2"/>',
  calPlus: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-1"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.4z"/>',
  out: '<path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h9"/>',
  trash: '<path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.5h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-12"/>',
  map: '<path d="M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  spark: '<path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7l-1.6-5.5L5 10.6 10.4 9z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c.6-3.3 3.2-5.3 6.5-5.3s5.9 2 6.5 5.3"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.4c2.2.6 3.6 2.5 4 5.1"/>',
  receipt: '<path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
  edit: '<path d="M4.5 19.5 5.3 16 16 5.3a1.8 1.8 0 0 1 2.6 0l.1.1a1.8 1.8 0 0 1 0 2.6L8 18.7z"/><path d="M14 7.3 16.7 10"/>',
  shield: '<path d="M12 3.5 19 6v5.5c0 4.3-3 7.7-7 9-4-1.3-7-4.7-7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  dl: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
  bolt: '<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-3.5-9.5C12 7 11 9.5 11.5 12 10 11.5 9 10 9 8.5 7 10.5 6 12.6 6 15a6 6 0 0 0 6 6z"/>',
  table: '<path d="M3.5 9.5h17M6 9.5 4.5 19M18 9.5l1.5 9.5M8 9.5V6.5h8v3"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.3 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.3-3.8-8.5s1.2-6.1 3.8-8.5z"/>',
  crown: '<path d="M4 8l4 4 4-6 4 6 4-4-1.5 10h-13z"/><path d="M5.5 20.5h13"/>',
  tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.2 6.2a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.5"/>',
  mega: '<path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  cake: '<path d="M4.5 20.5h15v-7a2 2 0 0 0-2-2h-11a2 2 0 0 0-2 2z"/><path d="M4.5 15.5c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 4.5 0 1.5-.6 1.5-.6M12 11.5V8M12 5.2c.8-.9.8-1.7 0-2.7-.8 1-.8 1.8 0 2.7z"/>',
  send: '<path d="M21 3 3 10.5l7.5 3L14 21z"/><path d="m10.5 13.5 4-4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  layers: '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>',
  pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>',
  note: '<path d="M6 3.5h9l4 4v13H6z"/><path d="M15 3.5v4h4M9 12h7M9 15.5h5"/>',
  sparkle: '<path d="M12 2.5l1.8 5.7 5.7 1.8-5.7 1.8L12 17.5l-1.8-5.7-5.7-1.8 5.7-1.8z"/>',
  stir: '<path d="M4 20 15 9"/><path d="M14.5 4.5c2.5-1 5 1.5 4 4-.6 1.5-2.4 2-3.7 1.3"/>',
  coffee: '<path d="M5 9h11v5.5A5.5 5.5 0 0 1 10.5 20A5.5 5.5 0 0 1 5 14.5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/>',
  door: '<path d="M14 20.5H5.5V4.5H14M18 12H9.5M15 8.5l3.5 3.5-3.5 3.5"/>',
};
export const icon = (n, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;

/* ----------------------------------------------------------- money, dates */
export { num, money, moneyText, kmoney, fmtDay, fmtLong, fmtTime, relDay, ago, greeting, digits, pct, plural, fmtOther, hhmm, L, loc } from "./i18n.js";
import { L, loc, digits } from "./i18n.js";
export const pad = (n) => String(n).padStart(2, "0");
export function dayFromToday(offset, hhmm = "00:00") {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

/* ------------------------------------------------------- open hours / busy */
const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export function tehranNow() {
  try { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()); const h = +p.find((x) => x.type === "hour").value, m = +p.find((x) => x.type === "minute").value; const d = new Date(); d.setHours(h % 24, m, 0, 0); return d; } catch (e) { return new Date(); }
}
export function openState(b, now = tehranNow()) {
  const m = now.getHours() * 60 + now.getMinutes();
  const o = toMin(b.open), c = toMin(b.close) || 1440;
  const isOpen = m >= o && m < c;
  return { isOpen, label: isOpen ? L(`Open – until ${b.close === "24:00" ? "midnight" : b.close}`, `باز – تا ${b.close === "24:00" ? "نیمه‌شب" : digits(b.close)}`) : L(`Closed – opens ${b.open}`, `بسته – از ${digits(b.open)}`) };
}
// a believable curve: quiet mornings, a lunch bump, full evenings. Demo only.
export function busy(b, now = tehranNow()) {
  const h = now.getHours() + now.getMinutes() / 60;
  if (!openState(b, now).isOpen) return 0;
  const curve = 0.18 + 0.32 * Math.exp(-((h - 13) ** 2) / 3) + 0.62 * Math.exp(-((h - 20.5) ** 2) / 5);
  const wobble = ((b.hue * 7 + now.getDate() * 13) % 17) / 100;
  return clamp(curve + wobble - 0.08, 0.08, 0.97);
}
export const busyLabel = (v) => (v === 0 ? L("Closed", "بسته") : v < 0.35 ? L("Quiet now", "خلوت") : v < 0.65 ? L("Getting busy", "کم‌کم شلوغ") : v < 0.85 ? L("Busy", "شلوغ") : L("Packed", "خیلی شلوغ"));

/* ---------------------------------------------------------------- haptics */
export function haptic(ms = 8) {
  if (!get().prefs.haptics) return;
  try { navigator.vibrate?.(ms); } catch (e) {}
}
export function replay(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

/* ------------------------------------------------------------------ toast */
let toastT = 0;
export function toast(msg, ico = "check") {
  const root = $("#toast-root");
  root.innerHTML = `<div class="toast">${icon(ico)}<span>${msg}</span></div>`;
  const t = root.firstElementChild;
  requestAnimationFrame(() => t.classList.add("in"));
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, 2600);
}

/* ------------------------------------------------------------------ sheet */
// iOS sheet: rises on a spring, the page behind steps back, drag the grabber
// (or anywhere at the top of the content) down to let it go.
let openSheet = null;
export function sheet(html, { onMount, onClose, cls = "", label = "Details" } = {}) {
  closeSheet(true);
  const root = $("#sheet-root");
  const wrap = document.createElement("div");
  wrap.className = "sheet-wrap";
  wrap.innerHTML = `<div class="scrim"></div><section class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="grab"><span></span></div><button class="sheet-x" type="button" aria-label="${L("Close", "بستن")}">${icon("close")}</button><div class="sheet-body">${html}</div></section>`;
  root.appendChild(wrap);
  const sh = $(".sheet", wrap), body = $(".sheet-body", wrap);
  document.documentElement.classList.add("sheet-open");
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add("in")));
  const close = () => closeSheet();
  $(".scrim", wrap).addEventListener("click", close);
  $(".sheet-x", wrap).addEventListener("click", close);
  // drag to dismiss
  let y0 = null, dy = 0, t0 = 0;
  sh.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const onGrab = e.target.closest(".grab");
    if (!onGrab && (body.scrollTop > 0 || e.target.closest("input,textarea,select,button,a,.no-drag"))) return;
    y0 = e.clientY; dy = 0; t0 = performance.now();
  });
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("pointerup", onUp);
  addEventListener("pointercancel", onUp);
  function onMove(e) {
    if (y0 == null) return;
    dy = Math.max(0, e.clientY - y0);
    if (dy > 4) { sh.classList.add("dragging"); sh.style.transform = `translateY(${dy}px)`; }
  }
  function onUp() {
    if (y0 == null) return;
    const v = dy / Math.max(1, performance.now() - t0);
    y0 = null;
    sh.classList.remove("dragging");
    sh.style.transform = "";
    if (dy > 120 || v > 0.6) close();
  }
  const onKey = (e) => { if (e.key === "Escape") close(); };
  addEventListener("keydown", onKey);
  openSheet = { wrap, onClose, off: () => { removeEventListener("pointermove", onMove); removeEventListener("pointerup", onUp); removeEventListener("pointercancel", onUp); removeEventListener("keydown", onKey); } };
  setTimeout(() => $(".sheet-x", wrap).focus({ preventScroll: true, focusVisible: false }), 50);
  onMount?.(body, close);
  return { body, close };
}
export function closeSheet(instant = false) {
  if (!openSheet) return;
  const { wrap, onClose, off } = openSheet;
  openSheet = null;
  off();
  document.documentElement.classList.remove("sheet-open");
  wrap.classList.remove("in");
  onClose?.();
  if (instant) wrap.remove();
  else setTimeout(() => wrap.remove(), 420);
}
export const sheetIsOpen = () => !!openSheet;

/* ---------------------------------------------------------------- confetti-free celebration: a cream burst */
export function burst(x, y) {
  if (reduced()) return;
  const host = document.createElement("div");
  host.className = "burst";
  host.style.left = x + "px"; host.style.top = y + "px";
  host.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg;--d:${38 + (i % 3) * 14}px"></i>`).join("");
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 900);
}

/* ------------------------------------------------------------------- art */
// Every item drawn from above, in one hand: saucer, cup, what's in it.
const SPECK = (n, r, seed, col, size = 1.4) => {
  let s = seed, out = "";
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280; const a = (s / 233280) * Math.PI * 2;
    s = (s * 9301 + 49297) % 233280; const d = Math.sqrt(s / 233280) * r;
    out += `<circle cx="${(50 + Math.cos(a) * d).toFixed(1)}" cy="${(50 + Math.sin(a) * d).toFixed(1)}" r="${size}" fill="${col}"/>`;
  }
  return out;
};
function topping(t, c, d, R) {
  const cream = `<path d="M50 ${50 - R * .78} c ${R * .5} 0 ${R * .82} ${R * .3} ${R * .78} ${R * .74} s -${R * .4} ${R * .7} -${R * .8} ${R * .66} s -${R * .74} -${R * .4} -${R * .68} -${R * .82} s ${R * .4} -${R * .58} ${R * .7} -${R * .58} z" fill="#FFF9F1"/>
    <path d="M50 ${50 - R * .5} c ${R * .32} 0 ${R * .52} ${R * .2} ${R * .5} ${R * .48} s -${R * .26} ${R * .45} -${R * .5} ${R * .42} s -${R * .46} -${R * .26} -${R * .42} -${R * .52} s ${R * .25} -${R * .38} ${R * .42} -${R * .38}" fill="none" stroke="#EADFD2" stroke-width="1.6"/>
    <path d="M50 ${50 - R * .24} c ${R * .14} 0 ${R * .24} ${R * .1} ${R * .22} ${R * .22} s -${R * .12} ${R * .2} -${R * .24} ${R * .18}" fill="none" stroke="#EADFD2" stroke-width="1.6"/>`;
  switch (t) {
    case "crema": return `<circle cx="50" cy="50" r="${R}" fill="url(#crema)"/>${SPECK(14, R * .8, 7, "rgba(255,230,190,.35)", 1)}`;
    case "heart": return `<path d="M50 ${50 + R * .55} C ${50 - R * .9} ${50 - R * .05} ${50 - R * .55} ${50 - R * .75} 50 ${50 - R * .3} C ${50 + R * .55} ${50 - R * .75} ${50 + R * .9} ${50 - R * .05} 50 ${50 + R * .55} z" fill="#FBF3E8" opacity=".95"/><path d="M50 ${50 - R * .32} L50 ${50 + R * .7}" stroke="#FBF3E8" stroke-width="1.4" opacity=".8"/>`;
    case "rosetta": {
      let leaves = "";
      for (let i = 0; i < 6; i++) { const y = 50 + R * .55 - i * R * .2, w = R * (.72 - i * .1); leaves += `<path d="M${50 - w} ${y} Q50 ${y - R * .3} ${50 + w} ${y}" fill="none" stroke="#FBF3E8" stroke-width="${3.4 - i * .35}" stroke-linecap="round"/>`; }
      return leaves + `<path d="M50 ${50 - R * .62} L50 ${50 + R * .76}" stroke="#FBF3E8" stroke-width="1.3"/>`;
    }
    case "cream": return cream;
    case "cream-drizzle": return cream + `<path d="M${50 - R * .55} ${50 - R * .2} q ${R * .2} -${R * .25} ${R * .35} 0 t ${R * .35} 0 t ${R * .35} 0 M${50 - R * .5} ${50 + R * .2} q ${R * .2} -${R * .25} ${R * .35} 0 t ${R * .35} 0 t ${R * .35} 0" fill="none" stroke="${d || "#B87333"}" stroke-width="2.2" stroke-linecap="round"/>`;
    case "cream-cocoa": return cream + SPECK(40, R * .6, 3, "#5B3322", .9);
    case "cream-pistachio": return cream + SPECK(16, R * .5, 11, "#8DA34C", 1.6) + SPECK(8, R * .5, 5, "#B65F5A", 1.1);
    case "scoop": return `<circle cx="50" cy="50" r="${R * .55}" fill="#FFF7EA"/><path d="M${50 - R * .5} ${50 + R * .1} a ${R * .55} ${R * .55} 0 0 0 ${R} 0" fill="none" stroke="#EBDCC6" stroke-width="2"/>${SPECK(10, R * .4, 2, "#2B160D", .7)}`;
    case "spice": return `<circle cx="50" cy="50" r="${R * .9}" fill="rgba(255,240,220,.35)"/>${SPECK(26, R * .7, 9, "#7A4A26", .9)}<path d="M${50 - R * .5} ${50 + R * .4} l ${R} -${R * .7}" stroke="#6E3B1E" stroke-width="3.2" stroke-linecap="round"/>`;
    case "clear": return `<ellipse cx="${50 - R * .32}" cy="${50 - R * .34}" rx="${R * .32}" ry="${R * .14}" fill="rgba(255,255,255,.28)" transform="rotate(-35 50 50)"/>`;
    default: return "";
  }
}
export function art(it, cls = "") {
  const a = it.art;
  const defs = `<defs><radialGradient id="crema" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#C48A54"/><stop offset=".55" stop-color="#9A5F33"/><stop offset="1" stop-color="#5E3520"/></radialGradient><radialGradient id="saucer" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EFE7DD"/></radialGradient></defs>`;
  let g = "";
  if (a.k === "cup" || a.k === "pot") {
    const R = a.small ? 20 : 25;
    g += `<ellipse cx="52" cy="54" rx="40" ry="40" fill="rgba(60,30,10,.10)"/><circle cx="50" cy="50" r="40" fill="url(#saucer)"/><circle cx="50" cy="50" r="31" fill="none" stroke="#E7DDD1" stroke-width="1"/>`;
    if (a.k === "pot") {
      g += `<path d="M78 46 q14 -2 14 4 q0 6 -14 4" fill="#fff" stroke="#E0D4C6"/><circle cx="50" cy="50" r="${R + 6}" fill="#FDFBF8" stroke="#E5DACD"/><circle cx="50" cy="50" r="${R + 1}" fill="${a.c}"/><circle cx="50" cy="50" r="${R + 1}" fill="url(#crema)" opacity=".35"/>`;
    } else {
      g += `<rect x="${50 + R + 2}" y="46" width="13" height="8" rx="4" fill="#FFFFFF" stroke="#E0D4C6"/><circle cx="50" cy="50" r="${R + 5}" fill="#FFFFFF" stroke="#E2D6C8"/><circle cx="50" cy="50" r="${R}" fill="${a.c}"/>`;
      g += topping(a.t, a.c, a.d, R);
    }
  } else if (a.k === "glass") {
    g += `<ellipse cx="52" cy="54" rx="34" ry="34" fill="rgba(60,30,10,.10)"/><circle cx="50" cy="50" r="33" fill="rgba(255,255,255,.75)" stroke="rgba(255,255,255,.95)" stroke-width="2"/><circle cx="50" cy="50" r="28" fill="${a.c}" opacity=".92"/>`;
    if (a.t === "cream") g += topping("cream", a.c, null, 24);
    else g += `<rect x="34" y="34" width="14" height="14" rx="3.5" fill="rgba(255,255,255,.42)" transform="rotate(14 41 41)"/><rect x="52" y="40" width="13" height="13" rx="3.5" fill="rgba(255,255,255,.36)" transform="rotate(-18 58 46)"/><rect x="40" y="53" width="13" height="13" rx="3.5" fill="rgba(255,255,255,.3)" transform="rotate(30 46 60)"/>`;
    g += `<circle cx="62" cy="36" r="4.6" fill="#F4ECE2" stroke="#D8C9B8"/><circle cx="62" cy="36" r="2.2" fill="#C8B49E"/>`;
  } else if (a.k === "slice") {
    g += `<ellipse cx="52" cy="54" rx="40" ry="40" fill="rgba(60,30,10,.10)"/><circle cx="50" cy="50" r="40" fill="url(#saucer)"/><circle cx="50" cy="50" r="32" fill="none" stroke="#E7DDD1"/>`;
    g += `<path d="M26 66 L72 30 Q80 46 74 62 Z" fill="${a.c}"/><path d="M72 30 Q80 46 74 62 L70 62 Q75 47 68 33 Z" fill="${a.top}" opacity=".95"/><path d="M26 66 L72 30" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/>`;
    if (a.dust) g += SPECK(30, 14, 4, "#5A3524", .8).replace(/cx="([\d.]+)" cy="([\d.]+)"/g, (m, x, y) => `cx="${(+x + 6).toFixed(1)}" cy="${(+y - 2).toFixed(1)}"`);
    g += `<circle cx="38" cy="66" r="3.4" fill="#B23A3A"/><circle cx="33" cy="69" r="2.6" fill="#7E1F2B"/><path d="M40 63 q3 -4 6 -2" stroke="#5C8A3A" stroke-width="1.6" fill="none"/>`;
  } else if (a.k === "plate") {
    g += `<ellipse cx="52" cy="54" rx="42" ry="42" fill="rgba(60,30,10,.10)"/><circle cx="50" cy="50" r="42" fill="url(#saucer)"/><circle cx="50" cy="50" r="33" fill="none" stroke="#E7DDD1"/>`;
    if (a.f === "croissant") g += `<path d="M26 58 Q30 34 50 32 Q70 34 74 58 Q66 50 60 54 Q56 44 50 44 Q44 44 40 54 Q34 50 26 58z" fill="#D69A4B"/><path d="M40 54 Q44 44 50 44 Q56 44 60 54" fill="none" stroke="#B5762F" stroke-width="2"/><path d="M33 52 Q38 40 50 38 Q62 40 67 52" fill="none" stroke="#E9B86E" stroke-width="2"/>`;
    if (a.f === "eggs") g += `<rect x="24" y="30" width="26" height="36" rx="7" fill="#D2A066" transform="rotate(-12 37 48)"/><rect x="27" y="33" width="20" height="30" rx="5" fill="#EBCB98" transform="rotate(-12 37 48)"/><path d="M52 36 q14 -6 20 6 q6 12 -6 18 q-12 4 -16 -6 q-3 -10 2 -18z" fill="#FFFDF7"/><circle cx="61" cy="47" r="6" fill="#F2A71B"/><circle cx="58" cy="66" r="5" fill="#D9472B"/><circle cx="66" cy="64" r="4" fill="#E2573A"/><path d="M45 68 q3 -5 7 -3" stroke="#5C8A3A" stroke-width="2" fill="none"/>`;
    if (a.f === "pancakes") g += `<circle cx="50" cy="50" r="26" fill="#C98A45"/><circle cx="50" cy="50" r="23" fill="#E2AE68"/><path d="M36 44 q8 -6 16 0 t16 0" fill="none" stroke="#9A5B22" stroke-width="3" stroke-linecap="round" opacity=".8"/><circle cx="50" cy="50" r="7" fill="#FFF9F1"/><circle cx="40" cy="58" r="3.2" fill="#3B3A7A"/><circle cx="60" cy="57" r="3.2" fill="#B23A3A"/><circle cx="57" cy="40" r="2.8" fill="#3B3A7A"/>`;
  }
  return `<svg class="art ${cls}" viewBox="0 0 100 100" aria-hidden="true">${defs}${g}</svg>`;
}
export const tile = (it, cls = "") => `<span class="tile ${cls}" style="--tile:${it.art.bg}">${art(it)}</span>`;

/* --------------------------------------------------------------------- QR */
export function qrSvg(text) {
  if (!window.qrcode) return `<div class="qr-fallback">${esc(text)}</div>`;
  const q = window.qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return `<svg class="qr" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" aria-label="QR code ${esc(text)}"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#1E120C"/></svg>`;
}

/* -------------------------------------------------------------- reveal-on-scroll */
let io = null;
export function reveal(root) {
  if (reduced() || !("IntersectionObserver" in window)) { $$(".rv", root).forEach((e) => e.classList.add("in")); return; }
  io ||= new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px" });
  $$(".rv", root).forEach((e) => io.observe(e));
}

/* --------------------------------------------------------------- segmented */
// a segmented control whose thumb slides (and squishes) to the chosen segment
export function segmented(el, onChange) {
  const btns = $$("button", el);
  const thumb = $(".seg-thumb", el);
  const place = (animate = true) => {
    const on = btns.find((b) => b.getAttribute("aria-pressed") === "true") || btns[0];
    if (!animate) thumb.style.transition = "none";
    thumb.style.width = on.offsetWidth + "px";
    thumb.style.transform = `translateX(${on.offsetLeft - 3}px)`;
    if (!animate) { void thumb.offsetWidth; thumb.style.transition = ""; }
  };
  btns.forEach((b) => b.addEventListener("click", () => {
    if (b.getAttribute("aria-pressed") === "true") return;
    btns.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    replay(thumb, "squish");
    place();
    haptic(6);
    onChange?.(b.dataset.v);
  }));
  requestAnimationFrame(() => place(false));
  if ("ResizeObserver" in window) new ResizeObserver(() => place(false)).observe(el);
}
export const seg = (opts, cur, cls = "") => `<div class="seg ${cls}" role="group"><span class="seg-thumb" aria-hidden="true"></span>${opts.map(([v, l, ic]) => `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${ic ? icon(ic) : ""}<span>${l}</span></button>`).join("")}</div>`;

/* ------------------------------------------------------------------ switch */
export const sw = (name, on, label = "") => `<label class="switch"><input type="checkbox" name="${name}" ${on ? "checked" : ""} aria-label="${esc(label)}"><span class="sw-track"><span class="sw-knob"></span></span></label>`;
