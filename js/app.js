// Wiring: language, theme, routes, the top bar's scroll-derived chrome, the
// opening, the inbox, campaigns arriving from the panel, the service worker.
import { $, $$, icon, closeSheet, sheet, esc, reveal, haptic, toast } from "./ui.js";
import { get, set, subscribe, flush } from "./store.js";
import { LOCKUP } from "./brand.js";
import { initTabbar, paintTabs, setTone, expand, paintLabels } from "./tabbar.js";
import { onInbox, unread, markAllRead, notify } from "./notify.js";
import { tick } from "./orders.js";
import { applyTheme, applyCalm } from "./theme.js";
import { applyLang, getLang, hasChosen, L, ago } from "./i18n.js";
import { onHub, getHub } from "./hub.js";
import { remindTick } from "./views/events.js";
import { onSwitchLang } from "./langbus.js";
import home from "./views/home.js";
import menu from "./views/menu.js";
import checkin from "./views/checkin.js";
import events from "./views/events.js";
import profile from "./views/profile.js";
import settings from "./views/settings.js";
import bag from "./views/bag.js";
import order from "./views/order.js";
import orders from "./views/orders.js";
import rewards from "./views/rewards.js";

const ROUTES = { "": home, menu, checkin, events, profile, settings, bag, order, orders, rewards };
const view = $("#view");
const bar = $("#bar");
const dock = $("#dock");
let cleanup = null, current = "", heroEl = null, titleEl = null, visits = 0;

/* ----------------------------------------------------------------- router */
function parse() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, q = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return { name: parts[0] || "", arg: parts[1], q: Object.fromEntries(new URLSearchParams(q)), path: "/" + path };
}
export function render() {
  const r = parse();
  const V = ROUTES[r.name];
  if (!V) { location.replace("#/"); return; }
  const samePage = current === r.path && view.firstElementChild;
  closeSheet(true);
  cleanup?.(); cleanup = null;
  dock.innerHTML = "";
  if (!samePage) scrollTo(0, 0);
  let back = false;
  try { back = sessionStorage.getItem("cp.back") === "1"; sessionStorage.removeItem("cp.back"); } catch (e) {}
  const meta = V.meta || {};
  document.body.dataset.route = r.name || "home";
  const screen = document.createElement("div");
  screen.className = "screen" + (back ? " back-in" : "");
  view.replaceChildren(screen);
  cleanup = V(screen, r, { dock, rerender: render }) || null;
  current = r.path;
  heroEl = $(".hero", screen);
  titleEl = $(".lt", screen);
  $("#bar-title").textContent = meta.title ? L(...meta.title) : "";
  $("#bar-back").hidden = !meta.back;
  paintTabs(r.path);
  reveal(screen);
  chrome();
  expand();
}
addEventListener("hashchange", () => { visits++; render(); });
$("#bar-back").addEventListener("click", () => {
  try { sessionStorage.setItem("cp.back", "1"); } catch (e) {}
  const meta = ROUTES[parse().name]?.meta;
  if (visits > 0) history.back(); else location.hash = meta?.parent || "#/";
});

/* ------------------------------------------------- scroll-derived chrome */
function chrome() {
  const barH = bar.offsetHeight;
  let overHero = false, toneDark = false;
  if (heroEl) {
    const r = heroEl.getBoundingClientRect();
    overHero = r.bottom > barH + 4;
    toneDark = innerWidth >= 900 ? r.bottom > 80 : r.bottom > innerHeight - 70;
  }
  bar.classList.toggle("over-hero", overHero);
  bar.classList.toggle("solid", heroEl ? !overHero : scrollY > 4);
  bar.classList.toggle("titled", !!titleEl && titleEl.getBoundingClientRect().bottom < barH);
  setTone(toneDark);
}
addEventListener("scroll", chrome, { passive: true });
addEventListener("resize", chrome);

/* ------------------------------------------------------------------ inbox */
const CAT_IC = { order: ["receipt", "#45281A"], events: ["events", "#8A5A2E"], offers: ["gift", "#B4682F"], checkin: ["checkin", "#3C9560"], system: ["bell", "#75604F"], digest: ["spark", "#94653A"] };
function paintBell() { $("#bell-dot").classList.toggle("on", unread() > 0); }
function openInbox() {
  const list = get().inbox;
  sheet(`<h2>${L("Notifications", "اعلان‌ها")}</h2>
    <p class="small lead">${L("Order updates, event reminders and offers. Choose what reaches your phone in", "وضعیت سفارش، یادآور رویدادها و پیشنهادها. اینکه چی به گوشیت برسه رو از")} <a class="link" href="#/settings">${L("Settings", "تنظیمات")}</a>.</p>
    <div style="margin-top:14px">${list.length ? list.map((n) => `<a class="inbox-item ${n.read ? "" : "unread"}" href="${esc(n.url)}"><span class="row-ic" style="--c:${(CAT_IC[n.cat] || CAT_IC.system)[1]}">${icon((CAT_IC[n.cat] || CAT_IC.system)[0])}</span><span class="row-main"><span class="row-t">${esc(n.title)}</span><span class="row-s">${esc(n.body)}</span><span class="tiny">${ago(n.at)}</span></span></a>`).join("") : `<div class="empty">${icon("bell")}<h3>${L("All quiet", "خبری نیست")}</h3><p class="small">${L("When your order moves or an event is close, it shows up here.", "وقتی سفارشت جلو بره یا یه رویداد نزدیک بشه، اینجا می‌بینیش.")}</p></div>`}</div>`,
  { label: L("Notifications", "اعلان‌ها"), onMount: (b) => $$("a", b).forEach((a) => a.addEventListener("click", () => closeSheet())), onClose: () => markAllRead() });
}
$("#bar-bell").innerHTML += icon("bell");
$("#bar-bell").addEventListener("click", openInbox);
onInbox(() => { const b = $("#bar-bell"); b.classList.remove("ring"); void b.offsetWidth; b.classList.add("ring"); });
subscribe(paintBell);

/* --------------------------------------- campaigns sent from the owner panel */
async function deliverBroadcasts() {
  const s = get(), hub = getHub();
  const fresh = hub.broadcasts.filter((b) => !s.seenBroadcasts.includes(b.id) && b.at > (s.user?.since || 0) - 864e5 * 30);
  if (!fresh.length) return;
  set((st) => ({ seenBroadcasts: [...st.seenBroadcasts, ...fresh.map((b) => b.id)].slice(-80) }));
  const { grantVoucher, addStamps, addPoints } = await import("./store.js");
  for (const b of fresh) {
    if (b.stamps) addStamps(b.stamps);
    if (b.points) addPoints(b.points);
    if (b.offer) grantVoucher("campaign", { code: b.code, value: b.offer.value, kind: b.offer.kind, title: b.offer.title, title_fa: b.offer.title_fa, days: 14 });
    notify({ title: L(b.title, b.title_fa || b.title), body: L(b.body, b.body_fa || b.body), cat: "offers", url: b.offer ? "#/rewards" : "#/" });
  }
}
onHub(() => { deliverBroadcasts(); tick(); });

/* -------------------------------------------------- liquid button highlight */
addEventListener("pointerdown", (e) => {
  const b = e.target.closest?.(".btn");
  if (!b) return;
  const r = b.getBoundingClientRect();
  b.style.setProperty("--px", `${e.clientX - r.left}px`);
  b.style.setProperty("--py", `${e.clientY - r.top}px`);
}, { passive: true });

/* ------------------------------------------------------------------- boot */
function boot() {
  applyLang();
  applyTheme();
  applyCalm();
  $("#bar-logo").innerHTML = LOCKUP;
  $("#bar-back").innerHTML = icon("back");
  initTabbar();
  paintBell();
  render();
  tick();
  deliverBroadcasts();
  setInterval(() => { tick(); remindTick(); }, 1000);
  const warm = document.documentElement.classList.contains("boot-warm") || document.documentElement.classList.contains("calm");
  setTimeout(() => {
    const b = $("#boot");
    if (b) { b.classList.add("out"); setTimeout(() => b.remove(), 700); }
    document.documentElement.classList.remove("booting");
    try { sessionStorage.setItem("conpanna.booted", "1"); } catch (e) {}
  }, warm ? 650 : 2650);
}
boot();

if ("serviceWorker" in navigator && !location.search.includes("nosw") && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  navigator.serviceWorker.addEventListener("message", (e) => { if (e.data?.url) location.hash = e.data.url.replace(/^.*#/, "#"); });
}
