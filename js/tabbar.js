// The tab bar — Alpha's glass capsule, as on KAIRO: five places on one capsule of
// glass, and the bag beside it as its own round button.
// - the lens under the current tab slides between tabs on a spring, and follows a
//   finger dragged along the bar; letting go lands on the nearest tab
// - scrolling down a long page folds the capsule to the current tab alone;
//   scrolling back up, tapping it, or going anywhere opens it again
// - over the liquid hero the glass turns dark so its type stays light
import { $, $$, clamp, icon, haptic, replay } from "./ui.js";
import { bagCount, subscribe } from "./store.js";
import { L, digits } from "./i18n.js";

const LABELS = { home: ["Home", "خانه"], menu: ["Menu", "منو"], checkin: ["Check-in", "ورود"], events: ["Events", "رویدادها"], profile: ["Profile", "پروفایل"] };
export function paintLabels() {
  tabs.forEach((t) => { const l = LABELS[t.dataset.tab]; t.querySelector(".tab-l").textContent = l[0]; });
  document.querySelector(".bag-l").textContent = "Bag";
  place();
}
// the tabs as they sit on screen, left to right (Persian lays them out mirrored)
const visual = () => tabs.slice().sort((a, b) => a.offsetLeft - b.offsetLeft);

const TAB_FOR = { "/": "home", "/menu": "menu", "/checkin": "checkin", "/events": "events", "/profile": "profile", "/settings": "profile", "/orders": "profile" };

let bar, caps, row, tabs, bagBtn;
const narrow = matchMedia("(max-width: 899px)");
let active = null, minimized = false;

function place() {
  const i = tabs.findIndex((t) => t.dataset.tab === active);
  if (i < 0) { bar.classList.add("no-lens"); bar.style.setProperty("--row-x", "0px"); return; }
  bar.classList.remove("no-lens");
  const t = tabs[i];
  const shift = minimized ? -t.offsetLeft : 0;
  bar.style.setProperty("--row-x", `${shift}px`);
  bar.style.setProperty("--lens-x", `${t.offsetLeft + shift}px`);
  bar.style.setProperty("--lens-w", `${t.offsetWidth}px`);
  bar.style.setProperty("--min-w", `${t.offsetWidth}px`);
  bar.dataset.ready = "1";
}

export function paintTabs(path) {
  const root = "/" + (path.split("/")[1] || "");
  const was = active;
  active = TAB_FOR[root] ?? null;
  tabs.forEach((t) => t.setAttribute("aria-current", t.dataset.tab === active ? "page" : "false"));
  bagBtn.setAttribute("aria-current", root === "/bag" || root === "/order" ? "page" : "false");
  if (was !== active) { const t = tabs.find((x) => x.dataset.tab === active); if (t) replay(t, "bump"); }
  setMin(false);
  place();
}

function setMin(on) {
  if (on === minimized) return;
  if (on && (!narrow.matches || !active || document.documentElement.scrollHeight - innerHeight < 700)) return;
  minimized = on;
  bar.classList.toggle("min", on);
  place();
}
export const expand = () => setMin(false);

export function setTone(dark) { bar.dataset.tone = dark ? "dark" : "light"; }

function paintBag() {
  const b = $("#bag-badge");
  const n = bagCount();
  const txt = n > 99 ? "99+" : String(n);
  const changed = b.textContent !== txt;
  b.textContent = txt;
  b.classList.toggle("on", n > 0);
  bagBtn.classList.toggle("has", n > 0);
  bagBtn.setAttribute("aria-label", n ? `Bag, ${n} items` : "Bag");
  if (changed && n > 0) { replay(b, "pop"); replay(bagBtn, "gulp"); }
}

export function initTabbar() {
  bar = $("#tabbar"); caps = $("#tabs"); row = $("#tabs-row"); tabs = $$(".tab", row); bagBtn = $("#bag-btn");
  tabs.forEach((t) => { $(".tab-ico", t).innerHTML = icon(t.dataset.tab) + icon(t.dataset.tab + "F"); });
  $("#bag-ico").innerHTML = icon("bag");

  // fold on scroll
  let lastY = scrollY, run = 0;
  addEventListener("scroll", () => {
    const y = scrollY, dy = y - lastY;
    lastY = y;
    if (y < 120) { run = 0; setMin(false); return; }
    run = Math.sign(dy) === Math.sign(run) ? run + dy : dy;
    if (run > 48) setMin(true);
    else if (run < -28) setMin(false);
  }, { passive: true });

  // drag the lens
  let drag = null, swallow = false;
  caps.addEventListener("dragstart", (e) => e.preventDefault());
  caps.addEventListener("pointerdown", (e) => {
    if (minimized || e.button > 0) return;
    drag = { x0: e.clientX, id: e.pointerId, moved: false, idx: -1 };
  });
  caps.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) {
      if (Math.abs(dx) < 8) return;
      drag.moved = true;
      try { caps.setPointerCapture(e.pointerId); } catch (err) {}
      bar.classList.add("dragging");
      bar.classList.remove("no-lens");
    }
    const w = tabs[0].offsetWidth;
    const r = row.getBoundingClientRect();
    const x = clamp(e.clientX - r.left - w / 2, 0, r.width - w);
    bar.style.setProperty("--lens-x", `${x}px`);
    bar.style.setProperty("--lens-w", `${w}px`);
    const idx = clamp(Math.round(x / w), 0, tabs.length - 1);
    if (idx !== drag.idx) { drag.idx = idx; haptic(4); const v = visual(); tabs.forEach((t) => t.classList.toggle("under", t === v[idx])); }
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag; drag = null;
    bar.classList.remove("dragging");
    tabs.forEach((t) => t.classList.remove("under"));
    if (!d.moved) return;
    swallow = true; setTimeout(() => { swallow = false; }, 0);
    const t = visual()[d.idx];
    if (t && location.hash !== t.getAttribute("href")) location.hash = t.getAttribute("href");
    else place();
  };
  caps.addEventListener("pointerup", endDrag);
  caps.addEventListener("pointercancel", () => { drag = null; bar.classList.remove("dragging"); tabs.forEach((t) => t.classList.remove("under")); place(); });
  caps.addEventListener("click", (e) => {
    if (swallow) { e.preventDefault(); e.stopPropagation(); return; }
    if (minimized) { e.preventDefault(); setMin(false); haptic(5); return; }
    const t = e.target.closest(".tab");
    if (t && t.getAttribute("href") === (location.hash.split("?")[0] || "#/")) { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }
    else if (t) haptic(5);
  }, true);

  subscribe(paintBag);
  paintBag();
  paintLabels();
  addEventListener("resize", () => { if (!narrow.matches) setMin(false); place(); });
  if ("ResizeObserver" in window) new ResizeObserver(() => place()).observe(row);
  document.fonts?.ready?.then(place);
}
