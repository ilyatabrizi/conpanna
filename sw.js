// Offline: the shell and assets are cached on install; pages are network-first
// with the cache as fallback, assets cache-first. Notification taps open the app
// at the screen the notification is about.
const CACHE = "conpanna-18b2dce612";
const ASSETS = [
"./",
"admin.html",
"manifest.webmanifest",
"assets/brand/alpha-black.png",
"assets/brand/alpha-white.png",
"assets/fonts/fraunces-400i.woff2",
"assets/fonts/fraunces-600.woff2",
"assets/fonts/yekan.woff2",
"assets/icons/apple-touch-icon.png",
"assets/icons/favicon-32.png",
"assets/icons/icon-192.png",
"assets/icons/icon-512.png",
"assets/icons/maskable-512.png",
"assets/og.png",
"css/admin.css",
"css/app.css",
"js/admin/admin.js",
"js/admin/ceo.js",
"js/admin/crm.js",
"js/admin/extra.js",
"js/admin/kit.js",
"js/admin/more.js",
"js/admin/ops.js",
"js/admin/seed.js",
"js/app.js",
"js/brand.js",
"js/data.js",
"js/hero.js",
"js/hub.js",
"js/i18n.js",
"js/install.js",
"js/langbus.js",
"js/notify.js",
"js/orders.js",
"js/qr.js",
"js/store.js",
"js/tabbar.js",
"js/theme.js",
"js/ui.js",
"js/views/bag.js",
"js/views/checkin.js",
"js/views/events.js",
"js/views/home.js",
"js/views/menu.js",
"js/views/order.js",
"js/views/orders.js",
"js/views/profile.js",
"js/views/rewards.js",
"js/views/settings.js",
"js/views/shared.js"
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("conpanna-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put("./", c)); return r; }).catch(() => caches.match("./")));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(req, c)); }
    return r;
  })));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "#/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ("focus" in c) { c.postMessage({ url }); return c.focus(); } }
    return self.clients.openWindow("./" + url);
  }));
});
// a real server push lands here in the live app
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: "Coffee Conpanna", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Coffee Conpanna", { body: d.body || "", icon: "assets/icons/icon-192.png", badge: "assets/icons/favicon-32.png", data: { url: d.url || "#/" } }));
});
