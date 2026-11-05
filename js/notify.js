// Notifications. Everything that would be a push lands in the in-app inbox; when
// the customer has allowed notifications (and the category is on, and it isn't
// quiet hours) it also goes to the phone's notification centre through the
// service worker — so it shows even when the app is in the background.
import { get, set, uid } from "./store.js";

export const supported = () => "Notification" in window;
export const permission = () => (supported() ? Notification.permission : "unsupported");

export async function ask() {
  if (!supported()) return "unsupported";
  try {
    const r = await Notification.requestPermission();
    return r;
  } catch (e) { return Notification.permission; }
}

function inQuiet() {
  const n = get().notif;
  if (!n.quiet) return false;
  const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
  const t = (s) => { const [h, mm] = s.split(":").map(Number); return h * 60 + mm; };
  const a = t(n.qFrom), b = t(n.qTo);
  return a < b ? m >= a && m < b : m >= a || m < b;
}

const listeners = new Set();
export const onInbox = (f) => { listeners.add(f); return () => listeners.delete(f); };

// cat: order | events | offers | checkin | digest | system
export async function notify({ title, body, cat = "system", url = "#/", tag }) {
  const entry = { id: uid("N"), title, body, cat, url, at: Date.now(), read: false };
  set((s) => ({ inbox: [entry, ...s.inbox].slice(0, 40) }));
  listeners.forEach((f) => f(entry));
  const prefs = get().notif;
  const allowed = cat === "system" || prefs[cat];
  if (!allowed || inQuiet() || permission() !== "granted") return entry;
  const opts = { body, tag: tag || entry.id, icon: "assets/icons/icon-192.png", badge: "assets/icons/favicon-32.png", data: { url }, renotify: !!tag };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch (e) {
    try { new Notification(title, opts); } catch (e2) { /* the inbox has it */ }
  }
  return entry;
}

export const unread = () => get().inbox.filter((n) => !n.read).length;
export const markAllRead = () => set((s) => ({ inbox: s.inbox.map((n) => ({ ...n, read: true })) }));
